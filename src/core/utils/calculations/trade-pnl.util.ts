import { TradeStatus } from '../../enums/trade-status.enum';

export interface TradeLot { price: number; quantity: number; date?: Date | string; }
export interface TradePnlInput { buyLots: TradeLot[]; sellLots: TradeLot[]; lastKnownPrice?: number | null; }

export function calculateTradePnl(input: TradePnlInput) {
  const totalBoughtQty = input.buyLots.reduce((s, l) => s + l.quantity, 0);
  const totalBoughtValue = input.buyLots.reduce((s, l) => s + l.quantity * l.price, 0);
  const totalSoldQty = input.sellLots.reduce((s, l) => s + l.quantity, 0);
  const totalSoldValue = input.sellLots.reduce((s, l) => s + l.quantity * l.price, 0);
  const averageBuyPrice = totalBoughtQty > 0 ? totalBoughtValue / totalBoughtQty : 0;
  const remainingQuantity = totalBoughtQty - totalSoldQty;
  const realisedPnl = totalSoldValue - totalSoldQty * averageBuyPrice;
  const unrealisedPnl = input.lastKnownPrice && remainingQuantity > 0 ? (input.lastKnownPrice - averageBuyPrice) * remainingQuantity : 0;
  const status = totalSoldQty === 0 ? TradeStatus.PENDING : remainingQuantity > 0 ? TradeStatus.PARTIALLY_EXITED : TradeStatus.CLOSED;
  return { totalBoughtQty, totalSoldQty, remainingQuantity, averageBuyPrice, realisedPnl, unrealisedPnl, totalPnl: realisedPnl + unrealisedPnl, status };
}
