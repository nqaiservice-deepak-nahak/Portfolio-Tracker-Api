import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTradeDto {
  @ApiProperty({
    example: 'TCS',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message: 'stockSymbol must contain at least one non-whitespace character',
  })
  @MaxLength(20)
  stockSymbol!: string;

  @ApiProperty({
    example: 'Tata Consultancy Services',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message: 'companyName must contain at least one non-whitespace character',
  })
  @MaxLength(120)
  companyName!: string;

  @ApiProperty({
    example: '2026-06-15',
  })
  @IsDateString()
  buyDate!: string;

  @ApiProperty({
    example: 3500,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  buyPrice!: number;

  @ApiProperty({
    example: 10,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

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
    example: 'Short term swing trade',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/\S/, {
    message: 'notes must contain at least one non-whitespace character',
  })
  notes?: string;
}