import { Module } from '@nestjs/common';
import { OddsModule } from '../odds/odds.module';
import { RaceSettlementModule } from '../race-settlement/race-settlement.module';
import { RaceEngineModule } from '../race-engine/race-engine.module';
import { RacesService } from './races.service';
import { RacesController } from './races.controller';

@Module({
  imports: [OddsModule, RaceSettlementModule, RaceEngineModule],
  providers: [RacesService],
  controllers: [RacesController],
})
export class RacesModule {}
