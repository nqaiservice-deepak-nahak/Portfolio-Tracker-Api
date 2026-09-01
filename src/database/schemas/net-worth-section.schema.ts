import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { NetWorthSectionType } from '../../core/enums/net-worth-section-type.enum';

export type NetWorthSectionDocument = HydratedDocument<NetWorthSection>;

@Schema({ timestamps: true, collection: 'net_worth_sections' })
export class NetWorthSection {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true }) userId!: Types.ObjectId;
  @Prop({ required: true, trim: true }) sectionName!: string;
  @Prop({ required: true, enum: NetWorthSectionType, default: NetWorthSectionType.CUSTOM }) sectionType!: NetWorthSectionType;
  @Prop({ required: true, min: 0 }) amount!: number;
  @Prop({ type: String, required: false, default: null })
  notes!: string | null;
  @Prop({ required: true, default: Date.now }) lastUpdated!: Date;
}
export const NetWorthSectionSchema = SchemaFactory.createForClass(NetWorthSection);
