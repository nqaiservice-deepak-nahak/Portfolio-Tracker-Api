import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  logConnectionInfo(): void {
    this.logger.log('MongoDB connection module initialized');
  }
}
