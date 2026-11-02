import { INestApplication, ValidationPipe } from '@nestjs/common';

// Общая настройка HTTP-слоя для main.ts и интеграционных тестов
export function configureApp(app: INestApplication): INestApplication {
  app.useGlobalPipes(
    new ValidationPipe({
      // Лишние поля в теле и query (ownerId, status, usedBytes...) дают 400
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Закрывает пул соединений при SIGTERM/SIGINT
  app.enableShutdownHooks();
  return app;
}
