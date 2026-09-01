export function toCurrencyNumber(value: number): number {
  return Number(Number(value || 0).toFixed(2));
}
