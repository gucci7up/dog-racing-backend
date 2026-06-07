import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BetType, Prisma, RaceStatus, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RaceSettlementService {
  constructor(private readonly prisma: PrismaService) {}

  async settleRace(params: { raceId: string }) {
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

      const oddsRows = await tx.raceOdds.findMany({
        where: {
          raceId: race.id,
          OR: [
            { betType: BetType.WINNER, selection: winners.winner },
            { betType: BetType.EXACTA, selection: winners.exacta },
            { betType: BetType.TRIFECTA, selection: winners.trifecta },
          ],
        },
        select: { betType: true, selection: true, finalOdds: true, currentOdds: true },
      });

      const oddsByKey = new Map<string, Prisma.Decimal>();
      for (const row of oddsRows) {
        oddsByKey.set(`${row.betType}:${row.selection}`, row.finalOdds ?? row.currentOdds);
      }

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
        if (ticket.status === TicketStatus.CANCELLED) continue;

        const ticketPrize = this.calculateTicketPrize(ticket.details, winners, oddsByKey);
        const hasWin = ticketPrize.gt(0);

        if (ticket.status === TicketStatus.PAID) {
          await tx.ticket.update({
            where: { id: ticket.id },
            data: { prizeAmount: ticketPrize },
          });
          ticketsGanadores++;
          montoPremios = montoPremios.add(ticketPrize);
          continue;
        }

        if (hasWin) {
          await tx.ticket.update({
            where: { id: ticket.id },
            data: { status: TicketStatus.WON, prizeAmount: ticketPrize },
          });
          ticketsGanadores++;
          montoPremios = montoPremios.add(ticketPrize);
        } else {
          await tx.ticket.update({
            where: { id: ticket.id },
            data: { status: TicketStatus.LOST, prizeAmount: new Prisma.Decimal(0) },
          });
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
      this.prisma.ticket.count({ where: { raceId: race.id, status: { in: [TicketStatus.WON, TicketStatus.PAID] } } }),
      this.prisma.ticket.count({ where: { raceId: race.id, status: TicketStatus.LOST } }),
      this.prisma.ticket.aggregate({
        where: { raceId: race.id, status: { in: [TicketStatus.WON, TicketStatus.PAID] } },
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

  private calculateTicketPrize(
    details: Array<{ betType: BetType; selection: string; amount: Prisma.Decimal }>,
    winners: { winner: string; exacta: string; trifecta: string },
    oddsByKey: Map<string, Prisma.Decimal>,
  ) {
    let total = new Prisma.Decimal(0);

    for (const d of details) {
      const isWinner =
        (d.betType === BetType.WINNER && d.selection === winners.winner) ||
        (d.betType === BetType.EXACTA && d.selection === winners.exacta) ||
        (d.betType === BetType.TRIFECTA && d.selection === winners.trifecta);

      if (!isWinner) continue;

      const key = `${d.betType}:${d.selection}`;
      const odds = oddsByKey.get(key);
      if (!odds) {
        throw new BadRequestException('finalOdds no disponibles para liquidación');
      }

      total = total.add(d.amount.mul(odds));
    }

    return total;
  }
}
