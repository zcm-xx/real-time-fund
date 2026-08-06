import { useEffect, useState } from 'react';
import { fetchFundSparkline } from '@/api/fund';
import { fetchStockSparkline } from '@/api/stock';
import type { WatchlistItem } from '@/api/types';
import { useAppStore } from '@/hooks/useAppStore';

const cache = new Map<string, number[]>();

export function useSparkline(item: WatchlistItem): number[] {
  const settings = useAppStore((s) => s.settings);
  const key = `${item.type}:${item.code}`;
  const [points, setPoints] = useState<number[]>(() => cache.get(key) ?? []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data =
          item.type === 'fund'
            ? await fetchFundSparkline(item.code, settings)
            : await fetchStockSparkline(
                item.code,
                item.market,
                settings,
              );
        if (!cancelled && data.length > 0) {
          cache.set(key, data);
          setPoints(data);
        }
      } catch {
        // 分时图加载失败时静默降级
      }
    }

    if (!cache.has(key)) void load();
    else setPoints(cache.get(key) ?? []);

    return () => {
      cancelled = true;
    };
  }, [item.code, item.type, item.market, key, settings]);

  return points;
}

export function clearSparklineCache(): void {
  cache.clear();
}
