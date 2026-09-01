import { IsDateString, IsNumber, Min } from 'class-validator';

export class AddSellLotDto {
  @IsNumber() @Min(0.01) sellPrice: number;
  @IsNumber() @Min(1) sellQuantity: number;
  @IsDateString() sellDate: string;
}
