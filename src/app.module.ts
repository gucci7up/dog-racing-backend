import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { VideosModule } from './modules/videos/videos.module';
import { RacesModule } from './modules/races/races.module';
import { QueueModule } from './modules/queue/queue.module';
import { RaceEngineModule } from './modules/race-engine/race-engine.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    VideosModule,
    RacesModule,
    QueueModule,
    RaceEngineModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
