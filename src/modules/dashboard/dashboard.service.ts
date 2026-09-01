import { HttpStatus, Injectable } from '@nestjs/common';

import type { AppResponse } from '../../shared/appresponse.shared';
import { createResponse } from '../../shared/appresponse.shared';
import { Messages } from '../../shared/messages.shared';
import { AbstractDashboardDao } from '../../database/mongodb/abstract/dashboard.abstract';
import { MutualFundDocument } from '../../database/schemas/mutual-fund.schema';
import { SipEntryDocument } from '../../database/schemas/sip-entry.schema';
import { TradeDocument } from '../../database/schemas/trade.schema';
import { TradeSellDocument } from '../../database/schemas/trade-sell.schema';
import {
  DashboardAssetAllocationDto,
  DashboardMetricDto,
  DashboardRecentActivityDto,
  DashboardSummaryDto,
} from './dto/dashboard-summary.dto';
import { DashboardAbstract } from './dashboard.abstract';

@Injectable()
export class DashboardService extends DashboardAbstract {
  constructor(private readonly dashboardDao: AbstractDashboardDao) {
    super();
  }

  async getSummary(userId: string): Promise<AppResponse> {
    try {
      const fundsRes = await this.dashboardDao.getActiveFunds(userId);
      if (fundsRes.code !== HttpStatus.OK) {
        return fundsRes;
      }
      const funds = fundsRes.data as MutualFundDocument[];

      const fundIds = funds.map((fund) => fund._id.toString());

      let sipEntries: SipEntryDocument[] = [];
      if (fundIds.length > 0) {
        const sipRes = await this.dashboardDao.getSipEntriesForFunds(
          userId,
          fundIds,
        );
        if (sipRes.code !== HttpStatus.OK) {
          return sipRes;
        }
        sipEntries = sipRes.data as SipEntryDocument[];
      }

      const tradesRes = await this.dashboardDao.getActiveTrades(userId);
      if (tradesRes.code !== HttpStatus.OK) {
        return tradesRes;
      }
      const trades = tradesRes.data as TradeDocument[];

      const tradeIds = trades.map((trade) => trade._id.toString());

      let tradeSells: TradeSellDocument[] = [];
      if (tradeIds.length > 0) {
        const sellRes = await this.dashboardDao.getTradeSellsForTrades(
          userId,
          tradeIds,
        );
        if (sellRes.code !== HttpStatus.OK) {
          return sellRes;
        }
        tradeSells = sellRes.data as TradeSellDocument[];
      }

      const mutualFundsTotalInvestment = this.calculateMutualFundsInvestment(
        funds,
        sipEntries,
      );

      const mutualFundsCurrentValue = this.calculateMutualFundsCurrentValue(
        funds,
        sipEntries,
      );

      const mutualFundsProfitLoss =
        mutualFundsCurrentValue - mutualFundsTotalInvestment;

      const tradesTotalInvestment = this.calculateTradesInvestment(
        trades,
        tradeSells,
      );

      const tradesCurrentValue = this.calculateTradesCurrentValue(
        trades,
        tradeSells,
      );

      const tradesProfitLoss = tradesCurrentValue - tradesTotalInvestment;

      const totalInvestment = mutualFundsTotalInvestment + tradesTotalInvestment;
      const totalNetWorth = mutualFundsCurrentValue + tradesCurrentValue;
      const totalProfitLoss = mutualFundsProfitLoss + tradesProfitLoss;

      const summary: DashboardSummaryDto = {
        netWorth: this.createMetric({
          label: 'Total Net Worth',
          value: totalNetWorth,
          changePercentage: this.calculatePercentage(
            totalProfitLoss,
            totalInvestment,
          ),
          trend: this.getTrend(totalProfitLoss),
        }),
        totalInvestment: this.createMetric({
          label: 'Total Investment',
          value: totalInvestment,
          changePercentage: 0,
          trend: 'neutral',
        }),
        mutualFunds: this.createMetric({
          label: 'Mutual Funds',
          value: mutualFundsCurrentValue,
          changePercentage: this.calculatePercentage(
            mutualFundsProfitLoss,
            mutualFundsTotalInvestment,
          ),
          trend: this.getTrend(mutualFundsProfitLoss),
        }),
        trades: this.createMetric({
          label: 'Trades',
          value: tradesCurrentValue,
          changePercentage: this.calculatePercentage(
            tradesProfitLoss,
            tradesTotalInvestment,
          ),
          trend: this.getTrend(tradesProfitLoss),
        }),
        profitLoss: this.createMetric({
          label: 'Profit / Loss',
          value: totalProfitLoss,
          changePercentage: this.calculatePercentage(
            totalProfitLoss,
            totalInvestment,
          ),
          trend: this.getTrend(totalProfitLoss),
        }),
        assetAllocation: this.getAssetAllocation({
          mutualFundsValue: mutualFundsCurrentValue,
          tradesValue: tradesCurrentValue,
          cashOthersValue: 0,
        }),
        recentActivities: this.getRecentActivities({
          funds,
          sipEntries,
          trades,
          tradeSells,
        }),
      };

      return createResponse(HttpStatus.OK, Messages.S24, summary);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  private calculateMutualFundsInvestment(
    funds: MutualFundDocument[],
    sipEntries: SipEntryDocument[],
  ): number {
    const lumpSumTotal = funds.reduce(
      (sum, fund) => sum + fund.lumpSumAmount,
      0,
    );

    const sipTotal = sipEntries.reduce(
      (sum, entry) => sum + entry.amountContributed,
      0,
    );

    return Number((lumpSumTotal + sipTotal).toFixed(2));
  }

  private calculateMutualFundsCurrentValue(
    funds: MutualFundDocument[],
    sipEntries: SipEntryDocument[],
  ): number {
    const currentValue = funds.reduce((sum, fund) => {
      const fundSipEntries = sipEntries.filter(
        (entry) => entry.fundId.toString() === fund._id.toString(),
      );

      return (
        sum +
        this.calculateFundProjectedValue({
          fund,
          sipEntries: fundSipEntries,
        })
      );
    }, 0);

    return Number(currentValue.toFixed(2));
  }

  private calculateFundProjectedValue(params: {
    fund: MutualFundDocument;
    sipEntries: SipEntryDocument[];
  }): number {
    const monthlyRate = params.fund.currentCagr / 12 / 100;
    const monthsSinceStart = this.getMonthsBetween(
      params.fund.startDate,
      new Date(),
    );

    let projectedValue = this.compoundAmount(
      params.fund.lumpSumAmount,
      monthlyRate,
      monthsSinceStart,
    );

    for (const entry of params.sipEntries) {
      const entryDate = this.getDateFromMonth(entry.month);
      const monthsFromEntry = this.getMonthsBetween(entryDate, new Date());

      projectedValue += this.compoundAmount(
        entry.amountContributed,
        monthlyRate,
        monthsFromEntry,
      );
    }

    return Number(projectedValue.toFixed(2));
  }

  // private calculateTradesInvestment(
  //   trades: TradeDocument[],
  //   tradeSells: TradeSellDocument[],
  // ): number {
  //   const total = trades.reduce((sum, trade) => {
  //     const tradeSellEntries = tradeSells.filter(
  //       (sell) => sell.tradeId.toString() === trade._id.toString(),
  //     );

  //     const soldQuantity = this.calculateSoldQuantity(tradeSellEntries);
  //     const remainingQuantity = trade.quantity - soldQuantity;

  //     if (remainingQuantity <= 0) {
  //       return sum;
  //     }

  //     const totalBuyCost =
  //       trade.buyPrice * trade.quantity + trade.brokerage + trade.charges;

  //     const averageBuyCost =
  //       trade.quantity > 0 ? totalBuyCost / trade.quantity : 0;

  //     return sum + remainingQuantity * averageBuyCost;
  //   }, 0);

  //   return Number(total.toFixed(2));
  // }

  private calculateTradesInvestment(
    trades: TradeDocument[],
    tradeSells: TradeSellDocument[],
  ): number {
    const total = trades.reduce((sum, trade) => {
      const tradeSellEntries = tradeSells.filter(
        (sell) => sell.tradeId.toString() === trade._id.toString(),
      );

      const soldQuantity = this.calculateSoldQuantity(tradeSellEntries);
      const remainingQuantity = trade.quantity - soldQuantity;

      if (remainingQuantity <= 0) {
        return sum;
      }

      return sum + remainingQuantity * trade.buyPrice;
    }, 0);

    return Number(total.toFixed(2));
  }

  private calculateTradesCurrentValue(
    trades: TradeDocument[],
    tradeSells: TradeSellDocument[],
  ): number {
    const total = trades.reduce((sum, trade) => {
      const tradeSellEntries = tradeSells.filter(
        (sell) => sell.tradeId.toString() === trade._id.toString(),
      );

      const soldQuantity = this.calculateSoldQuantity(tradeSellEntries);
      const remainingQuantity = trade.quantity - soldQuantity;

      if (remainingQuantity <= 0) {
        return sum;
      }

      const currentPrice = trade.currentPrice || trade.buyPrice;

      return sum + remainingQuantity * currentPrice;
    }, 0);

    return Number(total.toFixed(2));
  }

  private calculateSoldQuantity(tradeSells: TradeSellDocument[]): number {
    return tradeSells.reduce((sum, sell) => sum + sell.quantity, 0);
  }

  private createMetric(params: {
    label: string;
    value: number;
    changePercentage: number;
    trend: 'positive' | 'negative' | 'neutral';
  }): DashboardMetricDto {
    return {
      label: params.label,
      value: Number(params.value.toFixed(2)),
      displayValue: this.formatCurrency(params.value),
      changePercentage: Number(params.changePercentage.toFixed(2)),
      trend: params.trend,
    };
  }

  private getAssetAllocation(params: {
    mutualFundsValue: number;
    tradesValue: number;
    cashOthersValue: number;
  }): DashboardAssetAllocationDto[] {
    const total =
      params.mutualFundsValue + params.tradesValue + params.cashOthersValue;

    return [
      {
        label: 'Mutual Funds',
        value: Number(params.mutualFundsValue.toFixed(2)),
        percentage: this.calculateAllocationPercentage(
          params.mutualFundsValue,
          total,
        ),
        displayValue: this.formatCurrency(params.mutualFundsValue),
      },
      {
        label: 'Trades',
        value: Number(params.tradesValue.toFixed(2)),
        percentage: this.calculateAllocationPercentage(params.tradesValue, total),
        displayValue: this.formatCurrency(params.tradesValue),
      },
      {
        label: 'Cash / Others',
        value: Number(params.cashOthersValue.toFixed(2)),
        percentage: this.calculateAllocationPercentage(
          params.cashOthersValue,
          total,
        ),
        displayValue: this.formatCurrency(params.cashOthersValue),
      },
    ];
  }

  private getRecentActivities(params: {
    funds: MutualFundDocument[];
    sipEntries: SipEntryDocument[];
    trades: TradeDocument[];
    tradeSells: TradeSellDocument[];
  }): DashboardRecentActivityDto[] {
    const activities: DashboardRecentActivityDto[] = [];

    const latestFunds = params.funds.slice(0, 2);

    for (const fund of latestFunds) {
      activities.push({
        title: 'Mutual fund added',
        description: `${fund.fundName} is active in your portfolio.`,
        type: 'MUTUAL_FUND',
        activityAt: this.formatDateToIst(
          this.getDocumentDate(fund, fund.startDate),
        ),
      });
    }

    const latestSipEntries = [...params.sipEntries]
      .sort((a, b) => {
        const firstDate = this.getDocumentDate(a, this.getDateFromMonth(a.month));
        const secondDate = this.getDocumentDate(
          b,
          this.getDateFromMonth(b.month),
        );

        return secondDate.getTime() - firstDate.getTime();
      })
      .slice(0, 2);

    for (const entry of latestSipEntries) {
      activities.push({
        title: 'SIP contribution added',
        description: `${this.formatCurrency(
          entry.amountContributed,
        )} SIP contribution recorded for ${entry.month}.`,
        type: 'SIP_ENTRY',
        activityAt: this.formatDateToIst(
          this.getDocumentDate(entry, this.getDateFromMonth(entry.month)),
        ),
      });
    }

    const latestTrades = params.trades.slice(0, 2);

    for (const trade of latestTrades) {
      activities.push({
        title: 'Trade added',
        description: `${trade.stockSymbol} trade is active in your portfolio.`,
        type: 'TRADE',
        activityAt: this.formatDateToIst(
          this.getDocumentDate(trade, trade.buyDate),
        ),
      });
    }

    const latestTradeSells = [...params.tradeSells]
      .sort((a, b) => {
        const firstDate = this.getDocumentDate(a, a.sellDate);
        const secondDate = this.getDocumentDate(b, b.sellDate);

        return secondDate.getTime() - firstDate.getTime();
      })
      .slice(0, 2);

    for (const sell of latestTradeSells) {
      activities.push({
        title: 'Trade sell recorded',
        description: `${sell.quantity} shares sold at ${this.formatCurrency(
          sell.sellPrice,
        )}.`,
        type: 'TRADE_SELL',
        activityAt: this.formatDateToIst(
          this.getDocumentDate(sell, sell.sellDate),
        ),
      });
    }

    if (activities.length === 0) {
      return [
        {
          title: 'Welcome to NetworthX',
          description:
            'Your dashboard is ready. Start adding investments to see real portfolio insights.',
          type: 'SYSTEM',
          activityAt: this.formatDateToIst(new Date()),
        },
      ];
    }

    return activities
      .sort((a, b) => {
        return (
          new Date(b.activityAt).getTime() - new Date(a.activityAt).getTime()
        );
      })
      .slice(0, 5);
  }

  private getDocumentDate(
    document:
      | MutualFundDocument
      | SipEntryDocument
      | TradeDocument
      | TradeSellDocument,
    fallbackDate: Date,
  ): Date {
    const possibleDocument = document as unknown as {
      createdAt?: Date;
      updatedAt?: Date;
    };

    return possibleDocument.createdAt || possibleDocument.updatedAt || fallbackDate;
  }

  private calculatePercentage(value: number, baseValue: number): number {
    if (baseValue <= 0) {
      return 0;
    }

    return (value / baseValue) * 100;
  }

  private calculateAllocationPercentage(value: number, total: number): number {
    if (total <= 0) {
      return 0;
    }

    return Number(((value / total) * 100).toFixed(2));
  }

  private getTrend(value: number): 'positive' | 'negative' | 'neutral' {
    if (value > 0) {
      return 'positive';
    }

    if (value < 0) {
      return 'negative';
    }

    return 'neutral';
  }

  private compoundAmount(
    amount: number,
    monthlyRate: number,
    months: number,
  ): number {
    if (amount <= 0) {
      return 0;
    }

    if (monthlyRate <= 0 || months <= 0) {
      return amount;
    }

    return amount * (1 + monthlyRate) ** months;
  }

  private getMonthsBetween(startDate: Date, endDate: Date): number {
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();

    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();

    const months = (endYear - startYear) * 12 + (endMonth - startMonth);

    return Math.max(months, 0);
  }

  private getDateFromMonth(month: string): Date {
    const [year, monthNumber] = month.split('-').map(Number);

    return new Date(year, monthNumber - 1, 1);
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private formatDateToIst(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  }
}
