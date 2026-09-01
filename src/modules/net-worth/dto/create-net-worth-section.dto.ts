import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateNetWorthSectionDto {
  @IsString() @IsNotEmpty() sectionName: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() notes?: string;
}
