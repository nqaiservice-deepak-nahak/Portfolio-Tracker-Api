import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BuyLotDocument = HydratedDocument<BuyLot>;

@Schema({
  timestamps: true,
  collection: 'buy_lots',
})
export class BuyLot {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Trade',
    required: true,
    index: true,
  })
  tradeId!: string; // Reference to the parent position (Trade)

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
  originalQuantity!: number;


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
}

export const BuyLotSchema = SchemaFactory.createForClass(BuyLot);

BuyLotSchema.index({
  userId: 1,
  tradeId: 1,
});

BuyLotSchema.index({
  tradeId: 1,
  buyDate: 1, // Useful for FIFO sorting
});
