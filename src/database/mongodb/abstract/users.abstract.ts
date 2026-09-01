import type { AppResponse } from '../../../shared/appresponse.shared';

export abstract class AbstractUsersDao {
  abstract findByEmail(email: string): Promise<AppResponse>;
  abstract findById(
    userId: string,
    includeSecrets?: boolean,
  ): Promise<AppResponse>;
  abstract updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<AppResponse>;
}
