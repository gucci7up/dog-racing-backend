import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { BetType, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type RandomFn = () => number;

type WinnerOddsRow = {
  dog: number;
  probability: number;
  probabilityPct: number;
  odds: number;
};

@Injectable()
export class VirtualOddsService {
  private readonly logger = new Logger(VirtualOddsService.name);
  private readonly probabilityMin = 0.08;
  private readonly probabilityMax = 0.28;

  constructor(private readonly prisma: PrismaService) {}

  async generateOdds(raceId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    const race = await client.race.findUnique({
      where: { id: raceId },
      select: {
        id: true,
        numero: true,
        resultado: true,
        video: {
          select: {
            nombre: true,
          },
        },
      },
    });

    if (!race?.video) {
      throw new BadRequestException('race inválida');
    }

    const seed = this.buildSeed(race.numero, race.video.nombre, race.resultado);
    const probabilities = this.generateProbabilities({
      raceNumber: race.numero,
      videoName: race.video.nombre,
      resultado: race.resultado,
    });

    const winnerMarket = this.buildWinnerMarket(probabilities);
    const oddsBySelection = new Map<string, Prisma.Decimal>();

    for (const row of winnerMarket) {
      oddsBySelection.set(`WINNER:${row.dog}`, this.toDecimal(row.odds));
    }

    for (const row of this.buildExactaMarket(probabilities)) {
      oddsBySelection.set(`EXACTA:${row.selection}`, this.toDecimal(row.odds));
    }

    for (const row of this.buildTrifectaMarket(probabilities)) {
      oddsBySelection.set(`TRIFECTA:${row.selection}`, this.toDecimal(row.odds));
    }

    const rows = await client.raceOdds.findMany({
      where: { raceId },
      select: { id: true, betType: true, selection: true },
    });

    if (rows.length === 0) {
      throw new BadRequestException('race odds no inicializadas');
    }

    for (const row of rows) {
      const key = `${row.betType}:${row.selection}`;
      const nextOdds = oddsBySelection.get(key);
      if (!nextOdds) {
        throw new BadRequestException(`selección sin cuota virtual: ${key}`);
      }

      await client.raceOdds.update({
        where: { id: row.id },
        data: { currentOdds: nextOdds },
      });
    }

    this.logger.log(`[VIRTUAL ODDS]\nRace ${race.numero}\nSeed: ${seed}`);
    this.logger.log(
      `[VIRTUAL ODDS GENERATED]\n` +
        `RaceId: ${race.id}\n` +
        `RaceNumber: ${race.numero}\n` +
        `Seed: ${seed}\n` +
        `Probabilidades: ${JSON.stringify(
          winnerMarket.map((row) => ({
            dog: row.dog,
            probabilityPct: row.probabilityPct,
          })),
        )}\n` +
        `Cuotas WINNER: ${JSON.stringify(
          winnerMarket.map((row) => ({
            dog: row.dog,
            odds: row.odds,
          })),
        )}`,
    );

    return {
      seed,
      probabilities: winnerMarket,
    };
  }

  private buildSeed(raceNumber: number, videoName: string, resultado: string) {
    return `${raceNumber}-${videoName}-${resultado}`;
  }

  private generateProbabilities(params: {
    raceNumber: number;
    videoName: string;
    resultado: string;
  }) {
    const result = this.parseTopThree(params.resultado);
    const rng = this.createRng(this.buildSeed(params.raceNumber, params.videoName, params.resultado));
    const template = this.generateTemplate(rng);
    const availableSlots = new Set<number>([0, 1, 2, 3, 4, 5]);
    const assignment = new Map<number, number>();

    const winnerSlot = this.pickSlot(rng, [4, 5, 3], availableSlots);
    assignment.set(result.first, template[winnerSlot]);
    availableSlots.delete(winnerSlot);

    const secondSlot = this.pickSlot(rng, [3, 4, 2], availableSlots);
    assignment.set(result.second, template[secondSlot]);
    availableSlots.delete(secondSlot);

    const thirdSlot = this.pickSlot(rng, [2, 3, 1], availableSlots);
    assignment.set(result.third, template[thirdSlot]);
    availableSlots.delete(thirdSlot);

    const remainingDogs = [1, 2, 3, 4, 5, 6].filter(
      (dog) => dog !== result.first && dog !== result.second && dog !== result.third,
    );
    this.shuffleInPlace(remainingDogs, rng);

    const remainingSlots = Array.from(availableSlots).sort((a, b) => a - b);
    for (let index = 0; index < remainingDogs.length; index++) {
      assignment.set(remainingDogs[index], template[remainingSlots[index]]);
    }

    const probabilities = Array.from({ length: 6 }, (_, index) => assignment.get(index + 1) ?? 0);
    return this.projectProbabilities(probabilities);
  }

  private generateTemplate(rng: RandomFn) {
    const p1 = 0.22 + 0.06 * rng();
    const p2 = 0.16 + 0.05 * rng();
    const p3 = 0.13 + 0.04 * rng();
    const p4 = 0.1 + 0.03 * rng();
    const p5 = 0.08 + 0.03 * rng();
    const p6 = 1 - (p1 + p2 + p3 + p4 + p5);

    return this.projectProbabilities([p1, p2, p3, p4, p5, p6]).sort((a, b) => b - a);
  }

  private buildWinnerMarket(probabilities: number[]): WinnerOddsRow[] {
    return probabilities.map((probability, index) => ({
      dog: index + 1,
      probability,
      probabilityPct: this.round(probability * 100, 4),
      odds: this.round(0.9 / probability, 4),
    }));
  }

  private buildExactaMarket(probabilities: number[]) {
    const rows: Array<{ selection: string; probability: number; odds: number }> = [];

    for (let a = 0; a < probabilities.length; a++) {
      for (let b = 0; b < probabilities.length; b++) {
        if (a === b) continue;

        const probability = probabilities[a] * (probabilities[b] / (1 - probabilities[a]));
        rows.push({
          selection: `${a + 1}-${b + 1}`,
          probability,
          odds: this.round(0.85 / probability, 4),
        });
      }
    }

    return rows;
  }

  private buildTrifectaMarket(probabilities: number[]) {
    const rows: Array<{ selection: string; probability: number; odds: number }> = [];

    for (let a = 0; a < probabilities.length; a++) {
      for (let b = 0; b < probabilities.length; b++) {
        if (a === b) continue;

        for (let c = 0; c < probabilities.length; c++) {
          if (c === a || c === b) continue;

          const probability =
            probabilities[a] *
            (probabilities[b] / (1 - probabilities[a])) *
            (probabilities[c] / (1 - probabilities[a] - probabilities[b]));

          rows.push({
            selection: `${a + 1}-${b + 1}-${c + 1}`,
            probability,
            odds: this.round(0.8 / probability, 4),
          });
        }
      }
    }

    return rows;
  }

  private projectProbabilities(rawProbabilities: number[]) {
    const fixed = Array<number | null>(rawProbabilities.length).fill(null);
    const weights = [...rawProbabilities];

    while (true) {
      const freeIndexes = fixed.flatMap((value, index) => (value === null ? [index] : []));
      if (freeIndexes.length === 0) break;

      const fixedMass = fixed.reduce((sum, value) => sum + (value ?? 0), 0);
      const totalWeight = freeIndexes.reduce((sum, index) => sum + weights[index], 0);
      const provisional = new Map<number, number>();

      for (const index of freeIndexes) {
        const value =
          totalWeight <= 0
            ? (1 - fixedMass) / freeIndexes.length
            : ((1 - fixedMass) * weights[index]) / totalWeight;
        provisional.set(index, value);
      }

      let changed = false;
      for (const index of freeIndexes) {
        const value = provisional.get(index) ?? 0;
        if (value < this.probabilityMin) {
          fixed[index] = this.probabilityMin;
          changed = true;
        } else if (value > this.probabilityMax) {
          fixed[index] = this.probabilityMax;
          changed = true;
        }
      }

      if (!changed) {
        for (const index of freeIndexes) {
          fixed[index] = provisional.get(index) ?? 0;
        }
        break;
      }
    }

    const projected = fixed.map((value) => value ?? 0);
    const total = projected.reduce((sum, value) => sum + value, 0);
    return projected.map((value) => value / total);
  }

  private pickSlot(rng: RandomFn, preferredSlots: number[], availableSlots: Set<number>) {
    for (const slot of preferredSlots) {
      if (availableSlots.has(slot)) {
        return slot;
      }
    }

    const remaining = Array.from(availableSlots).sort((a, b) => a - b);
    return remaining[Math.floor(rng() * remaining.length)];
  }

  private shuffleInPlace(values: number[], rng: RandomFn) {
    for (let index = values.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(rng() * (index + 1));
      [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
    }
  }

  private parseTopThree(resultado: string) {
    const positions = resultado
      .split('-')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 6);

    if (positions.length < 3) {
      throw new BadRequestException('resultado inválido para generar virtual odds');
    }

    return {
      first: positions[0],
      second: positions[1],
      third: positions[2],
    };
  }

  private createRng(seed: string): RandomFn {
    const hash = createHash('sha256').update(seed).digest();
    let state = hash.readUInt32BE(0) || 1;

    return () => {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private toDecimal(value: number) {
    return new Prisma.Decimal(value.toFixed(4));
  }

  private round(value: number, decimals: number) {
    return Number(value.toFixed(decimals));
  }
}
