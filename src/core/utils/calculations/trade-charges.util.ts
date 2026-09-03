/**
 * Computes statutory and exchange charges for an Indian equity delivery trade.
 *
 * Rates (as of 2024–25):
 *  - STT:                    0.1%   (charged on both buy and sell turnover)
 *  - Exchange transaction:   0.00297% (NSE)
 *  - SEBI charges:           ₹10 per crore = 0.0001%
 *  - Stamp duty:             0.015% on buy turnover only
 *  - GST:                    18% on (brokerage + exchange charge + SEBI charge)
 *
 * @param price           Buy price (for BUY) or sell price (for SELL)
 * @param quantity        Number of shares in this transaction
 * @param brokerage       Client-supplied brokerage for this transaction (trusted, not recomputed)
 * @param transactionType 'BUY' or 'SELL'
 * @returns Computed charges, rounded to 2 decimal places
 */
export function computeCharges(params: {
  price: number;
  quantity: number;
  brokerage: number;
  transactionType: 'BUY' | 'SELL';
}): number {
  const { price, quantity, brokerage, transactionType } = params;

  const turnover = price * quantity;

  const stt = turnover * 0.001;
  const exchangeTransactionCharge = turnover * 0.0000297;
  const sebiCharges = turnover * 0.000001;
  const stampDuty = transactionType === 'BUY' ? turnover * 0.00015 : 0;
  const gst = (brokerage + exchangeTransactionCharge + sebiCharges) * 0.18;

  const total =
    stt + exchangeTransactionCharge + sebiCharges + stampDuty + gst;

  return Number(total.toFixed(2));
}
