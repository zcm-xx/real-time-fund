import type { FundSearchResult } from '@/api/types';

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

/** fundSearch 会返回股票，需与基金区分（CATEGORY 700=基金） */
export function isStockSearchResult(item: FundSearchResult): boolean {
  if (item.CATEGORY === 700 || item.CATEGORYDESC === '基金') return false;
  if (item.FundBaseInfo) return false;
  if (item.STOCKMARKET != null && item.STOCKMARKET !== '') return true;
  if (item.CATEGORYDESC && /市$/.test(item.CATEGORYDESC)) return true;
  return false;
}

export function marketFromSearchResult(item: FundSearchResult): number {
  const fromApi = Number.parseInt(String(item.STOCKMARKET ?? ''), 10);
  if (!Number.isNaN(fromApi)) return fromApi;
  return detectStockMarket(item.CODE);
}
