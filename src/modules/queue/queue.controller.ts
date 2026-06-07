import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { QueueService } from './queue.service';

@ApiTags('queue')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @ApiOperation({ summary: 'Reinicia y remezcla la cola aleatoria de videos activos' })
  @Post('reset')
  resetQueue() {
    return this.queueService.resetQueue();
  }

  @ApiOperation({ summary: 'Obtiene el siguiente video aleatorio sin repetición' })
  @Get('next')
  getNextVideo() {
    return this.queueService.getNextVideo();
  }
}
