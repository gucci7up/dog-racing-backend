import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RaceStatus, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateRaceDto } from './dto/create-race.dto';
import { UpdateRaceDto } from './dto/update-race.dto';
import { RacesService } from './races.service';
import { RaceSettlementService } from '../race-settlement/race-settlement.service';
import { RaceEngineService } from '../race-engine/race-engine.service';

@ApiTags('races')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('races')
export class RacesController {
  constructor(
    private readonly racesService: RacesService,
    private readonly raceSettlement: RaceSettlementService,
    private readonly raceEngine: RaceEngineService,
  ) {}

  @Post()
  create(@Body() dto: CreateRaceDto) {
    return this.racesService.create({
      numero: dto.numero,
      videoId: dto.videoId,
      resultado: dto.resultado,
      status: dto.status,
      openAt: dto.openAt ? new Date(dto.openAt) : undefined,
      closeAt: dto.closeAt ? new Date(dto.closeAt) : undefined,
      runAt: dto.runAt ? new Date(dto.runAt) : undefined,
      finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : undefined,
    });
  }

  @ApiQuery({ name: 'status', required: false, enum: RaceStatus })
  @ApiQuery({ name: 'videoId', required: false, type: String })
  @Get()
  findAll(@Query('status') status?: string, @Query('videoId') videoId?: string) {
    const parsedStatus =
      status === undefined
        ? undefined
        : Object.values(RaceStatus).includes(status as RaceStatus)
          ? (status as RaceStatus)
          : null;

    if (parsedStatus === null) throw new BadRequestException('status inválido');

    return this.racesService.findAll({
      status: parsedStatus ?? undefined,
      videoId,
    });
  }

  @ApiOperation({ summary: 'Carrera actual (OPEN/CLOSED/RUNNING)' })
  @Get('current')
  current() {
    return this.racesService.current();
  }

  @ApiOperation({ summary: 'Historial de carreras FINISHED' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('history')
  history(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : undefined;
    return this.racesService.history({ limit: Number.isFinite(parsed as number) ? (parsed as number) : undefined });
  }

  @ApiOperation({ summary: 'Estado del motor + contadores' })
  @Get('status')
  status() {
    return this.raceEngine.status();
  }

  @Post(':id/settle')
  settle(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('solo ADMIN puede liquidar');
    return this.raceSettlement.settleRace({ raceId: id });
  }

  @Get(':id/results')
  results(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.raceSettlement.getResults({ raceId: id });
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.racesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateRaceDto,
  ) {
    return this.racesService.update(id, {
      numero: dto.numero,
      videoId: dto.videoId,
      resultado: dto.resultado,
      status: dto.status,
      openAt: dto.openAt ? new Date(dto.openAt) : undefined,
      closeAt: dto.closeAt ? new Date(dto.closeAt) : undefined,
      runAt: dto.runAt ? new Date(dto.runAt) : undefined,
      finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : undefined,
    });
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.racesService.remove(id);
  }
}
