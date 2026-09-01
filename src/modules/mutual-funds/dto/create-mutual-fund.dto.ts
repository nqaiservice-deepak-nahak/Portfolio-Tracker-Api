import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { MutualFundCategory } from '../../../database/schemas/mutual-fund.schema';

export class CreateMutualFundDto {
  @ApiProperty({
    example: 'Axis Bluechip Fund',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message: 'fundName must contain at least one non-whitespace character',
  })
  fundName!: string;

  @ApiProperty({
    example: MutualFundCategory.EQUITY,
    enum: MutualFundCategory,
  })
  @IsEnum(MutualFundCategory)
  category!: MutualFundCategory;

  @ApiProperty({
    example: 5000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sipAmount!: number;

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
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    example: 12,
    description: 'Expected annual CAGR percentage',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  currentCagr!: number;
}
