import { apiRequest, unwrapEastmoneyData } from '@/api/client';
import type {
  AppSettings,
  IndexQuote,
  KlineBar,
  Quote,
  StockDetailResponse,
  StockKlineResponse,
  StockTrendsResponse,
} from '@/api/types';
import { detectStockMarket } from '@/utils/market';

export async function fetchStockQuote(
  code: string,
  name: string,
  market = detectStockMarket(code),
  settings?: AppSettings,
): Promise<Quote> {
  const base: Quote = {
    code,
    name,
    type: 'stock',
    price: null,
    change: null,
    changePercent: null,
    prevClose: null,
    updatedAt: new Date().toISOString(),
  };

  try {
    const raw = await apiRequest<StockDetailResponse | { data?: StockDetailResponse }>(
      '/stockGet',
      { type: market, code },
      settings,
    );
    const data = unwrapEastmoneyData(raw);

    const decimal = data.decimal ?? 2;
    const scale = 10 ** decimal;
    const price = scaleField(data.f43, scale);
    const change = scaleField(data.f169, scale);
    const changePercent = data.f170 !== undefined ? data.f170 / 100 : null;
    const prevClose =
      price !== null && change !== null ? price - change : scaleField(data.f60, scale);

    return {
      code: data.f57 || code,
      name: data.f58 || name,
      type: 'stock',
      price,
      change,
      changePercent,
      prevClose,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...base,
      error: error instanceof Error ? error.message : '获取失败',
    };
  }
}

function scaleField(value: number | undefined, scale: number): number | null {
  if (value === undefined) return null;
  return value / scale;
}

export async function fetchStockDetail(
  code: string,
  market = detectStockMarket(code),
  settings?: AppSettings,
): Promise<StockDetailResponse> {
  const raw = await apiRequest<StockDetailResponse | { data?: StockDetailResponse }>(
    '/stockGet',
    { type: market, code },
    settings,
  );
  return unwrapEastmoneyData(raw);
}

export function parseStockSparkline(
  trends?: string[],
  decimal = 2,
): number[] {
  if (!trends?.length) return [];
  const scale = 10 ** decimal;
  return trends
    .map((row) => {
      const parts = row.split(',');
      const price = Number.parseFloat(parts[1] ?? '');
      return Number.isNaN(price) ? NaN : price / scale;
    })
    .filter((n) => !Number.isNaN(n));
}

export async function fetchStockSparkline(
  code: string,
  market = detectStockMarket(code),
  settings?: AppSettings,
): Promise<number[]> {
  const raw = await apiRequest<StockTrendsResponse | { data?: StockTrendsResponse }>(
    '/stockTrends2',
    { type: market, code, ndays: 1 },
    settings,
  );
  const data = unwrapEastmoneyData(raw);
  return parseStockSparkline(data.trends, data.decimal ?? 2);
}

export async function fetchStockKline(
  code: string,
  market = detectStockMarket(code),
  settings?: AppSettings,
  days = 30,
): Promise<number[]> {
  const bars = await fetchStockKlineBars(code, market, settings, days);
  return bars.map((b) => b.close);
}

export function parseStockKlineBars(
  klines: string[] | undefined,
  decimal = 2,
): KlineBar[] {
  if (!klines?.length) return [];
  const scale = 10 ** decimal;
  return klines
    .map((row) => {
      const p = row.split(',');
      const open = Number.parseFloat(p[1] ?? '') / scale;
      const high = Number.parseFloat(p[2] ?? '') / scale;
      const low = Number.parseFloat(p[3] ?? '') / scale;
      const close = Number.parseFloat(p[4] ?? '') / scale;
      const date = (p[0] ?? '').split(' ')[0] ?? '';
      if ([open, high, low, close].some(Number.isNaN)) return null;
      return { date, open, high, low, close };
    })
    .filter((b): b is KlineBar => b !== null);
}

export async function fetchStockKlineBars(
  code: string,
  market = detectStockMarket(code),
  settings?: AppSettings,
  days = 60,
): Promise<KlineBar[]> {
  const raw = await apiRequest<StockKlineResponse | { data?: StockKlineResponse }>(
    '/stockKline',
    { type: market, code, klt: 101, lmt: days, fqt: 1 },
    settings,
  );
  const data = unwrapEastmoneyData(raw);
  return parseStockKlineBars(data.klines, data.decimal ?? 2);
}

const MARKET_INDICES = [
  { code: '000001', name: '上证指数', market: 1 },
  { code: '399001', name: '深证成指', market: 0 },
  { code: '399006', name: '创业板指', market: 0 },
] as const;

export async function fetchMarketIndices(
  settings?: AppSettings,
): Promise<IndexQuote[]> {
  const results = await Promise.all(
    MARKET_INDICES.map(async ({ code, name, market }) => {
      try {
        const data = await fetchStockDetail(code, market, settings);
        const quote = parseStockQuoteFromDetail(data, code, name);
        return {
          code,
          name: data.f58 || name,
          price: quote.price,
          changePercent: quote.changePercent,
        };
      } catch {
        return { code, name, price: null, changePercent: null };
      }
    }),
  );
  return results;
}

export function parseStockQuoteFromDetail(
  data: StockDetailResponse,
  code: string,
  name: string,
): Quote {
  const decimal = data.decimal ?? 2;
  const scale = 10 ** decimal;
  const price = scaleField(data.f43, scale);
  const change = scaleField(data.f169, scale);
  const changePercent = data.f170 !== undefined ? data.f170 / 100 : null;
  const prevClose =
    price !== null && change !== null ? price - change : scaleField(data.f60, scale);

  return {
    code: data.f57 || code,
    name: data.f58 || name,
    type: 'stock',
    price,
    change,
    changePercent,
    prevClose,
    updatedAt: new Date().toISOString(),
  };
}
