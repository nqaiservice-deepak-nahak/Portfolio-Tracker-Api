import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from '../modules/app/app.module';
import { AppConfigService } from '../config/appconfig.service';
import { setUpSwagger } from './swagger/doc.swagger';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appConfigService = app.get(AppConfigService);

  app.setGlobalPrefix(appConfigService.apiPrefix);
  app.enableCors({ origin: appConfigService.frontendUrl, credentials: true });
  app.use(helmet());
  app.use(compression());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const environment = appConfigService.nodeEnv;
  if (environment && environment.toLowerCase() !== 'production') {
    setUpSwagger(app);
  }

  await app.listen(appConfigService.appPort);
  console.log(`${appConfigService.appName} running on http://localhost:${appConfigService.appPort}/${appConfigService.apiPrefix}`);

}


