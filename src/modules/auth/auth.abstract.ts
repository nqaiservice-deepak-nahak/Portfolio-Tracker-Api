import type { AppResponse } from '../../shared/appresponse.shared';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { MicrosoftAuthCodeDto } from './dto/microsoft-auth-code.dto';

export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  authProvider: string;
}

export interface LoginResponse {
  user: AuthUserResponse;
  accessToken: string;
  refreshToken: string;
}

export interface LogoutResponse {
  loggedOut: boolean;
}

export interface EndSessionResponse {
  sessionEnded: boolean;
}

export abstract class AuthAbstract {
  abstract register(registerDto: RegisterDto): Promise<AppResponse>;

  abstract login(loginDto: LoginDto): Promise<AppResponse>;

  abstract refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AppResponse>;

  abstract logout(logoutDto: LogoutDto): Promise<AppResponse>;

  abstract endSession(endSessionDto: EndSessionDto): Promise<AppResponse>;

  abstract microsoftCodeRegister(microsoftAuthCodeDto: MicrosoftAuthCodeDto): Promise<AppResponse>;

  abstract microsoftCodeLogin(microsoftAuthCodeDto: MicrosoftAuthCodeDto): Promise<AppResponse>;
}
