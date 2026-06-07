import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OddsEngineService } from './odds-engine/odds-engine.service';

@ApiTags('odds')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('odds')
export class OddsController {
  constructor(private readonly oddsEngine: OddsEngineService) {}

  @ApiOperation({ summary: 'Cuotas (final si existe, si no current)' })
  @Get('race/:raceId')
  getRaceOdds(@Param('raceId', new ParseUUIDPipe({ version: '4' })) raceId: string) {
    return this.oddsEngine.getRaceOdds(raceId);
  }

  @ApiOperation({ summary: 'Cuotas live (current + final)' })
  @Get('race/:raceId/live')
  getRaceOddsLive(@Param('raceId', new ParseUUIDPipe({ version: '4' })) raceId: string) {
    return this.oddsEngine.getRaceOddsLive(raceId);
  }
}
