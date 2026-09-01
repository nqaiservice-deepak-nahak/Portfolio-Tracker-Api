import type { AppResponse } from '../../shared/appresponse.shared';

export abstract class UsersAbstract {
  abstract findByEmail(email: string): Promise<AppResponse>;

  abstract findByIdWithRefreshToken(userId: string): Promise<AppResponse>;

  abstract findProfileById(userId: string): Promise<AppResponse>;

  abstract updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<AppResponse>;
}
