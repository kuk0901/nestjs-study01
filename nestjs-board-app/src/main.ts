import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import config from 'config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const serverConfig = config.get<{ port: number }>('server');
  const port = serverConfig.port;

  await app.listen(process.env.PORT ?? port);
  Logger.log(`Application running on port ${port}`);
}
bootstrap();
