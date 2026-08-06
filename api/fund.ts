import { apiRequest, extractList, type ListEnvelope } from '@/api/client';
import type {
  AppSettings,
  FundSearchResult,
  FundValuationResponse,
  Quote,
} from '@/api/types';

export async function searchFunds(
  keyword: string,
  settings?: AppSettings,
): Promise<FundSearchResult[]> {
  const result = await apiRequest<ListEnvelope<FundSearchResult> | FundSearchResult[]>(
    '/fundSearch',
    { m: 1, key: keyword },
    settings,
  );
  return extractList(result);
}

export async function fetchFundQuote(
  code: string,
  name: string,
  settings?: AppSettings,
): Promise<Quote> {
  const base: Quote = {
    code,
    name,
    type: 'fund',
    price: null,
    change: null,
    changePercent: null,
    prevClose: null,
    updatedAt: new Date().toISOString(),
  };

  try {
    const data = await apiRequest<FundValuationResponse | null>(
      '/fundVarietieValuationDetail',
      { FCODE: code },
      settings,
    );

    const expansion = data?.Expansion;
    if (!expansion) {
      const lastNav = await fetchLatestNavPoint(code, settings);
      if (lastNav) {
        return quoteFromNavPoint(code, name, lastNav);
      }
      return { ...base, error: '暂无估值数据' };
    }

    if (isFundValuationForToday(expansion)) {
      const prevClose = parseNumber(expansion.DWJZ);
      const price = parseNumber(expansion.GZ) ?? prevClose;
      const changePercent = parseNumber(expansion.GSZZL);
      const change =
        price !== null && prevClose !== null ? price - prevClose : null;

      return {
        code,
        name: expansion.SHORTNAME || name,
        type: 'fund',
        price,
        change,
        changePercent,
        prevClose,
        updatedAt: expansion.GZTIME || new Date().toISOString(),
        isEstimated: true,
      };
    }

    const lastNav = await fetchLatestNavPoint(code, settings);
    if (lastNav) {
      return quoteFromNavPoint(code, expansion.SHORTNAME || name, lastNav);
    }

    const prevClose = parseNumber(expansion.DWJZ);
    const price = prevClose;
    return {
      code,
      name: expansion.SHORTNAME || name,
      type: 'fund',
      price,
      change: null,
      changePercent: null,
      prevClose,
      updatedAt: expansion.JZRQ || expansion.GZTIME || new Date().toISOString(),
      isEstimated: false,
    };
  } catch (error) {
    return {
      ...base,
      error: error instanceof Error ? error.message : '获取失败',
    };
  }
}

function getChinaTodayDate(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
}

/** 估值时间是否为今日（有当日盘中估算） */
function isFundValuationForToday(
  expansion: import('@/api/types').FundValuationExpansion,
): boolean {
  const valDate = expansion.GZTIME?.split(' ')[0];
  if (!valDate || valDate !== getChinaTodayDate()) return false;
  return parseNumber(expansion.GSZZL) !== null;
}

interface FundNavRow {
  FSRQ?: string;
  DWJZ?: string;
  JZZZL?: string;
}

interface LatestNavPoint {
  date: string;
  nav: number;
  changePercent: number | null;
  prevNav: number | null;
}

async function fetchLatestNavPoint(
  code: string,
  settings?: AppSettings,
): Promise<LatestNavPoint | null> {
  const data = await apiRequest<{ data?: FundNavRow[]; Datas?: FundNavRow[] }>(
    '/fundVPageDiagram',
    { FCODE: code, RANGE: 'jn', POINTCOUNT: 2 },
    settings,
  );
  const rows = data.data ?? data.Datas ?? [];
  if (!rows.length) return null;

  const last = rows[rows.length - 1]!;
  const nav = parseNumber(last.DWJZ);
  if (nav === null) return null;

  const prevNav =
    rows.length >= 2 ? parseNumber(rows[rows.length - 2]!.DWJZ) : null;

  return {
    date: last.FSRQ ?? '',
    nav,
    changePercent: parseNumber(last.JZZZL),
    prevNav,
  };
}

