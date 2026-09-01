import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get appName(): string {
    return this.configService.get<string>('APP_NAME', 'Portfolio Tracker API');
  }

  get appVersion(): string {
    return this.configService.get<string>('APP_VERSION', '1.0.0');
  }

  get appPort(): number {
    return Number(this.configService.get<number>('APP_PORT', 5000));
  }

  get apiPrefix(): string {
    return this.configService.get<string>('API_PREFIX', 'api/v1');
  }

  get mongodbUri(): string {
    return this.configService.get<string>(
      'MONGODB_URI',
      'mongodb://127.0.0.1:27017/portfolio_tracker',
    );
  }

  get frontendUrl(): string {
    return this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:4000',
    );
  }

  get jwtAccessSecret(): string {
    return this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'change_this_access_secret',
    );
  }

  get jwtRefreshSecret(): string {
    return this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'change_this_refresh_secret',
    );
  }

  get jwtAccessExpiresIn(): string {
    return this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  get microsoftClientId(): string {
    return this.configService.get<string>('MICROSOFT_CLIENT_ID', '');
  }

  get microsoftTenantId(): string {
    return this.configService.get<string>('MICROSOFT_TENANT_ID', 'common');
  }

  get microsoftClientSecret(): string {
    return this.configService.get<string>('MICROSOFT_CLIENT_SECRET', '');
  }

  get microsoftRedirectUri(): string {
    return this.configService.get<string>(
      'MICROSOFT_REDIRECT_URI',
      'http://localhost:4000/runway',
    );
  }

  get openAiApiKey(): string {
    return this.configService.get<string>('OPENAI_API_KEY', '');
  }
}