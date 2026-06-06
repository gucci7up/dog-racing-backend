import { ApiPropertyOptional } from '@nestjs/swagger';
import { RaceStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class UpdateRaceDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  numero?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  videoId?: string;

  @ApiPropertyOptional({ example: '1-2-3-4-5-6' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  resultado?: string;

  @ApiPropertyOptional({ enum: RaceStatus })
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
