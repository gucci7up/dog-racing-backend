import { Module } from '@nestjs/common';
import { RaceSettlementService } from './race-settlement.service';

@Module({
  providers: [RaceSettlementService],
  exports: [RaceSettlementService],
})
export class RaceSettlementModule {}
