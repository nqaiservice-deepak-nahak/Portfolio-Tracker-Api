import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { AppResponse } from '../../../shared/appresponse.shared';
import { createResponse } from '../../../shared/appresponse.shared';
import { messageFactory, Messages } from '../../../shared/messages.shared';
import {
  MutualFund,
  MutualFundDocument,
} from '../../schemas/mutual-fund.schema';
import {
  SipEntry,
  SipEntryDocument,
} from '../../schemas/sip-entry.schema';
import { AbstractMutualFundsDao } from '../abstract/mutual-funds.abstract';

@Injectable()
export class MutualFundsDao implements AbstractMutualFundsDao {
  constructor(
    @InjectModel(MutualFund.name)
    private readonly funds: Model<MutualFundDocument>,
    @InjectModel(SipEntry.name)
    private readonly entries: Model<SipEntryDocument>,
  ) {}

  async createFund(data: Partial<MutualFund>): Promise<AppResponse> {
    try {
      const fund = await this.funds.create(data);
      return createResponse(HttpStatus.CREATED, Messages.S9, fund);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async listFunds(
    userId: string,
    includeArchived: boolean,
  ): Promise<AppResponse> {
    try {
      const funds = await this.funds
        .find({
          userId,
          ...(includeArchived ? {} : { isActive: true }),
        })
        .sort({ createdAt: -1 })
        .exec();
      return createResponse(HttpStatus.OK, Messages.S10, funds);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async findFund(
    userId: string,
    fundId: string,
  ): Promise<AppResponse> {
    try {
      const fund = await this.funds
        .findOne({ _id: fundId, userId })
        .exec();
      if (!fund) {
        return createResponse(
          HttpStatus.NOT_FOUND,
          messageFactory(Messages.W5, ['Mutual fund']),
        );
      }
      return createResponse(HttpStatus.OK, Messages.S11, fund);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async updateFund(
    userId: string,
    fundId: string,
    data: Partial<MutualFund>,
  ): Promise<AppResponse> {
    try {
      const res = await this.funds
        .updateOne({ _id: fundId, userId }, { $set: data })
        .exec();
      if (res.matchedCount === 0) {
        return createResponse(
          HttpStatus.NOT_FOUND,
          messageFactory(Messages.W5, ['Mutual fund']),
        );
      }
      return createResponse(HttpStatus.OK, Messages.S12);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async createSipEntry(data: Partial<SipEntry>): Promise<AppResponse> {
    try {
      const entry = await this.entries.create(data);
      return createResponse(HttpStatus.CREATED, Messages.S14, entry);
    } catch (error: any) {
      if (error?.code === 11000) {
        return createResponse(HttpStatus.CONFLICT, Messages.W23);
      }
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async findSipEntry(
    userId: string,
    fundId: string,
    month: string,
  ): Promise<AppResponse> {
    try {
      const entry = await this.entries
        .findOne({ userId, fundId, month })
        .exec();
      if (!entry) {
        return createResponse(
          HttpStatus.NOT_FOUND,
          messageFactory(Messages.W5, ['SIP entry']),
        );
      }
      return createResponse(HttpStatus.OK, Messages.S15, entry);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async listSipEntries(
    userId: string,
    fundId: string | string[],
  ): Promise<AppResponse> {
    try {
      const entries = await this.entries
        .find({
          userId,
          fundId: Array.isArray(fundId) ? { $in: fundId } : fundId,
        })
        .sort({ month: 1 })
        .exec();
      return createResponse(HttpStatus.OK, Messages.S15, entries);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }
}
