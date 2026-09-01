import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { AppResponse } from '../../../shared/appresponse.shared';
import { createResponse } from '../../../shared/appresponse.shared';
import { Messages } from '../../../shared/messages.shared';
import {
  MutualFund,
  MutualFundDocument,
} from '../../schemas/mutual-fund.schema';
import {
  SipEntry,
  SipEntryDocument,
} from '../../schemas/sip-entry.schema';
import { Trade, TradeDocument } from '../../schemas/trade.schema';
import {
  TradeSell,
  TradeSellDocument,
} from '../../schemas/trade-sell.schema';
import { AbstractDashboardDao } from '../abstract/dashboard.abstract';

@Injectable()
export class DashboardDao implements AbstractDashboardDao {
  constructor(
    @InjectModel(MutualFund.name)
    private readonly mutualFundModel: Model<MutualFundDocument>,
    @InjectModel(SipEntry.name)
    private readonly sipEntryModel: Model<SipEntryDocument>,
    @InjectModel(Trade.name)
    private readonly tradeModel: Model<TradeDocument>,
    @InjectModel(TradeSell.name)
    private readonly tradeSellModel: Model<TradeSellDocument>,
  ) {}

  async getActiveFunds(userId: string): Promise<AppResponse> {
    try {
      const funds = await this.mutualFundModel
        .find({ userId, isActive: true })
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

  async getSipEntriesForFunds(
    userId: string,
    fundIds: string[],
  ): Promise<AppResponse> {
    try {
      const entries = await this.sipEntryModel
        .find({ userId, fundId: { $in: fundIds } })
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

  async getActiveTrades(userId: string): Promise<AppResponse> {
    try {
      const trades = await this.tradeModel
        .find({ userId, isActive: true })
        .sort({ createdAt: -1 })
        .exec();
      return createResponse(HttpStatus.OK, Messages.S18, trades);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async getTradeSellsForTrades(
    userId: string,
    tradeIds: string[],
  ): Promise<AppResponse> {
    try {
      const sells = await this.tradeSellModel
        .find({ userId, tradeId: { $in: tradeIds } })
        .sort({ sellDate: 1 })
        .exec();
      return createResponse(HttpStatus.OK, Messages.S23, sells);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }
}
