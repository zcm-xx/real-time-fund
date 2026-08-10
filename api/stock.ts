import {
  fetchEastmoneyStockDetail,
  fetchEastmoneyStockKline,
  fetchEastmoneyStockTrends,
} from '@/api/eastmoney';
import {
  fetchSinaStockKline,
  fetchTencentStockDetail,
  fetchTencentStockKline,
  fetchTencentStockQuote,
} from '@/api/tencent';
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
import { MARKET_INDICES } from '@/utils/indices';

export async function fetchStockQuote(
  code: string,
  name: string,
  market = detectStockMarket(code),
  _settings?: AppSettings,
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
    return await fetchTencentStockQuote(code, name, market);
  } catch (tencentError) {
    try {
      const data = await fetchEastmoneyStockDetail(code, market);
      return parseStockQuoteFromDetail(data, code, name);
    } catch {
      return {
        ...base,
        error:
          tencentError instanceof Error
            ? tencentError.message
            : '获取失败',
      };
    }
  }
}

function scaleField(value: number | undefined, scale: number): number | null {
  if (value === undefined || Number.isNaN(value)) return null;
  return value / scale;
}

export async function fetchStockDetail(
  code: string,
  market = detectStockMarket(code),
  _settings?: AppSettings,
): Promise<StockDetailResponse> {
  try {
    return await fetchTencentStockDetail(code, market);
  } catch {
    return fetchEastmoneyStockDetail(code, market);
  }
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
  _settings?: AppSettings,
): Promise<number[]> {
  try {
    const data: StockTrendsResponse = await fetchEastmoneyStockTrends(code, market);
    return parseStockSparkline(data.trends, data.decimal ?? 0);
  } catch {
    return [];
  }
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
  decimal = 0,
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
  _settings?: AppSettings,
  days = 60,
): Promise<KlineBar[]> {
  try {
    return await fetchTencentStockKline(code, market, days);
  } catch {
    // try next
  }
  try {
    return await fetchSinaStockKline(code, market, days);
  } catch {
    // try next
  }
  try {
    const data: StockKlineResponse = await fetchEastmoneyStockKline(
      code,
      market,
      days,
    );
    return parseStockKlineBars(data.klines, data.decimal ?? 0);
  } catch {
    return [];
  }
}

export async function fetchMarketIndices(
  _settings?: AppSettings,
): Promise<IndexQuote[]> {
  const results = await Promise.all(
    MARKET_INDICES.map(async ({ code, name, market, desc }) => {
      try {
        const quote = await fetchStockQuote(code, name, market);
        return {
          code,
          name: quote.name || name,
          price: quote.price,
          changePercent: quote.changePercent,
          desc,
        };
      } catch {
        return { code, name, price: null, changePercent: null, desc };
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
  const decimal = data.decimal ?? data.f59 ?? 2;
  const scale = 10 ** decimal;
  const price = scaleField(data.f43, scale);
  const change = scaleField(data.f169, scale);
  const changePercent = data.f170 !== undefined ? data.f170 / 100 : null;
  const prevClose =
    price !== null && change !== null
      ? price - change
      : scaleField(data.f60, scale);

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
