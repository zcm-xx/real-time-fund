import { checkApiHealth } from '@/api/client';
import { useAppStore } from '@/hooks/useAppStore';
import { useEffect, useState } from 'react';

export function SettingsPanel({
  onClose,
  showBack = true,
}: {
  onClose: () => void;
  showBack?: boolean;
}) {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    void checkApiHealth(settings).then(setApiOk);
  }, [settings]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">设置</h2>
        {showBack && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            返回
          </button>
        )}
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-gray-500">API 模式</span>
        <select
          value={settings.apiMode}
          onChange={(e) =>
            void updateSettings({
              apiMode: e.target.value as 'local' | 'vercel',
            })
          }
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="local">本地 (localhost:3001)</option>
          <option value="vercel">Vercel 公共实例</option>
        </select>
      </label>

      {settings.apiMode === 'local' && (
        <label className="block space-y-1">
          <span className="text-xs text-gray-500">本地 API 地址</span>
          <input
            value={settings.apiBaseUrl}
            onChange={(e) =>
              void updateSettings({ apiBaseUrl: e.target.value })
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-xs text-gray-500">自动刷新间隔（分钟）</span>
        <select
          value={settings.refreshIntervalMinutes}
          onChange={(e) =>
            void updateSettings({
              refreshIntervalMinutes: Number(e.target.value),
            })
          }
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value={1}>1 分钟</option>
          <option value={2}>2 分钟</option>
          <option value={5}>5 分钟</option>
          <option value={15}>15 分钟</option>
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-gray-500">涨跌颜色</span>
        <select
          value={settings.colorScheme}
          onChange={(e) =>
            void updateSettings({
              colorScheme: e.target.value as 'china' | 'western',
            })
          }
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="china">红涨绿跌（A 股）</option>
          <option value="western">绿涨红跌（欧美）</option>
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-gray-500">提醒冷却时间（分钟）</span>
        <select
          value={settings.alertCooldownMinutes}
          onChange={(e) =>
            void updateSettings({
              alertCooldownMinutes: Number(e.target.value),
            })
          }
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value={15}>15 分钟</option>
          <option value={30}>30 分钟</option>
          <option value={60}>60 分钟</option>
        </select>
      </label>

      <label className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
        <span className="text-gray-700">财经网站页面浮窗</span>
        <input
          type="checkbox"
          checked={settings.floatWidgetEnabled}
          onChange={(e) =>
            void updateSettings({ floatWidgetEnabled: e.target.checked })
          }
          className="h-4 w-4"
        />
      </label>
      <p className="text-[10px] text-gray-400">
        在东方财富、雪球等网站右下角显示自选浮窗（刷新页面后生效）
      </p>

      <label className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
        <span className="text-gray-700">启用价格提醒通知</span>
        <input
          type="checkbox"
          checked={settings.notificationsEnabled}
          onChange={(e) =>
            void updateSettings({ notificationsEnabled: e.target.checked })
          }
          className="h-4 w-4"
        />
      </label>

      <div
        className={`rounded-lg px-3 py-2 text-xs ${
          apiOk === null
            ? 'bg-gray-50 text-gray-500'
            : apiOk
              ? 'bg-green-50 text-green-700'
              : 'bg-amber-50 text-amber-700'
        }`}
      >
        {apiOk === null && '正在检测 API 连接...'}
        {apiOk === true && 'API 连接正常'}
        {apiOk === false &&
          'API 无法连接。请确认 TiantianFundApi 运行在 http://localhost:3001，或切换到 Vercel 模式'}
      </div>

      <p className="text-[10px] leading-relaxed text-gray-400">
        数据来源：TiantianFundApi / 东方财富。仅供学习，不构成投资建议。
      </p>
    </div>
  );
}
