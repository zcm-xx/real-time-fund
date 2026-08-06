import { useState } from 'react';
import type { AlertCondition, AssetType } from '@/api/types';
import { useAppStore } from '@/hooks/useAppStore';
import { alertConditionLabel } from '@/lib/holdings';
import { detectStockMarket } from '@/utils/market';
import { getQuoteKey } from '@/utils/format';

const CONDITIONS: AlertCondition[] = [
  'change_up',
  'change_down',
  'price_above',
  'price_below',
];

export function AlertsPanel() {
  const alerts = useAppStore((s) => s.alerts);
  const quotes = useAppStore((s) => s.quotes);
  const watchlist = useAppStore((s) => s.watchlist);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const addAlert = useAppStore((s) => s.addAlert);
  const removeAlert = useAppStore((s) => s.removeAlert);
  const toggleAlert = useAppStore((s) => s.toggleAlert);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-3 ring-1 ring-gray-100">
        <label className="flex items-center justify-between text-sm">
          <span className="text-gray-700">启用系统通知</span>
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={(e) =>
              void updateSettings({ notificationsEnabled: e.target.checked })
            }
            className="h-4 w-4 rounded border-gray-300"
          />
        </label>
        <p className="mt-1 text-[10px] text-gray-400">
          冷却时间 {settings.alertCooldownMinutes} 分钟内不重复提醒
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">价格提醒</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          {showForm ? '取消' : '+ 添加'}
        </button>
      </div>

      {showForm && (
        <AlertForm
          watchlist={watchlist}
          onSubmit={async (data) => {
            await addAlert(data);
            setShowForm(false);
          }}
        />
      )}

      {alerts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center">
          <p className="text-sm text-gray-500">还没有提醒规则</p>
          <p className="mt-1 text-xs text-gray-400">
            涨跌幅或到价时推送系统通知
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => {
            const quote = quotes[getQuoteKey(alert.code, alert.type)];
            return (
              <li
                key={alert.id}
                className={`rounded-xl border bg-white px-3 py-2.5 shadow-sm ${
                  alert.enabled ? 'border-gray-100' : 'border-gray-100 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {quote?.name || alert.name}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {alertConditionLabel(alert.condition)}{' '}
                      <strong>{alert.threshold}</strong>
                      {alert.condition.startsWith('change') ? '%' : ' 元'}
                    </div>
                    {quote && !quote.error && (
                      <div className="mt-1 text-[10px] text-gray-400">
                        当前{' '}
                        {quote.price?.toFixed(2) ?? '--'} ·{' '}
                        {quote.changePercent?.toFixed(2) ?? '--'}%
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => void toggleAlert(alert.id)}
                      className={`rounded-md px-2 py-1 text-[10px] ${
                        alert.enabled
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {alert.enabled ? '开' : '关'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeAlert(alert.id)}
                      className="rounded-md px-1.5 py-1 text-gray-300 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AlertForm({
  watchlist,
  onSubmit,
}: {
  watchlist: import('@/api/types').WatchlistItem[];
  onSubmit: (
    data: Omit<import('@/api/types').PriceAlert, 'id' | 'enabled'>,
  ) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('fund');
  const [condition, setCondition] = useState<AlertCondition>('change_up');
  const [threshold, setThreshold] = useState('2');
  const [fromWatchlist, setFromWatchlist] = useState('');

  function pickFromWatchlist(key: string) {
    setFromWatchlist(key);
    const item = watchlist.find((w) => `${w.type}:${w.code}` === key);
    if (item) {
      setCode(item.code);
      setName(item.name);
      setType(item.type);
    }
  }

  return (
    <form
      className="space-y-2 rounded-xl border border-gray-100 bg-white p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const t = Number.parseFloat(threshold);
        if (!code || Number.isNaN(t)) return;
        void onSubmit({
          code: code.trim(),
          name: name.trim() || code.trim(),
          type,
          market: type === 'stock' ? detectStockMarket(code) : undefined,
          condition,
          threshold: t,
        });
      }}
    >
      {watchlist.length > 0 && (
        <select
          value={fromWatchlist}
          onChange={(e) => pickFromWatchlist(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">从自选选择...</option>
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

      <select
        value={condition}
        onChange={(e) => setCondition(e.target.value as AlertCondition)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      >
        {CONDITIONS.map((c) => (
          <option key={c} value={c}>
            {alertConditionLabel(c)}
          </option>
        ))}
      </select>

      <input
        value={threshold}
        onChange={(e) => setThreshold(e.target.value)}
        placeholder="阈值"
        type="number"
        step="any"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        required
      />

      <button
        type="submit"
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        创建提醒
      </button>
    </form>
  );
}
