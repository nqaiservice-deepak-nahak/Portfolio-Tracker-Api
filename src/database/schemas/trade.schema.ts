import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TradeDocument = HydratedDocument<Trade>;

export enum TradeStatus {
  OPEN = 'OPEN',
  PARTIALLY_SOLD = 'PARTIALLY_SOLD',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

@Schema({
  timestamps: true,
  collection: 'trades',
})
export class Trade {
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
    uppercase: true,
    trim: true,
    index: true,
  })
  stockSymbol!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  companyName!: string;

  @Prop({
    type: Date,
    required: true,
  })
  buyDate!: Date;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  buyPrice!: number;

  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  quantity!: number;

  @Prop({
    type: Number,
    required: true,
    min: 0,
    default: 0,
  })
  brokerage!: number;

  @Prop({
    type: Number,
    required: true,
    min: 0,
    default: 0,
  })
  charges!: number;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  currentPrice!: number;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  targetPrice!: number;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  stopLoss!: number;

  @Prop({
    type: String,
    default: '',
    trim: true,
  })
  notes!: string;

  @Prop({
    type: String,
    enum: Object.values(TradeStatus),
    default: TradeStatus.OPEN,
    index: true,
  })
  status!: TradeStatus;

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

export const TradeSchema = SchemaFactory.createForClass(Trade);

TradeSchema.index({
  userId: 1,
  isActive: 1,
});

TradeSchema.index({
  userId: 1,
  status: 1,
});

TradeSchema.index({
  userId: 1,
  stockSymbol: 1,
});