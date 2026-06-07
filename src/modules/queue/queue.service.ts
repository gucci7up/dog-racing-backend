import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService) {}

  async initializeQueue() {
    const videos = await this.prisma.video.findMany({
      where: { activo: true },
      orderBy: { createdAt: 'asc' },
    });

    if (videos.length === 0) throw new BadRequestException('no hay videos activos');

    const shuffled = this.shuffle(videos);

    await this.prisma.videoQueue.deleteMany();

    await this.prisma.videoQueue.createMany({
      data: shuffled.map((video, index) => ({
        videoId: video.id,
        position: index + 1,
        used: false,
      })),
    });

    return { count: shuffled.length };
  }

  async getNextVideo() {
    return this.prisma.$transaction(async (tx) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        let entry = await tx.videoQueue.findFirst({
          where: { used: false },
          orderBy: { position: 'asc' },
          select: { id: true, videoId: true, position: true },
        });

        if (!entry) {
          await tx.videoQueue.deleteMany();

          const videos = await tx.video.findMany({
            where: { activo: true },
            orderBy: { createdAt: 'asc' },
          });
          if (videos.length === 0) throw new BadRequestException('no hay videos activos');

          const shuffled = this.shuffle(videos);
          await tx.videoQueue.createMany({
            data: shuffled.map((video, index) => ({
              videoId: video.id,
              position: index + 1,
              used: false,
            })),
          });

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

        if (updated.count === 1) {
          const video = await tx.video.findUnique({ where: { id: entry.videoId } });
          if (!video) throw new BadRequestException('video no encontrado');
          return { position: entry.position, video };
        }
      }

      throw new BadRequestException('no se pudo obtener el siguiente video');
    });
  }

  async resetQueue() {
    await this.prisma.videoQueue.deleteMany();
    return this.initializeQueue();
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
