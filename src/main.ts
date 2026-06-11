import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: ['https://pos.mbracesrd.lat', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const configService = app.get(ConfigService<AppConfig>);
  const videosPath = (configService.get<string>('videosPath', { infer: true }) ?? '/opt/mbraces/videos').trim();
  if (videosPath) {
    app.useStaticAssets(videosPath, { prefix: '/videos', fallthrough: false, index: false });
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('MBSport API')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearer',
    )
    .build();

  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  swaggerDoc.security = [{ bearer: [] }];
  SwaggerModule.setup('docs', app, swaggerDoc);

  const port = configService.getOrThrow<number>('port', { infer: true });

  await app.listen(port);
}
bootstrap();
