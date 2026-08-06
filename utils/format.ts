import type { ColorScheme } from '@/api/types';

export function formatPrice(value: number | null, digits = 2): string {
  if (value === null || Number.isNaN(value)) return '--';
  return value.toFixed(digits);
}

export function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatChange(value: number | null, digits = 2): string {
  if (value === null || Number.isNaN(value)) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}`;
}

export function getQuoteKey(code: string, type: string): string {
  return `${type}:${code}`;
}

export function getChangeColor(
  value: number | null,
  scheme: ColorScheme,
): string {
  if (value === null || value === 0) return 'text-gray-500';
  const isUp = value > 0;
  if (scheme === 'china') {
    return isUp ? 'text-rise' : 'text-fall';
  }
  return isUp ? 'text-fall' : 'text-rise';
}

export function formatRefreshTime(timestamp: number | null): string {
  if (!timestamp) return '尚未刷新';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
