import { NestFactory } from '@nestjs/core';
import { VideoImportService } from '../modules/videos/video-import.service';
import { VideosImportCliModule } from './videos-import.module';

async function main() {
  const app = await NestFactory.createApplicationContext(VideosImportCliModule, { logger: ['log', 'error', 'warn'] });
  try {
    const importer = app.get(VideoImportService);
    const summary = await importer.importFromLocal();
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exitCode = 1;
});
