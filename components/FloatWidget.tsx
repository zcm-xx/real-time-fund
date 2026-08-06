import { useEffect, useState } from 'react';
import type { Quote, WatchlistItem } from '@/api/types';
import { STORAGE_KEYS } from '@/utils/constants';
import {
  formatPercent,
  formatPrice,
  getChangeColor,
  getQuoteKey,
} from '@/utils/format';
import { openDetailPage } from '@/utils/navigation';

export function FloatWidget() {
  const [collapsed, setCollapsed] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [colorScheme, setColorScheme] = useState<'china' | 'western'>('china');
  const [pos, setPos] = useState({ x: 16, y: 80 });

  useEffect(() => {
    void loadData();
    const listener = (
      changes: { [key: string]: { newValue?: unknown } },
      area: string,
    ) => {
      if (area !== 'local') return;
      if (changes[STORAGE_KEYS.watchlist] || changes[STORAGE_KEYS.quotes]) {
        void loadData();
      }
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  async function loadData() {
    const data = await browser.storage.local.get([
      STORAGE_KEYS.watchlist,
      STORAGE_KEYS.quotes,
      STORAGE_KEYS.settings,
    ]);
    setWatchlist((data[STORAGE_KEYS.watchlist] as WatchlistItem[]) ?? []);
    setQuotes((data[STORAGE_KEYS.quotes] as Record<string, Quote>) ?? {});
    const settings = data[STORAGE_KEYS.settings] as
      | { colorScheme?: 'china' | 'western' }
      | undefined;
    if (settings?.colorScheme) setColorScheme(settings.colorScheme);
  }

  const items = watchlist.slice(0, 6);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: pos.x,
        bottom: pos.y,
        zIndex: 2147483646,
        fontFamily:
          '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      }}
    >
      <div
        style={{
          width: collapsed ? 'auto' : 240,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}
      >
        <div
          draggable
          onDragEnd={(e) => {
            const rect = (e.target as HTMLElement).closest('[data-widget]')
              ?.parentElement?.getBoundingClientRect();
            if (rect) {
              setPos({
                x: Math.max(8, window.innerWidth - e.clientX - 20),
                y: Math.max(8, window.innerHeight - e.clientY - 20),
              });
            }
          }}
          data-widget
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
            color: '#fff',
            cursor: 'grab',
            userSelect: 'none',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <span>基金助手</span>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              cursor: 'pointer',
              padding: '2px 6px',
              fontSize: 10,
            }}
          >
            {collapsed ? '展开' : '收起'}
          </button>
        </div>

        {!collapsed && (
          <ul style={{ margin: 0, padding: '4px 0', listStyle: 'none' }}>
            {items.map((item) => {
              const quote = quotes[getQuoteKey(item.code, item.type)];
              const changeColor = getChangeColor(
                quote?.changePercent ?? null,
                colorScheme,
              );
              const colorMap: Record<string, string> = {
                'text-rise': '#ef4444',
                'text-fall': '#22c55e',
                'text-gray-500': '#6b7280',
              };

              return (
                <li key={getQuoteKey(item.code, item.type)}>
                  <button
                    type="button"
                    onClick={() =>
                      openDetailPage(item.type, item.code, item.market)
                    }
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: '#111827',
                        }}
                      >
                        {quote?.name || item.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>
                        {item.code}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: 8 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#111827',
                        }}
                      >
                        {formatPrice(quote?.price ?? null)}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: colorMap[changeColor] ?? '#6b7280',
                        }}
                      >
                        {formatPercent(quote?.changePercent ?? null)}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
