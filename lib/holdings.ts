import type {
  AlertCondition,
  Holding,
  PriceAlert,
  Quote,
  QuoteTarget,
} from '@/api/types';
import { STORAGE_KEYS } from '@/utils/constants';

export async function getHoldings(): Promise<Holding[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.holdings);
  return (result[STORAGE_KEYS.holdings] as Holding[] | undefined) ?? [];
}

export async function saveHoldings(holdings: Holding[]): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.holdings]: holdings });
}

export async function getAlerts(): Promise<PriceAlert[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.alerts);
  return (result[STORAGE_KEYS.alerts] as PriceAlert[] | undefined) ?? [];
}

export async function saveAlerts(alerts: PriceAlert[]): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.alerts]: alerts });
}

export function createHoldingId(): string {
  return `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createAlertId(): string {
  return `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function alertConditionLabel(condition: AlertCondition): string {
  const map: Record<AlertCondition, string> = {
    change_up: '涨幅超过',
    change_down: '跌幅超过',
    price_above: '价格高于',
    price_below: '价格低于',
  };
  return map[condition];
}

export function checkAlertTriggered(
  alert: PriceAlert,
  quote: Quote | undefined,
): boolean {
  if (!alert.enabled || !quote || quote.error) return false;
  if (quote.price === null && alert.condition.startsWith('price')) return false;
  if (quote.changePercent === null && alert.condition.startsWith('change')) {
    return false;
  }

  switch (alert.condition) {
    case 'change_up':
      return (quote.changePercent ?? 0) >= alert.threshold;
    case 'change_down':
      return (quote.changePercent ?? 0) <= -alert.threshold;
    case 'price_above':
      return (quote.price ?? 0) >= alert.threshold;
    case 'price_below':
      return (quote.price ?? 0) <= alert.threshold;
    default:
      return false;
  }
}

export function isAlertInCooldown(
  alert: PriceAlert,
  cooldownMs: number,
): boolean {
  if (!alert.lastTriggeredAt) return false;
  return Date.now() - alert.lastTriggeredAt < cooldownMs;
}

export async function processAlerts(
  quotes: Record<string, Quote>,
  settings: import('@/api/types').AppSettings,
): Promise<void> {
  if (!settings.notificationsEnabled) return;

  const alerts = await getAlerts();
  const cooldownMs = settings.alertCooldownMinutes * 60 * 1000;
  let updated = false;

  for (const alert of alerts) {
    if (!alert.enabled) continue;

    const key = `${alert.type}:${alert.code}`;
    const quote = quotes[key];
    if (!checkAlertTriggered(alert, quote)) continue;
    if (isAlertInCooldown(alert, cooldownMs)) continue;

    const title = `${quote?.name || alert.name} 提醒`;
    const message = formatAlertMessage(alert, quote);

    try {
      await browser.notifications.create(`${alert.id}-${Date.now()}`, {
        type: 'basic',
        iconUrl: browser.runtime.getURL('/icon/128.png'),
        title,
        message,
        priority: 2,
      });
      alert.lastTriggeredAt = Date.now();
      updated = true;
    } catch {
      // notifications 权限未授予时静默失败
    }
  }

  if (updated) {
    await saveAlerts(alerts);
  }
}

function formatAlertMessage(alert: PriceAlert, quote: Quote | undefined): string {
  const price = quote?.price?.toFixed(2) ?? '--';
  const change = quote?.changePercent?.toFixed(2) ?? '--';

  switch (alert.condition) {
    case 'change_up':
      return `涨幅 ${change}% ≥ ${alert.threshold}%`;
    case 'change_down':
      return `跌幅 ${change}% ≤ -${alert.threshold}%`;
    case 'price_above':
      return `现价 ${price} ≥ ${alert.threshold}`;
    case 'price_below':
      return `现价 ${price} ≤ ${alert.threshold}`;
    default:
      return `已触发提醒`;
  }
}

export function mergeQuoteTargets(
  ...lists: QuoteTarget[][]
): QuoteTarget[] {
  const map = new Map<string, QuoteTarget>();
  for (const list of lists) {
    for (const item of list) {
      const key = `${item.type}:${item.code}`;
      if (!map.has(key)) map.set(key, item);
    }
  }
  return [...map.values()];
}
