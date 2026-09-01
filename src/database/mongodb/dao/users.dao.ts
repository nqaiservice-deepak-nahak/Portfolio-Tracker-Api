import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { AppResponse } from '../../../shared/appresponse.shared';
import { createResponse } from '../../../shared/appresponse.shared';
import { messageFactory, Messages } from '../../../shared/messages.shared';
import { User, UserDocument } from '../../schemas/user.schema';
import { AbstractUsersDao } from '../abstract/users.abstract';

@Injectable()
export class UsersDao implements AbstractUsersDao {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string): Promise<AppResponse> {
    try {
      const user = await this.userModel
        .findOne({ email: email.toLowerCase().trim() })
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

  async findById(
    userId: string,
    includeSecrets = false,
  ): Promise<AppResponse> {
    try {
      const query = this.userModel.findById(userId);
      if (includeSecrets) {
        query.select('+passwordHash +refreshTokenHash');
      }
      const user = await query.exec();
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

  async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<AppResponse> {
    try {
      const res = await this.userModel
        .updateOne(
          { _id: userId },
          { $set: { refreshTokenHash } },
        )
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
}
