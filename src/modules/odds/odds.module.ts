import { Module } from '@nestjs/common';
import { OddsEngineService } from './odds-engine/odds-engine.service';
import { OddsController } from './odds.controller';
import { VirtualOddsService } from './virtual-odds.service';

@Module({
  providers: [OddsEngineService, VirtualOddsService],
  controllers: [OddsController],
  exports: [OddsEngineService, VirtualOddsService],
})
export class OddsModule {}
