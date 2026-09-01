import type { AppResponse } from '../../shared/appresponse.shared';
import { CreateTradeDto } from './dto/create-trade.dto';
import { UpdateTradeDto } from './dto/update-trade.dto';
import { CreateTradeSellDto } from './dto/create-trade-sell.sto';

export interface TradeSellSummary {
  id: string;
  tradeId: string;
  sellDate: Date;
  quantity: number;
  sellPrice: number;
  grossSellValue: number;
  brokerage: number;
  charges: number;
  netSellValue: number;
  realizedProfitLoss: number;
  displayGrossSellValue: string;
  displayNetSellValue: string;
  displayRealizedProfitLoss: string;
  notes: string;
}

export interface TradeSummary {
  id: string;
  stockSymbol: string;
  companyName: string;
  buyDate: Date;
  buyPrice: number;
  quantity: number;
  soldQuantity: number;
  remainingQuantity: number;
  brokerage: number;
  charges: number;
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  notes: string;
  status: string;
  isActive: boolean;
  grossBuyValue: number;
  totalBuyCost: number;
  averageBuyCost: number;
  realizedProfitLoss: number;
  unrealizedProfitLoss: number;
  totalProfitLoss: number;
  profitLossPercentage: number;
  displayTotalBuyCost: string;
  displayRealizedProfitLoss: string;
  displayUnrealizedProfitLoss: string;
  displayTotalProfitLoss: string;
  sells: TradeSellSummary[];
}

export abstract class TradesAbstract {
  abstract createTrade(
    userId: string,
    createTradeDto: CreateTradeDto,
  ): Promise<AppResponse>;

  abstract listTrades(
    userId: string,
    includeArchived?: boolean,
  ): Promise<AppResponse>;

  abstract getTradeById(
    userId: string,
    tradeId: string,
  ): Promise<AppResponse>;

  abstract updateTrade(
    userId: string,
    tradeId: string,
    updateTradeDto: UpdateTradeDto,
  ): Promise<AppResponse>;

  abstract archiveTrade(
    userId: string,
    tradeId: string,
  ): Promise<AppResponse>;

  abstract createSell(
    userId: string,
    tradeId: string,
    createTradeSellDto: CreateTradeSellDto,
  ): Promise<AppResponse>;

  abstract listSells(
    userId: string,
    tradeId: string,
  ): Promise<AppResponse>;
}
