import type { AppSettings } from '@/api/types';
import { DEFAULT_SETTINGS } from '@/utils/constants';

export type ListEnvelope<T> = {
  ErrCode?: number;
  ErrMsg?: string;
  Datas?: T[];
  data?: T[];
  Data?: T[];
};

/** 东方财富列表类接口：{ ErrCode, Datas: [...] } */
export function extractList<T>(
  data: ListEnvelope<T> | T[] | null | undefined,
): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.ErrCode && data.ErrCode !== 0) {
    throw new Error(data.ErrMsg || `API 错误 (${data.ErrCode})`);
  }
  return data.Datas ?? data.data ?? data.Data ?? [];
}

/** 东方财富股票类接口：{ rc, data: { f43, trends, klines, ... } } */
export function unwrapEastmoneyData<T>(
  payload: T | { data?: T; rc?: number } | null | undefined,
): T {
  if (!payload || typeof payload !== 'object') {
    throw new Error('API 返回空数据');
  }
  if ('data' in payload && payload.data && typeof payload.data === 'object') {
    return payload.data;
  }
  return payload as T;
}

export async function apiRequest<T>(
  route: string,
  params: Record<string, string | number | boolean | undefined>,
  settings: AppSettings = DEFAULT_SETTINGS,
): Promise<T> {
  const searchParams = new URLSearchParams();

  if (settings.apiMode === 'vercel') {
    searchParams.set('action_name', route.replace(/^\//, ''));
  }

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  }

  const base =
    settings.apiMode === 'vercel'
      ? settings.vercelApiUrl
      : settings.apiBaseUrl.replace(/\/$/, '');

  const path =
    settings.apiMode === 'vercel'
      ? base
      : `${base}/${route.replace(/^\//, '')}`;

  const url = `${path}?${searchParams.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function checkApiHealth(
  settings: AppSettings = DEFAULT_SETTINGS,
): Promise<boolean> {
  try {
    const result = await apiRequest<ListEnvelope<unknown> | unknown[]>(
      '/fundSearch',
      { m: 1, key: '000001' },
      settings,
    );
    return extractList(result).length > 0;
  } catch {
    return false;
  }
}
