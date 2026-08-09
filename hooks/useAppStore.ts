import { useEffect, useState } from 'react';
import { create } from 'zustand';
import type {
  AlertCondition,
  AppSettings,
  Holding,
  PriceAlert,
  Quote,
  WatchlistGroup,
  WatchlistItem,
} from '@/api/types';
import {
  createAlertId,
  createHoldingId,
  getAlerts,
  getHoldings,
  saveAlerts,
  saveHoldings,
} from '@/lib/holdings';
import { createGroupId, itemsInGroup } from '@/lib/groups';
import {
  exportData,
  getAppState,
  getGroups,
  importData,
  saveGroups,
  saveSettings,
  saveWatchlist,
} from '@/lib/quotes';
import { DEFAULT_GROUP_ID, DEFAULT_SETTINGS, STORAGE_KEYS } from '@/utils/constants';

interface AppStore {
  watchlist: WatchlistItem[];
  groups: WatchlistGroup[];
  holdings: Holding[];
  alerts: PriceAlert[];
  quotes: Record<string, Quote>;
  settings: AppSettings;
  lastRefreshAt: number | null;
  loading: boolean;
  hydrated: boolean;
  activeGroupId: string;
  hydrate: () => Promise<void>;
  setActiveGroupId: (id: string) => void;
  setWatchlist: (items: WatchlistItem[]) => Promise<void>;
  addItem: (item: Omit<WatchlistItem, 'groupId' | 'order'>) => Promise<void>;
  removeItem: (code: string, type: WatchlistItem['type']) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  refreshQuotes: () => Promise<void>;
  addGroup: (name: string) => Promise<WatchlistGroup>;
  removeGroup: (id: string) => Promise<void>;
  moveItemToGroup: (
    code: string,
    type: WatchlistItem['type'],
    groupId: string,
  ) => Promise<void>;
  reorderInGroup: (groupId: string, ordered: WatchlistItem[]) => Promise<void>;
  addHolding: (holding: Omit<Holding, 'id'>) => Promise<void>;
  updateHolding: (id: string, patch: Partial<Holding>) => Promise<void>;
  removeHolding: (id: string) => Promise<void>;
  addAlert: (alert: Omit<PriceAlert, 'id' | 'enabled'>) => Promise<void>;
  updateAlert: (id: string, patch: Partial<PriceAlert>) => Promise<void>;
  removeAlert: (id: string) => Promise<void>;
  toggleAlert: (id: string) => Promise<void>;
  togglePinned: (code: string, type: WatchlistItem['type']) => Promise<void>;
  exportWatchlist: () => Promise<string>;
  importWatchlist: (json: string) => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  watchlist: [],
  groups: [],
  holdings: [],
  alerts: [],
  quotes: {},
  settings: DEFAULT_SETTINGS,
  lastRefreshAt: null,
  loading: false,
  hydrated: false,
  activeGroupId: DEFAULT_GROUP_ID,

  hydrate: async () => {
    try {
      const state = await getAppState();
      set({
        ...state,
        hydrated: true,
        activeGroupId:
          get().activeGroupId || state.groups[0]?.id || DEFAULT_GROUP_ID,
      });
    } catch (error) {
      console.error('[基金助手] 初始化失败', error);
      set({ hydrated: true });
    }
  },

  setActiveGroupId: (id) => set({ activeGroupId: id }),

  setWatchlist: async (items) => {
    await saveWatchlist(items);
    set({ watchlist: items });
  },

  addItem: async (item) => {
    const { watchlist, activeGroupId } = get();
    const key = `${item.type}:${item.code}`;
    if (watchlist.some((w) => `${w.type}:${w.code}` === key)) return;

    const groupItems = itemsInGroup(watchlist, activeGroupId);
    const next: WatchlistItem = {
      ...item,
      groupId: activeGroupId,
      order: groupItems.length,
      addedAt: item.addedAt ?? Date.now(),
    };

    const updated = [...watchlist, next];
    await saveWatchlist(updated);
    set({ watchlist: updated });
    await get().refreshQuotes();

    // 添加后若行情带回正式名称，写回自选避免一直显示代码
    if (item.type === 'stock' || item.name === item.code) {
      const quoteKey = `${item.type}:${item.code}`;
      const quote = get().quotes[quoteKey];
      if (quote?.name && quote.name !== item.code) {
        const named = get().watchlist.map((w) =>
          w.code === item.code && w.type === item.type
            ? { ...w, name: quote.name }
            : w,
        );
        await saveWatchlist(named);
        set({ watchlist: named });
      }
    }
  },

