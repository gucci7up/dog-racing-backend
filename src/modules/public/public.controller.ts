import { Controller, Get, NotFoundException, Param, Res, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus } from '@prisma/client';
import type { Response } from 'express';
import QRCode from 'qrcode';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Consultar ticket públicamente por token' })
  @Get('tickets/:publicToken')
  async getTicket(@Param('publicToken') publicToken: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { publicToken },
      include: {
        details: true,
        race: true,
        user: {
          select: {
            id: true,
            agency: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('ticket no encontrado');

    const paid = ticket.status === TicketStatus.PAID;

    return {
      ticketNumber: ticket.ticketNumber,
      agency: ticket.user.agency,
      raceNumber: ticket.race.numero,
      status: ticket.status,
      createdAt: ticket.createdAt,
      details: ticket.details,
      resultado: ticket.race.resultado,
      prizeAmount: null,
      paid,
      paidAt: null,
    };
  }

  @ApiProduces('image/png')
  @ApiOperation({ summary: 'Generar QR del ticket público (PNG)' })
  @Get('tickets/:publicToken/qr')
  async getTicketQr(
    @Param('publicToken') publicToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { publicToken },
      select: { publicToken: true },
    });
    if (!ticket) throw new NotFoundException('ticket no encontrado');

    const publicBaseUrl =
      this.configService.get<string>('publicBaseUrl', { infer: true }) ??
      `http://localhost:${this.configService.get<number>('port', { infer: true }) ?? 3000}`;

    const url = `${publicBaseUrl.replace(/\/$/, '')}/public/tickets/${ticket.publicToken}`;
    const buffer = await QRCode.toBuffer(url, { type: 'png', width: 320, margin: 2 });

    res.setHeader('Content-Type', 'image/png');
    return new StreamableFile(buffer);
  }
}
