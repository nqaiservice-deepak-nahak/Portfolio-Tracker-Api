import { Injectable } from '@nestjs/common';
import { ChatbotAbstract } from './chatbot.abstract';

@Injectable()
export class ChatbotService extends ChatbotAbstract {}
