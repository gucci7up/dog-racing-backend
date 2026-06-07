import { Module } from '@nestjs/common';
import { OddsModule } from '../odds/odds.module';
import { RaceSettlementModule } from '../race-settlement/race-settlement.module';
import { RacesService } from './races.service';
import { RacesController } from './races.controller';

@Module({
  imports: [OddsModule, RaceSettlementModule],
  providers: [RacesService],
  controllers: [RacesController],
})
export class RacesModule {}
