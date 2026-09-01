import { calculateSipFutureValue } from './sip-calculation.util';

describe('calculateSipFutureValue', () => {
  it('should return 0 when months is 0', () => {
    const result = calculateSipFutureValue({
      monthlySip: 5000,
      annualCagr: 12,
      months: 0,
    });

    expect(result).toBe(0);
  });

  it('should return 0 when monthly SIP is 0', () => {
    const result = calculateSipFutureValue({
      monthlySip: 0,
      annualCagr: 12,
      months: 12,
    });

    expect(result).toBe(0);
  });

  it('should calculate SIP future value for 0% CAGR', () => {
    const result = calculateSipFutureValue({
      monthlySip: 5000,
      annualCagr: 0,
      months: 12,
    });

    expect(result).toBe(60000);
  });

  it('should calculate SIP future value for positive CAGR', () => {
    const result = calculateSipFutureValue({
      monthlySip: 5000,
      annualCagr: 12,
      months: 12,
    });

    expect(result).toBeCloseTo(64046.64, 2);
  });
});