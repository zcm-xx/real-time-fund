import type { KlineBar, Quote, StockDetailResponse } from '@/api/types';
import { detectStockMarket } from '@/utils/market';

/** 腾讯行情代码：sh600000 / sz300308 */
export function toTencentSymbol(code: string, market = detectStockMarket(code)): string {
  const normalized = code.trim();
  const prefix = market === 1 ? 'sh' : 'sz';
  return `${prefix}${normalized}`;
}

function decodeMaybeGbk(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('gbk').decode(buffer);
  } catch {
    try {
      return new TextDecoder('gb18030').decode(buffer);
    } catch {
      return new TextDecoder('utf-8').decode(buffer);
    }
  }
}

function parseNumber(value: string | undefined): number | null {
  if (!value || value === '-' || value === '') return null;
  const n = Number.parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

/**
 * 腾讯财经实时行情（国内较稳）
 * https://qt.gtimg.cn/q=sz300308
 */
export async function fetchTencentStockQuote(
  code: string,
  name: string,
  market = detectStockMarket(code),
): Promise<Quote> {
  const symbol = toTencentSymbol(code, market);
  const response = await fetch(`https://qt.gtimg.cn/q=${symbol}`);
  if (!response.ok) {
    throw new Error(`腾讯行情请求失败: ${response.status}`);
  }

  const text = decodeMaybeGbk(await response.arrayBuffer());
  const match = text.match(/="([^"]*)"/);
  if (!match?.[1] || match[1] === '') {
    throw new Error('腾讯行情返回空数据');
  }

  const parts = match[1].split('~');
  const parsedName = parts[1]?.trim() || name;
  const price = parseNumber(parts[3]);
  const prevClose = parseNumber(parts[4]);
  const change = parseNumber(parts[31]);
  const changePercent = parseNumber(parts[32]);

  if (price === null && !parsedName) {
    throw new Error('腾讯行情解析失败');
  }

  return {
    code: parts[2] || code,
    name: parsedName,
    type: 'stock',
    price,
    change,
    changePercent,
    prevClose,
    updatedAt: new Date().toISOString(),
  };
}

/** 把腾讯字段映射成详情页可用的结构（价格已是实际值） */
export async function fetchTencentStockDetail(
  code: string,
  market = detectStockMarket(code),
): Promise<StockDetailResponse> {
  const symbol = toTencentSymbol(code, market);
  const response = await fetch(`https://qt.gtimg.cn/q=${symbol}`);
  if (!response.ok) {
    throw new Error(`腾讯行情请求失败: ${response.status}`);
  }
  const text = decodeMaybeGbk(await response.arrayBuffer());
  const match = text.match(/="([^"]*)"/);
  if (!match?.[1]) {
    throw new Error('腾讯行情返回空数据');
  }
  const parts = match[1].split('~');

  const price = parseNumber(parts[3]);
  const prevClose = parseNumber(parts[4]);
  const change = parseNumber(parts[31]);
  const changePercent = parseNumber(parts[32]);
  const high = parseNumber(parts[33]);
  const low = parseNumber(parts[34]);
  const turnover = parseNumber(parts[38]);
  const pe = parseNumber(parts[52]);
  const circMvYi = parseNumber(parts[44]);
  const totalMvYi = parseNumber(parts[45]);

  return {
    f57: parts[2] || code,
    f58: parts[1]?.trim() || code,
    f59: 0,
    decimal: 0,
    f43: price ?? undefined,
    f169: change ?? undefined,
    f170: changePercent !== null ? Math.round(changePercent * 100) : undefined,
    f60: prevClose ?? undefined,
    f44: high ?? undefined,
    f45: low ?? undefined,
    f168: turnover !== null ? Math.round(turnover * 100) : undefined,
    f162: pe !== null ? Math.round(pe * 100) : undefined,
    f116: totalMvYi !== null ? totalMvYi * 1e8 : undefined,
    f117: circMvYi !== null ? circMvYi * 1e8 : undefined,
    f127: 'A股',
  };
}

/**
 * 腾讯日K（前复权）
 * qfqday: [date, open, close, high, low, volume]
 */
export async function fetchTencentStockKline(
  code: string,
  market = detectStockMarket(code),
  days = 90,
): Promise<KlineBar[]> {
  const symbol = toTencentSymbol(code, market);
  const url =
    `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get` +
    `?param=${encodeURIComponent(`${symbol},day,,,${days},qfq`)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`腾讯K线请求失败: ${response.status}`);
  }
  const payload = (await response.json()) as {
    code?: number;
    data?: Record<
      string,
      {
        qfqday?: string[][];
        day?: string[][];
      }
    >;
  };
  const block = payload.data?.[symbol];
  const rows = block?.qfqday ?? block?.day ?? [];
  const bars: KlineBar[] = [];
  for (const row of rows) {
    const date = row[0] ?? '';
    const open = Number.parseFloat(row[1] ?? '');
    const close = Number.parseFloat(row[2] ?? '');
    const high = Number.parseFloat(row[3] ?? '');
    const low = Number.parseFloat(row[4] ?? '');
    if ([open, high, low, close].some(Number.isNaN) || !date) continue;
    bars.push({ date, open, high, low, close });
  }
  if (bars.length === 0) {
    throw new Error('腾讯K线返回空数据');
  }
  return bars;
}

/** 新浪日K */
export async function fetchSinaStockKline(
  code: string,
  market = detectStockMarket(code),
  days = 90,
): Promise<KlineBar[]> {
  const symbol = toTencentSymbol(code, market);
  const url =
    `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData` +
    `?symbol=${encodeURIComponent(symbol)}&scale=240&ma=no&datalen=${days}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`新浪K线请求失败: ${response.status}`);
  }
  const rows = (await response.json()) as Array<{
    day?: string;
    open?: string;
    high?: string;
    low?: string;
    close?: string;
  }>;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('新浪K线返回空数据');
  }
  return rows
    .map((row) => {
      const open = Number.parseFloat(row.open ?? '');
      const high = Number.parseFloat(row.high ?? '');
      const low = Number.parseFloat(row.low ?? '');
      const close = Number.parseFloat(row.close ?? '');
      const date = row.day ?? '';
      if ([open, high, low, close].some(Number.isNaN) || !date) return null;
      return { date, open, high, low, close };
    })
    .filter((b): b is KlineBar => b !== null);
}
