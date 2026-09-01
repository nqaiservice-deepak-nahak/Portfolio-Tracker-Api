import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MicrosoftLoginDto {
  @ApiProperty({
    example: 'eyJ0eXAiOiJKV1QiLCJub25jZSI6...',
    description: 'Microsoft ID token received from MSAL login response',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}