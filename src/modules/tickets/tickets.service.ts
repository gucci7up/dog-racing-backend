import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BetType, Prisma, Ticket, TicketStatus, RaceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    raceId: string;
    userId: string;
    details: Array<{
      betType: BetType;
      selection: string;
      amount: string;
      odds: string;
    }>;
  }) {
    if (params.details.length === 0) throw new BadRequestException('ticket sin detalles');

    const race = await this.prisma.race.findUnique({
      where: { id: params.raceId },
      select: { id: true, status: true },
    });
    if (!race) throw new NotFoundException('race no encontrada');
    if (race.status !== RaceStatus.OPEN) throw new BadRequestException('race no está abierta');

    const computedDetails = params.details.map((d) => {
      let amount: Prisma.Decimal;
      let odds: Prisma.Decimal;
      try {
        amount = new Prisma.Decimal(d.amount);
        odds = new Prisma.Decimal(d.odds);
      } catch {
        throw new BadRequestException('amount u odds inválido');
      }

      if (amount.lte(0)) throw new BadRequestException('amount debe ser > 0');
      if (odds.lte(0)) throw new BadRequestException('odds debe ser > 0');

      const potentialPrize = amount.mul(odds);
      return {
        betType: d.betType,
        selection: d.selection,
        amount,
        odds,
        potentialPrize,
      };
    });

    const totalAmount = computedDetails.reduce(
      (acc, d) => acc.add(d.amount),
      new Prisma.Decimal(0),
    );

    return this.prisma.$transaction(async (tx) => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const last = await tx.ticket.findFirst({
          orderBy: { ticketNumber: 'desc' },
          select: { ticketNumber: true },
        });
        const nextNumber = (last?.ticketNumber ?? 0) + 1;

        try {
          const ticket = await tx.ticket.create({
            data: {
              ticketNumber: nextNumber,
              totalAmount,
              status: TicketStatus.PENDING,
              user: { connect: { id: params.userId } },
              race: { connect: { id: params.raceId } },
              details: {
                create: computedDetails.map((d) => ({
                  betType: d.betType,
                  selection: d.selection,
                  amount: d.amount,
                  odds: d.odds,
                  potentialPrize: d.potentialPrize,
                })),
              },
            },
            include: {
              details: true,
              user: { select: { id: true, username: true, email: true, role: true } },
              race: true,
            },
          });

          return ticket;
        } catch (err) {
          const prismaError = err as { code?: string };
          if (prismaError.code === 'P2002') continue;
          throw err;
        }
      }
      throw new BadRequestException('no se pudo asignar ticketNumber');
    });
  }

  async findAll() {
    return this.prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        details: true,
        user: { select: { id: true, username: true, email: true, role: true } },
        race: true,
      },
    });
  }

  async findById(id: string): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        details: true,
        user: { select: { id: true, username: true, email: true, role: true } },
        race: true,
      },
    });
    if (!ticket) throw new NotFoundException('ticket no encontrado');
    return ticket;
  }

  async findByRaceId(raceId: string) {
    return this.prisma.ticket.findMany({
      where: { raceId },
      orderBy: { createdAt: 'desc' },
      include: {
        details: true,
        user: { select: { id: true, username: true, email: true, role: true } },
        race: true,
      },
    });
  }

  async findByTicketNumber(ticketNumber: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        details: true,
        user: { select: { id: true, username: true, email: true, role: true } },
        race: true,
      },
    });
    if (!ticket) throw new NotFoundException('ticket no encontrado');
    return ticket;
  }
}
