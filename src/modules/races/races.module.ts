import { Module } from '@nestjs/common';
import { OddsModule } from '../odds/odds.module';
import { RacesService } from './races.service';
import { RacesController } from './races.controller';

@Module({
  imports: [OddsModule],
  providers: [RacesService],
  controllers: [RacesController],
})
export class RacesModule {}
