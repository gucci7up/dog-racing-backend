import { Module } from '@nestjs/common';
import { RaceEngineService } from './race-engine.service';
import { RaceEngineController } from './race-engine.controller';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  providers: [RaceEngineService],
  controllers: [RaceEngineController],
})
export class RaceEngineModule {}
