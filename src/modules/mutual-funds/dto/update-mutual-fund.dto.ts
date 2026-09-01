import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { MutualFundCategory } from '../../../database/schemas/mutual-fund.schema';

export class UpdateMutualFundDto {
  @ApiProperty({
    example: 'Axis Bluechip Fund',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/\S/, {
    message: 'fundName must contain at least one non-whitespace character',
  })
  fundName?: string;

  @ApiProperty({
    example: MutualFundCategory.EQUITY,
    enum: MutualFundCategory,
    required: false,
  })
  @IsEnum(MutualFundCategory)
  @IsOptional()
  category?: MutualFundCategory;

  @ApiProperty({
    example: 5000,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  sipAmount?: number;

  @ApiProperty({
    example: 10000,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  lumpSumAmount?: number;

  @ApiProperty({
    example: '2026-06-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    example: 12,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  currentCagr?: number;

  @ApiProperty({
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
