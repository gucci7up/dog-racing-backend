import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CancelTicketDto {
  @ApiPropertyOptional({ example: '123456', description: 'Requerido para CASHIER. ADMIN puede omitir.' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  code?: string;

  @ApiProperty({ example: 'Error de captura' })
  @IsString()
  @MinLength(1)
  reason!: string;
}
