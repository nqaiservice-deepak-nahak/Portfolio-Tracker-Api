export interface SipProjectionInput {
  monthlySip: number;
  annualCagr: number;
  months: number;
}

export function calculateSipFutureValue(input: SipProjectionInput): number {
  const { monthlySip, annualCagr, months } = input;
  if (months <= 0 || monthlySip <= 0) return 0;
  const monthlyRate = annualCagr / 100 / 12;
  if (monthlyRate === 0) return monthlySip * months;
  return monthlySip * (((1 + monthlyRate) ** months - 1) / monthlyRate) * (1 + monthlyRate);
}
