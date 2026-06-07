import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { AgenciesService } from './agencies.service';

@ApiTags('agencies')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('agencies')
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @ApiOperation({ summary: 'Crear agency' })
  @Post()
  create(@Body() dto: CreateAgencyDto) {
    return this.agenciesService.create({
      name: dto.name,
      code: dto.code,
      active: dto.active ?? true,
    });
  }

  @ApiOperation({ summary: 'Listar agencies' })
  @Get()
  findAll() {
    return this.agenciesService.findAll();
  }

  @ApiOperation({ summary: 'Obtener agency por id' })
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.agenciesService.findOne(id);
  }

  @ApiOperation({ summary: 'Actualizar agency' })
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateAgencyDto,
  ) {
    return this.agenciesService.update(id, {
      name: dto.name,
      code: dto.code,
      active: dto.active,
    });
  }

  @ApiOperation({ summary: 'Eliminar agency' })
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.agenciesService.remove(id);
  }
}
