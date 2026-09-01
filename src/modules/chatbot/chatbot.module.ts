import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatbotAbstract } from './chatbot.abstract';

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService, { provide: ChatbotAbstract, useClass: ChatbotService }],
  exports: [ChatbotService, ChatbotAbstract],
})
export class ChatbotModule {}
