import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateBetDto } from './dto/create-bet.dto';
import { BetsService } from './bets.service';

@ApiTags('bets')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('bets')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @ApiOperation({ summary: 'Crear apuesta (solo en carreras OPEN)' })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBetDto) {
    return this.betsService.create({
      raceId: dto.raceId,
      userId: user.id,
      tipo: dto.tipo,
      combinacion: dto.combinacion,
      monto: dto.monto,
    });
  }

  @ApiOperation({ summary: 'Listar apuestas' })
  @Get()
  findAll() {
    return this.betsService.findAll();
  }

  @ApiOperation({ summary: 'Obtener apuesta por id' })
  @Get(':id')
  findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.betsService.findById(id);
  }

  @ApiOperation({ summary: 'Listar apuestas por carrera' })
  @Get('race/:raceId')
  findByRaceId(@Param('raceId', new ParseUUIDPipe({ version: '4' })) raceId: string) {
    return this.betsService.findByRaceId(raceId);
  }
}
