import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTradeSellDto {
  @ApiProperty({
    example: '2026-06-20',
  })
  @IsDateString()
  sellDate!: string;

  @ApiProperty({
    example: 5,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    example: 3700,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellPrice!: number;

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
    example: 'Partial exit',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  notes?: string;
}