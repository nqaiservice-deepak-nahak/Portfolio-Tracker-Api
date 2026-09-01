import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigService } from '../config/appconfig.service';
import { ResponseHandler } from './middleware/response-handler';

@Module({
  providers: [
    AppConfigService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseHandler,
    },
  ],
  exports: [AppConfigService],
})
export class CoreModule {}
