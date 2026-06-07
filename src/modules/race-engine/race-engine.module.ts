import { Module } from '@nestjs/common';
import { RaceEngineService } from './race-engine.service';
import { RaceEngineController } from './race-engine.controller';
import { QueueModule } from '../queue/queue.module';
import { OddsModule } from '../odds/odds.module';

@Module({
  imports: [QueueModule, OddsModule],
  providers: [RaceEngineService],
  controllers: [RaceEngineController],
})
export class RaceEngineModule {}
