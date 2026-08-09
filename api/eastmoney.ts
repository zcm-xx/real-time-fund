import type { StockDetailResponse, StockKlineResponse, StockTrendsResponse } from '@/api/types';
import { detectStockMarket } from '@/utils/market';

const STOCK_FIELDS =
  'f43,f44,f45,f46,f47,f48,f57,f58,f59,f60,f116,f117,f127,f162,f168,f169,f170';

function secid(code: string, market = detectStockMarket(code)): string {
  return `${market}.${code.trim()}`;
}

async function fetchEastmoneyJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`东方财富请求失败: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function unwrapData<T>(payload: { rc?: number; data?: T | null } | null | undefined): T {
  if (!payload || payload.data == null) {
    throw new Error('东方财富返回空数据');
  }
  return payload.data;
}

/** 股票详情（直连东方财富，不依赖 TiantianFundApi） */
export async function fetchEastmoneyStockDetail(
  code: string,
  market = detectStockMarket(code),
): Promise<StockDetailResponse> {
  const url =
    `https://push2.eastmoney.com/api/qt/stock/get` +
    `?secid=${encodeURIComponent(secid(code, market))}` +
    `&ut=fa5fd1943c7b386f172d6893dbfba10b` +
    `&fields=${STOCK_FIELDS}&invt=2&fltt=1`;
  const payload = await fetchEastmoneyJson<{ rc?: number; data?: StockDetailResponse | null }>(
    url,
  );
  return unwrapData(payload);
}

/** 分时走势；价格已是实际值，无需再按 decimal 缩放 */
export async function fetchEastmoneyStockTrends(
  code: string,
  market = detectStockMarket(code),
): Promise<StockTrendsResponse> {
  const url =
    `https://push2.eastmoney.com/api/qt/stock/trends2/get` +
    `?secid=${encodeURIComponent(secid(code, market))}` +
    `&ndays=1&iscr=0` +
    `&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13` +
    `&fields2=f51,f52,f53,f54,f55,f56,f57,f58`;
  const payload = await fetchEastmoneyJson<{
    rc?: number;
    data?: StockTrendsResponse | null;
  }>(url);
  const data = unwrapData(payload);
  return {
    ...data,
    // 直连接口 trends 价格已是元，标记 decimal=0 避免二次缩放
    decimal: 0,
  };
}

/** 日 K；失败时返回空，不阻断详情页 */
export async function fetchEastmoneyStockKline(
  code: string,
  market = detectStockMarket(code),
  days = 90,
): Promise<StockKlineResponse> {
  const hosts = [
    'https://push2his.eastmoney.com',
    'https://push2delay.eastmoney.com',
    'https://push2.eastmoney.com',
  ];
  let lastError: unknown;
  for (const host of hosts) {
    try {
      const url =
        `${host}/api/qt/stock/kline/get` +
        `?secid=${encodeURIComponent(secid(code, market))}` +
        `&ut=fa5fd1943c7b386f172d6893dbfba10b` +
        `&fields1=f1,f2,f3,f4,f5,f6` +
        `&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61` +
        `&klt=101&fqt=1&end=20500101&lmt=${days}&beg=0`;
      const payload = await fetchEastmoneyJson<{
        rc?: number;
        data?: StockKlineResponse | null;
      }>(url);
      if (payload.data) {
        return {
          ...payload.data,
          decimal: 0,
        };
      }
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) {
    console.warn('[基金助手] K线获取失败', lastError);
  }
  return { klines: [], decimal: 0 };
}
