import type { AppResponse } from '../../../shared/appresponse.shared';
import { Trade } from '../../schemas/trade.schema';
import { TradeSell } from '../../schemas/trade-sell.schema';

export abstract class AbstractTradesDao {
  abstract createTrade(data: Partial<Trade>): Promise<AppResponse>;
  abstract listTrades(
    userId: string,
    includeArchived: boolean,
  ): Promise<AppResponse>;
  abstract findTrade(
    userId: string,
    tradeId: string,
  ): Promise<AppResponse>;
  abstract updateTrade(
    userId: string,
    tradeId: string,
    data: Partial<Trade>,
  ): Promise<AppResponse>;
  abstract createSell(data: Partial<TradeSell>): Promise<AppResponse>;
  abstract listSells(
    userId: string,
    tradeId: string,
  ): Promise<AppResponse>;
  abstract listSellsForTrades(
    userId: string,
    tradeIds: string[],
  ): Promise<AppResponse>;
  abstract updateTradeStatusAndPrice(
    userId: string,
    tradeId: string,
    status: Trade['status'],
    currentPrice: number,
  ): Promise<AppResponse>;
}
