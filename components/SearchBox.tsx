import { useState } from 'react';
import { searchFunds } from '@/api/fund';
import { fetchStockQuote } from '@/api/stock';
import type { FundSearchResult } from '@/api/types';
import { useAppStore } from '@/hooks/useAppStore';
import {
  detectStockMarket,
  isStockCode,
  isStockSearchResult,
  marketFromSearchResult,
} from '@/utils/market';

export function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FundSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'fund' | 'stock'>('fund');
  const addItem = useAppStore((s) => s.addItem);
  const settings = useAppStore((s) => s.settings);

  async function handleSearch() {
    const keyword = query.trim();
    if (!keyword) return;

    if (mode === 'stock' && isStockCode(keyword)) {
      setSearching(true);
      setError(null);
      try {
        const market = detectStockMarket(keyword);
        const quote = await fetchStockQuote(keyword, keyword, market, settings);
        await addItem({
          code: keyword,
          name: quote.name || keyword,
          type: 'stock',
          market,
          addedAt: Date.now(),
        });
        setQuery('');
        setResults([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : '添加股票失败');
      } finally {
        setSearching(false);
      }
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const data = await searchFunds(keyword, settings);
      const filtered =
        mode === 'stock'
          ? data.filter(isStockSearchResult)
          : data.filter((item) => !isStockSearchResult(item));
      setResults(filtered.slice(0, 8));
      if (filtered.length === 0) {
        setError(
          mode === 'stock'
            ? '未找到相关股票，请直接输入 6 位代码添加'
            : '未找到相关基金，请换个关键词试试',
        );
      }
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : '搜索失败，请检查 API 设置');
    } finally {
      setSearching(false);
    }
  }

  async function handleAddResult(item: FundSearchResult) {
    const asStock = isStockSearchResult(item);
    await addItem({
      code: item.CODE,
      name: item.NAME || item.FundBaseInfo?.SHORTNAME || item.CODE,
      type: asStock ? 'stock' : 'fund',
      market: asStock ? marketFromSearchResult(item) : undefined,
      addedAt: Date.now(),
    });
    setQuery('');
    setResults([]);
    setError(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => {
            setMode('fund');
            setResults([]);
            setError(null);
          }}
          className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
            mode === 'fund'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          基金
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('stock');
            setResults([]);
            setError(null);
          }}
          className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
            mode === 'stock'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          股票
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
          placeholder={
            mode === 'fund' ? '搜索基金名称或代码' : '输入 6 位股票代码或名称'
          }
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
        <button
          type="button"
          onClick={() => void handleSearch()}
          disabled={searching}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {searching
            ? '...'
            : mode === 'stock' && isStockCode(query.trim())
              ? '添加'
              : '搜索'}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <ul className="max-h-40 overflow-y-auto rounded-lg border border-gray-100 bg-white">
          {results.map((item) => {
            const asStock = isStockSearchResult(item);
            return (
              <li key={`${item.CATEGORY ?? 'x'}-${item.CODE}`}>
                <button
                  type="button"
                  onClick={() => void handleAddResult(item)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-medium">{item.NAME}</span>
                    <span className="shrink-0 rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-500">
                      {asStock ? '股' : '基'}
                    </span>
                  </span>
                  <span className="ml-2 shrink-0 text-xs text-gray-400">
                    {item.CODE}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
