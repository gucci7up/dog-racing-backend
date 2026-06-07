import { Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { QueueService } from './queue.service';

@ApiTags('queue')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @ApiOperation({ summary: 'Estado de la cola' })
  @Get('status')
  status() {
    return this.queueService.status();
  }

  @ApiOperation({ summary: 'Reconstruir la cola aleatoria (solo ADMIN)' })
  @Post('rebuild')
  rebuild(@CurrentUser() user: AuthUser) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('solo ADMIN');
    return this.queueService.rebuildQueue();
  }

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