function quoteFromNavPoint(
  code: string,
  name: string,
  nav: LatestNavPoint,
): Quote {
  const change =
    nav.prevNav !== null ? nav.nav - nav.prevNav : null;

  return {
    code,
    name,
    type: 'fund',
    price: nav.nav,
    change,
    changePercent: nav.changePercent,
    prevClose: nav.prevNav,
    updatedAt: nav.date || new Date().toISOString(),
    isEstimated: false,
  };
}

function parseNumber(value?: string): number | null {
  if (!value || value === '--') return null;
  const num = Number.parseFloat(value);
  return Number.isNaN(num) ? null : num;
}

export async function fetchFundValuation(
  code: string,
  settings?: AppSettings,
): Promise<FundValuationResponse> {
  return apiRequest<FundValuationResponse>(
    '/fundVarietieValuationDetail',
    { FCODE: code },
    settings,
  );
}

export function parseFundSparkline(datas?: string[]): number[] {
  if (!datas?.length) return [];
  return datas
    .map((row) => {
      const parts = row.split(',');
      return Number.parseFloat(parts[2] ?? '');
    })
    .filter((n) => !Number.isNaN(n));
}

export async function fetchFundSparkline(
  code: string,
  settings?: AppSettings,
): Promise<number[]> {
  const data = await fetchFundValuation(code, settings);
  return parseFundSparkline(data.Datas);
}

export async function fetchFundDetail(
  code: string,
  settings?: AppSettings,
): Promise<import('@/api/types').FundDetailData | null> {
  const data = await apiRequest<import('@/api/types').FundDetailResponse>(
    '/fundMNDetailInformation',
    { FCODE: code },
    settings,
  );
  return data.Datas ?? null;
}

export async function fetchFundBrief(
  code: string,
  settings?: AppSettings,
): Promise<import('@/api/types').FundBriefResponse | null> {
  return apiRequest<import('@/api/types').FundBriefResponse>(
    '/fundMNStopWatch',
    { FCODE: code },
    settings,
  );
}

export async function fetchFundPeriodIncrease(
  code: string,
  settings?: AppSettings,
): Promise<import('@/api/types').FundPeriodItem[]> {
  const data = await apiRequest<import('@/api/types').FundPeriodResponse>(
    '/fundMNPeriodIncrease',
    { FCODE: code },
    settings,
  );
  return data.Datas ?? [];
}

export async function fetchFundNavHistory(
  code: string,
  settings?: AppSettings,
  range: import('@/api/types').FundNavRange = '1m',
): Promise<import('@/api/types').FundNavPoint[]> {
  const apiRange = FUND_NAV_RANGE_MAP[range];
  const data = await apiRequest<{
    data?: FundNavRow[];
    Datas?: FundNavRow[];
  }>(
    '/fundVPageDiagram',
    { FCODE: code, RANGE: apiRange },
    settings,
  );
  const rows = data.data ?? data.Datas ?? [];
  if (!rows.length) return [];
  return rows
    .map((row) => ({
      date: row.FSRQ ?? '',
      nav: Number.parseFloat(row.DWJZ ?? ''),
      changePercent: row.JZZZL ? Number.parseFloat(row.JZZZL) : undefined,
    }))
    .filter((p) => !Number.isNaN(p.nav))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const FUND_NAV_RANGE_OPTIONS: {
  id: import('@/api/types').FundNavRange;
  label: string;
}[] = [
  { id: '1m', label: '近1月' },
  { id: '6m', label: '半年' },
  { id: '3y', label: '三年' },
  { id: '5y', label: '五年' },
  { id: 'all', label: '成立以来' },
];

const FUND_NAV_RANGE_MAP: Record<
  import('@/api/types').FundNavRange,
  string
> = {
  '1m': 'y',
  '6m': '6y',
  '3y': '3n',
  '5y': '5n',
  all: 'ln',
};
