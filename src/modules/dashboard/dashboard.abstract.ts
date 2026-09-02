import type { AppResponse } from '../../shared/appresponse.shared';
import { ListRecentActivityDto } from './dto/list-recent-activity.dto';

export abstract class DashboardAbstract {
  abstract getSummary(userId: string): Promise<AppResponse>;
  abstract getRecentActivity(userId: string, dto: ListRecentActivityDto): Promise<AppResponse>;
}
