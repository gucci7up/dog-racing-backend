import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdWithAgency(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { agency: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async assignAgencyToCashier(params: { userId: string; agencyId: string }) {
    const [user, agency] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: params.userId } }),
      this.prisma.agency.findUnique({ where: { id: params.agencyId } }),
    ]);

    if (!agency) throw new NotFoundException('agency no encontrada');
    if (!user) throw new NotFoundException('usuario no encontrado');
    if (user.role !== Role.CASHIER) throw new BadRequestException('solo usuarios CASHIER pueden pertenecer a una agency');

    return this.prisma.user.update({
      where: { id: params.userId },
      data: { agencyId: params.agencyId },
      include: { agency: true },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await this.prisma.user.create({ data });
    } catch (err) {
      const prismaError = err as { code?: string };
      if (prismaError.code === 'P2002') {
        throw new BadRequestException('username o email ya existe');
      }
      throw err;
    }
  }
}
