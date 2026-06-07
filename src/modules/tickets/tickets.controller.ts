import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @ApiOperation({ summary: 'Crear ticket (solo en carreras OPEN)' })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create({
      raceId: dto.raceId,
      userId: user.id,
      details: dto.details,
    });
  }

  @ApiOperation({ summary: 'Listar tickets' })
  @Get()
  findAll() {
    return this.ticketsService.findAll();
  }

  @ApiOperation({ summary: 'Obtener ticket por id' })
  @Get(':id')
  findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.ticketsService.findById(id);
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
