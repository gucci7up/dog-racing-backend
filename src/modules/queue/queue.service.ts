import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService) {}

  async initializeQueue() {
    return this.prisma.$transaction(async (tx) => this.rebuildQueueTx(tx, false));
  }

  async getNextVideo() {
    return this.prisma.$transaction(async (tx) => {
      let state = await this.ensureStateTx(tx);

      let entry = await tx.videoQueue.findFirst({
        where: { used: false },
        orderBy: { position: 'asc' },
        select: { id: true, videoId: true, position: true },
      });

      if (!entry) {
        state = await this.rebuildQueueTx(tx, true);
        entry = await tx.videoQueue.findFirst({
          where: { used: false },
          orderBy: { position: 'asc' },
          select: { id: true, videoId: true, position: true },
        });
      }

      if (!entry) throw new BadRequestException('cola vacía');

      const updated = await tx.videoQueue.updateMany({
        where: { id: entry.id, used: false },
        data: { used: true },
      });

      if (updated.count !== 1) throw new BadRequestException('no se pudo obtener el siguiente video');

      const video = await tx.video.findUnique({ where: { id: entry.videoId } });
      if (!video) throw new BadRequestException('video no encontrado');

      await tx.queueState.update({
        where: { id: state.id },
        data: { currentPosition: entry.position },
      });

      return { position: entry.position, cycleNumber: state.cycleNumber, video };
    });
  }

  async resetQueue() {
    return this.prisma.$transaction(async (tx) => this.rebuildQueueTx(tx, true));
  }

  async rebuildQueue() {
    return this.prisma.$transaction(async (tx) => this.rebuildQueueTx(tx, true));
  }

  async status() {
    const state = await this.prisma.$transaction(async (tx) => this.ensureStateTx(tx));

    const [remainingVideos, nextEntry] = await Promise.all([
      this.prisma.videoQueue.count({ where: { used: false } }),
      this.prisma.videoQueue.findFirst({
        where: { used: false },
        orderBy: { position: 'asc' },
        select: { position: true, videoId: true },
      }),
    ]);

    const nextVideo = nextEntry
      ? await this.prisma.video.findUnique({ where: { id: nextEntry.videoId } })
      : null;

    return {
      currentPosition: state.currentPosition,
      remainingVideos,
      cycleNumber: state.cycleNumber,
      nextVideo,
    };
  }

  private async ensureStateTx(tx: Prisma.TransactionClient) {
    const existing = await tx.queueState.findFirst();
    if (existing) return existing;
    return tx.queueState.create({
      data: { currentPosition: 0, cycleNumber: 1 },
    });
  }

  private async rebuildQueueTx(tx: Prisma.TransactionClient, incrementCycle: boolean) {
    const videos = await tx.video.findMany({
      where: { activo: true },
      orderBy: { createdAt: 'asc' },
    });

    if (videos.length === 0) throw new BadRequestException('no hay videos activos');

    const shuffled = this.shuffle(videos);

    await tx.videoQueue.deleteMany();
    await tx.videoQueue.createMany({
      data: shuffled.map((video, index) => ({
        videoId: video.id,
        position: index + 1,
        used: false,
      })),
    });

    const state = await this.ensureStateTx(tx);
    const nextCycle = incrementCycle ? state.cycleNumber + 1 : state.cycleNumber;

    return tx.queueState.update({
      where: { id: state.id },
      data: {
        currentPosition: 0,
        cycleNumber: nextCycle,
      },
    });
  }

  private shuffle<T>(items: T[]): T[] {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
