import type { AppResponse } from '../../../shared/appresponse.shared';
import { AuthProvider } from '../../../core/enums/auth-provider.enum';
import { User } from '../../schemas/user.schema';
import { UserSessionDocument } from '../../schemas/user-session.schema';

export abstract class AbstractAuthDao {
  abstract findUserByEmail(email: string): Promise<AppResponse>;
  abstract findUserByMicrosoftId(
    microsoftId: string,
    provider?: AuthProvider,
  ): Promise<AppResponse>;
  abstract findUserById(userId: string): Promise<AppResponse>;
  abstract createUser(user: Partial<User>): Promise<AppResponse>;
  abstract updateUserName(userId: string, name: string): Promise<AppResponse>;
  abstract createSession(
    userId: string,
    provider: AuthProvider,
    loginAt: string,
  ): Promise<AppResponse>;
  abstract findActiveSession(
    sessionId: string,
    userId: string,
  ): Promise<AppResponse>;
  abstract closeSession(
    sessionId: string,
    userId: string,
    logoutAt: string,
  ): Promise<AppResponse>;
  abstract closeActiveSessions(
    userId: string,
    logoutAt: string,
  ): Promise<AppResponse>;
  abstract saveSessionRefreshToken(
    sessionId: string,
    userId: string,
    hash: string,
  ): Promise<AppResponse>;
}
