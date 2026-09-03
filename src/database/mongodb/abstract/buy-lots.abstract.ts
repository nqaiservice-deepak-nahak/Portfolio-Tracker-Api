import type { AppResponse } from '../../../shared/appresponse.shared';
import { BuyLot } from '../../schemas/buy-lot.schema';

export abstract class AbstractBuyLotsDao {
  abstract createBuyLot(data: Partial<BuyLot>): Promise<AppResponse>;
  abstract listBuyLotsForTrade(tradeId: string): Promise<AppResponse>;
  abstract listBuyLotsForTrades(tradeIds: string[]): Promise<AppResponse>;
  abstract updateBuyLot(
    buyLotId: string,
    data: Partial<BuyLot>,
  ): Promise<AppResponse>;
}
