import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { AppResponse } from '../../../shared/appresponse.shared';
import { createResponse } from '../../../shared/appresponse.shared';
import { messageFactory, Messages } from '../../../shared/messages.shared';
import { BuyLot, BuyLotDocument } from '../../schemas/buy-lot.schema';
import { AbstractBuyLotsDao } from '../abstract/buy-lots.abstract';

@Injectable()
export class BuyLotsDao implements AbstractBuyLotsDao {
  constructor(
    @InjectModel(BuyLot.name)
    private readonly buyLotModel: Model<BuyLotDocument>,
  ) {}

  async createBuyLot(data: Partial<BuyLot>): Promise<AppResponse> {
    try {
      const buyLot = await this.buyLotModel.create(data);
      // We'll reuse S17 (Trade created successfully) or simply S2 (Success) 
      // but it's internal so message matters less.
      return createResponse(HttpStatus.CREATED, Messages.S2, buyLot);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async listBuyLotsForTrade(tradeId: string): Promise<AppResponse> {
    try {
      const buyLots = await this.buyLotModel
        .find({ tradeId })
        .sort({ buyDate: 1 })
        .exec();
      return createResponse(HttpStatus.OK, Messages.S2, buyLots);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async listBuyLotsForTrades(tradeIds: string[]): Promise<AppResponse> {
    try {
      const buyLots = await this.buyLotModel
        .find({ tradeId: { $in: tradeIds } })
        .sort({ buyDate: 1 })
        .exec();
      return createResponse(HttpStatus.OK, Messages.S2, buyLots);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }


  async updateBuyLot(
    buyLotId: string,
    data: Partial<BuyLot>,
  ): Promise<AppResponse> {
    try {
      const res = await this.buyLotModel
        .updateOne({ _id: buyLotId }, { $set: data })
        .exec();
      if (res.matchedCount === 0) {
        return createResponse(
          HttpStatus.NOT_FOUND,
          messageFactory(Messages.W5, ['Buy Lot']),
        );
      }
      return createResponse(HttpStatus.OK, Messages.S2);
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }
}
