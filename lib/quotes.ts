import type {
  AppSettings,
  AppState,
  ExportData,
  ExportDataV1,
  Quote,
  QuoteTarget,
  WatchlistGroup,
  WatchlistItem,
} from '@/api/types';
import { fetchFundQuote } from '@/api/fund';
import { fetchStockQuote } from '@/api/stock';
import {
  getGroups,
  normalizeWatchlist,
  saveGroups,
  sortWatchlist,
} from '@/lib/groups';
import { getAlerts, getHoldings, mergeQuoteTargets, saveAlerts, saveHoldings } from '@/lib/holdings';
import { DEFAULT_GROUP, DEFAULT_SETTINGS, STORAGE_KEYS } from '@/utils/constants';
import { getQuoteKey } from '@/utils/format';
import { detectStockMarket } from '@/utils/market';

export async function getSettings(): Promise<AppSettings> {
  const result = await browser.storage.local.get(STORAGE_KEYS.settings);
  const stored = result[STORAGE_KEYS.settings] as Partial<AppSettings> | undefined;
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  if (settings.apiBaseUrl === 'http://localhost:3000') {
    settings.apiBaseUrl = 'http://localhost:3001';
  }
  return settings;
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.watchlist);
  const items = (result[STORAGE_KEYS.watchlist] as WatchlistItem[] | undefined) ?? [];
  return sortWatchlist(normalizeWatchlist(items));
}

export async function getQuotes(): Promise<Record<string, Quote>> {
  const result = await browser.storage.local.get(STORAGE_KEYS.quotes);
  return (result[STORAGE_KEYS.quotes] as Record<string, Quote> | undefined) ?? {};
}

export async function getAppState(): Promise<AppState> {
  const result = await browser.storage.local.get([
    STORAGE_KEYS.watchlist,
    STORAGE_KEYS.quotes,
    STORAGE_KEYS.settings,
    STORAGE_KEYS.lastRefreshAt,
    STORAGE_KEYS.holdings,
    STORAGE_KEYS.alerts,
    STORAGE_KEYS.groups,
  ]);

  const watchlist = normalizeWatchlist(
    (result[STORAGE_KEYS.watchlist] as WatchlistItem[] | undefined) ?? [],
  );
  const groups = (result[STORAGE_KEYS.groups] as WatchlistGroup[] | undefined)
    ?.length
    ? ([...(result[STORAGE_KEYS.groups] as WatchlistGroup[])].sort(
        (a, b) => a.order - b.order,
      ))
    : [DEFAULT_GROUP];
  const holdings =
    (result[STORAGE_KEYS.holdings] as import('@/api/types').Holding[] | undefined) ??
    [];
  const alerts =
    (result[STORAGE_KEYS.alerts] as import('@/api/types').PriceAlert[] | undefined) ??
    [];
  const storedSettings = result[STORAGE_KEYS.settings] as
    | Partial<AppSettings>
    | undefined;
  const settings = { ...DEFAULT_SETTINGS, ...storedSettings };
  if (settings.apiBaseUrl === 'http://localhost:3000') {
    settings.apiBaseUrl = 'http://localhost:3001';
  }

  return {
    watchlist: sortWatchlist(watchlist),
    groups,
    holdings,
    alerts,
    quotes:
      (result[STORAGE_KEYS.quotes] as Record<string, Quote> | undefined) ?? {},
    settings,
    lastRefreshAt:
      (result[STORAGE_KEYS.lastRefreshAt] as number | undefined) ?? null,
  };
}

export async function saveWatchlist(watchlist: WatchlistItem[]): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEYS.watchlist]: sortWatchlist(normalizeWatchlist(watchlist)),
  });
}

export { saveGroups, getGroups };
export { getHoldings, saveHoldings, getAlerts, saveAlerts };

export async function saveSettings(settings: AppSettings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.settings]: settings });
}

const CONCURRENCY = 5;

async function collectQuoteTargets(): Promise<QuoteTarget[]> {
  const [watchlist, holdings, alerts] = await Promise.all([
    getWatchlist(),
    getHoldings(),
    getAlerts(),
  ]);

  return mergeQuoteTargets(
    watchlist.map((w) => ({
      code: w.code,
      name: w.name,
      type: w.type,
      market: w.market,
    })),
    holdings.map((h) => ({
      code: h.code,
      name: h.name,
      type: h.type,
      market: h.market,
    })),
    alerts.filter((a) => a.enabled).map((a) => ({
      code: a.code,
      name: a.name,
      type: a.type,
      market: a.market,
    })),
  );
}

export async function refreshAllQuotes(): Promise<Record<string, Quote>> {
  const [targets, settings] = await Promise.all([
    collectQuoteTargets(),
    getSettings(),
  ]);

  if (targets.length === 0) {
    await browser.storage.local.set({
      [STORAGE_KEYS.quotes]: {},
      [STORAGE_KEYS.lastRefreshAt]: Date.now(),
    });
    return {};
  }

  const quotes: Record<string, Quote> = {};

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((item) => fetchQuoteForTarget(item, settings)),
    );

    for (const quote of results) {
      quotes[getQuoteKey(quote.code, quote.type)] = quote;
    }
  }

  await browser.storage.local.set({
    [STORAGE_KEYS.quotes]: quotes,
    [STORAGE_KEYS.lastRefreshAt]: Date.now(),
  });

  return quotes;
}

async function fetchQuoteForTarget(
  item: QuoteTarget,
  settings: AppSettings,
): Promise<Quote> {
  if (item.type === 'fund') {
    return fetchFundQuote(item.code, item.name, settings);
  }
  return fetchStockQuote(
    item.code,
    item.name,
    item.market ?? detectStockMarket(item.code),
    settings,
  );
}

export async function updateBadge(quotes: Record<string, Quote>): Promise<void> {
  const focused = (await getWatchlist()).find((item) => item.pinned);
  if (!focused) {
    clearBadge();
    return;
  }

  const quote = quotes[getQuoteKey(focused.code, focused.type)];
  if (!quote || quote.error || quote.changePercent === null) {
    clearBadge();
    return;
  }

  void browser.action.setBadgeText({
    text: formatBadgePercent(quote.changePercent),
  });
  void browser.action.setBadgeBackgroundColor({ color: '#2563eb' });
  void browser.action.setTitle({
    title: `${quote.name} ${formatBadgePercent(quote.changePercent)}%`,
  });
}

function clearBadge(): void {
  void browser.action.setBadgeText({ text: '' });
  void browser.action.setTitle({ title: '基金股票助手' });
}

function formatBadgePercent(value: number): string {
  if (value === 0) return '0.0';
  const sign = value > 0 ? '+' : '-';
  const abs = Math.abs(value);
  if (abs >= 10) return `${sign}${Math.round(abs)}`;
  return `${sign}${abs.toFixed(1)}`;
}

export async function exportData(): Promise<ExportData> {
  const [watchlist, groups, holdings, alerts] = await Promise.all([
    getWatchlist(),
    getGroups(),
    getHoldings(),
    getAlerts(),
  ]);
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    watchlist,
    groups,
    holdings,
    alerts,
  };
}

export async function importData(data: ExportData | ExportDataV1): Promise<void> {
  await saveGroups(data.groups);
  await saveWatchlist(data.watchlist);
  if (data.version === 2) {
    if (data.holdings) await saveHoldings(data.holdings);
    if (data.alerts) await saveAlerts(data.alerts);
  }
}
