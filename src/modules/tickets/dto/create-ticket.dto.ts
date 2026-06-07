import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { CreateTicketDetailDto } from './create-ticket-detail.dto';

export class CreateTicketDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  raceId!: string;

  @ApiProperty({ type: CreateTicketDetailDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTicketDetailDto)
  details!: CreateTicketDetailDto[];
}
