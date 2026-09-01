import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { AppResponse } from '../../../shared/appresponse.shared';
import { createResponse } from '../../../shared/appresponse.shared';
import { messageFactory, Messages } from '../../../shared/messages.shared';
import { Trade, TradeDocument, TradeStatus } from '../../schemas/trade.schema';
import { TradeSell, TradeSellDocument } from '../../schemas/trade-sell.schema';
import { AbstractTradesDao } from '../abstract/trades.abstract';

@Injectable()
export class TradesDao implements AbstractTradesDao {
  constructor(
    @InjectModel(Trade.name)
    private readonly tradeModel: Model<TradeDocument>,
    @InjectModel(TradeSell.name)
    private readonly tradeSellModel: Model<TradeSellDocument>,
  ) {}

  async createTrade(data: Partial<Trade>): Promise<AppResponse> {
    try {
      const trade = await this.tradeModel.create(data);
      return createResponse(HttpStatus.CREATED, Messages.S17, trade);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async listTrades(
    userId: string,
    includeArchived: boolean,
  ): Promise<AppResponse> {
    try {
      const query: Record<string, unknown> = { userId };
      if (!includeArchived) query.isActive = true;
      const trades = await this.tradeModel
        .find(query)
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

  async findTrade(
    userId: string,
    tradeId: string,
  ): Promise<AppResponse> {
    try {
      const trade = await this.tradeModel
        .findOne({ _id: tradeId, userId })
        .exec();
      if (!trade) {
        return createResponse(
          HttpStatus.NOT_FOUND,
          messageFactory(Messages.W5, ['Trade']),
        );
      }
      return createResponse(HttpStatus.OK, Messages.S19, trade);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async updateTrade(
    userId: string,
    tradeId: string,
    data: Partial<Trade>,
  ): Promise<AppResponse> {
    try {
      const res = await this.tradeModel
        .updateOne({ _id: tradeId, userId }, { $set: data })
        .exec();
      if (res.matchedCount === 0) {
        return createResponse(
          HttpStatus.NOT_FOUND,
          messageFactory(Messages.W5, ['Trade']),
        );
      }
      return createResponse(HttpStatus.OK, Messages.S20);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async createSell(data: Partial<TradeSell>): Promise<AppResponse> {
    try {
      const sell = await this.tradeSellModel.create(data);
      return createResponse(HttpStatus.CREATED, Messages.S22, sell);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async listSells(
    userId: string,
    tradeId: string,
  ): Promise<AppResponse> {
    try {
      const sells = await this.tradeSellModel
        .find({ userId, tradeId })
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

  async listSellsForTrades(
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

  async updateTradeStatusAndPrice(
    userId: string,
    tradeId: string,
    status: TradeStatus,
    currentPrice: number,
  ): Promise<AppResponse> {
    try {
      const res = await this.tradeModel
        .updateOne(
          { _id: tradeId, userId },
          { $set: { status, currentPrice } },
        )
        .exec();
      if (res.matchedCount === 0) {
        return createResponse(
          HttpStatus.NOT_FOUND,
          messageFactory(Messages.W5, ['Trade']),
        );
      }
      return createResponse(HttpStatus.OK, Messages.S20);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }
}
