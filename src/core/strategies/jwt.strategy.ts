import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AppConfigService } from '../../config/appconfig.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  authProvider: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly appConfigService: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfigService.jwtAccessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid access token.');
    }

    return {
      id: payload.sub,
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      authProvider: payload.authProvider,
      sessionId: payload.sessionId,
    };
  }
}