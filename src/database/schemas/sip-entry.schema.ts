import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SipEntryDocument = HydratedDocument<SipEntry>;

@Schema({
  timestamps: true,
  collection: 'sip_entries',
})
export class SipEntry {
  @Prop({
    type: Types.ObjectId,
    ref: 'MutualFund',
    required: true,
    index: true,
  })
  fundId!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    match: /^\d{4}-(0[1-9]|1[0-2])$/,
  })
  month!: string;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  amountContributed!: number;

  @Prop({
    type: String,
    default: '',
    trim: true,
  })
  notes!: string;
}

export const SipEntrySchema = SchemaFactory.createForClass(SipEntry);

SipEntrySchema.index({
  userId: 1,
  fundId: 1,
  month: 1,
});

SipEntrySchema.index(
  {
    fundId: 1,
    month: 1,
  },
  {
    unique: true,
  },
);