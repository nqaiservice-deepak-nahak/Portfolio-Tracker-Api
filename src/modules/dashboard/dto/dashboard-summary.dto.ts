import { ApiProperty } from '@nestjs/swagger';

export class DashboardMetricDto {
  @ApiProperty({
    example: 'Total Net Worth',
  })
  label!: string;

  @ApiProperty({
    example: 0,
  })
  value!: number;

  @ApiProperty({
    example: '₹0',
  })
  displayValue!: string;

  @ApiProperty({
    example: 0,
  })
  changePercentage!: number;

  @ApiProperty({
    example: 'neutral',
    enum: ['positive', 'negative', 'neutral'],
  })
  trend!: 'positive' | 'negative' | 'neutral';
}

export class DashboardAssetAllocationDto {
  @ApiProperty({
    example: 'Mutual Funds',
  })
  label!: string;

  @ApiProperty({
    example: 0,
  })
  value!: number;

  @ApiProperty({
    example: 0,
  })
  percentage!: number;

  @ApiProperty({
    example: '₹0',
  })
  displayValue!: string;
}

export class DashboardRecentActivityDto {
  @ApiProperty({
    example: 'Welcome to NetworthX',
  })
  title!: string;

  @ApiProperty({
    example: 'Your portfolio dashboard is ready.',
  })
  description!: string;

  @ApiProperty({
    example: 'SYSTEM',
  })
  type!: string;

  @ApiProperty({
    example: '15 Jun 2026, 12:06:00 pm',
  })
  activityAt!: string;
}

export class DashboardSummaryDto {
  @ApiProperty({
    type: DashboardMetricDto,
  })
  netWorth!: DashboardMetricDto;

  @ApiProperty({
    type: DashboardMetricDto,
  })
  totalInvestment!: DashboardMetricDto;

  @ApiProperty({
    type: DashboardMetricDto,
  })
  mutualFunds!: DashboardMetricDto;

  @ApiProperty({
    type: DashboardMetricDto,
  })
  trades!: DashboardMetricDto;

  @ApiProperty({
    type: DashboardMetricDto,
  })
  profitLoss!: DashboardMetricDto;

  @ApiProperty({
    type: [DashboardAssetAllocationDto],
  })
  assetAllocation!: DashboardAssetAllocationDto[];

  @ApiProperty({
    type: [DashboardRecentActivityDto],
  })
  recentActivities!: DashboardRecentActivityDto[];
}