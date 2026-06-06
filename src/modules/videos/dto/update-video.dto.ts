import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateVideoDto {
  @ApiPropertyOptional({ example: 'Carrera 001' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  nombre?: string;

  @ApiPropertyOptional({ example: '1-2-3-4-5-6' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  resultado?: string;

  @ApiPropertyOptional({ example: 's3://bucket/video-001.mp4' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  archivo?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
