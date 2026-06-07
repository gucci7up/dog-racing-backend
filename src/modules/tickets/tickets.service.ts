import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt, randomUUID } from 'crypto';
import { BetType, Prisma, RaceStatus, Role, Ticket, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OddsEngineService } from '../odds/odds-engine/odds-engine.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oddsEngine: OddsEngineService,
  ) {}

  async payTicket(params: { ticketId: string; paidBy: string }) {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const payer = await tx.user.findUnique({
        where: { id: params.paidBy },
        select: { id: true, role: true, agencyId: true },
      });
      if (!payer) throw new NotFoundException('usuario no encontrado');
      if (!payer.agencyId) throw new BadRequestException('usuario sin agency');

      const ticket = await tx.ticket.findUnique({
        where: { id: params.ticketId },
        include: {
          details: true,
          race: true,
          user: { select: { id: true, username: true, email: true, role: true, agencyId: true } },
        },
      });
      if (!ticket) throw new NotFoundException('ticket no encontrado');

      if (ticket.status !== TicketStatus.WON) {
        throw new BadRequestException('solo tickets WON pueden pagarse');
      }
      if (ticket.paidAt) {
        throw new BadRequestException('ticket ya fue pagado');
      }
      if (!ticket.user.agencyId) {
        throw new BadRequestException('ticket sin agency asociada');
      }
      if (ticket.user.agencyId !== payer.agencyId) {
        throw new BadRequestException('solo la misma agency puede pagarlo');
      }

      return tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.PAID,
          paidAt: now,
          paidBy: payer.id,
        },
        include: {
          details: true,
          race: true,
          user: { select: { id: true, username: true, email: true, role: true, agencyId: true } },
        },
      });
    });
  }

  async findWinners() {
    return this.prisma.ticket.findMany({
      where: { status: TicketStatus.WON },
      orderBy: { createdAt: 'desc' },
      include: {
        details: true,
        user: { select: { id: true, username: true, email: true, role: true, agencyId: true } },
        race: true,
      },
    });
  }

  async findPendingPayment() {
    return this.prisma.ticket.findMany({
      where: { status: TicketStatus.WON },
      orderBy: { createdAt: 'desc' },
      include: {
        details: true,
        user: { select: { id: true, username: true, email: true, role: true, agencyId: true } },
        race: true,
      },
    });
  }

  async findPaid() {
    return this.prisma.ticket.findMany({
      where: { status: TicketStatus.PAID },
      orderBy: { paidAt: 'desc' },
      include: {
        details: true,
        user: { select: { id: true, username: true, email: true, role: true, agencyId: true } },
        race: true,
      },
    });
  }

  async createCancellationCode(params: { createdBy: string }) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 1000);

    for (let attempt = 0; attempt < 10; attempt++) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      try {
        const row = await this.prisma.ticketCancellationCode.create({
          data: {
            code,
            expiresAt,
            used: false,
            createdBy: params.createdBy,
          },
          select: { id: true, code: true, expiresAt: true, used: true, createdAt: true },
        });
        return row;
      } catch (err) {
        const prismaError = err as { code?: string };
        if (prismaError.code === 'P2002') continue;
        throw err;
      }
    }

    throw new BadRequestException('no se pudo generar código');
  }

  async cancelTicket(params: {
    ticketId: string;
    cancelledBy: string;
    role: Role;
    reason: string;
    code?: string;
  }) {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: params.ticketId },
        include: {
          details: true,
          user: { select: { id: true, username: true, email: true, role: true } },
          race: true,
        },
      });

      if (!ticket) throw new NotFoundException('ticket no encontrado');
      if (ticket.race.status !== RaceStatus.OPEN) {
        throw new BadRequestException('solo se puede anular en carreras OPEN');
      }
      if (ticket.status === TicketStatus.CANCELLED) {
        throw new BadRequestException('ticket ya está anulado');
      }
      if (ticket.status !== TicketStatus.PENDING) {
        throw new BadRequestException('solo se puede anular tickets PENDING');
      }

      if (params.role !== Role.ADMIN) {
        if (!params.code) throw new BadRequestException('code requerido');
        const updated = await tx.ticketCancellationCode.updateMany({
          where: {
            code: params.code,
            used: false,
            expiresAt: { gt: now },
          },
          data: {
            used: true,
            usedAt: now,
          },
        });
        if (updated.count === 0) throw new BadRequestException('code inválido o expirado');
      }

      const cancelled = await tx.ticket.update({
        where: { id: params.ticketId },
        data: {
          status: TicketStatus.CANCELLED,
          cancelledAt: now,
          cancelledBy: params.cancelledBy,
          cancelReason: params.reason,
        },
        include: {
          details: true,
          user: { select: { id: true, username: true, email: true, role: true } },
          race: true,
        },
      });

      return cancelled;
    });
  }

  async findCancelled() {
    return this.prisma.ticket.findMany({
      where: { status: TicketStatus.CANCELLED },
      orderBy: { cancelledAt: 'desc' },
      include: {
        details: true,
        user: { select: { id: true, username: true, email: true, role: true } },
        race: true,
      },
    });
  }

  async getTicketResult(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        details: true,
        race: true,
        user: { select: { id: true, username: true, email: true, role: true } },
      },
    });
    if (!ticket) throw new NotFoundException('ticket no encontrado');

    const winners = this.getWinningSelections(ticket.race.resultado);
    const { wonAmount, lostAmount, winningDetails } = this.calculateTicketOutcome(ticket.details, winners);

    return {
      ticket,
      estado: ticket.status,
      premio: wonAmount,
      wonAmount,
      lostAmount,
      detalleGanador: winningDetails[0] ?? null,
    };
  }

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
              publicToken: randomUUID(),
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

          await this.oddsEngine.applyTicketDetails(
            {
              raceId: params.raceId,
              details: computedDetails.map((d) => ({
                betType: d.betType,
                selection: d.selection,
                amount: d.amount,
              })),
            },
            tx,
          );

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

  private getWinningSelections(resultado: string) {
    const parts = resultado
      .split('-')
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length < 3) throw new BadRequestException('resultado inválido');

    const winner = parts[0]!;
    const exacta = `${parts[0]}-${parts[1]}`;
    const trifecta = `${parts[0]}-${parts[1]}-${parts[2]}`;

    return { winner, exacta, trifecta };
  }

  private calculateTicketOutcome(
    details: Array<{ betType: BetType; selection: string; amount: Prisma.Decimal; odds: Prisma.Decimal }>,
    winners: { winner: string; exacta: string; trifecta: string },
  ) {
    let wonAmount = new Prisma.Decimal(0);
    let lostAmount = new Prisma.Decimal(0);
    const winningDetails: Array<{
      betType: BetType;
      selection: string;
      amount: Prisma.Decimal;
      odds: Prisma.Decimal;
      prize: Prisma.Decimal;
    }> = [];

    for (const d of details) {
      const isWinner =
        (d.betType === BetType.WINNER && d.selection === winners.winner) ||
        (d.betType === BetType.EXACTA && d.selection === winners.exacta) ||
        (d.betType === BetType.TRIFECTA && d.selection === winners.trifecta);

      if (isWinner) {
        const prize = d.amount.mul(d.odds);
        wonAmount = wonAmount.add(prize);
        winningDetails.push({ betType: d.betType, selection: d.selection, amount: d.amount, odds: d.odds, prize });
      } else {
        lostAmount = lostAmount.add(d.amount);
      }
    }

    return { wonAmount, lostAmount, winningDetails };
  }
}
