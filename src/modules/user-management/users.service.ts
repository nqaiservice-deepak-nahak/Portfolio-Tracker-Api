import { HttpStatus, Injectable } from '@nestjs/common';

import { AbstractUsersDao } from '../../database/mongodb/abstract/users.abstract';
import { UsersAbstract } from './users.abstract';
import type { AppResponse } from '../../shared/appresponse.shared';
import { createResponse } from '../../shared/appresponse.shared';
import { Messages } from '../../shared/messages.shared';

@Injectable()
export class UsersService implements UsersAbstract {
  constructor(private readonly usersDao: AbstractUsersDao) {}

  async findByEmail(email: string): Promise<AppResponse> {
    try {
      const result = await this.usersDao.findByEmail(email);
      if (result.code !== HttpStatus.OK) {
        return result;
      }
      return createResponse(HttpStatus.OK, Messages.S3, result.data);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async findByIdWithRefreshToken(userId: string): Promise<AppResponse> {
    try {
      const result = await this.usersDao.findById(userId, true);
      if (result.code !== HttpStatus.OK) {
        return result;
      }
      return createResponse(HttpStatus.OK, Messages.S3, result.data);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async findProfileById(userId: string): Promise<AppResponse> {
    try {
      const result = await this.usersDao.findById(userId);
      if (result.code !== HttpStatus.OK) {
        return result;
      }
      return createResponse(HttpStatus.OK, Messages.S8, result.data);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<AppResponse> {
    try {
      const result = await this.usersDao.updateRefreshTokenHash(userId, refreshTokenHash);
      if (result.code !== HttpStatus.OK) {
        return result;
      }
      return createResponse(HttpStatus.OK, Messages.S3);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }
}
