import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { UsersService } from './users.service';
import { AssignUserAgencyDto } from './dto/assign-user-agency.dto';
import type { AppConfig } from '../../config/configuration';

@ApiTags('users')
@ApiBearerAuth('bearer')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const dbUser = await this.usersService.findByIdWithAgency(user.id);
    if (!dbUser) throw new NotFoundException();

    const { password: _password, ...safeUser } = dbUser;
    return safeUser;
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Asignar agency a un usuario CASHIER (solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @Patch(':id/agency')
  async assignAgency(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AssignUserAgencyDto,
  ) {
    if (actor.role !== Role.ADMIN) throw new ForbiddenException('solo ADMIN');

    const updatedUser = await this.usersService.assignAgencyToCashier({
      userId: id,
      agencyId: dto.agencyId,
    });

    const { password: _password, ...safeUser } = updatedUser;
    return safeUser;
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Endpoint temporal para promover usuario a ADMIN en development/test' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @Post(':id/make-admin')
  async makeAdmin(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const nodeEnv = this.configService.getOrThrow('nodeEnv', { infer: true });
    if (nodeEnv !== 'development' && nodeEnv !== 'test') {
      throw new ForbiddenException('endpoint temporal disponible solo en development/test');
    }

    const updatedUser = await this.usersService.makeAdmin(id);
    const { password: _password, ...safeUser } = updatedUser;
    return safeUser;
  }
}
