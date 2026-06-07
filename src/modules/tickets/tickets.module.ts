import { Module } from '@nestjs/common';
import { OddsModule } from '../odds/odds.module';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [OddsModule],
  providers: [TicketsService],
  controllers: [TicketsController],
})
export class TicketsModule {}
