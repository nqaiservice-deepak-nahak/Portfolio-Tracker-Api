import type { AppResponse } from '../../shared/appresponse.shared';

export abstract class DashboardAbstract {
  abstract getSummary(userId: string): Promise<AppResponse>;
}
