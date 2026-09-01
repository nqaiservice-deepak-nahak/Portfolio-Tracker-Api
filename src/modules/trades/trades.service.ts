import { HttpStatus, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

import type { AppResponse } from '../../shared/appresponse.shared';
import { createResponse } from '../../shared/appresponse.shared';
import { messageFactory, Messages } from '../../shared/messages.shared';
import { AbstractTradesDao } from '../../database/mongodb/abstract/trades.abstract';
import {
  Trade,
  TradeDocument,
  TradeStatus,
} from '../../database/schemas/trade.schema';
import { TradeSellDocument } from '../../database/schemas/trade-sell.schema';
import { CreateTradeDto } from './dto/create-trade.dto';
import { UpdateTradeDto } from './dto/update-trade.dto';
import { CreateTradeSellDto } from './dto/create-trade-sell.sto';
import {
  TradesAbstract,
  TradeSummary,
  TradeSellSummary,
} from './trades.abstract';

@Injectable()
export class TradesService extends TradesAbstract {
  constructor(private readonly tradesDao: AbstractTradesDao) {
    super();
  }

  async createTrade(
    userId: string,
    createTradeDto: CreateTradeDto,
  ): Promise<AppResponse> {
    try {
      if (createTradeDto.quantity <= 0) {
        return createResponse(HttpStatus.BAD_REQUEST, Messages.W24);
      }

      if (createTradeDto.buyPrice <= 0) {
        return createResponse(HttpStatus.BAD_REQUEST, Messages.W25);
      }

      const buyDate = new Date(createTradeDto.buyDate);
      if (isNaN(buyDate.getTime())) {
        return createResponse(HttpStatus.BAD_REQUEST, Messages.W26);
      }
      if (buyDate > new Date()) {
        return createResponse(HttpStatus.BAD_REQUEST, Messages.W27);
      }

      const createRes = await this.tradesDao.createTrade({
        userId,
        stockSymbol: createTradeDto.stockSymbol.trim().toUpperCase(),
        companyName: createTradeDto.companyName.trim(),
        buyDate: buyDate,
        buyPrice: createTradeDto.buyPrice,
        quantity: createTradeDto.quantity,
        brokerage: createTradeDto.brokerage || 0,
        charges: createTradeDto.charges || 0,
        currentPrice: createTradeDto.currentPrice || createTradeDto.buyPrice,
        targetPrice: createTradeDto.targetPrice || 0,
        stopLoss: createTradeDto.stopLoss || 0,
        notes: createTradeDto.notes?.trim() || '',
        status: TradeStatus.OPEN,
        isActive: true,
        archivedAt: null,
      });

      if (createRes.code !== HttpStatus.CREATED) {
        return createRes;
      }

      const trade = createRes.data as TradeDocument;
      const summary = this.buildTradeSummary(trade, []);

      return createResponse(HttpStatus.CREATED, Messages.S17, summary);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async listTrades(
    userId: string,
    includeArchived = false,
  ): Promise<AppResponse> {
    try {
      const tradesRes = await this.tradesDao.listTrades(userId, includeArchived);
      if (tradesRes.code !== HttpStatus.OK) {
        return tradesRes;
      }

      const trades = tradesRes.data as TradeDocument[];
      const tradeIds = trades.map((trade) => trade._id.toString());

      let sells: TradeSellDocument[] = [];
      if (tradeIds.length > 0) {
        const sellsRes = await this.tradesDao.listSellsForTrades(userId, tradeIds);
        if (sellsRes.code !== HttpStatus.OK) {
          return sellsRes;
        }
        sells = sellsRes.data as TradeSellDocument[];
      }

      const summaries = trades.map((trade) => {
        const tradeSells = sells.filter(
          (sell) => sell.tradeId.toString() === trade._id.toString(),
        );
        return this.buildTradeSummary(trade, tradeSells);
      });

      return createResponse(HttpStatus.OK, Messages.S18, summaries);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async getTradeById(
    userId: string,
    tradeId: string,
  ): Promise<AppResponse> {
    try {
      const tradeRes = await this.findUserTrade(userId, tradeId);
      if (tradeRes.code !== HttpStatus.OK) {
        return tradeRes;
      }
      const trade = tradeRes.data as TradeDocument;

      const sellsRes = await this.tradesDao.listSells(userId, tradeId);
      if (sellsRes.code !== HttpStatus.OK) {
        return sellsRes;
      }
      const sells = sellsRes.data as TradeSellDocument[];

      const summary = this.buildTradeSummary(trade, sells);
      return createResponse(HttpStatus.OK, Messages.S19, summary);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async updateTrade(
    userId: string,
    tradeId: string,
    updateTradeDto: UpdateTradeDto,
  ): Promise<AppResponse> {
    try {
      const tradeRes = await this.findUserTrade(userId, tradeId);
      if (tradeRes.code !== HttpStatus.OK) {
        return tradeRes;
      }
      const trade = tradeRes.data as TradeDocument;

      const sellsRes = await this.tradesDao.listSells(userId, tradeId);
      if (sellsRes.code !== HttpStatus.OK) {
        return sellsRes;
      }
      const sells = sellsRes.data as TradeSellDocument[];

      const soldQuantity = this.calculateSoldQuantity(sells);

      if (
        updateTradeDto.quantity !== undefined &&
        updateTradeDto.quantity < soldQuantity
      ) {
        return createResponse(HttpStatus.BAD_REQUEST, Messages.W29);
      }

      const updatePayload: Partial<Trade> = {};

      if (updateTradeDto.stockSymbol !== undefined) {
        updatePayload.stockSymbol = updateTradeDto.stockSymbol
          .trim()
          .toUpperCase();
      }

      if (updateTradeDto.companyName !== undefined) {
        updatePayload.companyName = updateTradeDto.companyName.trim();
      }

      if (updateTradeDto.buyDate !== undefined) {
        const newBuyDate = new Date(updateTradeDto.buyDate);

        if (isNaN(newBuyDate.getTime())) {
          return createResponse(HttpStatus.BAD_REQUEST, Messages.W26);
        }

        const hasEarlierSell = sells.some(
          (sell) => new Date(sell.sellDate) < newBuyDate,
        );

        if (hasEarlierSell) {
          return createResponse(HttpStatus.BAD_REQUEST, Messages.W37);
        }

        updatePayload.buyDate = newBuyDate;
      }

      if (updateTradeDto.buyPrice !== undefined) {
        updatePayload.buyPrice = updateTradeDto.buyPrice;
      }

      if (updateTradeDto.quantity !== undefined) {
        updatePayload.quantity = updateTradeDto.quantity;
      }

      if (updateTradeDto.brokerage !== undefined) {
        updatePayload.brokerage = updateTradeDto.brokerage;
      }

      if (updateTradeDto.charges !== undefined) {
        updatePayload.charges = updateTradeDto.charges;
      }

      if (updateTradeDto.currentPrice !== undefined) {
        updatePayload.currentPrice = updateTradeDto.currentPrice;
      }

      if (updateTradeDto.targetPrice !== undefined) {
        updatePayload.targetPrice = updateTradeDto.targetPrice;
      }

      if (updateTradeDto.stopLoss !== undefined) {
        updatePayload.stopLoss = updateTradeDto.stopLoss;
      }

      if (updateTradeDto.notes !== undefined) {
        updatePayload.notes = updateTradeDto.notes.trim();
      }

      if (updateTradeDto.status !== undefined) {
        updatePayload.status = updateTradeDto.status;
        updatePayload.isActive = updateTradeDto.status !== TradeStatus.ARCHIVED;
        updatePayload.archivedAt =
          updateTradeDto.status === TradeStatus.ARCHIVED ? new Date() : null;
      }

      const updateRes = await this.tradesDao.updateTrade(
        userId,
        tradeId,
        updatePayload,
      );
      if (updateRes.code !== HttpStatus.OK) {
        return updateRes;
      }

      return this.getTradeById(userId, tradeId);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async archiveTrade(
    userId: string,
    tradeId: string,
  ): Promise<AppResponse> {
    try {
      const tradeRes = await this.findUserTrade(userId, tradeId);
      if (tradeRes.code !== HttpStatus.OK) {
        return tradeRes;
      }
      const trade = tradeRes.data as TradeDocument;

      const updateRes = await this.tradesDao.updateTrade(
        userId,
        trade._id.toString(),
        {
          status: TradeStatus.ARCHIVED,
          isActive: false,
          archivedAt: new Date(),
        },
      );
      if (updateRes.code !== HttpStatus.OK) {
        return updateRes;
      }

      return createResponse(HttpStatus.OK, Messages.S21, { archived: true });
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async createSell(
    userId: string,
    tradeId: string,
    createTradeSellDto: CreateTradeSellDto,
  ): Promise<AppResponse> {
    try {
      const tradeRes = await this.findUserTrade(userId, tradeId);
      if (tradeRes.code !== HttpStatus.OK) {
        return tradeRes;
      }
      const trade = tradeRes.data as TradeDocument;

      if (createTradeSellDto.quantity <= 0) {
        return createResponse(HttpStatus.BAD_REQUEST, Messages.W34);
      }

      if (createTradeSellDto.sellPrice <= 0) {
        return createResponse(HttpStatus.BAD_REQUEST, Messages.W35);
      }

      const sellDate = new Date(createTradeSellDto.sellDate);
      if (isNaN(sellDate.getTime())) {
        return createResponse(HttpStatus.BAD_REQUEST, Messages.W30);
      }

      if (sellDate < trade.buyDate) {
        return createResponse(HttpStatus.BAD_REQUEST, Messages.W31);
      }

      if (!trade.isActive || trade.status === TradeStatus.ARCHIVED) {
        return createResponse(HttpStatus.BAD_REQUEST, Messages.W32);
      }

      if (trade.status === TradeStatus.CLOSED) {
        return createResponse(HttpStatus.BAD_REQUEST, Messages.W33);
      }

      const sellsRes = await this.tradesDao.listSells(userId, tradeId);
      if (sellsRes.code !== HttpStatus.OK) {
        return sellsRes;
      }
      const sells = sellsRes.data as TradeSellDocument[];

      const soldQuantity = this.calculateSoldQuantity(sells);
      const remainingQuantity = trade.quantity - soldQuantity;

      if (createTradeSellDto.quantity > remainingQuantity) {
        return createResponse(
          HttpStatus.BAD_REQUEST,
          messageFactory(Messages.W36, [remainingQuantity.toString()]),
        );
      }

      const sellCreateRes = await this.tradesDao.createSell({
        userId,
        tradeId,
        sellDate: new Date(createTradeSellDto.sellDate),
        quantity: createTradeSellDto.quantity,
        sellPrice: createTradeSellDto.sellPrice,
        brokerage: createTradeSellDto.brokerage || 0,
        charges: createTradeSellDto.charges || 0,
        notes: createTradeSellDto.notes?.trim() || '',
      });
      if (sellCreateRes.code !== HttpStatus.CREATED) {
        return sellCreateRes;
      }

      const updatedSoldQuantity = soldQuantity + createTradeSellDto.quantity;
      const nextStatus =
        updatedSoldQuantity >= trade.quantity
          ? TradeStatus.CLOSED
          : TradeStatus.PARTIALLY_SOLD;

      const statusRes = await this.tradesDao.updateTradeStatusAndPrice(
        userId,
        tradeId,
        nextStatus,
        createTradeSellDto.sellPrice,
      );
      if (statusRes.code !== HttpStatus.OK) {
        return statusRes;
      }

      return this.getTradeById(userId, tradeId);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async listSells(
    userId: string,
    tradeId: string,
  ): Promise<AppResponse> {
    try {
      const tradeRes = await this.findUserTrade(userId, tradeId);
      if (tradeRes.code !== HttpStatus.OK) {
        return tradeRes;
      }
      const trade = tradeRes.data as TradeDocument;

      const sellsRes = await this.tradesDao.listSells(userId, tradeId);
      if (sellsRes.code !== HttpStatus.OK) {
        return sellsRes;
      }
      const sells = sellsRes.data as TradeSellDocument[];

      const averageBuyCost = this.calculateAverageBuyCost(trade);
      const summaries = sells.map((sell) =>
        this.buildSellSummary(sell, averageBuyCost),
      );

      return createResponse(HttpStatus.OK, Messages.S23, summaries);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  private async findUserTrade(
    userId: string,
    tradeId: string,
  ): Promise<AppResponse> {
    if (!Types.ObjectId.isValid(tradeId)) {
      return createResponse(
        HttpStatus.NOT_FOUND,
        messageFactory(Messages.W5, ['Trade']),
      );
    }

    return this.tradesDao.findTrade(userId, tradeId);
  }

  private buildTradeSummary(
    trade: TradeDocument,
    sells: TradeSellDocument[],
  ): TradeSummary {
    const soldQuantity = this.calculateSoldQuantity(sells);
    const remainingQuantity = trade.quantity - soldQuantity;
    const grossBuyValue = trade.buyPrice * trade.quantity;
    const totalBuyCost = this.calculateTotalBuyCost(trade);
    const averageBuyCost = this.calculateAverageBuyCost(trade);

    const sellSummaries = sells.map((sell) =>
      this.buildSellSummary(sell, averageBuyCost),
    );

    const realizedProfitLoss = sellSummaries.reduce(
      (sum, sell) => sum + sell.realizedProfitLoss,
      0,
    );

    const currentPrice = trade.currentPrice || trade.buyPrice;
    const unrealizedGrossValue = remainingQuantity * currentPrice;
    const remainingCost = remainingQuantity * averageBuyCost;
    const unrealizedProfitLoss = unrealizedGrossValue - remainingCost;
    const totalProfitLoss = realizedProfitLoss + unrealizedProfitLoss;
    const profitLossPercentage =
      totalBuyCost > 0 ? (totalProfitLoss / totalBuyCost) * 100 : 0;

    return {
      id: trade._id.toString(),
      stockSymbol: trade.stockSymbol,
      companyName: trade.companyName,
      buyDate: trade.buyDate,
      buyPrice: trade.buyPrice,
      quantity: trade.quantity,
      soldQuantity,
      remainingQuantity,
      brokerage: trade.brokerage,
      charges: trade.charges,
      currentPrice,
      targetPrice: trade.targetPrice,
      stopLoss: trade.stopLoss,
      notes: trade.notes,
      status: trade.status,
      isActive: trade.isActive,
      grossBuyValue: Number(grossBuyValue.toFixed(2)),
      totalBuyCost: Number(totalBuyCost.toFixed(2)),
      averageBuyCost: Number(averageBuyCost.toFixed(2)),
      realizedProfitLoss: Number(realizedProfitLoss.toFixed(2)),
      unrealizedProfitLoss: Number(unrealizedProfitLoss.toFixed(2)),
      totalProfitLoss: Number(totalProfitLoss.toFixed(2)),
      profitLossPercentage: Number(profitLossPercentage.toFixed(2)),
      displayTotalBuyCost: this.formatCurrency(totalBuyCost),
      displayRealizedProfitLoss: this.formatCurrency(realizedProfitLoss),
      displayUnrealizedProfitLoss: this.formatCurrency(unrealizedProfitLoss),
      displayTotalProfitLoss: this.formatCurrency(totalProfitLoss),
      sells: sellSummaries,
    };
  }

  // private buildSellSummary(
  //   sell: TradeSellDocument,
  //   averageBuyCost: number,
  // ): TradeSellSummary {
  //   const grossSellValue = sell.quantity * sell.sellPrice;
  //   const netSellValue = grossSellValue - sell.brokerage - sell.charges;
  //   const realizedCost = sell.quantity * averageBuyCost;
  //   const realizedProfitLoss = netSellValue - realizedCost;

  //   return {
  //     id: sell._id.toString(),
  //     tradeId: sell.tradeId.toString(),
  //     sellDate: sell.sellDate,
  //     quantity: sell.quantity,
  //     sellPrice: sell.sellPrice,
  //     grossSellValue: Number(grossSellValue.toFixed(2)),
  //     brokerage: sell.brokerage,
  //     charges: sell.charges,
  //     netSellValue: Number(netSellValue.toFixed(2)),
  //     realizedProfitLoss: Number(realizedProfitLoss.toFixed(2)),
  //     displayGrossSellValue: this.formatCurrency(grossSellValue),
  //     displayNetSellValue: this.formatCurrency(netSellValue),
  //     displayRealizedProfitLoss: this.formatCurrency(realizedProfitLoss),
  //     notes: sell.notes,
  //   };
  // }

  private buildSellSummary(
    sell: TradeSellDocument,
    averageBuyCost: number,
  ): TradeSellSummary {
    const grossSellValue = sell.quantity * sell.sellPrice;

    // Brokerage and charges are stored/displayed,
    // but are not included in the calculation.
    const netSellValue = grossSellValue;

    const realizedCost = sell.quantity * averageBuyCost;

    // P&L is calculated without brokerage and charges.
    const realizedProfitLoss = grossSellValue - realizedCost;

    return {
      id: sell._id.toString(),
      tradeId: sell.tradeId.toString(),
      sellDate: sell.sellDate,
      quantity: sell.quantity,
      sellPrice: sell.sellPrice,

      grossSellValue: Number(grossSellValue.toFixed(2)),

      brokerage: sell.brokerage,
      charges: sell.charges,

      netSellValue: Number(netSellValue.toFixed(2)),

      realizedProfitLoss: Number(realizedProfitLoss.toFixed(2)),

      displayGrossSellValue: this.formatCurrency(grossSellValue),
      displayNetSellValue: this.formatCurrency(netSellValue),
      displayRealizedProfitLoss:
        this.formatCurrency(realizedProfitLoss),

      notes: sell.notes,
    };
  }

  private calculateSoldQuantity(sells: TradeSellDocument[]): number {
    return sells.reduce((sum, sell) => sum + sell.quantity, 0);
  }

  // private calculateTotalBuyCost(trade: TradeDocument): number {
  //   const grossBuyValue = trade.buyPrice * trade.quantity;
  //   return grossBuyValue - trade.brokerage - trade.charges;
  // }

  private calculateTotalBuyCost(trade): number {
    return trade.buyPrice * trade.quantity;
  }

  private calculateAverageBuyCost(trade: TradeDocument): number {
    const totalBuyCost = this.calculateTotalBuyCost(trade);
    if (trade.quantity <= 0) {
      return 0;
    }
    return totalBuyCost / trade.quantity;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
