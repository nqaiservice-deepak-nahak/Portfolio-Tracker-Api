import type { AppResponse } from '../../shared/appresponse.shared';
import { CreateMutualFundDto } from './dto/create-mutual-fund.dto';
import { UpdateMutualFundDto } from './dto/update-mutual-fund.dto';
import { CreateSipEntryDto } from './dto/create-sip-entry.dto';

export abstract class MutualFundsAbstract {
  abstract createFund(
    userId: string,
    createMutualFundDto: CreateMutualFundDto,
  ): Promise<AppResponse>;

  abstract listFunds(
    userId: string,
    includeArchived?: boolean,
  ): Promise<AppResponse>;

  abstract getFundById(
    userId: string,
    fundId: string,
  ): Promise<AppResponse>;

  abstract updateFund(
    userId: string,
    fundId: string,
    updateMutualFundDto: UpdateMutualFundDto,
  ): Promise<AppResponse>;

  abstract archiveFund(
    userId: string,
    fundId: string,
  ): Promise<AppResponse>;

  abstract createSipEntry(
    userId: string,
    fundId: string,
    createSipEntryDto: CreateSipEntryDto,
  ): Promise<AppResponse>;

  abstract listSipEntries(
    userId: string,
    fundId: string,
  ): Promise<AppResponse>;

  abstract getProjection(
    userId: string,
    fundId: string,
  ): Promise<AppResponse>;
}
