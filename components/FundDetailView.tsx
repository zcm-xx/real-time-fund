import { useEffect, useState } from 'react';
import { fetchFundDetail, fetchFundNavHistory, fetchFundPeriodIncrease, fetchFundSparkline, fetchFundValuation, FUND_NAV_RANGE_OPTIONS } from '@/api/fund';
import { KlineChart } from '@/components/KlineChart';
import { LargeChart } from '@/components/MiniChart';
import { NavRangeTabs } from '@/components/NavRangeTabs';
import type { AppSettings, FundDetailData, FundNavPoint, FundNavRange, FundPeriodItem, FundValuationExpansion } from '@/api/types';
import { getSettings } from '@/lib/quotes';
import {
  formatChange,
  formatPercent,
  formatPrice,
  getChangeColor,
} from '@/utils/format';

interface FundDetailViewProps {
  code: string;
}

export function FundDetailView({ code }: FundDetailViewProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [detail, setDetail] = useState<FundDetailData | null>(null);
  const [expansion, setExpansion] = useState<FundValuationExpansion | null>(null);
  const [periods, setPeriods] = useState<FundPeriodItem[]>([]);
  const [sparkline, setSparkline] = useState<number[]>([]);
  const [navPoints, setNavPoints] = useState<FundNavPoint[]>([]);
  const [navRange, setNavRange] = useState<FundNavRange>('1m');
  const [navLoading, setNavLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const navLabel =
    FUND_NAV_RANGE_OPTIONS.find((o) => o.id === navRange)?.label ?? '净值走势';

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const s = await getSettings();
        setSettings(s);
        const [d, v, p, sp] = await Promise.all([
          fetchFundDetail(code, s),
          fetchFundValuation(code, s),
          fetchFundPeriodIncrease(code, s),
          fetchFundSparkline(code, s),
        ]);
        setDetail(d);
        setExpansion(v.Expansion ?? null);
        setPeriods(p);
        setSparkline(sp);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [code]);

  useEffect(() => {
    if (!settings) return;
    let cancelled = false;
    void (async () => {
      setNavLoading(true);
      try {
        const nav = await fetchFundNavHistory(code, settings, navRange);
        if (!cancelled) setNavPoints(nav);
      } finally {
        if (!cancelled) setNavLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, settings, navRange]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-gray-400">加载中...</div>;
  }

  const name = expansion?.SHORTNAME || detail?.SHORTNAME || code;
  const price = expansion?.GZ ? Number.parseFloat(expansion.GZ) : null;
  const changePercent = expansion?.GSZZL
    ? Number.parseFloat(expansion.GSZZL)
    : null;
  const prevClose = expansion?.DWJZ
    ? Number.parseFloat(expansion.DWJZ)
    : null;
  const change =
    price !== null && prevClose !== null ? price - prevClose : null;
  const scheme = settings?.colorScheme ?? 'china';

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {code} · {detail?.FTYPE || '基金'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">
              {formatPrice(price)}
            </div>
            <div
              className={`text-sm font-medium tabular-nums ${getChangeColor(changePercent, scheme)}`}
            >
              {formatPercent(changePercent)} ({formatChange(change)})
            </div>
            {expansion?.GZTIME && (
              <p className="mt-1 text-xs text-gray-400">
                估值时间 {expansion.GZTIME}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {expansion?.SGZT && (
            <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">
              申购: {expansion.SGZT}
            </span>
          )}
          {expansion?.SHZT && (
            <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">
              赎回: {expansion.SHZT}
            </span>
          )}
        </div>
      </div>

      <LargeChart
        points={sparkline}
        colorScheme={scheme}
        label="今日估值走势"
        height={160}
      />

      <div className="rounded-xl border border-gray-100 bg-white p-3">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-gray-500">{navLabel}</span>
          <NavRangeTabs value={navRange} onChange={setNavRange} />
        </div>
        {navLoading ? (
          <div
            className="flex items-center justify-center text-sm text-gray-400"
            style={{ height: 220 }}
          >
            加载中...
          </div>
        ) : (
          <KlineChart
            navPoints={navPoints}
            mode="line"
            height={220}
            colorScheme={scheme}
          />
        )}
      </div>

      {periods.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">阶段涨幅</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {periods.map((p) => (
              <div
                key={p.title}
                className="rounded-lg bg-gray-50 px-3 py-2"
              >
                <div className="text-xs text-gray-500">{p.title}</div>
                <div
                  className={`text-sm font-semibold tabular-nums ${getChangeColor(p.syl ? Number.parseFloat(p.syl) : null, scheme)}`}
                >
                  {p.syl ? `${Number.parseFloat(p.syl).toFixed(2)}%` : '--'}
                </div>
                {p.rank && p.sc && (
                  <div className="text-[10px] text-gray-400">
                    排名 {p.rank}/{p.sc}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {detail && (
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">基金概况</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Info label="基金公司" value={detail.JJGS} />
            <Info label="基金经理" value={detail.JJJL} />
            <Info label="成立日期" value={detail.ESTABDATE} />
            <Info label="基金规模" value={formatScale(detail.ENDNAV)} />
            <Info label="风险等级" value={riskLabel(detail.RISKLEVEL)} />
            <Info label="评级" value={detail.RLEVEL_SZ} />
          </dl>
          {detail.INVTGT && (
            <p className="mt-4 text-xs leading-relaxed text-gray-500">
              {detail.INVTGT}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-800">{value || '--'}</dd>
    </div>
  );
}

function formatScale(value?: string): string {
  if (!value) return '--';
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) return value;
  return `${(num / 1e8).toFixed(2)} 亿`;
}

function riskLabel(level?: string): string {
  const map: Record<string, string> = {
    '1': '低',
    '2': '中低',
    '3': '中',
    '4': '中高',
    '5': '高',
  };
  return level ? (map[level] ?? level) : '--';
}
