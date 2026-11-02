import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config } from 'dotenv';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { assertDemoAuthAllowed } from './common/demo-auth.js';

async function bootstrap() {
  config({ quiet: true });
  assertDemoAuthAllowed();

  const app = configureApp(await NestFactory.create(AppModule));

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Video Hosting API').setDescription('API for video hosting application').setVersion('1.0').build(),
  );
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
