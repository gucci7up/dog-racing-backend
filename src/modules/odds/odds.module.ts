import { Module } from '@nestjs/common';
import { OddsEngineService } from './odds-engine/odds-engine.service';
import { OddsController } from './odds.controller';

@Module({
  providers: [OddsEngineService],
  controllers: [OddsController],
  exports: [OddsEngineService],
})
export class OddsModule {}
