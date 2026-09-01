import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChatbotMessageDto {
  @IsString() @IsNotEmpty() @MaxLength(2000) message: string;
  @IsOptional() @IsArray() conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}
