import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAgencyDto {
  @ApiProperty({ example: 'Banca Centro' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'BC01' })
  @IsString()
  @MinLength(1)
  code!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
