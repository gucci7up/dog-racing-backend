import { Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CancelTicketDto } from './dto/cancel-ticket.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @ApiOperation({ summary: 'Generar código de anulación (6 dígitos, expira en 2 minutos)' })
  @Post('cancellation-code')
  createCancellationCode(@CurrentUser() user: AuthUser) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('solo ADMIN puede generar código');
    return this.ticketsService.createCancellationCode({ createdBy: user.id });
  }

  @ApiOperation({ summary: 'Crear ticket (solo en carreras OPEN)' })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create({
      raceId: dto.raceId,
      userId: user.id,
      details: dto.details,
    });
  }

  @ApiOperation({ summary: 'Anular ticket (solo mientras la carrera esté OPEN)' })
  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CancelTicketDto,
  ) {
    return this.ticketsService.cancelTicket({
      ticketId: id,
      cancelledBy: user.id,
      role: user.role,
      reason: dto.reason,
      code: dto.code,
    });
  }

  @ApiOperation({ summary: 'Listar tickets' })
  @Get()
  findAll() {
    return this.ticketsService.findAll();
  }

  @ApiOperation({ summary: 'Listar tickets anulados' })
  @Get('cancelled')
  findCancelled() {
    return this.ticketsService.findCancelled();
  }

  @ApiOperation({ summary: 'Listar tickets ganadores (WON)' })
  @Get('winners')
  findWinners() {
    return this.ticketsService.findWinners();
  }

  @ApiOperation({ summary: 'Listar tickets pendientes de pago (WON)' })
  @Get('pending-payment')
  findPendingPayment() {
    return this.ticketsService.findPendingPayment();
  }

  @ApiOperation({ summary: 'Listar tickets pagados (PAID)' })
  @Get('paid')
  findPaid() {
    return this.ticketsService.findPaid();
  }

  @ApiOperation({ summary: 'Pagar ticket (solo WON, misma Agency)' })
  @Post(':id/pay')
  pay(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.ticketsService.payTicket({ ticketId: id, paidBy: user.id });
  }

  @ApiOperation({ summary: 'Obtener ticket por id' })
  @Get(':id')
  findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.ticketsService.findById(id);
  }

  @ApiOperation({ summary: 'Resultado del ticket (premio + detalle ganador)' })
  @Get(':id/result')
  result(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.ticketsService.getTicketResult(id);
  }

  @ApiOperation({ summary: 'Listar tickets por carrera' })
  @Get('race/:raceId')
  findByRaceId(@Param('raceId', new ParseUUIDPipe({ version: '4' })) raceId: string) {
    return this.ticketsService.findByRaceId(raceId);
  }

  @ApiOperation({ summary: 'Obtener ticket por número' })
  @Get('number/:ticketNumber')
  findByTicketNumber(@Param('ticketNumber', ParseIntPipe) ticketNumber: number) {
    return this.ticketsService.findByTicketNumber(ticketNumber);
  }
}
