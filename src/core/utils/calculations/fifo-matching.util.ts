import { BuyLotDocument } from '../../../database/schemas/buy-lot.schema';
import { TradeSellDocument } from '../../../database/schemas/trade-sell.schema';

export interface FifoSellResult {
  sellId: string;
  realizedCost: number;
}

export interface FifoPositionResult {
  totalOriginalQuantity: number;
  remainingQuantity: number;
  remainingTotalCost: number;
  averageBuyPrice: number;
  sellResults: FifoSellResult[];
}

/**
 * Runs a FIFO matching algorithm on all buy lots and sells for a position.
 * Returns the current remaining quantity, the total cost basis of those remaining shares,
 * the average buy price, and the realized cost for each sell.
 */
export function calculateFifoPosition(
  buyLots: BuyLotDocument[],
  sells: TradeSellDocument[],
): FifoPositionResult {
  // Sort buy lots by date ascending
  const sortedLots = [...buyLots].sort(
    (a, b) => a.buyDate.getTime() - b.buyDate.getTime(),
  );

  // Sort sells by date ascending
  const sortedSells = [...sells].sort(
    (a, b) => a.sellDate.getTime() - b.sellDate.getTime(),
  );

  // We will track the remaining quantity and cost for each lot as we process sells
  const lotStates = sortedLots.map((lot) => {
    // Total cost of this lot = price * qty + brokerage + charges
    const totalCost =
      lot.buyPrice * lot.originalQuantity + lot.brokerage + lot.charges;
    const costPerShare = totalCost / lot.originalQuantity;

    return {
      id: lot._id.toString(),
      originalQty: lot.originalQuantity,
      remainingQty: lot.originalQuantity,
      costPerShare,
    };
  });

  const sellResults: FifoSellResult[] = [];

  for (const sell of sortedSells) {
    let qtyToSell = sell.quantity;
    let realizedCost = 0;

    for (const lot of lotStates) {
      if (qtyToSell <= 0) break;
      if (lot.remainingQty <= 0) continue;

      const qtyFromThisLot = Math.min(qtyToSell, lot.remainingQty);
      lot.remainingQty -= qtyFromThisLot;
      qtyToSell -= qtyFromThisLot;

      realizedCost += qtyFromThisLot * lot.costPerShare;
    }

    sellResults.push({
      sellId: sell._id.toString(),
      realizedCost,
    });
  }

  let remainingQuantity = 0;
  let remainingTotalCost = 0;
  let totalOriginalQuantity = 0;

  for (const lot of lotStates) {
    totalOriginalQuantity += lot.originalQty;
    if (lot.remainingQty > 0) {
      remainingQuantity += lot.remainingQty;
      remainingTotalCost += lot.remainingQty * lot.costPerShare;
    }
  }

  const averageBuyPrice =
    remainingQuantity > 0 ? remainingTotalCost / remainingQuantity : 0;

  return {
    totalOriginalQuantity,
    remainingQuantity,
    remainingTotalCost,
    averageBuyPrice,
    sellResults,
  };
}
