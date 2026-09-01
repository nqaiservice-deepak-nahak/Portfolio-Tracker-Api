import { HttpStatus, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

import {
  MutualFund,
  MutualFundDocument,
} from '../../database/schemas/mutual-fund.schema';
import { SipEntry, SipEntryDocument } from '../../database/schemas/sip-entry.schema';
import { AbstractMutualFundsDao } from '../../database/mongodb/abstract/mutual-funds.abstract';
import { MutualFundsAbstract } from './mutual-funds.abstract';
import { CreateMutualFundDto } from './dto/create-mutual-fund.dto';
import { UpdateMutualFundDto } from './dto/update-mutual-fund.dto';
import { CreateSipEntryDto } from './dto/create-sip-entry.dto';
import type { AppResponse } from '../../shared/appresponse.shared';
import { createResponse } from '../../shared/appresponse.shared';
import { messageFactory, Messages } from '../../shared/messages.shared';

export interface MutualFundSummary {
  id: string;
  fundName: string;
  category: string;
  sipAmount: number;
  lumpSumAmount: number;
  startDate: Date;
  currentCagr: number;
  isActive: boolean;
  totalSipInvested: number;
  totalInvested: number;
  projectedCurrentValue: number;
  estimatedGain: number;
  gainPercentage: number;
  displayTotalInvested: string;
  displayProjectedCurrentValue: string;
  displayEstimatedGain: string;
}

export interface ProjectionItem {
  horizon: string;
  months: number;
  totalInvested: number;
  projectedValue: number;
  estimatedGain: number;
  gainPercentage: number;
  displayTotalInvested: string;
  displayProjectedValue: string;
  displayEstimatedGain: string;
}

@Injectable()
export class MutualFundsService implements MutualFundsAbstract {
  constructor(private readonly mutualFundsDao: AbstractMutualFundsDao) { }

  async createFund(
    userId: string,
    createMutualFundDto: CreateMutualFundDto,
  ): Promise<AppResponse> {
    try {
      const sipAmount = createMutualFundDto.sipAmount;
      const lumpSumAmount = createMutualFundDto.lumpSumAmount ?? 0;

      if (sipAmount === 0 && lumpSumAmount === 0) {
        return createResponse(HttpStatus.BAD_REQUEST, Messages.W21);
      }

      const startDate = new Date(createMutualFundDto.startDate);

      if (startDate > new Date()) {
        return createResponse(HttpStatus.BAD_REQUEST, Messages.W22);
      }

      const createdFundResult = await this.mutualFundsDao.createFund({
        userId,
        fundName: createMutualFundDto.fundName.trim(),
        category: createMutualFundDto.category,
        sipAmount: createMutualFundDto.sipAmount,
        lumpSumAmount: createMutualFundDto.lumpSumAmount || 0,
        startDate,
        currentCagr: createMutualFundDto.currentCagr,
        isActive: true,
        archivedAt: null,
      });

      if (createdFundResult.code >= HttpStatus.BAD_REQUEST) {
        return createdFundResult;
      }

      const summary = this.buildFundSummary(createdFundResult.data, []);
      return createResponse(HttpStatus.CREATED, Messages.S9, summary);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async listFunds(
    userId: string,
    includeArchived = false,
  ): Promise<AppResponse> {
    try {
      const fundsResult = await this.mutualFundsDao.listFunds(userId, includeArchived);
      if (fundsResult.code >= HttpStatus.BAD_REQUEST) {
        return fundsResult;
      }

      const funds: MutualFundDocument[] = fundsResult.data;
      const fundIds = funds.map((fund) => fund._id.toString());

      const sipEntriesResult = await this.mutualFundsDao.listSipEntries(userId, fundIds);
      if (sipEntriesResult.code >= HttpStatus.BAD_REQUEST) {
        return sipEntriesResult;
      }

      const sipEntries: SipEntryDocument[] = sipEntriesResult.data;

      const summaries = funds.map((fund) => {
        const fundSipEntries = sipEntries.filter(
          (entry) => entry.fundId.toString() === fund._id.toString(),
        );

        return this.buildFundSummary(fund, fundSipEntries);
      });

      return createResponse(HttpStatus.OK, Messages.S10, summaries);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async getFundById(
    userId: string,
    fundId: string,
  ): Promise<AppResponse> {
    try {
      const fundResult = await this.findUserFund(userId, fundId);
      if (fundResult.code >= HttpStatus.BAD_REQUEST) {
        return fundResult;
      }

      const fund: MutualFundDocument = fundResult.data;

      const sipEntriesResult = await this.mutualFundsDao.listSipEntries(userId, fundId);
      if (sipEntriesResult.code >= HttpStatus.BAD_REQUEST) {
        return sipEntriesResult;
      }

      const summary = this.buildFundSummary(fund, sipEntriesResult.data);
      return createResponse(HttpStatus.OK, Messages.S11, summary);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async updateFund(
    userId: string,
    fundId: string,
    updateMutualFundDto: UpdateMutualFundDto,
  ): Promise<AppResponse> {
    try {
      const fundResult = await this.findUserFund(userId, fundId);
      if (fundResult.code >= HttpStatus.BAD_REQUEST) {
        return fundResult;
      }

      const fund: MutualFundDocument = fundResult.data;

      const updatePayload: Partial<MutualFund> = {};

      const finalSipAmount =
        updateMutualFundDto.sipAmount ?? fund.sipAmount;

      const finalLumpSumAmount =
        updateMutualFundDto.lumpSumAmount ?? fund.lumpSumAmount;

      if (finalSipAmount === 0 && finalLumpSumAmount === 0) {
        return createResponse(HttpStatus.BAD_REQUEST, Messages.W21);
      }

      if (updateMutualFundDto.startDate !== undefined) {
        const startDate = new Date(updateMutualFundDto.startDate);

        if (startDate > new Date()) {
          return createResponse(HttpStatus.BAD_REQUEST, Messages.W22);
        }

        updatePayload.startDate = startDate;
      }

      if (updateMutualFundDto.fundName !== undefined) {
        updatePayload.fundName = updateMutualFundDto.fundName.trim();
      }

      if (updateMutualFundDto.category !== undefined) {
        updatePayload.category = updateMutualFundDto.category;
      }

      if (updateMutualFundDto.sipAmount !== undefined) {
        updatePayload.sipAmount = updateMutualFundDto.sipAmount;
      }

      if (updateMutualFundDto.lumpSumAmount !== undefined) {
        updatePayload.lumpSumAmount = updateMutualFundDto.lumpSumAmount;
      }

      if (updateMutualFundDto.startDate !== undefined) {
        updatePayload.startDate = new Date(updateMutualFundDto.startDate);
      }

      if (updateMutualFundDto.currentCagr !== undefined) {
        updatePayload.currentCagr = updateMutualFundDto.currentCagr;
      }

      if (updateMutualFundDto.isActive !== undefined) {
        updatePayload.isActive = updateMutualFundDto.isActive;
        updatePayload.archivedAt = updateMutualFundDto.isActive
          ? null
          : new Date();
      }

      const updateResult = await this.mutualFundsDao.updateFund(userId, fund._id.toString(), updatePayload);
      if (updateResult.code >= HttpStatus.BAD_REQUEST) {
        return updateResult;
      }

      return this.getFundById(userId, fundId);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async archiveFund(
    userId: string,
    fundId: string,
  ): Promise<AppResponse> {
    try {
      const fundResult = await this.findUserFund(userId, fundId);
      if (fundResult.code >= HttpStatus.BAD_REQUEST) {
        return fundResult;
      }

      const fund: MutualFundDocument = fundResult.data;

      const updateResult = await this.mutualFundsDao.updateFund(userId, fund._id.toString(), { isActive: false, archivedAt: new Date() });
      if (updateResult.code >= HttpStatus.BAD_REQUEST) {
        return updateResult;
      }

      return createResponse(HttpStatus.OK, Messages.S13, { archived: true });
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async createSipEntry(
    userId: string,
    fundId: string,
    createSipEntryDto: CreateSipEntryDto,
  ): Promise<AppResponse> {
    try {
      const fundResult = await this.findUserFund(userId, fundId);

      if (fundResult.code >= HttpStatus.BAD_REQUEST) {
        return fundResult;
      }

      const fund = fundResult.data as MutualFundDocument;

      // Convert SIP month (YYYY-MM) to the first day of that month
      const [sipYear, sipMonth] = createSipEntryDto.month
        .split('-')
        .map(Number);

      const sipMonthDate = new Date(sipYear, sipMonth - 1, 1);

      // Fund start month
      const fundStartDate = new Date(fund.startDate);

      const fundStartMonthDate = new Date(
        fundStartDate.getFullYear(),
        fundStartDate.getMonth(),
        1,
      );

      // Current month
      const now = new Date();

      const currentMonthDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );

      // SIP cannot be before the fund started
      if (sipMonthDate < fundStartMonthDate) {
        return createResponse(
          HttpStatus.BAD_REQUEST,
          'SIP month cannot be before the mutual fund start month',
        );
      }

      // SIP cannot be in the future
      if (sipMonthDate > currentMonthDate) {
        return createResponse(
          HttpStatus.BAD_REQUEST,
          'SIP month cannot be in the future',
        );
      }

      // Check duplicate SIP for the same month
      const existingEntryResult =
        await this.mutualFundsDao.findSipEntry(
          userId,
          fundId,
          createSipEntryDto.month,
        );

      if (existingEntryResult.code === HttpStatus.OK) {
        return createResponse(HttpStatus.CONFLICT, Messages.W23);
      }

      const createdEntryResult =
        await this.mutualFundsDao.createSipEntry({
          userId,
          fundId,
          month: createSipEntryDto.month,
          amountContributed: createSipEntryDto.amountContributed,
          notes: createSipEntryDto.notes?.trim() || '',
        });

      if (createdEntryResult.code >= HttpStatus.BAD_REQUEST) {
        return createdEntryResult;
      }

      return createResponse(
        HttpStatus.CREATED,
        Messages.S14,
        createdEntryResult.data,
      );
    } catch (error: any) {
      return createResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        Messages.E2,
      );
    }
  }

  async listSipEntries(
    userId: string,
    fundId: string,
  ): Promise<AppResponse> {
    try {
      const fundResult = await this.findUserFund(userId, fundId);
      if (fundResult.code >= HttpStatus.BAD_REQUEST) {
        return fundResult;
      }

      const entriesResult = await this.mutualFundsDao.listSipEntries(userId, fundId);
      if (entriesResult.code >= HttpStatus.BAD_REQUEST) {
        return entriesResult;
      }

      return createResponse(HttpStatus.OK, Messages.S15, entriesResult.data);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  async getProjection(
    userId: string,
    fundId: string,
  ): Promise<AppResponse> {
    try {
      const fundResult = await this.findUserFund(userId, fundId);
      if (fundResult.code >= HttpStatus.BAD_REQUEST) {
        return fundResult;
      }

      const fund: MutualFundDocument = fundResult.data;

      const sipEntriesResult = await this.mutualFundsDao.listSipEntries(userId, fundId);
      if (sipEntriesResult.code >= HttpStatus.BAD_REQUEST) {
        return sipEntriesResult;
      }

      const projections = [
        this.buildProjection(fund, sipEntriesResult.data, 'Current', 0),
        this.buildProjection(fund, sipEntriesResult.data, '1 Year', 12),
        this.buildProjection(fund, sipEntriesResult.data, '3 Years', 36),
        this.buildProjection(fund, sipEntriesResult.data, '5 Years', 60),
        this.buildProjection(fund, sipEntriesResult.data, '10 Years', 120),
      ];

      return createResponse(HttpStatus.OK, Messages.S16, projections);
    } catch (error: any) {
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, Messages.E2);
    }
  }

  private async findUserFund(
    userId: string,
    fundId: string,
  ): Promise<AppResponse> {
    if (!Types.ObjectId.isValid(fundId)) {
      return createResponse(
        HttpStatus.NOT_FOUND,
        messageFactory(Messages.W5, ['Mutual fund']),
      );
    }

    const fundResult = await this.mutualFundsDao.findFund(userId, fundId);

    if (fundResult.code >= HttpStatus.BAD_REQUEST) {
      return fundResult;
    }

    return createResponse(
      HttpStatus.OK,
      Messages.S3,
      fundResult.data,
    );
  }

  private buildFundSummary(
    fund: MutualFundDocument,
    sipEntries: SipEntryDocument[],
  ): MutualFundSummary {
    const totalSipInvested = sipEntries.reduce(
      (sum, entry) => sum + entry.amountContributed,
      0,
    );

    const totalInvested = fund.lumpSumAmount + totalSipInvested;

    const projectedCurrentValue = this.calculateProjectedValue({
      fund,
      sipEntries,
      futureMonths: 0,
    });

    const estimatedGain = projectedCurrentValue - totalInvested;

    const gainPercentage =
      totalInvested > 0 ? (estimatedGain / totalInvested) * 100 : 0;

    return {
      id: fund._id.toString(),
      fundName: fund.fundName,
      category: fund.category,
      sipAmount: fund.sipAmount,
      lumpSumAmount: fund.lumpSumAmount,
      startDate: fund.startDate,
      currentCagr: fund.currentCagr,
      isActive: fund.isActive,
      totalSipInvested,
      totalInvested,
      projectedCurrentValue,
      estimatedGain,
      gainPercentage: Number(gainPercentage.toFixed(2)),
      displayTotalInvested: this.formatCurrency(totalInvested),
      displayProjectedCurrentValue: this.formatCurrency(projectedCurrentValue),
      displayEstimatedGain: this.formatCurrency(estimatedGain),
    };
  }

  private buildProjection(
    fund: MutualFundDocument,
    sipEntries: SipEntryDocument[],
    horizon: string,
    months: number,
  ): ProjectionItem {
    const existingSipTotal = sipEntries.reduce(
      (sum, entry) => sum + entry.amountContributed,
      0,
    );

    const futureSipInvestment = fund.sipAmount * months;
    const totalInvested =
      fund.lumpSumAmount + existingSipTotal + futureSipInvestment;

    const projectedValue = this.calculateProjectedValue({
      fund,
      sipEntries,
      futureMonths: months,
    });

    const estimatedGain = projectedValue - totalInvested;

    const gainPercentage =
      totalInvested > 0 ? (estimatedGain / totalInvested) * 100 : 0;

    return {
      horizon,
      months,
      totalInvested,
      projectedValue,
      estimatedGain,
      gainPercentage: Number(gainPercentage.toFixed(2)),
      displayTotalInvested: this.formatCurrency(totalInvested),
      displayProjectedValue: this.formatCurrency(projectedValue),
      displayEstimatedGain: this.formatCurrency(estimatedGain),
    };
  }

  private calculateProjectedValue(params: {
    fund: MutualFundDocument;
    sipEntries: SipEntryDocument[];
    futureMonths: number;
  }): number {
    const monthlyRate = params.fund.currentCagr / 12 / 100;
    const monthsSinceStart = this.getMonthsBetween(
      params.fund.startDate,
      new Date(),
    );

    let projectedValue = this.compoundAmount(
      params.fund.lumpSumAmount,
      monthlyRate,
      monthsSinceStart + params.futureMonths,
    );

    for (const entry of params.sipEntries) {
      const entryDate = this.getDateFromMonth(entry.month);
      const monthsFromEntry = this.getMonthsBetween(entryDate, new Date());

      projectedValue += this.compoundAmount(
        entry.amountContributed,
        monthlyRate,
        monthsFromEntry + params.futureMonths,
      );
    }

    if (params.futureMonths > 0 && params.fund.sipAmount > 0) {
      projectedValue += this.calculateFutureSipValue(
        params.fund.sipAmount,
        monthlyRate,
        params.futureMonths,
      );
    }

    return Number(projectedValue.toFixed(2));
  }

  private calculateFutureSipValue(
    monthlySip: number,
    monthlyRate: number,
    months: number,
  ): number {
    if (months <= 0 || monthlySip <= 0) {
      return 0;
    }

    if (monthlyRate <= 0) {
      return monthlySip * months;
    }

    return (
      monthlySip *
      (((1 + monthlyRate) ** months - 1) / monthlyRate) *
      (1 + monthlyRate)
    );
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
}