  removeItem: async (code, type) => {
    const { watchlist, quotes } = get();
    const next = watchlist.filter((w) => !(w.code === code && w.type === type));
    const quoteKey = `${type}:${code}`;
    const nextQuotes = { ...quotes };
    delete nextQuotes[quoteKey];
    await saveWatchlist(next);
    await browser.storage.local.set({ [STORAGE_KEYS.quotes]: nextQuotes });
    set({ watchlist: next, quotes: nextQuotes });
  },

  updateSettings: async (partial) => {
    const settings = { ...get().settings, ...partial };
    await saveSettings(settings);
    set({ settings });
  },

  refreshQuotes: async () => {
    set({ loading: true });
    try {
      const result = (await browser.runtime.sendMessage({
        type: 'REFRESH_QUOTES',
      })) as { ok?: boolean; quotes?: Record<string, Quote> } | undefined;
      if (result?.quotes) {
        set({
          quotes: result.quotes,
          lastRefreshAt: Date.now(),
        });

        // 用行情名称回填仍显示代码的自选
        const { watchlist } = get();
        let changed = false;
        const named = watchlist.map((w) => {
          if (w.type !== 'stock' || (w.name && w.name !== w.code)) return w;
          const q = result.quotes![`${w.type}:${w.code}`];
          if (q?.name && q.name !== w.code) {
            changed = true;
            return { ...w, name: q.name };
          }
          return w;
        });
        if (changed) {
          await saveWatchlist(named);
          set({ watchlist: named });
        }
      } else {
        const state = await getAppState();
        set({
          quotes: state.quotes,
          lastRefreshAt: state.lastRefreshAt,
          alerts: state.alerts,
        });
      }
    } finally {
      set({ loading: false });
    }
  },

  addGroup: async (name) => {
    const groups = await getGroups();
    const group: WatchlistGroup = {
      id: createGroupId(),
      name,
      order: groups.length,
    };
    const next = [...groups, group];
    await saveGroups(next);
    set({ groups: next });
    return group;
  },

  removeGroup: async (id) => {
    if (id === DEFAULT_GROUP_ID) return;
    const { watchlist, groups, activeGroupId } = get();
    const nextGroups = groups.filter((g) => g.id !== id);
    const nextWatchlist = watchlist.map((item) =>
      item.groupId === id ? { ...item, groupId: DEFAULT_GROUP_ID } : item,
    );
    await saveGroups(nextGroups);
    await saveWatchlist(nextWatchlist);
    set({
      groups: nextGroups,
      watchlist: nextWatchlist,
      activeGroupId: activeGroupId === id ? DEFAULT_GROUP_ID : activeGroupId,
    });
  },

  moveItemToGroup: async (code, type, groupId) => {
    const { watchlist } = get();
    const targetCount = itemsInGroup(watchlist, groupId).length;
    const next = watchlist.map((item) =>
      item.code === code && item.type === type
        ? { ...item, groupId, order: targetCount }
        : item,
    );
    await saveWatchlist(next);
    set({ watchlist: next });
  },

  reorderInGroup: async (groupId, ordered) => {
    const { watchlist } = get();
    const next = watchlist.map((item) => {
      const idx = ordered.findIndex(
        (o) => o.code === item.code && o.type === item.type,
      );
      if (idx >= 0) {
        return { ...item, groupId, order: idx };
      }
      return item;
    });
    await saveWatchlist(next);
    set({ watchlist: next });
  },

  togglePinned: async (code, type) => {
    const current = get().watchlist.find(
      (item) => item.code === code && item.type === type,
    );
    const shouldPin = !current?.pinned;
    const watchlist = get().watchlist.map((item) => ({
      ...item,
      pinned: shouldPin && item.code === code && item.type === type,
    }));
    await saveWatchlist(watchlist);
    set({ watchlist });
    await get().refreshQuotes();
  },

