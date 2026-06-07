import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RaceEngineService } from './race-engine.service';

@ApiTags('race-engine')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('race-engine')
export class RaceEngineController {
  constructor(private readonly raceEngineService: RaceEngineService) {}

  @ApiOperation({ summary: 'Estado del motor de carreras' })
  @Get('status')
  status() {
    return this.raceEngineService.status();
  }
}
