import { useEffect, useState } from 'react';
import { fetchFundRank } from '@/api/discover';
import { fetchFundNavHistory } from '@/api/fund';
import { fetchMarketIndices, fetchStockKlineBars } from '@/api/stock';
import { KlineChart } from '@/components/KlineChart';
import type { FundNavPoint, IndexQuote, KlineBar, WatchlistItem } from '@/api/types';
import { useAppStore, useStorageSync } from '@/hooks/useAppStore';
import { getSettings } from '@/lib/quotes';
import {
  formatChange,
  formatPercent,
  formatPrice,
  formatRefreshTime,
  getChangeColor,
  getQuoteKey,
} from '@/utils/format';
import { openDetailPage } from '@/utils/navigation';
import { calcPortfolioSummary } from '@/utils/pnl';

export function Dashboard() {
  useStorageSync();
  const watchlist = useAppStore((s) => s.watchlist);
  const holdings = useAppStore((s) => s.holdings);
  const quotes = useAppStore((s) => s.quotes);
  const settings = useAppStore((s) => s.settings);
  const lastRefreshAt = useAppStore((s) => s.lastRefreshAt);
  const hydrated = useAppStore((s) => s.hydrated);
  const refreshQuotes = useAppStore((s) => s.refreshQuotes);
  const loading = useAppStore((s) => s.loading);

  const [indices, setIndices] = useState<IndexQuote[]>([]);
  const [topRanks, setTopRanks] = useState<
    Array<{ code: string; name: string; change: number | null }>
  >([]);
  const [selected, setSelected] = useState<WatchlistItem | null>(null);
  const [klineBars, setKlineBars] = useState<KlineBar[]>([]);
  const [navPoints, setNavPoints] = useState<FundNavPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  const portfolio = calcPortfolioSummary(holdings, quotes);

  useEffect(() => {
    if (!hydrated) return;
    void (async () => {
      try {
        const s = await getSettings();
        const [idx, ranks] = await Promise.all([
          fetchMarketIndices(s),
          fetchFundRank({ sortColumn: 'RZDF', pageSize: 5 }, s),
        ]);
        setIndices(idx);
        setTopRanks(
          ranks.slice(0, 5).map((r) => ({
            code: r.FCODE ?? '',
            name: r.SHORTNAME ?? '',
            change: r.RZDF ? Number.parseFloat(String(r.RZDF)) : null,
          })),
        );
      } catch (error) {
        console.error('[基金助手] 仪表盘数据加载失败', error);
      }
    })();
  }, [hydrated]);

  useEffect(() => {
    if (!selected) {
      setKlineBars([]);
      setNavPoints([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      setChartLoading(true);
      try {
        const s = await getSettings();
        if (selected.type === 'stock') {
          const bars = await fetchStockKlineBars(
            selected.code,
            selected.market,
            s,
            90,
          );
          if (!cancelled) {
            setKlineBars(bars);
            setNavPoints([]);
          }
        } else {
          const nav = await fetchFundNavHistory(selected.code, s, '6m');
          if (!cancelled) {
            setNavPoints(nav);
            setKlineBars([]);
          }
        }
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    if (watchlist.length > 0 && !selected) {
      setSelected(watchlist[0]);
    }
  }, [watchlist, selected]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">基金股票助手</h1>
            <p className="text-xs text-gray-400">
              更新于 {formatRefreshTime(lastRefreshAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshQuotes()}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '刷新中...' : '刷新行情'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        {/* 大盘指数 */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {indices.map((idx) => (
            <div
              key={idx.code}
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
            >
              <div className="text-sm text-gray-500">{idx.name}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">
                {formatPrice(idx.price)}
              </div>
              <div
                className={`text-sm font-medium tabular-nums ${getChangeColor(idx.changePercent, settings.colorScheme)}`}
              >
                {formatPercent(idx.changePercent)}
              </div>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 左侧：自选 + 持仓 */}
          <div className="space-y-6 lg:col-span-1">
            {holdings.length > 0 && (
              <section className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 text-white shadow-sm">
                <div className="text-xs opacity-80">持仓总市值</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">
                  ¥{portfolio.totalMarketValue.toFixed(2)}
                </div>
                <div className="mt-2 text-sm">
                  盈亏 {formatChange(portfolio.totalPnl)} (
                  {formatPercent(portfolio.totalPnlPercent)})
                </div>
              </section>
            )}

            <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                自选 ({watchlist.length})
              </h2>
              {watchlist.length === 0 ? (
                <p className="text-sm text-gray-400">暂无自选，请从扩展 Popup 添加</p>
              ) : (
                <ul className="space-y-2">
                  {watchlist.slice(0, 12).map((item) => (
                    <DashboardWatchRow
                      key={getQuoteKey(item.code, item.type)}
                      item={item}
                      quote={quotes[getQuoteKey(item.code, item.type)]}
                      selected={
                        selected?.code === item.code &&
                        selected?.type === item.type
                      }
                      colorScheme={settings.colorScheme}
                      onSelect={() => setSelected(item)}
                    />
                  ))}
                </ul>
              )}
            </section>

            {topRanks.length > 0 && (
              <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <h2 className="mb-3 text-sm font-semibold text-gray-900">
                  今日涨幅榜 Top5
                </h2>
                <ul className="space-y-1.5">
                  {topRanks.map((r, i) => (
                    <li
                      key={r.code || i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate text-gray-700">
                        {i + 1}. {r.name}
                      </span>
                      <span
                        className={`tabular-nums ${getChangeColor(r.change, settings.colorScheme)}`}
                      >
                        {formatPercent(r.change)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* 右侧：大图 */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {quotes[getQuoteKey(selected.code, selected.type)]?.name ||
                        selected.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selected.code} ·{' '}
                      {selected.type === 'fund' ? '基金净值走势' : '日K (90日)'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openDetailPage(
                        selected.type,
                        selected.code,
                        selected.market,
                      )
                    }
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    查看详情 →
                  </button>
                </div>

                {chartLoading ? (
                  <div className="flex h-56 items-center justify-center rounded-xl bg-white text-sm text-gray-400">
                    加载图表...
                  </div>
                ) : selected.type === 'stock' ? (
                  <KlineChart
                    bars={klineBars}
                    mode="candle"
                    height={280}
                    colorScheme={settings.colorScheme}
                    label="日K线图"
                  />
                ) : (
                  <KlineChart
                    navPoints={navPoints}
                    mode="line"
                    height={280}
                    colorScheme={settings.colorScheme}
                    label="近90日净值"
                  />
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-gray-400">
                添加自选后在此查看大图
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-400">
        仅供学习，不构成投资建议 · 新标签页仪表盘
      </footer>
    </div>
  );
}

function DashboardWatchRow({
  item,
  quote,
  selected,
  colorScheme,
  onSelect,
}: {
  item: WatchlistItem;
  quote?: import('@/api/types').Quote;
  selected: boolean;
  colorScheme: import('@/api/types').ColorScheme;
  onSelect: () => void;
}) {
  const displayName = quote?.name || item.name;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition ${
          selected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium" title={displayName}>
            {displayName}
          </div>
          <div className="text-[10px] text-gray-400">{item.code}</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold tabular-nums">
            {formatPrice(quote?.price ?? null)}
          </div>
          <div
            className={`text-[10px] tabular-nums ${getChangeColor(quote?.changePercent ?? null, colorScheme)}`}
          >
            {formatPercent(quote?.changePercent ?? null)}
          </div>
        </div>
      </button>
    </li>
  );
}
