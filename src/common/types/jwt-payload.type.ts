import { Role } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  role: Role;
};
