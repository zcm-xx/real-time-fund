import { useEffect, useState } from 'react';
import {
  fetchStockDetail,
  fetchStockKlineBars,
  fetchStockSparkline,
  parseStockQuoteFromDetail,
} from '@/api/stock';
import { KlineChart } from '@/components/KlineChart';
import { LargeChart } from '@/components/MiniChart';
import type { AppSettings, KlineBar, Quote, StockDetailResponse } from '@/api/types';
import { getSettings } from '@/lib/quotes';
import { detectStockMarket } from '@/utils/market';
import {
  formatChange,
  formatPercent,
  formatPrice,
  getChangeColor,
} from '@/utils/format';

interface StockDetailViewProps {
  code: string;
  market?: number;
}

export function StockDetailView({ code, market: marketProp }: StockDetailViewProps) {
  const market = marketProp ?? detectStockMarket(code);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [detail, setDetail] = useState<StockDetailResponse | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [intraday, setIntraday] = useState<number[]>([]);
  const [klineBars, setKlineBars] = useState<KlineBar[]>([]);
  const [chartMode, setChartMode] = useState<'intraday' | 'kline'>('intraday');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadQuote() {
      setLoading(true);
      setError(null);
      try {
        const s = await getSettings();
        if (cancelled) return;
        setSettings(s);
        const d = await fetchStockDetail(code, market, s);
        if (cancelled) return;
        setDetail(d);
        setQuote(parseStockQuoteFromDetail(d, code, d.f58 || code));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '行情加载失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadCharts() {
      setChartLoading(true);
      try {
        const s = await getSettings();
        const [spResult, klResult] = await Promise.allSettled([
          fetchStockSparkline(code, market, s),
          fetchStockKlineBars(code, market, s, 90),
        ]);
        if (cancelled) return;
        if (spResult.status === 'fulfilled') setIntraday(spResult.value);
        if (klResult.status === 'fulfilled') setKlineBars(klResult.value);
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }

    void loadQuote();
    void loadCharts();

    return () => {
      cancelled = true;
    };
  }, [code, market]);

  if (loading && !detail) {
    return <div className="py-20 text-center text-sm text-gray-400">加载中...</div>;
  }

  if (error && !detail) {
    return (
      <div className="rounded-xl bg-amber-50 px-4 py-8 text-center text-sm text-amber-700">
        {error}
      </div>
    );
  }

  const scheme = settings?.colorScheme ?? 'china';
  const changePercent = quote?.changePercent ?? null;
  const decimal = detail?.decimal ?? detail?.f59 ?? 2;
  const scale = 10 ** decimal;
  const stockName = detail?.f58 || quote?.name || code;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-gray-900" title={stockName}>
              {stockName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {code} · {detail?.f127 || 'A股'}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold tabular-nums">
              {formatPrice(quote?.price ?? null)}
            </div>
            <div
              className={`text-sm font-medium tabular-nums ${getChangeColor(changePercent, scheme)}`}
            >
              {formatPercent(changePercent)} ({formatChange(quote?.change ?? null)})
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="mb-3 flex gap-2">
          <ChartTab
            active={chartMode === 'intraday'}
            onClick={() => setChartMode('intraday')}
            label="分时"
          />
          <ChartTab
            active={chartMode === 'kline'}
            onClick={() => setChartMode('kline')}
            label="日K (90日)"
          />
        </div>
        {chartLoading && chartMode === 'intraday' && intraday.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
            分时加载中...
          </div>
        ) : chartLoading && chartMode === 'kline' && klineBars.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">
            K线加载中...
          </div>
        ) : chartMode === 'intraday' ? (
          <LargeChart
            points={intraday}
            colorScheme={scheme}
            label="今日分时"
            height={200}
          />
        ) : (
          <KlineChart
            bars={klineBars}
            mode="candle"
            height={240}
            colorScheme={scheme}
            label="日K线图"
          />
        )}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">行情数据</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Info
            label="最高"
            value={formatPrice(scaleField(detail?.f44, scale))}
          />
          <Info
            label="最低"
            value={formatPrice(scaleField(detail?.f45, scale))}
          />
          <Info
            label="换手"
            value={
              detail?.f168 !== undefined
                ? `${(detail.f168 / 100).toFixed(2)}%`
                : '--'
            }
          />
          <Info
            label="市盈率"
            value={
              detail?.f162 !== undefined
                ? (detail.f162 / 100).toFixed(2)
                : '--'
            }
          />
          <Info
            label="总市值"
            value={formatLargeNumber(detail?.f116)}
          />
          <Info
            label="流通市值"
            value={formatLargeNumber(detail?.f117)}
          />
        </dl>
      </div>
    </div>
  );
}

function ChartTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="font-medium tabular-nums text-gray-800">{value}</dd>
    </div>
  );
}

function scaleField(value: number | undefined, scale: number): number | null {
  if (value === undefined) return null;
  return value / scale;
}

function formatLargeNumber(value?: number): string {
  if (value === undefined) return '--';
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} 万亿`;
  if (value >= 1e8) return `${(value / 1e8).toFixed(2)} 亿`;
  return value.toLocaleString('zh-CN');
}
