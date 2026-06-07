import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bet, BetStatus, Prisma, RaceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(params: {
    raceId: string;
    userId: string;
    tipo: Prisma.BetCreateInput['tipo'];
    combinacion: string;
    monto: string;
  }) {
    const minAmount = this.configService.getOrThrow<number>('betMinAmount', { infer: true });

    let amount: Prisma.Decimal;
    try {
      amount = new Prisma.Decimal(params.monto);
    } catch {
      throw new BadRequestException('monto inválido');
    }

    const min = new Prisma.Decimal(minAmount);
    if (amount.lessThan(min)) {
      throw new BadRequestException(`monto mínimo: ${minAmount}`);
    }

    const race = await this.prisma.race.findUnique({
      where: { id: params.raceId },
      select: { id: true, status: true },
    });
    if (!race) throw new NotFoundException('race no encontrada');
    if (race.status !== RaceStatus.OPEN) throw new BadRequestException('race no está abierta');

    return this.prisma.bet.create({
      data: {
        tipo: params.tipo,
        combinacion: params.combinacion,
        monto: amount,
        estado: BetStatus.PENDING,
        user: { connect: { id: params.userId } },
        race: { connect: { id: params.raceId } },
      },
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
        race: true,
      },
    });
  }

  async findAll() {
    return this.prisma.bet.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
        race: true,
      },
    });
  }

  async findById(id: string): Promise<Bet> {
    const bet = await this.prisma.bet.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
        race: true,
      },
    });
    if (!bet) throw new NotFoundException('bet no encontrada');
    return bet;
  }

  async findByRaceId(raceId: string) {
    return this.prisma.bet.findMany({
      where: { raceId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
        race: true,
      },
    });
  }
}
