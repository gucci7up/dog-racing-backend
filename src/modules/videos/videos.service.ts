import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Video } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VideosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.VideoCreateInput) {
    try {
      return await this.prisma.video.create({
        data,
        include: { races: true },
      });
    } catch (err) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2002') {
        throw new BadRequestException('nombre ya existe');
      }
      throw err;
    }
  }

  async bulkCreate(items: Array<Pick<Prisma.VideoCreateManyInput, 'nombre' | 'resultado' | 'archivo' | 'activo'>>) {
    try {
      const result = await this.prisma.video.createMany({
        data: items,
        skipDuplicates: true,
      });
      return { insertedCount: result.count };
    } catch (err) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2002') {
        throw new BadRequestException('nombre ya existe');
      }
      throw err;
    }
  }

  async findAll(params?: { activo?: boolean }) {
    const where: Prisma.VideoWhereInput = {};
    if (typeof params?.activo === 'boolean') where.activo = params.activo;

    return this.prisma.video.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { races: true },
    });
  }

  async stats() {
    const [total, active, inactive] = await Promise.all([
      this.prisma.video.count(),
      this.prisma.video.count({ where: { activo: true } }),
      this.prisma.video.count({ where: { activo: false } }),
    ]);

    return { total, active, inactive };
  }

  async findOne(id: string): Promise<Video> {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: { races: true },
    });
    if (!video) throw new NotFoundException('video no encontrado');
    return video;
  }

  async update(id: string, data: Prisma.VideoUpdateInput) {
    await this.findOne(id);

    try {
      return await this.prisma.video.update({
        where: { id },
        data,
        include: { races: true },
      });
    } catch (err) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2002') {
        throw new BadRequestException('nombre ya existe');
      }
      throw err;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.video.delete({ where: { id } });
  }
}
