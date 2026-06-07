import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { access, readFile } from 'fs/promises';
import { resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VideoImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async importFromLocal() {
    const videosPath = this.configService.get<string>('videosPath', { infer: true }) ?? '';
    const resultsCsvPath = this.configService.get<string>('resultsCsvPath', { infer: true }) ?? '';
    if (!videosPath) throw new BadRequestException('VIDEOS_PATH no configurado');
    if (!resultsCsvPath) throw new BadRequestException('RESULTS_CSV_PATH no configurado');

    const content = await readFile(resultsCsvPath, 'utf8');
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const summary = {
      videosEncontrados: 0,
      videosImportados: 0,
      videosActualizados: 0,
      errores: [] as Array<{ row: number; message: string }>,
    };

    if (lines.length === 0) return summary;

    const delimiter = this.detectDelimiter(lines[0]!);
    const header = this.parseCsvLine(lines[0]!, delimiter).map((h) => h.replace(/^\uFEFF/, '').toLowerCase());

    const headerLooksLikeHeader = header.includes('video') || header.includes('nombre') || header.includes('resultado');
    const startIndex = headerLooksLikeHeader ? 1 : 0;

    const findIndex = (candidates: string[]) => {
      for (const c of candidates) {
        const exact = header.indexOf(c);
        if (exact >= 0) return exact;
      }
      for (const c of candidates) {
        const partial = header.findIndex((h) => h.includes(c));
        if (partial >= 0) return partial;
      }
      return -1;
    };

    const getIndex = (name: string) => header.indexOf(name);

    const videoIdx = headerLooksLikeHeader ? findIndex(['video', 'nombre']) : 0;
    const resultadoIdx = headerLooksLikeHeader ? findIndex(['resultado', 'result']) : 1;
    const activoIdx = headerLooksLikeHeader ? getIndex('activo') : -1;

    if (headerLooksLikeHeader && (videoIdx < 0 || resultadoIdx < 0)) {
      throw new BadRequestException(`CSV inválido: headers=${header.join(',')}`);
    }

    for (let i = startIndex; i < lines.length; i++) {
      const rowNumber = i + 1;
      const cols = this.parseCsvLine(lines[i]!, delimiter);
      summary.videosEncontrados++;

      const nombre = (cols[videoIdx] ?? '').trim();
      const resultado = (cols[resultadoIdx] ?? '').trim();
      const activoRaw = activoIdx >= 0 ? (cols[activoIdx] ?? '').trim() : '';

      if (!nombre) {
        summary.errores.push({ row: rowNumber, message: 'video vacío' });
        continue;
      }
      if (!resultado) {
        summary.errores.push({ row: rowNumber, message: `resultado vacío para video ${nombre}` });
        continue;
      }

      const filename = `${nombre}.webm`;
      const filePath = resolve(videosPath, filename);
      try {
        await access(filePath);
      } catch {
        summary.errores.push({ row: rowNumber, message: `archivo no existe: ${filePath}` });
        continue;
      }

      const archivo = `${videosPath.replace(/[\\/]+$/, '')}/${filename}`;
      const activo =
        activoRaw === ''
          ? true
          : ['true', '1', 'yes', 'si', 'sí'].includes(activoRaw.toLowerCase())
            ? true
            : ['false', '0', 'no'].includes(activoRaw.toLowerCase())
              ? false
              : true;

      const existing = await this.prisma.video.findUnique({
        where: { nombre },
        select: { id: true },
      });

      if (existing) {
        await this.prisma.video.update({
          where: { nombre },
          data: { archivo, resultado, activo },
        });
        summary.videosActualizados++;
      } else {
        await this.prisma.video.create({
          data: {
            nombre,
            archivo,
            resultado,
            activo,
          } satisfies Prisma.VideoCreateInput,
        });
        summary.videosImportados++;
      }
    }

    return summary;
  }

  private detectDelimiter(line: string) {
    const comma = (line.match(/,/g) ?? []).length;
    const semicolon = (line.match(/;/g) ?? []).length;
    return semicolon > comma ? ';' : ',';
  }

  private parseCsvLine(line: string, delimiter: string) {
    const out: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }
      if (!inQuotes && ch === delimiter) {
        out.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }

    out.push(current.trim());
    return out.map((v) => v.replace(/^"|"$/g, '').trim());
  }
}
