import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AuthProvider } from '../../../core/enums/auth-provider.enum';
import type { AppResponse } from '../../../shared/appresponse.shared';
import { createResponse } from '../../../shared/appresponse.shared';
import { messageFactory, Messages } from '../../../shared/messages.shared';
import { User, UserDocument } from '../../schemas/user.schema';
import {
  UserSession,
  UserSessionDocument,
} from '../../schemas/user-session.schema';
import { AbstractAuthDao } from '../abstract/auth.abstract';

@Injectable()
export class AuthDao implements AbstractAuthDao {
  constructor(
    @InjectModel(User.name)
    private readonly users: Model<UserDocument>,
    @InjectModel(UserSession.name)
    private readonly sessions: Model<UserSessionDocument>,
  ) {}

  async findUserByEmail(email: string): Promise<AppResponse> {
    try {
      const user = await this.users
        .findOne({ email: email.toLowerCase().trim() })
        .exec();
      if (!user) {
        return createResponse(
          HttpStatus.NOT_FOUND,
          messageFactory(Messages.W5, ['User']),
        );
      }
      return createResponse(HttpStatus.OK, Messages.S3, user);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async findUserByMicrosoftId(
    microsoftId: string,
    provider?: AuthProvider,
  ): Promise<AppResponse> {
    try {
      const user = await this.users
        .findOne({
          microsoftId,
          ...(provider ? { authProvider: provider } : {}),
        })
        .select('+passwordHash +refreshTokenHash')
        .exec();
      if (!user) {
        return createResponse(
          HttpStatus.NOT_FOUND,
          messageFactory(Messages.W5, ['User']),
        );
      }
      return createResponse(HttpStatus.OK, Messages.S3, user);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async findUserById(userId: string): Promise<AppResponse> {
    try {
      const user = await this.users.findById(userId).exec();
      if (!user) {
        return createResponse(
          HttpStatus.NOT_FOUND,
          messageFactory(Messages.W5, ['User']),
        );
      }
      return createResponse(HttpStatus.OK, Messages.S3, user);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async createUser(user: Partial<User>): Promise<AppResponse> {
    try {
      const created = await this.users.create(user);
      return createResponse(HttpStatus.CREATED, Messages.S4, created);
    } catch (error: any) {
      if (error?.code === 11000) {
        return createResponse(HttpStatus.CONFLICT, Messages.W6);
      }
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async updateUserName(userId: string, name: string): Promise<AppResponse> {
    try {
      const res = await this.users
        .updateOne({ _id: userId }, { $set: { name } })
        .exec();
      if (res.matchedCount === 0) {
        return createResponse(
          HttpStatus.NOT_FOUND,
          messageFactory(Messages.W5, ['User']),
        );
      }
      return createResponse(HttpStatus.OK, Messages.S3);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async createSession(
    userId: string,
    provider: AuthProvider,
    loginAt: string,
  ): Promise<AppResponse> {
    try {
      const session = await this.sessions.create({
        userId,
        authProvider: provider,
        loginAt,
        logoutAt: null,
        refreshTokenHash: null,
        isActive: true,
      });
      return createResponse(HttpStatus.CREATED, Messages.S3, session);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async findActiveSession(
    sessionId: string,
    userId: string,
  ): Promise<AppResponse> {
    try {
      const session = await this.sessions
        .findOne({
          _id: sessionId,
          userId,
          isActive: true,
          logoutAt: null,
        })
        .select('+refreshTokenHash')
        .exec();
      if (!session) {
        return createResponse(
          HttpStatus.UNAUTHORIZED,
          Messages.W9,
        );
      }
      return createResponse(HttpStatus.OK, Messages.S3, session);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async closeSession(
    sessionId: string,
    userId: string,
    logoutAt: string,
  ): Promise<AppResponse> {
    try {
      const res = await this.sessions
        .updateOne(
          { _id: sessionId, userId, isActive: true, logoutAt: null },
          {
            $set: {
              logoutAt,
              isActive: false,
              refreshTokenHash: null,
            },
          },
        )
        .exec();
      return createResponse(HttpStatus.OK, Messages.S7, {
        modified: res.modifiedCount,
      });
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async closeActiveSessions(
    userId: string,
    logoutAt: string,
  ): Promise<AppResponse> {
    try {
      const res = await this.sessions
        .updateMany(
          { userId, isActive: true, logoutAt: null },
          {
            $set: {
              logoutAt,
              isActive: false,
              refreshTokenHash: null,
            },
          },
        )
        .exec();
      return createResponse(HttpStatus.OK, Messages.S3, {
        modified: res.modifiedCount,
      });
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async saveSessionRefreshToken(
    sessionId: string,
    userId: string,
    hash: string,
  ): Promise<AppResponse> {
    try {
      const res = await this.sessions
        .updateOne(
          { _id: sessionId, userId },
          { $set: { refreshTokenHash: hash, isActive: true } },
        )
        .exec();
      if (res.matchedCount === 0) {
        return createResponse(
          HttpStatus.NOT_FOUND,
          messageFactory(Messages.W5, ['Session']),
        );
      }
      return createResponse(HttpStatus.OK, Messages.S3);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }
}
