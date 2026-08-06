import { useEffect, useState } from 'react';
import {
  fetchBigDataList,
  fetchFundRank,
  fetchHotThemes,
  parseRankChange,
  parseThemeChange,
} from '@/api/discover';
import type { BigDataItem, FundRankItem, ThemeItem } from '@/api/types';
import { useAppStore } from '@/hooks/useAppStore';
import {
  formatPercent,
  getChangeColor,
} from '@/utils/format';

type DiscoverTab = 'rank' | 'theme' | 'hot';

const RANK_FILTERS = [
  { label: '日涨幅', sortColumn: 'RZDF' },
  { label: '近1月', sortColumn: 'SYL_Y' },
  { label: '近1年', sortColumn: 'SYL_1N' },
] as const;

const THEME_FILTERS = [
  { label: '实时', field: 'ZDF' },
  { label: '近1周', field: 'SYL_W' },
  { label: '近1月', field: 'SYL_M' },
] as const;

export function DiscoverPanel() {
  const [tab, setTab] = useState<DiscoverTab>('rank');
  const settings = useAppStore((s) => s.settings);
  const colorScheme = settings.colorScheme;
  const addItem = useAppStore((s) => s.addItem);

  const [rankFilter, setRankFilter] = useState(0);
  const [themeFilter, setThemeFilter] = useState(0);
  const [ranks, setRanks] = useState<FundRankItem[]>([]);
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [hotList, setHotList] = useState<BigDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        if (tab === 'rank') {
          const data = await fetchFundRank(
            { sortColumn: RANK_FILTERS[rankFilter].sortColumn },
            settings,
          );
          if (!cancelled) setRanks(data);
        } else if (tab === 'theme') {
          const data = await fetchHotThemes(
            THEME_FILTERS[themeFilter].field,
            settings,
          );
          if (!cancelled) setThemes(data);
        } else {
          const data = await fetchBigDataList(settings);
          if (!cancelled) setHotList(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '加载失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tab, rankFilter, themeFilter, settings]);

  async function handleAddFund(code: string, name: string) {
    await addItem({
      code,
      name,
      type: 'fund',
      addedAt: Date.now(),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {(
          [
            { id: 'rank' as const, label: '基金排行' },
            { id: 'theme' as const, label: '热门主题' },
            { id: 'hot' as const, label: '热榜' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'rank' && (
        <div className="flex gap-1">
          {RANK_FILTERS.map((f, i) => (
            <button
              key={f.sortColumn}
              type="button"
              onClick={() => setRankFilter(i)}
              className={`rounded-full px-2.5 py-1 text-[10px] ${
                rankFilter === i
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'theme' && (
        <div className="flex gap-1">
          {THEME_FILTERS.map((f, i) => (
            <button
              key={f.field}
              type="button"
              onClick={() => setThemeFilter(i)}
              className={`rounded-full px-2.5 py-1 text-[10px] ${
                themeFilter === i
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <p className="py-8 text-center text-sm text-gray-400">加载中...</p>
      )}
      {error && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {error}
        </p>
      )}

      {!loading && tab === 'rank' && (
        <ul className="space-y-1.5">
          {ranks.map((item, i) => {
            const change = parseRankChange(item);
            const code = item.FCODE ?? '';
            const name = item.SHORTNAME ?? code;
            return (
              <li
                key={code || i}
                className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-gray-100"
              >
                <span className="w-5 shrink-0 text-xs text-gray-400">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{name}</div>
                  <div className="text-[10px] text-gray-400">
                    {code} · {item.FTYPE ?? ''}
                  </div>
                </div>
                <span
                  className={`shrink-0 text-xs font-medium tabular-nums ${getChangeColor(change, colorScheme)}`}
                >
                  {formatPercent(change)}
                </span>
                {code && (
                  <button
                    type="button"
                    onClick={() => void handleAddFund(code, name)}
                    className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-100"
                  >
                    +自选
                  </button>
                )}
              </li>
            );
          })}
          {ranks.length === 0 && !error && (
            <Empty hint="暂无排行数据" />
          )}
        </ul>
      )}

      {!loading && tab === 'theme' && (
        <ul className="space-y-1.5">
          {themes.map((item, i) => {
            const field = THEME_FILTERS[themeFilter].field;
            const change = parseThemeChange(item, field);
            return (
              <li
                key={item.TTYPE ?? i}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-gray-100"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {item.TTYPENAME ?? '未知主题'}
                  </div>
                </div>
                <span
                  className={`shrink-0 text-xs font-medium tabular-nums ${getChangeColor(change, colorScheme)}`}
                >
                  {formatPercent(change)}
                </span>
              </li>
            );
          })}
          {themes.length === 0 && !error && (
            <Empty hint="暂无主题数据" />
          )}
        </ul>
      )}

      {!loading && tab === 'hot' && (
        <ul className="space-y-2">
          {hotList.map((item, i) => (
            <li
              key={item.ClType ?? i}
              className="rounded-lg bg-white p-3 ring-1 ring-gray-100"
            >
              <div className="text-sm font-medium">{item.Title}</div>
              {item.SubTitle && (
                <div className="mt-0.5 text-xs text-gray-500">
                  {item.SubTitle}
                </div>
              )}
              {item.FundCode && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    {item.FundName} ({item.FundCode})
                  </span>
                  <div className="flex items-center gap-2">
                    {item.SYL && (
                      <span className="text-xs text-gray-500">
                        {item.SYL}
                        {item.ShowunitMark ?? '%'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        void handleAddFund(
                          item.FundCode!,
                          item.FundName ?? item.FundCode!,
                        )
                      }
                      className="rounded-md bg-blue-50 px-2 py-1 text-[10px] text-blue-600"
                    >
                      +自选
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {hotList.length === 0 && !error && <Empty hint="暂无热榜数据" />}
        </ul>
      )}
    </div>
  );
}

function Empty({ hint }: { hint: string }) {
  return (
    <p className="py-8 text-center text-sm text-gray-400">{hint}</p>
  );
}
