import { Injectable, OnModuleInit } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly adminEmail = 'admin@mbracesrd.lat';

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.prisma.user.updateMany({
      where: {
        email: this.adminEmail,
        role: { not: Role.ADMIN },
      },
      data: {
        role: Role.ADMIN,
      },
    });
  }
}
