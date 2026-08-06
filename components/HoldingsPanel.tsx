import { useEffect, useRef, useState } from 'react';
import type { AssetType, Holding, Quote } from '@/api/types';
import { useAppStore } from '@/hooks/useAppStore';
import { detectStockMarket } from '@/utils/market';
import {
  formatChange,
  formatPercent,
  formatPrice,
  getChangeColor,
  getQuoteKey,
} from '@/utils/format';
import { calcHoldingPnl, calcPortfolioSummary } from '@/utils/pnl';

export function HoldingsPanel() {
  const holdings = useAppStore((s) => s.holdings);
  const quotes = useAppStore((s) => s.quotes);
  const settings = useAppStore((s) => s.settings);
  const watchlist = useAppStore((s) => s.watchlist);
  const addHolding = useAppStore((s) => s.addHolding);
  const removeHolding = useAppStore((s) => s.removeHolding);
  const [showForm, setShowForm] = useState(false);

  const summary = calcPortfolioSummary(holdings, quotes);

  return (
    <div className="space-y-4">
      {holdings.length > 0 && (
        <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white shadow-sm">
          <div className="text-xs opacity-80">持仓总市值</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            ¥{summary.totalMarketValue.toFixed(2)}
          </div>
          <div className="mt-2 flex gap-4 text-xs">
            <span>
              盈亏{' '}
              <strong className="tabular-nums">
                {formatChange(summary.totalPnl)}
              </strong>
            </span>
            <span>
              收益率{' '}
              <strong className="tabular-nums">
                {formatPercent(summary.totalPnlPercent)}
              </strong>
            </span>
          </div>
          <div className="mt-1 text-[10px] opacity-70">
            成本 ¥{summary.totalCost.toFixed(2)} · {summary.validCount}/
            {holdings.length} 只有行情
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">我的持仓</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          {showForm ? '取消' : '+ 添加'}
        </button>
      </div>

      {showForm && (
        <HoldingForm
          watchlist={watchlist}
          quotes={quotes}
          onSubmit={async (data) => {
            await addHolding(data);
            setShowForm(false);
          }}
        />
      )}

      {holdings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center">
          <p className="text-sm text-gray-500">还没有持仓记录</p>
          <p className="mt-1 text-xs text-gray-400">
            录入成本价和份额，自动计算盈亏
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {holdings.map((h) => (
            <HoldingRow
              key={h.id}
              holding={h}
              quote={quotes[getQuoteKey(h.code, h.type)]}
              colorScheme={settings.colorScheme}
              onRemove={() => void removeHolding(h.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HoldingRow({
  holding,
  quote,
  colorScheme,
  onRemove,
}: {
  holding: Holding;
  quote?: import('@/api/types').Quote;
  colorScheme: import('@/api/types').ColorScheme;
  onRemove: () => void;
}) {
  const pnl = calcHoldingPnl(holding, quote);

  return (
    <div className="group rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">
              {quote?.name || holding.name}
            </span>
            <span className="shrink-0 rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-500">
              {holding.type === 'fund' ? '基' : '股'}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-gray-400">
            {holding.code} · {holding.shares} 份 · 成本{' '}
            {holding.costPrice.toFixed(4)}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
        >
          ✕
        </button>
      </div>

      {pnl ? (
        <div className="mt-2 flex items-end justify-between">
          <div>
            <div className="text-xs text-gray-400">市值</div>
            <div className="text-sm font-semibold tabular-nums">
              ¥{pnl.marketValue.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">浮动盈亏</div>
            <div
              className={`text-sm font-semibold tabular-nums ${getChangeColor(pnl.pnl, colorScheme)}`}
            >
              {formatChange(pnl.pnl)} ({formatPercent(pnl.pnlPercent)})
            </div>
            <div className="text-[10px] text-gray-400 tabular-nums">
              现价 {formatPrice(pnl.currentPrice)}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-400">暂无行情数据</p>
      )}
    </div>
  );
}

function HoldingForm({
  watchlist,
  quotes,
  onSubmit,
}: {
  watchlist: import('@/api/types').WatchlistItem[];
  quotes: Record<string, Quote>;
  onSubmit: (data: Omit<Holding, 'id'>) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('fund');
  const [costPrice, setCostPrice] = useState('');
  const [shares, setShares] = useState('');
  const [fromWatchlist, setFromWatchlist] = useState('');
  const userEditedCost = useRef(false);

  function applyDefaultCostPrice(assetCode: string, assetType: AssetType) {
    if (!assetCode || userEditedCost.current) return;
    const quote = quotes[getQuoteKey(assetCode, assetType)];
    if (quote?.price != null) {
      setCostPrice(quote.price.toFixed(4));
    }
  }

  useEffect(() => {
    userEditedCost.current = false;
  }, [code, type]);

  useEffect(() => {
    if (!code || userEditedCost.current) return;
    const quote = quotes[getQuoteKey(code, type)];
    if (quote?.price != null) {
      setCostPrice(quote.price.toFixed(4));
    }
  }, [code, type, quotes]);

  function pickFromWatchlist(key: string) {
    setFromWatchlist(key);
    const item = watchlist.find((w) => `${w.type}:${w.code}` === key);
    if (item) {
      setCode(item.code);
      setName(item.name);
      setType(item.type);
      userEditedCost.current = false;
      applyDefaultCostPrice(item.code, item.type);
    }
  }

  return (
    <form
      className="space-y-2 rounded-xl border border-gray-100 bg-white p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const cost = Number.parseFloat(costPrice);
        const shareNum = Number.parseFloat(shares);
        if (!code || Number.isNaN(cost) || Number.isNaN(shareNum)) return;
        void onSubmit({
          code: code.trim(),
          name: name.trim() || code.trim(),
          type,
          market: type === 'stock' ? detectStockMarket(code) : undefined,
          costPrice: cost,
          shares: shareNum,
        });
      }}
    >
      {watchlist.length > 0 && (
        <select
          value={fromWatchlist}
          onChange={(e) => pickFromWatchlist(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">从自选快速填入...</option>
          {watchlist.map((w) => (
            <option key={`${w.type}:${w.code}`} value={`${w.type}:${w.code}`}>
              {w.name} ({w.code})
            </option>
          ))}
        </select>
      )}

      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AssetType)}
          className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
        >
          <option value="fund">基金</option>
          <option value="stock">股票</option>
        </select>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="代码"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          required
        />
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="名称（可选）"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <input
          value={costPrice}
          onChange={(e) => {
            userEditedCost.current = true;
            setCostPrice(e.target.value);
          }}
          placeholder="成本价（默认当前净值）"
          type="number"
          step="any"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          required
        />
        <input
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          placeholder="份额/股数"
          type="number"
          step="any"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        保存持仓
      </button>
    </form>
  );
}
