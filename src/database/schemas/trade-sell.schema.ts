import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TradeSellDocument = HydratedDocument<TradeSell>;

@Schema({
  timestamps: true,
  collection: 'trade_sells',
})
export class TradeSell {
  @Prop({
    type: Types.ObjectId,
    ref: 'Trade',
    required: true,
    index: true,
  })
  tradeId!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: string;

  @Prop({
    type: Date,
    required: true,
  })
  sellDate!: Date;

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
  })
  sellPrice!: number;

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
    type: String,
    default: '',
    trim: true,
  })
  notes!: string;
}

export const TradeSellSchema = SchemaFactory.createForClass(TradeSell);

TradeSellSchema.index({
  userId: 1,
  tradeId: 1,
});

TradeSellSchema.index({
  tradeId: 1,
  sellDate: -1,
});