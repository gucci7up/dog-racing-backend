import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Agency, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AgencyCreateInput): Promise<Agency> {
    try {
      return await this.prisma.agency.create({ data });
    } catch (err) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2002') {
        throw new BadRequestException('name o code ya existe');
      }
      throw err;
    }
  }

  async findAll() {
    return this.prisma.agency.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Agency> {
    const agency = await this.prisma.agency.findUnique({ where: { id } });
    if (!agency) throw new NotFoundException('agency no encontrada');
    return agency;
  }

  async update(id: string, data: Prisma.AgencyUpdateInput) {
    await this.findOne(id);

    try {
      return await this.prisma.agency.update({
        where: { id },
        data,
      });
    } catch (err) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2002') {
        throw new BadRequestException('name o code ya existe');
      }
      throw err;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.agency.delete({ where: { id } });
  }
}
