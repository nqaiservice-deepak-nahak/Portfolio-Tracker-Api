import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSipEntryDto {
  @ApiProperty({
    example: '2026-06',
    description: 'SIP month in YYYY-MM format',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format',
  })
  month!: string;

  @ApiProperty({
    example: 5000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amountContributed!: number;

  @ApiProperty({
    example: 'June SIP contribution',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/\S/, {
    message: 'notes must contain at least one non-whitespace character',
  })
  notes?: string;
}