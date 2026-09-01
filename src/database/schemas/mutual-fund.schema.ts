import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MutualFundDocument = HydratedDocument<MutualFund>;

export enum MutualFundCategory {
  EQUITY = 'EQUITY',
  DEBT = 'DEBT',
  HYBRID = 'HYBRID',
}

@Schema({
  timestamps: true,
  collection: 'mutual_funds',
})
export class MutualFund {
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
  })
  fundName!: string;

  @Prop({
    type: String,
    enum: Object.values(MutualFundCategory),
    required: true,
    index: true,
  })
  category!: MutualFundCategory;

  @Prop({
    type: Number,
    required: true,
    min: 0,
    default: 0,
  })
  sipAmount!: number;

  @Prop({
    type: Number,
    required: true,
    min: 0,
    default: 0,
  })
  lumpSumAmount!: number;

  @Prop({
    type: Date,
    required: true,
  })
  startDate!: Date;

  @Prop({
    type: Number,
    required: true,
    min: 0,
    default: 0,
  })
  currentCagr!: number;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive!: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  archivedAt!: Date | null;
}

export const MutualFundSchema = SchemaFactory.createForClass(MutualFund);

MutualFundSchema.index({
  userId: 1,
  isActive: 1,
});

MutualFundSchema.index({
  userId: 1,
  category: 1,
});