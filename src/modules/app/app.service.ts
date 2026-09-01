import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return { app: 'Portfolio Tracker API', version: '1.0.0' };
  }
}
