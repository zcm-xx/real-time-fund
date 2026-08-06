import type { AssetType } from '@/api/types';

export function openDetailPage(
  type: AssetType,
  code: string,
  market?: number,
): void {
  const params = new URLSearchParams({ type, code });
  if (market !== undefined) params.set('market', String(market));
  void browser.tabs.create({
    url: `${browser.runtime.getURL('/detail.html')}?${params.toString()}`,
  });
}

export async function openSidePanel(): Promise<void> {
  const win = await browser.windows.getCurrent();
  if (win.id !== undefined && browser.sidePanel?.open) {
    await browser.sidePanel.open({ windowId: win.id });
  }
}

export function openOptionsPage(): void {
  void browser.runtime.openOptionsPage();
}
