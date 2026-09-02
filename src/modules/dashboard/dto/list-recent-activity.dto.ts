import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ListRecentActivityDto {
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsNumber()
  @Min(1)
  limit: number = 10;

  @IsOptional()
  @IsString()
  activityType?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
