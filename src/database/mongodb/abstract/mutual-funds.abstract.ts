import type { AppResponse } from '../../../shared/appresponse.shared';
import { MutualFund } from '../../schemas/mutual-fund.schema';
import { SipEntry } from '../../schemas/sip-entry.schema';

export abstract class AbstractMutualFundsDao {
  abstract createFund(data: Partial<MutualFund>): Promise<AppResponse>;
  abstract listFunds(
    userId: string,
    includeArchived: boolean,
  ): Promise<AppResponse>;
  abstract findFund(
    userId: string,
    fundId: string,
  ): Promise<AppResponse>;
  abstract updateFund(
    userId: string,
    fundId: string,
    data: Partial<MutualFund>,
  ): Promise<AppResponse>;
  abstract createSipEntry(data: Partial<SipEntry>): Promise<AppResponse>;
  abstract findSipEntry(
    userId: string,
    fundId: string,
    month: string,
  ): Promise<AppResponse>;
  abstract listSipEntries(
    userId: string,
    fundId: string | string[],
  ): Promise<AppResponse>;
}
