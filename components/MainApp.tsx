import { useState } from 'react';
import type { MainTab } from '@/api/types';
import { AlertsPanel } from '@/components/AlertsPanel';
import { DiscoverPanel } from '@/components/DiscoverPanel';
import { GroupTabs } from '@/components/GroupTabs';
import { HoldingsPanel } from '@/components/HoldingsPanel';
import { SearchBox } from '@/components/SearchBox';
import { SettingsPanel } from '@/components/SettingsPanel';
import { TabBar } from '@/components/TabBar';
import { Watchlist } from '@/components/Watchlist';
import { useAppStore, useStorageSync } from '@/hooks/useAppStore';
import { formatRefreshTime } from '@/utils/format';
import { openOptionsPage, openSidePanel } from '@/utils/navigation';

export type AppVariant = 'popup' | 'sidepanel' | 'options';

interface MainAppProps {
  variant?: AppVariant;
}

export function MainApp({ variant = 'popup' }: MainAppProps) {
  useStorageSync();
  const [showSettings, setShowSettings] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('watchlist');
  const watchlist = useAppStore((s) => s.watchlist);
  const quotes = useAppStore((s) => s.quotes);
  const alerts = useAppStore((s) => s.alerts);
  const loading = useAppStore((s) => s.loading);
  const lastRefreshAt = useAppStore((s) => s.lastRefreshAt);
  const hydrated = useAppStore((s) => s.hydrated);
  const refreshQuotes = useAppStore((s) => s.refreshQuotes);
  const activeGroupId = useAppStore((s) => s.activeGroupId);
  const setActiveGroupId = useAppStore((s) => s.setActiveGroupId);

  const isPopup = variant === 'popup';
  const isOptions = variant === 'options';
  const enabledAlerts = alerts.filter((a) => a.enabled).length;

  if (!hydrated) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 ${
          isPopup ? 'h-[560px] w-[380px]' : 'min-h-screen'
        }`}
      >
        <span className="text-sm text-gray-400">加载中...</span>
      </div>
    );
  }

  const containerClass = isPopup
    ? 'flex h-[560px] w-[380px] flex-col bg-gray-50'
    : isOptions
      ? 'mx-auto flex min-h-screen max-w-2xl flex-col bg-gray-50'
      : 'flex min-h-screen flex-col bg-gray-50';

  return (
    <div className={containerClass}>
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-base font-bold text-gray-900">基金股票助手</h1>
          <p className="text-[10px] text-gray-400">
            更新于 {formatRefreshTime(lastRefreshAt)}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => void refreshQuotes()}
            disabled={loading}
            className="rounded-lg px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            title="刷新"
          >
            {loading ? '刷新中' : '↻'}
          </button>
          {isPopup && (
            <button
              type="button"
              onClick={() => void openSidePanel()}
              className="rounded-lg px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
              title="侧边栏"
            >
              ▤
            </button>
          )}
          {!isOptions && (
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className="rounded-lg px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
              title="设置"
            >
              ⚙
            </button>
          )}
          {isPopup && (
            <button
              type="button"
              onClick={() => openOptionsPage()}
              className="rounded-lg px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
              title="完整设置"
            >
              ⋯
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-3">
        {showSettings && !isOptions ? (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        ) : (
          <>
            {mainTab === 'watchlist' && (
              <div className="space-y-4">
                <SearchBox />
                <GroupTabs
                  activeGroupId={activeGroupId}
                  onSelect={setActiveGroupId}
                />
                <Watchlist
                  items={watchlist}
                  quotes={quotes}
                  groupId={activeGroupId}
                />
              </div>
            )}
            {mainTab === 'holdings' && <HoldingsPanel />}
            {mainTab === 'discover' && <DiscoverPanel />}
            {mainTab === 'alerts' && <AlertsPanel />}
          </>
        )}
      </main>

      {!showSettings && !isOptions && (
        <TabBar
          active={mainTab}
          onChange={setMainTab}
          alertCount={enabledAlerts}
        />
      )}
    </div>
  );
}
