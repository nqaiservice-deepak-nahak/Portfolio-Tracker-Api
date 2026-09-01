import type { AppResponse } from '../../../shared/appresponse.shared';

export interface DashboardRawData {
  funds: any[];
  sipEntries: any[];
  trades: any[];
  tradeSells: any[];
}

export abstract class AbstractDashboardDao {
  abstract getActiveFunds(userId: string): Promise<AppResponse>;
  abstract getSipEntriesForFunds(
    userId: string,
    fundIds: string[],
  ): Promise<AppResponse>;
  abstract getActiveTrades(userId: string): Promise<AppResponse>;
  abstract getTradeSellsForTrades(
    userId: string,
    tradeIds: string[],
  ): Promise<AppResponse>;
}
