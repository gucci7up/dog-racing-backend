import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    VideosModule,
    RacesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
