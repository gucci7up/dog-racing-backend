import { Module } from '@nestjs/common';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { VideoImportService } from './video-import.service';

@Module({
  providers: [VideosService, VideoImportService],
  controllers: [VideosController],
})
export class VideosModule {}
