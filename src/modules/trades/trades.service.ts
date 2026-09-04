import { HttpStatus, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

import type { AppResponse } from '../../shared/appresponse.shared';
import { createResponse } from '../../shared/appresponse.shared';
import { messageFactory, Messages } from '../../shared/messages.shared';
import { AbstractTradesDao } from '../../database/mongodb/abstract/trades.abstract';
import { AbstractBuyLotsDao } from '../../database/mongodb/abstract/buy-lots.abstract';
import {
  Trade,
  TradeDocument,
  TradeStatus,
} from '../../database/schemas/trade.schema';
import { TradeSellDocument } from '../../database/schemas/trade-sell.schema';
import { BuyLotDocument } from '../../database/schemas/buy-lot.schema';
import { CreateTradeDto } from './dto/create-trade.dto';
import { UpdateTradeDto } from './dto/update-trade.dto';
import { CreateTradeSellDto } from './dto/create-trade-sell.sto';
import {
  TradesAbstract,
  TradeSummary,
  TradeSellSummary,
} from './trades.abstract';
import { ListTradesDto, ListTradeSellsDto } from './dto/list-trades.dto';
import { calculatePaginationMeta, skipAndLimit } from '../../shared/pagination.shared';
import { computeCharges } from '../../core/utils/calculations/trade-charges.util';
import { calculateFifoPosition } from '../../core/utils/calculations/fifo-matching.util';

@Injectable()
export class TradesService extends TradesAbstract {
  constructor(
    private readonly tradesDao: AbstractTradesDao,
    private readonly buyLotsDao: AbstractBuyLotsDao,
  ) {
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

      const buyBrokerage = createTradeDto.brokerage || 0;
      const buyCharges = computeCharges({
        price: createTradeDto.buyPrice,
        quantity: createTradeDto.quantity,
        brokerage: buyBrokerage,
        transactionType: 'BUY',
      });

      const stockSymbol = createTradeDto.stockSymbol.trim().toUpperCase();

      // Check for existing open position for this symbol
      const existingTradeRes = await this.tradesDao.findActiveTradeBySymbol(userId, stockSymbol);
      let trade: TradeDocument;

      if (existingTradeRes.code === HttpStatus.OK) {
        trade = existingTradeRes.data as TradeDocument;
        // Position exists. We will add a new BuyLot to it.
      } else {
        // No active position exists, create a new Trade record
        const createRes = await this.tradesDao.createTrade({
          userId,
          stockSymbol,
          companyName: createTradeDto.companyName.trim(),
          buyDate: buyDate,
          buyPrice: createTradeDto.buyPrice, // Will be maintained as average later
          // The parent Trade must be valid before its first BuyLot is created.
          // syncTradeWithLotsAndSells will subsequently recalculate this value.
          quantity: createTradeDto.quantity,
          brokerage: 0,
          charges: 0,
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
        trade = createRes.data as TradeDocument;
      }

      // Create the BuyLot
      const lotCreateRes = await this.buyLotsDao.createBuyLot({
        userId,
        tradeId: trade._id.toString(),
        buyDate,
        buyPrice: createTradeDto.buyPrice,
        originalQuantity: createTradeDto.quantity,
        brokerage: buyBrokerage,
        charges: buyCharges,
      });

      if (lotCreateRes.code !== HttpStatus.CREATED) {
        return lotCreateRes;
      }

      // After adding a lot, re-run FIFO to sync the Trade document's fields
      await this.syncTradeWithLotsAndSells(userId, trade);

      return this.getTradeById(userId, trade._id.toString());
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  /**
   * Helper to recalculate and update a Trade's quantity and average cost based on its Lots and Sells.
   * Accepts the already-fetched trade to avoid a redundant DB call.
   */
  private async syncTradeWithLotsAndSells(userId: string, trade: TradeDocument) {
    const tradeId = trade._id.toString();

    const lotsRes = await this.buyLotsDao.listBuyLotsForTrade(tradeId);
    const sellsRes = await this.tradesDao.listSells(userId, tradeId);

    let buyLots = lotsRes.code === HttpStatus.OK ? (lotsRes.data as BuyLotDocument[]) : [];
    if (buyLots.length === 0 && trade.quantity > 0) {
      // Fallback for pre-migration data: synthesise a single virtual lot from the trade itself
      buyLots = [{
        _id: trade._id,
        tradeId: trade._id,
        buyDate: trade.buyDate,
        buyPrice: trade.buyPrice,
        originalQuantity: trade.quantity,
        brokerage: trade.brokerage,
        charges: trade.charges,
      } as any];
    }
    if (buyLots.length === 0) return; // No lots yet — nothing to sync
    const sells = sellsRes.code === HttpStatus.OK ? (sellsRes.data as TradeSellDocument[]) : [];

    const fifoResult = calculateFifoPosition(buyLots, sells);

    // Update Trade document with latest totals
    await this.tradesDao.updateTrade(userId, tradeId, {
      quantity: fifoResult.totalOriginalQuantity, // total historical quantity ever bought
      buyPrice: fifoResult.averageBuyPrice,
      brokerage: buyLots.reduce((sum, lot) => sum + lot.brokerage, 0),   // ADD
      charges: buyLots.reduce((sum, lot) => sum + lot.charges, 0),        // stored as cost-inclusive average
    });
  }

  async listTrades(
    userId: string,
    listTradesDto: ListTradesDto | boolean = false,
  ): Promise<AppResponse> {
    try {
      const isPaginatedRequest = typeof listTradesDto !== 'boolean';
      const request: Partial<ListTradesDto> = isPaginatedRequest
        ? listTradesDto
        : { includeArchived: listTradesDto };
      const { page = 1, limit = 10, search, includeArchived = false } = request;
      const tradesRes = await this.tradesDao.listTrades(userId, includeArchived);
      if (tradesRes.code !== HttpStatus.OK) {
        return tradesRes;
      }

      const trades = (tradesRes.data as TradeDocument[]).filter((trade) =>
        !search || [trade.stockSymbol, trade.companyName]
          .some((value) => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
      );
      const totalItems = trades.length;
      const { skip } = skipAndLimit(page, limit);
      const pageTrades = trades.slice(skip, skip + limit);
      const tradeIds = pageTrades.map((trade) => trade._id.toString());

      let sells: TradeSellDocument[] = [];
      let buyLots: BuyLotDocument[] = [];
      if (tradeIds.length > 0) {
        const sellsRes = await this.tradesDao.listSellsForTrades(userId, tradeIds);
        if (sellsRes.code !== HttpStatus.OK) {
          return sellsRes;
        }
        sells = sellsRes.data as TradeSellDocument[];

        const lotsRes = await this.buyLotsDao.listBuyLotsForTrades(tradeIds);
        if (lotsRes.code === HttpStatus.OK) {
          buyLots = lotsRes.data as BuyLotDocument[];
        }
      }

      const summaries = pageTrades.map((trade) => {
        const tradeSells = sells.filter(
          (sell) => sell.tradeId.toString() === trade._id.toString(),
        );
        let tradeLots = buyLots.filter(
          (lot) => lot.tradeId.toString() === trade._id.toString(),
        );
        if (tradeLots.length === 0) {
          tradeLots = [{
            _id: trade._id,
            tradeId: trade._id,
            buyDate: trade.buyDate,
            buyPrice: trade.buyPrice,
            originalQuantity: trade.quantity,
            brokerage: trade.brokerage,
            charges: trade.charges,
          } as any];
        }
        return this.buildTradeSummary(trade, tradeLots, tradeSells);
      });

      const response = {
        data: summaries,
        pagination: calculatePaginationMeta(totalItems, page, limit),
      };
      return createResponse(HttpStatus.OK, Messages.S18, isPaginatedRequest ? response : summaries);
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

      const lotsRes = await this.buyLotsDao.listBuyLotsForTrade(tradeId);
      let lots = lotsRes.code === HttpStatus.OK ? (lotsRes.data as BuyLotDocument[]) : [];
      if (lots.length === 0 && trade.quantity > 0) {
        lots = [{
          _id: trade._id,
          tradeId: trade._id,
          buyDate: trade.buyDate,
          buyPrice: trade.buyPrice,
          originalQuantity: trade.quantity,
          brokerage: trade.brokerage,
          charges: trade.charges,
        } as any];
      }

      const summary = this.buildTradeSummary(trade, lots, sells);
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

      // if (updateTradeDto.buyPrice !== undefined) {
      //   updatePayload.buyPrice = updateTradeDto.buyPrice;
      // }

      // if (updateTradeDto.quantity !== undefined) {
      //   updatePayload.quantity = updateTradeDto.quantity;
      // }

      // if (updateTradeDto.brokerage !== undefined) {
      //   updatePayload.brokerage = updateTradeDto.brokerage;
      // }

      // AFTER
      const lotsRes = await this.buyLotsDao.listBuyLotsForTrade(tradeId);
      const hasRealLots = lotsRes.code === HttpStatus.OK && (lotsRes.data as BuyLotDocument[]).length > 0;

      if (updateTradeDto.buyPrice !== undefined) {
        if (hasRealLots) {
          return createResponse(HttpStatus.BAD_REQUEST, Messages.W40); // "buyPrice is system-derived from buy lots and cannot be edited directly"
        }
        updatePayload.buyPrice = updateTradeDto.buyPrice;
      }

      if (updateTradeDto.quantity !== undefined) {
        if (hasRealLots) {
          return createResponse(HttpStatus.BAD_REQUEST, Messages.W40);
        }
        updatePayload.quantity = updateTradeDto.quantity;
      }

      if (updateTradeDto.brokerage !== undefined) {
        if (hasRealLots) {
          return createResponse(HttpStatus.BAD_REQUEST, Messages.W40);
        }
        updatePayload.brokerage = updateTradeDto.brokerage;
      }

      // Recompute charges server-side whenever any of the inputs change.
      // Client-supplied charges are never trusted.
      const priceChanged = updateTradeDto.buyPrice !== undefined;
      const qtyChanged = updateTradeDto.quantity !== undefined;
      const brokerageChanged = updateTradeDto.brokerage !== undefined;
      if (priceChanged || qtyChanged || brokerageChanged) {
        updatePayload.charges = computeCharges({
          price: updatePayload.buyPrice ?? trade.buyPrice,
          quantity: updatePayload.quantity ?? trade.quantity,
          brokerage: updatePayload.brokerage ?? trade.brokerage,
          transactionType: 'BUY',
        });
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

      if (sellDate > new Date()) {
        return createResponse(HttpStatus.BAD_REQUEST, Messages.W39);
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

      const sellBrokerage = createTradeSellDto.brokerage || 0;
      const sellCharges = computeCharges({
        price: createTradeSellDto.sellPrice,
        quantity: createTradeSellDto.quantity,
        brokerage: sellBrokerage,
        transactionType: 'SELL',
      });

      const sellCreateRes = await this.tradesDao.createSell({
        userId,
        tradeId,
        sellDate: new Date(createTradeSellDto.sellDate),
        quantity: createTradeSellDto.quantity,
        sellPrice: createTradeSellDto.sellPrice,
        brokerage: sellBrokerage,
        charges: sellCharges,
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
    listTradeSellsDto?: ListTradeSellsDto,
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

      const lotsRes = await this.buyLotsDao.listBuyLotsForTrade(tradeId);
      let buyLots = lotsRes.code === HttpStatus.OK ? (lotsRes.data as BuyLotDocument[]) : [];
      if (buyLots.length === 0) {
        buyLots = [{
          _id: trade._id,
          tradeId: trade._id,
          buyDate: trade.buyDate,
          buyPrice: trade.buyPrice,
          originalQuantity: trade.quantity,
          brokerage: trade.brokerage,
          charges: trade.charges,
        } as any];
      }

      const fifoResult = calculateFifoPosition(buyLots, sells);
      const averageBuyCost = trade.buyPrice; // fallback

      const getRealizedCost = (sellId: string, sellQty: number) => {
        const sr = fifoResult.sellResults.find(s => s.sellId === sellId);
        return sr ? sr.realizedCost : sellQty * averageBuyCost;
      };

      if (!listTradeSellsDto) return createResponse(HttpStatus.OK, Messages.S23, sells.map((sell) => this.buildSellSummary(sell, getRealizedCost(sell._id.toString(), sell.quantity))));

      const { page = 1, limit = 10, sortOrder = 'desc' } = listTradeSellsDto;
      const orderedSells = [...sells].sort((a, b) =>
        sortOrder === 'asc'
          ? a.sellDate.getTime() - b.sellDate.getTime()
          : b.sellDate.getTime() - a.sellDate.getTime(),
      );
      const { skip } = skipAndLimit(page, limit);
      const summaries = orderedSells.slice(skip, skip + limit).map((sell) =>
        this.buildSellSummary(sell, getRealizedCost(sell._id.toString(), sell.quantity)),
      );
      return createResponse(HttpStatus.OK, Messages.S23, {
        data: summaries,
        pagination: calculatePaginationMeta(sells.length, page, limit),
      });
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
    buyLots: BuyLotDocument[],
    sells: TradeSellDocument[],
  ): TradeSummary {
    const fifoResult = calculateFifoPosition(buyLots, sells);
    const soldQuantity = sells.reduce((sum, sell) => sum + sell.quantity, 0);
    const remainingQuantity = fifoResult.remainingQuantity;
    const grossBuyValue = trade.buyPrice * trade.quantity;
    // const totalBuyCost = this.calculateTotalBuyCost(trade);
    const totalBuyCost = fifoResult.totalOriginalCost;
    // Use FIFO-derived average: cost-inclusive average per share
    const averageBuyCost = fifoResult.averageBuyPrice > 0
      ? fifoResult.averageBuyPrice
      : trade.buyPrice;

    const sellSummaries = sells.map((sell) => {
      const fifoSellResult = fifoResult.sellResults.find(
        (sr) => sr.sellId === sell._id.toString(),
      );
      // If lot matching failed somehow, fallback to average
      const realizedCost = fifoSellResult
        ? fifoSellResult.realizedCost
        : sell.quantity * averageBuyCost;
      return this.buildSellSummary(sell, realizedCost);
    });

    const realizedProfitLoss = sellSummaries.reduce(
      (sum, sell) => sum + sell.realizedProfitLoss,
      0,
    );

    const currentPrice = trade.currentPrice || trade.buyPrice;
    const unrealizedGrossValue = remainingQuantity * currentPrice;
    const remainingCost = fifoResult.remainingTotalCost;
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

  private buildSellSummary(
    sell: TradeSellDocument,
    realizedCost: number,
  ): TradeSellSummary {
    const grossSellValue = sell.quantity * sell.sellPrice;

    // Net sell value = what the user actually received after all sell-side costs.
    const netSellValue = grossSellValue - sell.brokerage - sell.charges;

    // Realized P&L = net proceeds minus the cost basis of the shares sold.
    const realizedProfitLoss = netSellValue - realizedCost;

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
      displayRealizedProfitLoss: this.formatCurrency(realizedProfitLoss),
      notes: sell.notes,
    };
  }

  private calculateSoldQuantity(sells: TradeSellDocument[]): number {
    return sells.reduce((sum, sell) => sum + sell.quantity, 0);
  }

  // private calculateTotalBuyCost(trade: TradeDocument): number {
  //   // Total buy cost = what the user actually paid to acquire the shares,
  //   // including all buy-side transaction costs.
  //   return trade.buyPrice * trade.quantity + trade.brokerage + trade.charges;
  // }

  // private calculateAverageBuyCost(trade: TradeDocument): number {
  //   const totalBuyCost = this.calculateTotalBuyCost(trade);
  //   if (trade.quantity <= 0) {
  //     return 0;
  //   }
  //   return totalBuyCost / trade.quantity;
  // }

  private calculateTotalBuyCost(buyLots: BuyLotDocument[]): number {
    // Total cost = what the user actually paid across every lot ever bought,
    // including each lot's own brokerage and charges.
    return buyLots.reduce(
      (sum, lot) => sum + lot.buyPrice * lot.originalQuantity + lot.brokerage + lot.charges,
      0,
    );
  }

  private calculateAverageBuyCost(buyLots: BuyLotDocument[]): number {
    const totalQty = buyLots.reduce((sum, lot) => sum + lot.originalQuantity, 0);
    if (totalQty <= 0) return 0;
    return this.calculateTotalBuyCost(buyLots) / totalQty;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
