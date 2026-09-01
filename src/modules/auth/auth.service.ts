import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createRemoteJWKSet, JWTPayload, jwtVerify } from 'jose';

import * as bcrypt from 'bcrypt';

import type { AppResponse } from '../../shared/appresponse.shared';
import { createResponse } from '../../shared/appresponse.shared';
import {
  AuthAbstract,
  AuthUserResponse,
  LoginResponse,
  LogoutResponse,
  EndSessionResponse,
} from './auth.abstract';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { MicrosoftAuthCodeDto } from './dto/microsoft-auth-code.dto';
import { AbstractAuthDao } from '../../database/mongodb/abstract/auth.abstract';
import { UserSessionDocument } from '../../database/schemas/user-session.schema';
import { UsersAbstract } from '../user-management/users.abstract';
import { AuthProvider } from '../../core/enums/auth-provider.enum';
import { Messages } from '../../shared/messages.shared';
import { AppConfigService } from '../../config/appconfig.service';

interface JwtUserPayload {
  sub: string;
  email: string;
  name: string;
  authProvider: string;
  sessionId: string;
}

interface MicrosoftTokenResponse {
  token_type?: string;
  scope?: string;
  expires_in?: number;
  ext_expires_in?: number;
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

interface VerifiedMicrosoftProfile {
  microsoftId: string;
  email: string;
  name: string;
}

@Injectable()
export class AuthService implements AuthAbstract {
  constructor(
    private readonly authDao: AbstractAuthDao,
    private readonly usersService: UsersAbstract,
    private readonly jwtService: JwtService,
    private readonly appConfigService: AppConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AppResponse> {
    try {
      const normalizedEmail = registerDto.email.toLowerCase().trim();

      const existingUser = await this.authDao.findUserByEmail(normalizedEmail);

      if (existingUser.code === HttpStatus.OK) {
        return createResponse(HttpStatus.CONFLICT, Messages.W6);
      }

      if (existingUser.code !== HttpStatus.NOT_FOUND) {
        return existingUser;
      }

      const passwordHash = await bcrypt.hash(registerDto.password, 12);

      const createdUserRes = await this.authDao.createUser({
        name: registerDto.name.trim(),
        email: normalizedEmail,
        passwordHash,
        authProvider: AuthProvider.NATIVE,
        microsoftId: null,
        refreshTokenHash: null,
        isActive: true,
      });

      if (createdUserRes.code !== HttpStatus.CREATED) {
        return createdUserRes;
      }

      const createdUser = createdUserRes.data;

      const data: AuthUserResponse = {
        id: createdUser._id.toString(),
        name: createdUser.name,
        email: createdUser.email,
        authProvider: createdUser.authProvider,
      };

      return createResponse(HttpStatus.CREATED, Messages.S4, data);
    } catch (error: any) {
      if (error?.statusCode) {
        return createResponse(error.statusCode, error.message);
      }
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async login(loginDto: LoginDto): Promise<AppResponse> {
    try {
      const normalizedEmail = loginDto.email.toLowerCase().trim();

      const userRes = await this.usersService.findByEmail(normalizedEmail);

      if (userRes.code !== HttpStatus.OK) {
        if (userRes.code === HttpStatus.NOT_FOUND) {
          return createResponse(HttpStatus.UNAUTHORIZED, Messages.W20);
        }
        return userRes;
      }

      const user = userRes.data;

      if (!user.isActive) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W8);
      }

      if (!user.passwordHash) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W19);
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W7);
      }

      await this.closeExistingActiveSessions(user._id.toString());

      const sessionRes = await this.createActiveSession(
        user._id.toString(),
        AuthProvider.NATIVE,
      );

      if (sessionRes.code !== HttpStatus.CREATED) {
        return sessionRes;
      }

      const session = sessionRes.data;

      const tokensRes = await this.generateAndSaveTokens({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          authProvider: user.authProvider,
        },
        sessionId: session._id.toString(),
      });

      if (tokensRes.code !== HttpStatus.OK) {
        return tokensRes;
      }

