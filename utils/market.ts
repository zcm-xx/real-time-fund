/** 根据 A 股代码推断 stockGet 的 type 参数 */
export function detectStockMarket(code: string): number {
  const normalized = code.trim();
  if (/^6/.test(normalized) || /^5/.test(normalized)) return 1;
  return 0;
}

export function isStockCode(input: string): boolean {
  return /^\d{6}$/.test(input.trim());
}

export function isFundCode(input: string): boolean {
  return /^\d{6}$/.test(input.trim());
}
