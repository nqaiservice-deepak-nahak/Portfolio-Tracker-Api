import { AppConfigService } from '../config/appconfig.service';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseHandler } from './middleware/response-handler';

const getProviders = (): any[] => {
  return [
    AppConfigService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseHandler,
    },
  ];
};

const importProviders = (): any[] => {
  return [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.prod' }),
  ];
};

const exportProviders = (): any[] => {
  return [AppConfigService];
};

export { getProviders, importProviders, exportProviders };