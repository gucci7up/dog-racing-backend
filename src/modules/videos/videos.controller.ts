import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { VideosService } from './videos.service';

@ApiTags('videos')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post()
  create(@Body() dto: CreateVideoDto) {
    return this.videosService.create({
      nombre: dto.nombre,
      resultado: dto.resultado,
      archivo: dto.archivo,
      activo: dto.activo,
    });
  }

  @ApiOperation({ summary: 'Insertar videos en bulk' })
  @ApiBody({ type: CreateVideoDto, isArray: true })
  @Post('bulk')
  bulkCreate(
    @Body(
      new ParseArrayPipe({
        items: CreateVideoDto,
      }),
    )
    dtos: CreateVideoDto[],
  ) {
    return this.videosService.bulkCreate(
      dtos.map((dto) => ({
        nombre: dto.nombre,
        resultado: dto.resultado,
        archivo: dto.archivo,
        activo: dto.activo ?? true,
      })),
    );
  }

  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @Get()
  findAll(@Query('activo') activo?: string) {
    if (activo === undefined) return this.videosService.findAll();
    if (activo === 'true') return this.videosService.findAll({ activo: true });
    if (activo === 'false') return this.videosService.findAll({ activo: false });
    throw new BadRequestException('activo debe ser true o false');
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.videosService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateVideoDto,
  ) {
    return this.videosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.videosService.remove(id);
  }
}
