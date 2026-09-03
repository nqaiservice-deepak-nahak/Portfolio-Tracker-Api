import { computeCharges } from './trade-charges.util';

describe('computeCharges', () => {
  describe('BUY transaction', () => {
    it('should compute charges correctly for a buy transaction with brokerage', () => {
      // turnover = 100 × 10 = 1000
      // STT                    = 1000 × 0.001        = 1.000
      // exchangeTransactionChg = 1000 × 0.0000297    = 0.0297
      // sebiCharges            = 1000 × 0.000001     = 0.001
      // stampDuty              = 1000 × 0.00015      = 0.15
      // gst                    = (20 + 0.0297 + 0.001) × 0.18 = 3.6054...
      // total ≈ 1 + 0.0297 + 0.001 + 0.15 + 3.6054... ≈ 4.79
      const result = computeCharges({
        price: 100,
        quantity: 10,
        brokerage: 20,
        transactionType: 'BUY',
      });

      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
      // Verify it's rounded to 2 decimal places
      expect(result).toBe(Number(result.toFixed(2)));
    });

    it('should include stamp duty only on BUY side', () => {
      const buyCharges = computeCharges({
        price: 1000,
        quantity: 5,
        brokerage: 0,
        transactionType: 'BUY',
      });

      const sellCharges = computeCharges({
        price: 1000,
        quantity: 5,
        brokerage: 0,
        transactionType: 'SELL',
      });

      // BUY charges must be higher because stamp duty is BUY-only
      expect(buyCharges).toBeGreaterThan(sellCharges);
    });

    it('should compute zero stamp duty on SELL', () => {
      const turnover = 500 * 8;
      const stt = turnover * 0.001;
      const etc = turnover * 0.0000297;
      const sebi = turnover * 0.000001;
      const gst = (0 + etc + sebi) * 0.18;
      const expected = Number((stt + etc + sebi + gst).toFixed(2));

      const result = computeCharges({
        price: 500,
        quantity: 8,
        brokerage: 0,
        transactionType: 'SELL',
      });

      expect(result).toBe(expected);
    });

    it('should produce higher charges when brokerage is higher (due to GST on brokerage)', () => {
      const lowBrokerage = computeCharges({
        price: 200,
        quantity: 10,
        brokerage: 0,
        transactionType: 'BUY',
      });

      const highBrokerage = computeCharges({
        price: 200,
        quantity: 10,
        brokerage: 50,
        transactionType: 'BUY',
      });

      expect(highBrokerage).toBeGreaterThan(lowBrokerage);
      // Difference should be 50 × 0.18 = 9 (GST on the extra brokerage)
      expect(highBrokerage - lowBrokerage).toBeCloseTo(9, 2);
    });

    it('should return a value rounded to exactly 2 decimal places', () => {
      const result = computeCharges({
        price: 3457.75,
        quantity: 13,
        brokerage: 22.5,
        transactionType: 'BUY',
      });

      const asString = result.toString();
      const parts = asString.split('.');
      const decimalDigits = parts[1]?.length ?? 0;
      expect(decimalDigits).toBeLessThanOrEqual(2);
    });

    it('should handle zero brokerage correctly', () => {
      const result = computeCharges({
        price: 100,
        quantity: 1,
        brokerage: 0,
        transactionType: 'BUY',
      });

      expect(result).toBeGreaterThan(0); // STT + etc still apply
    });

    it('should scale linearly with quantity', () => {
      const single = computeCharges({
        price: 100,
        quantity: 1,
        brokerage: 0,
        transactionType: 'BUY',
      });

      const ten = computeCharges({
        price: 100,
        quantity: 10,
        brokerage: 0,
        transactionType: 'BUY',
      });

      expect(ten).toBeCloseTo(single * 10, 1);
    });
  });

  describe('exact formula verification', () => {
    it('should compute correct BUY charges for price=100, qty=10, brokerage=20', () => {
      const turnover = 100 * 10; // 1000
      const stt = turnover * 0.001;                  // 1.0
      const etc = turnover * 0.0000297;               // 0.0297
      const sebi = turnover * 0.000001;               // 0.001
      const stamp = turnover * 0.00015;               // 0.15
      const gst = (20 + etc + sebi) * 0.18;           // (20.0307) × 0.18 = 3.605526
      const expected = Number((stt + etc + sebi + stamp + gst).toFixed(2));

      const result = computeCharges({
        price: 100,
        quantity: 10,
        brokerage: 20,
        transactionType: 'BUY',
      });

      expect(result).toBe(expected);
    });

    it('should compute correct SELL charges for price=120, qty=4, brokerage=2', () => {
      const turnover = 120 * 4; // 480
      const stt = turnover * 0.001;
      const etc = turnover * 0.0000297;
      const sebi = turnover * 0.000001;
      const stamp = 0; // SELL — no stamp duty
      const gst = (2 + etc + sebi) * 0.18;
      const expected = Number((stt + etc + sebi + stamp + gst).toFixed(2));

      const result = computeCharges({
        price: 120,
        quantity: 4,
        brokerage: 2,
        transactionType: 'SELL',
      });

      expect(result).toBe(expected);
    });
  });
});
