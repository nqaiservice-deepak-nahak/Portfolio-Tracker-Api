import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { TradeStatus } from '../../../database/schemas/trade.schema';

export class UpdateTradeDto {
  @ApiProperty({
    example: 'TCS',
    required: false,
  })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  stockSymbol?: string;

  @ApiProperty({
    example: 'Tata Consultancy Services',
    required: false,
  })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  companyName?: string;

  @ApiProperty({
    example: '2026-06-15',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  buyDate?: string;

  @ApiProperty({
    example: 3500,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  buyPrice?: number;

  @ApiProperty({
    example: 10,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiProperty({
    example: 20,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  brokerage?: number;

  @ApiProperty({
    example: 15,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  charges?: number;

  @ApiProperty({
    example: 3600,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  currentPrice?: number;

  @ApiProperty({
    example: 3900,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  targetPrice?: number;

  @ApiProperty({
    example: 3300,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  stopLoss?: number;

  @ApiProperty({
    example: 'Updated trade notes',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    example: TradeStatus.OPEN,
    enum: TradeStatus,
    required: false,
  })
  @IsEnum(TradeStatus)
  @IsOptional()
  status?: TradeStatus;
}
