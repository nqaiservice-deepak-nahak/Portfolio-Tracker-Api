import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AppConfigService } from 'src/config/appconfig.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  authProvider: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly appConfigService: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authorizationHeader =
      request.headers.authorization || request.headers.Authorization;

    if (!authorizationHeader) {
      throw new UnauthorizedException('Authorization token is required.');
    }

    const token = this.extractTokenFromHeader(authorizationHeader);

    if (!token) {
      throw new UnauthorizedException('Invalid authorization header.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: this.appConfigService.jwtAccessSecret,
        },
      );

      const authenticatedUser: AuthenticatedUser = {
        id: payload.sub,
        userId: payload.sub,
        email: payload.email,
        name: payload.name,
        authProvider: payload.authProvider,
        sessionId: payload.sessionId,
      };

      request.user = authenticatedUser;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }

  private extractTokenFromHeader(authorizationHeader: string): string | null {
    const [type, token] = authorizationHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}