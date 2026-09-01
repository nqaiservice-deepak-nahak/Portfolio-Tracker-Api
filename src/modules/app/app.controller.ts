import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import type { AppResponse } from '../../shared/appresponse.shared';
import { createResponse } from '../../shared/appresponse.shared';
import { messageFactory, Messages } from '../../shared/messages.shared';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check API' })
  getHealth(): AppResponse {
    const health = this.appService.getHealth();
    return createResponse(
      HttpStatus.OK,
      messageFactory(Messages.S1, [health.app]),
      health,
    );
  }
}
