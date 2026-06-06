import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateVideoDto {
  @ApiProperty({ example: 'Carrera 001' })
  @IsString()
  @MinLength(1)
  nombre!: string;

  @ApiProperty({ example: '1-2-3-4-5-6' })
  @IsString()
  @MinLength(1)
  resultado!: string;

  @ApiProperty({ example: 's3://bucket/video-001.mp4' })
  @IsString()
  @MinLength(1)
  archivo!: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
