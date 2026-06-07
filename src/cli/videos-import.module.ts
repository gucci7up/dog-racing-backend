import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration';
import { envValidationSchema } from '../config/env.validation';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { VideosModule } from '../modules/videos/videos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    VideosModule,
  ],
})
export class VideosImportCliModule {}