      return createResponse(HttpStatus.OK, Messages.S5, tokensRes.data);
    } catch (error: any) {
      if (error?.statusCode) {
        return createResponse(error.statusCode, error.message);
      }
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async microsoftCodeRegister(
    microsoftAuthCodeDto: MicrosoftAuthCodeDto,
  ): Promise<AppResponse> {
    try {
      const tokenResponseRes = await this.exchangeMicrosoftCodeForTokens(
        microsoftAuthCodeDto,
      );

      if (tokenResponseRes.code !== HttpStatus.OK) {
        return tokenResponseRes;
      }

      const tokenResponse = tokenResponseRes.data;

      if (!tokenResponse.id_token) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W38);
      }

      const microsoftProfileRes = await this.verifyMicrosoftIdToken(
        tokenResponse.id_token,
        microsoftAuthCodeDto.nonce,
      );

      if (microsoftProfileRes.code !== HttpStatus.OK) {
        return microsoftProfileRes;
      }

      const microsoftProfile = microsoftProfileRes.data;

      const existingMicrosoftUser = await this.authDao.findUserByMicrosoftId(microsoftProfile.microsoftId);

      if (existingMicrosoftUser.code === HttpStatus.OK) {
        return createResponse(HttpStatus.CONFLICT, Messages.W16);
      }

      if (existingMicrosoftUser.code !== HttpStatus.NOT_FOUND) {
        return existingMicrosoftUser;
      }

      const existingEmailUser = await this.authDao.findUserByEmail(microsoftProfile.email);

      if (existingEmailUser.code === HttpStatus.OK) {
        return createResponse(HttpStatus.CONFLICT, Messages.W17);
      }

      if (existingEmailUser.code !== HttpStatus.NOT_FOUND) {
        return existingEmailUser;
      }

      const createdUserRes = await this.authDao.createUser({
        name: microsoftProfile.name,
        email: microsoftProfile.email,
        passwordHash: null,
        authProvider: AuthProvider.MICROSOFT,
        microsoftId: microsoftProfile.microsoftId,
        refreshTokenHash: null,
        isActive: true,
      });

      if (createdUserRes.code !== HttpStatus.CREATED) {
        return createdUserRes;
      }

      const createdUser = createdUserRes.data;

      const data: AuthUserResponse = {
        id: createdUser._id.toString(),
        name: createdUser.name,
        email: createdUser.email,
        authProvider: createdUser.authProvider,
      };

      return createResponse(HttpStatus.CREATED, Messages.S26, data);
    } catch (error: any) {
      if (error?.statusCode) {
        return createResponse(error.statusCode, error.message);
      }
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async microsoftCodeLogin(
    microsoftAuthCodeDto: MicrosoftAuthCodeDto,
  ): Promise<AppResponse> {
    try {
      const tokenResponseRes = await this.exchangeMicrosoftCodeForTokens(
        microsoftAuthCodeDto,
      );

      if (tokenResponseRes.code !== HttpStatus.OK) {
        return tokenResponseRes;
      }

      const tokenResponse = tokenResponseRes.data;

      if (!tokenResponse.id_token) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W38);
      }

      const microsoftProfileRes = await this.verifyMicrosoftIdToken(
        tokenResponse.id_token,
        microsoftAuthCodeDto.nonce,
      );

      if (microsoftProfileRes.code !== HttpStatus.OK) {
        return microsoftProfileRes;
      }

      const microsoftProfile = microsoftProfileRes.data;

      const existingMicrosoftUserRes = await this.authDao.findUserByMicrosoftId(
        microsoftProfile.microsoftId,
        AuthProvider.MICROSOFT,
      );

      if (existingMicrosoftUserRes.code !== HttpStatus.OK) {
        if (existingMicrosoftUserRes.code === HttpStatus.NOT_FOUND) {
          return createResponse(HttpStatus.UNAUTHORIZED, Messages.W18);
        }
        return existingMicrosoftUserRes;
      }

      const existingMicrosoftUser = existingMicrosoftUserRes.data;

      if (!existingMicrosoftUser.isActive) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W8);
      }

      const updatedName = existingMicrosoftUser.name?.trim()
        ? existingMicrosoftUser.name
        : microsoftProfile.name;

      const updateNameRes = await this.authDao.updateUserName(existingMicrosoftUser._id.toString(), updatedName);

      if (updateNameRes.code !== HttpStatus.OK) {
        return updateNameRes;
      }

      existingMicrosoftUser.name = updatedName;

      await this.closeExistingActiveSessions(
        existingMicrosoftUser._id.toString(),
      );

      const sessionRes = await this.createActiveSession(
        existingMicrosoftUser._id.toString(),
        AuthProvider.MICROSOFT,
      );

      if (sessionRes.code !== HttpStatus.CREATED) {
        return sessionRes;
      }

      const session = sessionRes.data;

      const tokensRes = await this.generateAndSaveTokens({
        user: {
          id: existingMicrosoftUser._id.toString(),
          name: existingMicrosoftUser.name,
          email: existingMicrosoftUser.email,
          authProvider: existingMicrosoftUser.authProvider,
        },
        sessionId: session._id.toString(),
      });

      if (tokensRes.code !== HttpStatus.OK) {
        return tokensRes;
      }

      return createResponse(HttpStatus.OK, Messages.S27, tokensRes.data);
    } catch (error: any) {
      if (error?.statusCode) {
        return createResponse(error.statusCode, error.message);
      }
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AppResponse> {
    try {
      const decodedTokenRes = await this.verifyRefreshToken(
        refreshTokenDto.refreshToken,
      );

      if (decodedTokenRes.code !== HttpStatus.OK) {
        return decodedTokenRes;
      }

      const decodedToken = decodedTokenRes.data;

      const userRes = await this.authDao.findUserById(decodedToken.sub);

      if (userRes.code !== HttpStatus.OK) {
        if (userRes.code === HttpStatus.NOT_FOUND) {
          return createResponse(HttpStatus.UNAUTHORIZED, Messages.W9);
        }
        return userRes;
      }

      const user = userRes.data;

      if (!user.isActive) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W8);
      }

      const sessionRes = await this.authDao.findActiveSession(decodedToken.sessionId, decodedToken.sub);

      if (sessionRes.code !== HttpStatus.OK) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W9);
      }

      const session = sessionRes.data;

      if (!session || !session.refreshTokenHash) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W9);
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshTokenDto.refreshToken,
        session.refreshTokenHash,
      );

      if (!isRefreshTokenValid) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W9);
      }

      const tokensRes = await this.generateAndSaveTokens({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          authProvider: user.authProvider,
        },
        sessionId: session._id.toString(),
      });

      if (tokensRes.code !== HttpStatus.OK) {
        return tokensRes;
      }

      return createResponse(HttpStatus.OK, Messages.S6, tokensRes.data);
    } catch (error: any) {
      if (error?.statusCode) {
        return createResponse(error.statusCode, error.message);
      }
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async logout(logoutDto: LogoutDto): Promise<AppResponse> {
    try {
      const decodedTokenRes = await this.verifyRefreshToken(logoutDto.refreshToken);

      if (decodedTokenRes.code !== HttpStatus.OK) {
        return decodedTokenRes;
      }

      const decodedToken = decodedTokenRes.data;

      const sessionRes = await this.authDao.findActiveSession(decodedToken.sessionId, decodedToken.sub);

      if (sessionRes.code !== HttpStatus.OK) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W9);
      }

      const session = sessionRes.data;

      if (!session || !session.refreshTokenHash) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W9);
      }

      const isRefreshTokenValid = await bcrypt.compare(
        logoutDto.refreshToken,
        session.refreshTokenHash,
      );

      if (!isRefreshTokenValid) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W9);
      }

      await this.closeSession(session._id.toString(), decodedToken.sub);

      await this.usersService.updateRefreshTokenHash(decodedToken.sub, null);

      const data: LogoutResponse = {
        loggedOut: true,
      };

      return createResponse(HttpStatus.OK, Messages.S7, data);
    } catch (error: any) {
      if (error?.statusCode) {
        return createResponse(error.statusCode, error.message);
      }
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async endSession(
    endSessionDto: EndSessionDto,
  ): Promise<AppResponse> {
    try {
      const decodedTokenRes = await this.verifyRefreshToken(
        endSessionDto.refreshToken,
      );

      if (decodedTokenRes.code !== HttpStatus.OK) {
        const data: EndSessionResponse = { sessionEnded: false };
        return createResponse(HttpStatus.OK, Messages.S25, data);
      }

      const decodedToken = decodedTokenRes.data;

      await this.closeSession(decodedToken.sessionId, decodedToken.sub);

      await this.usersService.updateRefreshTokenHash(decodedToken.sub, null);

      const data: EndSessionResponse = {
        sessionEnded: true,
      };

      return createResponse(HttpStatus.OK, Messages.S25, data);
    } catch {
      const data: EndSessionResponse = { sessionEnded: false };
      return createResponse(HttpStatus.OK, Messages.S25, data);
    }
  }

  private async createActiveSession(
    userId: string,
    authProvider: AuthProvider,
  ): Promise<AppResponse> {
    return this.authDao.createSession(userId, authProvider, this.formatDateToIst(new Date()));
  }

  private async closeSession(sessionId: string, userId: string): Promise<AppResponse> {
    return this.authDao.closeSession(sessionId, userId, this.formatDateToIst(new Date()));
  }

  private async closeExistingActiveSessions(userId: string): Promise<AppResponse> {
    return this.authDao.closeActiveSessions(userId, this.formatDateToIst(new Date()));
  }

  private async exchangeMicrosoftCodeForTokens(
    microsoftAuthCodeDto: MicrosoftAuthCodeDto,
  ): Promise<AppResponse> {
    try {
      const microsoftClientId = this.appConfigService.microsoftClientId;
      const microsoftTenantId = this.appConfigService.microsoftTenantId;
      const microsoftClientSecret = this.appConfigService.microsoftClientSecret;
      const configuredRedirectUri = this.appConfigService.microsoftRedirectUri;

      if (!microsoftClientId || !microsoftClientSecret) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W10);
      }

      if (microsoftAuthCodeDto.redirectUri !== configuredRedirectUri) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W11);
      }

      const tokenEndpoint = `https://login.microsoftonline.com/${microsoftTenantId}/oauth2/v2.0/token`;

      const body = new URLSearchParams();
      body.set('client_id', microsoftClientId);
      body.set('client_secret', microsoftClientSecret);
      body.set('grant_type', 'authorization_code');
      body.set('code', microsoftAuthCodeDto.code);
      body.set('redirect_uri', microsoftAuthCodeDto.redirectUri);
      body.set('scope', 'openid profile email User.Read');

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      const tokenResponse = (await response.json()) as MicrosoftTokenResponse;

      if (!response.ok || tokenResponse.error) {
        return createResponse(
          HttpStatus.UNAUTHORIZED,
          tokenResponse.error_description || Messages.W12,
        );
      }

      return createResponse(HttpStatus.OK, Messages.S3, tokenResponse);
    } catch (error: any) {
      if (error?.statusCode) {
        return createResponse(error.statusCode, error.message);
      }
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  private async verifyMicrosoftIdToken(
    idToken: string,
    expectedNonce?: string,
  ): Promise<AppResponse> {
    try {
      const microsoftClientId = this.appConfigService.microsoftClientId;
      const microsoftTenantId =
        this.appConfigService.microsoftTenantId || 'common';

      if (!microsoftClientId) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W10);
      }

      const jwksUrl = new URL(
        `https://login.microsoftonline.com/${microsoftTenantId}/discovery/v2.0/keys`,
      );

      const jwks = createRemoteJWKSet(jwksUrl);

      const verifyOptions =
        microsoftTenantId === 'common' ||
        microsoftTenantId === 'organizations' ||
        microsoftTenantId === 'consumers'
          ? {
              audience: microsoftClientId,
            }
          : {
              audience: microsoftClientId,
              issuer: `https://login.microsoftonline.com/${microsoftTenantId}/v2.0`,
            };

      const { payload } = await jwtVerify(idToken, jwks, verifyOptions);

      const validateRes = this.validateMicrosoftPayload(payload, expectedNonce);
      if (validateRes.code !== HttpStatus.OK) {
        return validateRes;
      }

      const microsoftIdRes = this.getMicrosoftId(payload);
      if (microsoftIdRes.code !== HttpStatus.OK) {
        return microsoftIdRes;
      }
      const microsoftId = microsoftIdRes.data;

      const emailRes = this.getMicrosoftEmail(payload);
      if (emailRes.code !== HttpStatus.OK) {
        return emailRes;
      }
      const email = emailRes.data;

      const name = this.getMicrosoftName(payload, email);

      const profile: VerifiedMicrosoftProfile = {
        microsoftId,
        email,
        name,
      };

      return createResponse(HttpStatus.OK, Messages.S3, profile);
    } catch {
      return createResponse(HttpStatus.UNAUTHORIZED, Messages.W13);
    }
  }

  private validateMicrosoftPayload(
    payload: JWTPayload,
    expectedNonce?: string,
  ): AppResponse {
    const issuer = String(payload.iss || '');

    if (!issuer.startsWith('https://login.microsoftonline.com/')) {
      return createResponse(HttpStatus.UNAUTHORIZED, Messages.W13);
    }

    if (!payload.sub && !payload.oid) {
      return createResponse(HttpStatus.UNAUTHORIZED, Messages.W13);
    }

    if (expectedNonce) {
      const tokenNonce = String(payload.nonce || '');

      if (!tokenNonce || tokenNonce !== expectedNonce) {
        return createResponse(HttpStatus.UNAUTHORIZED, Messages.W13);
      }
    }

    return createResponse(HttpStatus.OK, Messages.S3);
  }

  private getMicrosoftId(payload: JWTPayload): AppResponse {
    const microsoftId = String(payload.oid || payload.sub || '').trim();

    if (!microsoftId) {
      return createResponse(HttpStatus.UNAUTHORIZED, Messages.W14);
    }

    return createResponse(HttpStatus.OK, Messages.S3, microsoftId);
  }

  private getMicrosoftEmail(payload: JWTPayload): AppResponse {
    const email = String(
      payload.preferred_username || payload.email || payload.upn || '',
    )
      .toLowerCase()
      .trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return createResponse(HttpStatus.UNAUTHORIZED, Messages.W15);
    }

    return createResponse(HttpStatus.OK, Messages.S3, email);
  }

  private getMicrosoftName(payload: JWTPayload, email: string): string {
    const name = String(payload.name || '').trim();

    if (name) {
      return name;
    }

    return email.split('@')[0];
  }

  private formatDateToIst(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<AppResponse> {
    try {
      const decoded = await this.jwtService.verifyAsync<JwtUserPayload>(refreshToken, {
        secret: this.appConfigService.jwtRefreshSecret,
      });
      return createResponse(HttpStatus.OK, Messages.S3, decoded);
    } catch {
      return createResponse(HttpStatus.UNAUTHORIZED, Messages.W9);
    }
  }

  private async generateAndSaveTokens(params: {
    user: AuthUserResponse;
    sessionId: string;
  }): Promise<AppResponse> {
    try {
      const userPayload: JwtUserPayload = {
        sub: params.user.id,
        email: params.user.email,
        name: params.user.name,
        authProvider: params.user.authProvider,
        sessionId: params.sessionId,
      };

      const accessToken = await this.jwtService.signAsync(userPayload, {
        secret: this.appConfigService.jwtAccessSecret,
        expiresIn: this.appConfigService.jwtAccessExpiresIn as any,
      });

      const refreshToken = await this.jwtService.signAsync(userPayload, {
        secret: this.appConfigService.jwtRefreshSecret,
        expiresIn: this.appConfigService.jwtRefreshExpiresIn as any,
      });

      const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

      const saveSessionRes = await this.authDao.saveSessionRefreshToken(params.sessionId, params.user.id, refreshTokenHash);

      if (saveSessionRes.code !== HttpStatus.OK) {
        return saveSessionRes;
      }

      const updateHashRes = await this.usersService.updateRefreshTokenHash(
        params.user.id,
        refreshTokenHash,
      );

      if (updateHashRes && updateHashRes.code !== undefined && updateHashRes.code !== HttpStatus.OK) {
        return updateHashRes;
      }

      const data: LoginResponse = {
        user: params.user,
        accessToken,
        refreshToken,
      };

      return createResponse(HttpStatus.OK, Messages.S3, data);
    } catch (error: any) {
      if (error?.statusCode) {
        return createResponse(error.statusCode, error.message);
      }
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }
}
