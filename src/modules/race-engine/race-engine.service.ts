import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RaceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OddsEngineService } from '../odds/odds-engine/odds-engine.service';
import { QueueService } from '../queue/queue.service';
import { RaceSettlementService } from '../race-settlement/race-settlement.service';

@Injectable()
export class RaceEngineService {
  private readonly saleSeconds = 5 * 60;
  private readonly videoSeconds = 60;
  private isTickRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly oddsEngine: OddsEngineService,
    private readonly raceSettlement: RaceSettlementService,
  ) {}

  @Interval(1000)
  async tick() {
    if (this.isTickRunning) return;
    this.isTickRunning = true;
    try {
      const currentRace = await this.getCurrentRace();
      if (!currentRace) {
        await this.createNextRace();
        return;
      }

      if (currentRace.status === RaceStatus.OPEN) {
        const now = new Date();
        const saleStartAt = currentRace.saleStartAt ?? now;
        const saleEndAt = currentRace.saleEndAt ?? new Date(saleStartAt.getTime() + this.saleSeconds * 1000);

        if (!currentRace.saleStartAt || !currentRace.saleEndAt) {
          await this.prisma.race.update({
            where: { id: currentRace.id },
            data: {
              saleStartAt,
              saleEndAt,
              openAt: currentRace.openAt ?? saleStartAt,
              closeAt: currentRace.closeAt ?? saleEndAt,
            },
          });
        }

        if (now.getTime() >= saleEndAt.getTime()) {
          await this.closeRace(currentRace.id);
        }

        return;
      }

      if (currentRace.status === RaceStatus.CLOSED) {
        await this.startRace(currentRace.id);
        return;
      }

      if (currentRace.status === RaceStatus.RUNNING) {
        if (!currentRace.videoStartedAt) {
          await this.prisma.race.update({
            where: { id: currentRace.id },
            data: {
              videoStartedAt: new Date(),
              runAt: currentRace.runAt ?? new Date(),
            },
          });
          return;
        }

        const elapsed = Math.floor((Date.now() - currentRace.videoStartedAt.getTime()) / 1000);
        if (elapsed >= this.videoSeconds) {
          await this.finishRace(currentRace.id);
        }
      }
    } finally {
      this.isTickRunning = false;
    }
  }

  async createNextRace() {
    const { video } = await this.queueService.getNextVideo();

    const lastRace = await this.prisma.race.findFirst({
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const nextNumero = (lastRace?.numero ?? 0) + 1;

    const now = new Date();
    const saleStartAt = now;
    const saleEndAt = new Date(now.getTime() + this.saleSeconds * 1000);

    const race = await this.prisma.$transaction(async (tx) => {
      const created = await tx.race.create({
        data: {
          numero: nextNumero,
          video: { connect: { id: video.id } },
          resultado: video.resultado,
          status: RaceStatus.OPEN,
          openAt: now,
          closeAt: saleEndAt,
          saleStartAt,
          saleEndAt,
        },
        include: { video: true },
      });

      await this.oddsEngine.initializeForRace(created.id, tx);

      return created;
    });

    return race;
  }

  async closeRace(raceId: string) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const race = await tx.race.update({
        where: { id: raceId },
        data: {
          status: RaceStatus.CLOSED,
          closeAt: now,
          saleEndAt: now,
        },
        include: { video: true },
      });

      await this.oddsEngine.finalizeRace(raceId, tx);

      return race;
    });
  }

  async startRace(raceId: string) {
    const now = new Date();
    return this.prisma.race.update({
      where: { id: raceId },
      data: {
        status: RaceStatus.RUNNING,
        runAt: now,
        videoStartedAt: now,
      },
      include: { video: true },
    });
  }

  async finishRace(raceId: string) {
    const now = new Date();

    const race = await this.prisma.race.update({
      where: { id: raceId },
      data: {
        status: RaceStatus.FINISHED,
        finishedAt: now,
        videoFinishedAt: now,
      },
      include: { video: true },
    });

    await this.calculatePrizes(race.id);
    await this.createNextRace();

    return race;
  }

  async status() {
    const currentRace = await this.getCurrentRace();
    if (!currentRace) {
      return {
        currentRace: null,
        status: 'IDLE',
        remainingSaleSeconds: null,
        remainingVideoSeconds: null,
      };
    }

    const now = Date.now();

    const remainingSaleSeconds =
      currentRace.status === RaceStatus.OPEN && currentRace.saleEndAt
        ? Math.max(0, Math.ceil((currentRace.saleEndAt.getTime() - now) / 1000))
        : null;

    const remainingVideoSeconds =
      currentRace.status === RaceStatus.RUNNING && currentRace.videoStartedAt
        ? Math.max(0, this.videoSeconds - Math.floor((now - currentRace.videoStartedAt.getTime()) / 1000))
        : null;

    return {
      currentRace,
      status: currentRace.status,
      remainingSaleSeconds,
      remainingVideoSeconds,
    };
  }

  private async getCurrentRace() {
    return this.prisma.race.findFirst({
      where: { status: { in: [RaceStatus.OPEN, RaceStatus.CLOSED, RaceStatus.RUNNING] } },
      orderBy: { createdAt: 'desc' },
      include: { video: true },
    });
  }

  private async calculatePrizes(_raceId: string) {
    await this.raceSettlement.settleRace({ raceId: _raceId });
  }
}
