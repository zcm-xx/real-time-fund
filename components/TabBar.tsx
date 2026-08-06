import type { MainTab } from '@/api/types';

const TABS: { id: MainTab; label: string }[] = [
  { id: 'watchlist', label: '自选' },
  { id: 'holdings', label: '持仓' },
  { id: 'discover', label: '发现' },
  { id: 'alerts', label: '提醒' },
];

interface TabBarProps {
  active: MainTab;
  onChange: (tab: MainTab) => void;
  alertCount?: number;
}

export function TabBar({ active, onChange, alertCount = 0 }: TabBarProps) {
  return (
    <nav className="flex border-t border-gray-200 bg-white">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`relative flex-1 py-2.5 text-xs font-medium transition ${
            active === tab.id
              ? 'text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
          {tab.id === 'alerts' && alertCount > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
              {alertCount}
            </span>
          )}
          {active === tab.id && (
            <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-blue-600" />
          )}
        </button>
      ))}
    </nav>
  );
}
