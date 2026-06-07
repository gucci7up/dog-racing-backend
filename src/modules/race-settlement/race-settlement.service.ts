import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BetType, Prisma, RaceStatus, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RaceSettlementService {
  constructor(private readonly prisma: PrismaService) {}

  async settleRace(params: { raceId: string }) {
    const settledAt = new Date();
    return this.prisma.$transaction(async (tx) => {
      const race = await tx.race.findUnique({
        where: { id: params.raceId },
        select: { id: true, status: true, resultado: true, numero: true },
      });
      if (!race) throw new NotFoundException('race no encontrada');
      if (race.status !== RaceStatus.FINISHED) {
        throw new BadRequestException('solo se puede liquidar cuando la carrera está FINISHED');
      }

      const winners = this.getWinningSelections(race.resultado);

      const tickets = await tx.ticket.findMany({
        where: { raceId: race.id },
        include: {
          details: true,
        },
      });

      let ticketsGanadores = 0;
      let ticketsPerdedores = 0;
      let montoPremios = new Prisma.Decimal(0);

      for (const ticket of tickets) {
        if (
          ticket.status !== TicketStatus.PENDING &&
          ticket.status !== TicketStatus.WON &&
          ticket.status !== TicketStatus.LOST
        )
          continue;

        const { wonAmount } = this.calculateTicketAmounts(ticket.details, winners);
        const nextStatus = wonAmount.gt(0) ? TicketStatus.WON : TicketStatus.LOST;
        const nextPrize = wonAmount;

        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            status: nextStatus,
            prizeAmount: nextPrize,
            winningResult: race.resultado,
            settledAt,
          },
        });

        if (nextStatus === TicketStatus.WON) {
          ticketsGanadores++;
          montoPremios = montoPremios.add(nextPrize);
        } else {
          ticketsPerdedores++;
        }
      }

      return {
        raceId: race.id,
        raceNumber: race.numero,
        winners,
        ticketsGanadores,
        ticketsPerdedores,
        montoPremios,
        cantidadGanadores: ticketsGanadores,
        settledAt,
      };
    });
  }

  async getResults(params: { raceId: string }) {
    const race = await this.prisma.race.findUnique({
      where: { id: params.raceId },
      select: { id: true, numero: true, status: true, resultado: true },
    });
    if (!race) throw new NotFoundException('race no encontrada');

    const [winnersCount, losersCount, sum] = await Promise.all([
      this.prisma.ticket.count({ where: { raceId: race.id, status: TicketStatus.WON } }),
      this.prisma.ticket.count({ where: { raceId: race.id, status: TicketStatus.LOST } }),
      this.prisma.ticket.aggregate({
        where: { raceId: race.id, status: TicketStatus.WON },
        _sum: { prizeAmount: true },
      }),
    ]);

    return {
      raceId: race.id,
      raceNumber: race.numero,
      status: race.status,
      winners: this.getWinningSelections(race.resultado),
      ticketsGanadores: winnersCount,
      ticketsPerdedores: losersCount,
      montoPremios: sum._sum.prizeAmount ?? new Prisma.Decimal(0),
      cantidadGanadores: winnersCount,
    };
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

  private calculateTicketAmounts(
    details: Array<{ betType: BetType; selection: string; amount: Prisma.Decimal; odds: Prisma.Decimal }>,
    winners: { winner: string; exacta: string; trifecta: string },
  ) {
    let wonAmount = new Prisma.Decimal(0);
    let lostAmount = new Prisma.Decimal(0);

    for (const d of details) {
      const isWinner =
        (d.betType === BetType.WINNER && d.selection === winners.winner) ||
        (d.betType === BetType.EXACTA && d.selection === winners.exacta) ||
        (d.betType === BetType.TRIFECTA && d.selection === winners.trifecta);

      if (isWinner) {
        wonAmount = wonAmount.add(d.amount.mul(d.odds));
      } else {
        lostAmount = lostAmount.add(d.amount);
      }
    }

    return { wonAmount, lostAmount };
  }
}
