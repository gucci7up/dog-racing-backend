import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingByEmail = await this.usersService.findByEmail(dto.email);
    if (existingByEmail) throw new BadRequestException('email ya existe');

    const existingByUsername = await this.usersService.findByUsername(dto.username);
    if (existingByUsername) throw new BadRequestException('username ya existe');

    const saltRounds = this.configService.getOrThrow<number>('bcryptSaltRounds', {
      infer: true,
    });

    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.usersService.create({
      username: dto.username,
      email: dto.email,
      password: passwordHash,
      role: Role.CASHIER,
    });

    const accessToken = await this.signAccessToken(user);
    const { password: _password, ...safeUser } = user;

    return { user: safeUser, accessToken };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('credenciales inválidas');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('credenciales inválidas');

    const accessToken = await this.signAccessToken(user);
    const { password: _password, ...safeUser } = user;

    return { user: safeUser, accessToken };
  }

  private async signAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return this.jwtService.signAsync(payload);
  }
}
