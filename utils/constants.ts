export const STORAGE_KEYS = {
  watchlist: 'watchlist',
  groups: 'groups',
  holdings: 'holdings',
  alerts: 'alerts',
  quotes: 'quotes',
  settings: 'settings',
  lastRefreshAt: 'lastRefreshAt',
} as const;

export const DEFAULT_GROUP_ID = 'default';

export const DEFAULT_GROUP: import('@/api/types').WatchlistGroup = {
  id: DEFAULT_GROUP_ID,
  name: '默认',
  order: 0,
};

export const DEFAULT_SETTINGS: import('@/api/types').AppSettings = {
  apiMode: 'local',
  apiBaseUrl: 'http://localhost:3001',
  vercelApiUrl: 'https://tiantian-fund-api.vercel.app/api/action',
  refreshIntervalMinutes: 1,
  colorScheme: 'china',
  notificationsEnabled: true,
  alertCooldownMinutes: 30,
  floatWidgetEnabled: true,
};

export const VERCEL_API_URL = DEFAULT_SETTINGS.vercelApiUrl;

export const REFRESH_ALARM_NAME = 'quote-refresh';

export const ALERT_COOLDOWN_MS = 30 * 60 * 1000;
