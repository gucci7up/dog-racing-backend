import { BadRequestException, Injectable } from '@nestjs/common';
import { BetType, Prisma, RaceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OddsEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async initializeForRace(raceId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    const race = await client.race.findUnique({ where: { id: raceId }, select: { id: true } });
    if (!race) throw new BadRequestException('race inválida');

    const existingCount = await client.raceOdds.count({ where: { raceId } });
    if (existingCount > 0) return { count: existingCount };

    const selections = [
      ...this.generateWinnerSelections(),
      ...this.generateExactaSelections(),
      ...this.generateTrifectaSelections(),
    ];

    await client.raceOdds.createMany({
      data: selections.map((s) => ({
        raceId,
        betType: s.betType,
        selection: s.selection,
        totalAmount: new Prisma.Decimal(0),
        currentOdds: new Prisma.Decimal(1),
      })),
    });

    return { count: selections.length };
  }

  async applyTicketDetail(params: {
    raceId: string;
    betType: BetType;
    selection: string;
    amount: Prisma.Decimal;
    tx?: Prisma.TransactionClient;
  }) {
    await this.applyTicketDetails(
      {
        raceId: params.raceId,
        details: [{ betType: params.betType, selection: params.selection, amount: params.amount }],
      },
      params.tx,
    );
  }

  async applyTicketDetails(
    params: {
      raceId: string;
      details: Array<{ betType: BetType; selection: string; amount: Prisma.Decimal }>;
    },
    tx?: Prisma.TransactionClient,
  ) {
    if (params.details.length === 0) return;

    const applyInTx = async (client: Prisma.TransactionClient) => {
      const race = await client.race.findUnique({
        where: { id: params.raceId },
        select: { status: true },
      });
      if (!race) throw new BadRequestException('race inválida');
      if (race.status !== RaceStatus.OPEN) return;

      for (const detail of params.details) {
        const updated = await client.raceOdds.updateMany({
          where: {
            raceId: params.raceId,
            betType: detail.betType,
            selection: detail.selection,
            finalOdds: null,
          },
          data: {
            totalAmount: { increment: detail.amount },
          },
        });

        if (updated.count === 0) {
          throw new BadRequestException('selección inválida');
        }
      }
    };

    if (tx) {
      await applyInTx(tx);
      return;
    }

    await this.prisma.$transaction(async (innerTx) => applyInTx(innerTx));
  }

  async finalizeRace(raceId: string, tx?: Prisma.TransactionClient) {
    const finalizeInTx = async (client: Prisma.TransactionClient) => {
      const rows = await client.raceOdds.findMany({
        where: { raceId, finalOdds: null },
        select: { id: true, currentOdds: true },
      });

      for (const row of rows) {
        await client.raceOdds.update({
          where: { id: row.id },
          data: { finalOdds: row.currentOdds },
        });
      }
    };

    if (tx) {
      await finalizeInTx(tx);
      return;
    }

    await this.prisma.$transaction(async (innerTx) => finalizeInTx(innerTx));
  }

  async getRaceOdds(raceId: string) {
    const rows = await this.prisma.raceOdds.findMany({
      where: { raceId },
      orderBy: [{ betType: 'asc' }, { selection: 'asc' }],
    });

    return rows.map((r) => ({
      ...r,
      odds: r.finalOdds ?? r.currentOdds,
    }));
  }

  async getRaceOddsLive(raceId: string) {
    return this.prisma.raceOdds.findMany({
      where: { raceId },
      orderBy: [{ betType: 'asc' }, { selection: 'asc' }],
    });
  }

  private generateWinnerSelections() {
    return Array.from({ length: 6 }, (_, i) => ({
      betType: BetType.WINNER,
      selection: String(i + 1),
    }));
  }

  private generateExactaSelections() {
    const selections: Array<{ betType: BetType; selection: string }> = [];
    for (let a = 1; a <= 6; a++) {
      for (let b = 1; b <= 6; b++) {
        if (a === b) continue;
        selections.push({ betType: BetType.EXACTA, selection: `${a}-${b}` });
      }
    }
    return selections;
  }

  private generateTrifectaSelections() {
    const selections: Array<{ betType: BetType; selection: string }> = [];
    for (let a = 1; a <= 6; a++) {
      for (let b = 1; b <= 6; b++) {
        if (b === a) continue;
        for (let c = 1; c <= 6; c++) {
          if (c === a || c === b) continue;
          selections.push({ betType: BetType.TRIFECTA, selection: `${a}-${b}-${c}` });
        }
      }
    }
    return selections;
  }
}
