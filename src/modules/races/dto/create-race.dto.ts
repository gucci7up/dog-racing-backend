import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RaceStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRaceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  numero!: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  videoId!: string;

  @ApiProperty({ example: '1-2-3-4-5-6' })
  @IsString()
  @MinLength(1)
  resultado!: string;

  @ApiPropertyOptional({ enum: RaceStatus, default: RaceStatus.OPEN })
  @IsOptional()
  @IsEnum(RaceStatus)
  status?: RaceStatus;

  @ApiPropertyOptional({ example: '2026-06-06T23:59:00.000Z' })
  @IsOptional()
  @IsDateString()
  openAt?: string;

  @ApiPropertyOptional({ example: '2026-06-06T23:59:30.000Z' })
  @IsOptional()
  @IsDateString()
  closeAt?: string;

  @ApiPropertyOptional({ example: '2026-06-07T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  runAt?: string;

  @ApiPropertyOptional({ example: '2026-06-07T00:01:00.000Z' })
  @IsOptional()
  @IsDateString()
  finishedAt?: string;
}
