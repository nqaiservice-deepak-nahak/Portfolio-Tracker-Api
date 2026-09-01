import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChatSessionDocument = HydratedDocument<ChatSession>;

@Schema({ timestamps: true, collection: 'chat_sessions' })
export class ChatSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true }) userId!: Types.ObjectId;
  @Prop({ type: [{ role: String, content: String, timestamp: Date }], default: [] }) messages!: Array<{ role: string; content: string; timestamp: Date }>;
}
export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);
