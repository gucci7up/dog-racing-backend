import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RaceStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateRaceDto } from './dto/create-race.dto';
import { UpdateRaceDto } from './dto/update-race.dto';
import { RacesService } from './races.service';

@ApiTags('races')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('races')
export class RacesController {
  constructor(private readonly racesService: RacesService) {}

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
