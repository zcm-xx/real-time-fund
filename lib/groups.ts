import type { WatchlistGroup, WatchlistItem } from '@/api/types';
import { DEFAULT_GROUP, DEFAULT_GROUP_ID, STORAGE_KEYS } from '@/utils/constants';

export async function getGroups(): Promise<WatchlistGroup[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.groups);
  const groups = result[STORAGE_KEYS.groups] as WatchlistGroup[] | undefined;
  if (!groups?.length) return [DEFAULT_GROUP];
  return groups.sort((a, b) => a.order - b.order);
}

export async function saveGroups(groups: WatchlistGroup[]): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.groups]: groups });
}

export function normalizeWatchlist(items: WatchlistItem[]): WatchlistItem[] {
  let hasPinned = false;
  return items.map((item, index) => ({
    ...item,
    groupId: item.groupId ?? DEFAULT_GROUP_ID,
    order: item.order ?? index,
    pinned: item.pinned && !hasPinned ? ((hasPinned = true), true) : false,
  }));
}

export function sortWatchlist(items: WatchlistItem[]): WatchlistItem[] {
  return [...items].sort((a, b) => {
    const ga = a.groupId ?? DEFAULT_GROUP_ID;
    const gb = b.groupId ?? DEFAULT_GROUP_ID;
    if (ga !== gb) return ga.localeCompare(gb);
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

export function itemsInGroup(
  items: WatchlistItem[],
  groupId: string,
): WatchlistItem[] {
  return sortWatchlist(items).filter(
    (item) => (item.groupId ?? DEFAULT_GROUP_ID) === groupId,
  );
}

export function createGroupId(): string {
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
