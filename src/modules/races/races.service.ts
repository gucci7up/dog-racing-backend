import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Race } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    numero: number;
    videoId: string;
    resultado: string;
    status?: Prisma.RaceCreateInput['status'];
    openAt?: Date | null;
    closeAt?: Date | null;
    runAt?: Date | null;
    finishedAt?: Date | null;
  }) {
    const video = await this.prisma.video.findUnique({ where: { id: params.videoId } });
    if (!video) throw new BadRequestException('videoId inválido');

    try {
      return await this.prisma.race.create({
        data: {
          numero: params.numero,
          resultado: params.resultado,
          status: params.status,
          openAt: params.openAt ?? undefined,
          closeAt: params.closeAt ?? undefined,
          runAt: params.runAt ?? undefined,
          finishedAt: params.finishedAt ?? undefined,
          video: { connect: { id: params.videoId } },
        },
        include: { video: true },
      });
    } catch (err) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2002') throw new BadRequestException('numero ya existe');
      throw err;
    }
  }

  async findAll(params?: { status?: Prisma.RaceWhereInput['status']; videoId?: string }) {
    const where: Prisma.RaceWhereInput = {};
    if (params?.status) where.status = params.status;
    if (params?.videoId) where.videoId = params.videoId;

    return this.prisma.race.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { video: true },
    });
  }

  async findOne(id: string): Promise<Race> {
    const race = await this.prisma.race.findUnique({
      where: { id },
      include: { video: true },
    });
    if (!race) throw new NotFoundException('race no encontrada');
    return race;
  }

  async update(
    id: string,
    data: {
      numero?: number;
      videoId?: string;
      resultado?: string;
      status?: Prisma.RaceUpdateInput['status'];
      openAt?: Date | null;
      closeAt?: Date | null;
      runAt?: Date | null;
      finishedAt?: Date | null;
    },
  ) {
    await this.findOne(id);

    if (data.videoId) {
      const video = await this.prisma.video.findUnique({ where: { id: data.videoId } });
      if (!video) throw new BadRequestException('videoId inválido');
    }

    try {
      return await this.prisma.race.update({
        where: { id },
        data: {
          numero: data.numero,
          resultado: data.resultado,
          status: data.status,
          openAt: data.openAt ?? undefined,
          closeAt: data.closeAt ?? undefined,
          runAt: data.runAt ?? undefined,
          finishedAt: data.finishedAt ?? undefined,
          ...(data.videoId ? { video: { connect: { id: data.videoId } } } : {}),
        },
        include: { video: true },
      });
    } catch (err) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2002') throw new BadRequestException('numero ya existe');
      throw err;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.race.delete({ where: { id } });
  }
}
