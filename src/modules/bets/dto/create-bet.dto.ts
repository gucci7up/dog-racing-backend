import { ApiProperty } from '@nestjs/swagger';
import { BetType } from '@prisma/client';
import { IsEnum, IsString, IsUUID, Matches, MinLength } from 'class-validator';

export class CreateBetDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  raceId!: string;

  @ApiProperty({ enum: BetType, example: BetType.WINNER })
  @IsEnum(BetType)
  tipo!: BetType;

  @ApiProperty({ example: '1' })
  @IsString()
  @MinLength(1)
  combinacion!: string;

  @ApiProperty({ example: '10.00' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  monto!: string;
}
