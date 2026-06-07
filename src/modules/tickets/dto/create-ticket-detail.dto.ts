import { ApiProperty } from '@nestjs/swagger';
import { BetType } from '@prisma/client';
import { IsEnum, IsString, Matches, MinLength } from 'class-validator';

export class CreateTicketDetailDto {
  @ApiProperty({ enum: BetType, example: BetType.WINNER })
  @IsEnum(BetType)
  betType!: BetType;

  @ApiProperty({ example: '1' })
  @IsString()
  @MinLength(1)
  selection!: string;

  @ApiProperty({ example: '10.00' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;

  @ApiProperty({ example: '2.50' })
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  odds!: string;
}
