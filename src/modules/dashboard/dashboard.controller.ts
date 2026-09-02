import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { DashboardAbstract } from './dashboard.abstract';
import { ListRecentActivityDto } from './dto/list-recent-activity.dto';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { AppResponse } from '../../shared/appresponse.shared';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardAbstract) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get logged-in user dashboard summary statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary fetched successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getSummary(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AppResponse> {
    return await this.dashboardService.getSummary(currentUser.userId);
  }

  @Post('recent-activity')
  @ApiOperation({
    summary: 'Get logged-in user recent activity with pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent activity fetched successfully',
  })
  async getRecentActivity(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() listRecentActivityDto: ListRecentActivityDto,
  ): Promise<AppResponse> {
    return await this.dashboardService.getRecentActivity(
      currentUser.userId,
      listRecentActivityDto,
    );
  }
}