  addHolding: async (holding) => {
    const holdings = await getHoldings();
    const next: Holding = { ...holding, id: createHoldingId() };
    const updated = [...holdings, next];
    await saveHoldings(updated);
    set({ holdings: updated });
    await get().refreshQuotes();
  },

  updateHolding: async (id, patch) => {
    const holdings = await getHoldings();
    const updated = holdings.map((h) =>
      h.id === id ? { ...h, ...patch } : h,
    );
    await saveHoldings(updated);
    set({ holdings: updated });
  },

  removeHolding: async (id) => {
    const holdings = await getHoldings();
    const updated = holdings.filter((h) => h.id !== id);
    await saveHoldings(updated);
    set({ holdings: updated });
  },

  addAlert: async (alert) => {
    const alerts = await getAlerts();
    const next: PriceAlert = { ...alert, id: createAlertId(), enabled: true };
    const updated = [...alerts, next];
    await saveAlerts(updated);
    set({ alerts: updated });
    await get().refreshQuotes();
  },

  updateAlert: async (id, patch) => {
    const alerts = await getAlerts();
    const updated = alerts.map((a) => (a.id === id ? { ...a, ...patch } : a));
    await saveAlerts(updated);
    set({ alerts: updated });
  },

  removeAlert: async (id) => {
    const alerts = await getAlerts();
    const updated = alerts.filter((a) => a.id !== id);
    await saveAlerts(updated);
    set({ alerts: updated });
  },

  toggleAlert: async (id) => {
    const alerts = await getAlerts();
    const updated = alerts.map((a) =>
      a.id === id ? { ...a, enabled: !a.enabled } : a,
    );
    await saveAlerts(updated);
    set({ alerts: updated });
  },

  exportWatchlist: async () => {
    const data = await exportData();
    return JSON.stringify(data, null, 2);
  },

  importWatchlist: async (json) => {
    const data = JSON.parse(json) as import('@/api/types').ExportData | import('@/api/types').ExportDataV1;
    if (data.version !== 1 && data.version !== 2) {
      throw new Error('不支持的导出格式');
    }
    await importData(data);
    await get().hydrate();
    await get().refreshQuotes();
  },
}));

export function useStorageSync() {
  const hydrate = useAppStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();

    let timer: ReturnType<typeof setTimeout> | null = null;

    const listener = (
      changes: { [key: string]: { newValue?: unknown } },
      area: string,
    ) => {
      if (area !== 'local') return;

      // 行情刷新时只 patch quotes，避免全量 hydrate 造成卡顿
      const onlyQuotes =
        (changes[STORAGE_KEYS.quotes] || changes[STORAGE_KEYS.lastRefreshAt]) &&
        !changes[STORAGE_KEYS.watchlist] &&
        !changes[STORAGE_KEYS.groups] &&
        !changes[STORAGE_KEYS.holdings] &&
        !changes[STORAGE_KEYS.alerts];

      if (onlyQuotes) {
        const patch: Partial<AppStore> = {};
        if (changes[STORAGE_KEYS.quotes]?.newValue) {
          patch.quotes = changes[STORAGE_KEYS.quotes].newValue as Record<
            string,
            Quote
          >;
        }
        if (changes[STORAGE_KEYS.lastRefreshAt]?.newValue != null) {
          patch.lastRefreshAt = changes[STORAGE_KEYS.lastRefreshAt]
            .newValue as number;
        }
        if (Object.keys(patch).length > 0) {
          useAppStore.setState(patch);
        }
        return;
      }

      if (
        changes[STORAGE_KEYS.quotes] ||
        changes[STORAGE_KEYS.watchlist] ||
        changes[STORAGE_KEYS.groups] ||
        changes[STORAGE_KEYS.holdings] ||
        changes[STORAGE_KEYS.alerts] ||
        changes[STORAGE_KEYS.lastRefreshAt]
      ) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          void hydrate();
        }, 80);
      }
    };

    browser.storage.onChanged.addListener(listener);
    return () => {
      browser.storage.onChanged.removeListener(listener);
      if (timer) clearTimeout(timer);
    };
  }, [hydrate]);
}

// 供 AlertsPanel 表单使用
export type { AlertCondition };
