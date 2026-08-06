import {
  getAppState,
  getSettings,
  refreshAllQuotes,
  saveGroups,
  saveSettings,
  updateBadge,
} from '@/lib/quotes';
import { processAlerts } from '@/lib/holdings';
import { DEFAULT_GROUP, DEFAULT_SETTINGS, REFRESH_ALARM_NAME, STORAGE_KEYS } from '@/utils/constants';

export default defineBackground(() => {
  void browser.runtime.onInstalled.addListener(async () => {
    const existing = await browser.storage.local.get([
      STORAGE_KEYS.settings,
      STORAGE_KEYS.groups,
    ]);
    if (!existing[STORAGE_KEYS.settings]) {
      await saveSettings(DEFAULT_SETTINGS);
    }
    if (!existing[STORAGE_KEYS.groups]) {
      await saveGroups([DEFAULT_GROUP]);
    }
    await scheduleRefreshAlarm();
    void refreshAndUpdateBadge();
  });

  void browser.runtime.onStartup.addListener(() => {
    void scheduleRefreshAlarm();
  });

  void browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === REFRESH_ALARM_NAME) {
      void refreshAndUpdateBadge();
    }
  });

  void browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void handleMessage(message).then(sendResponse);
    return true;
  });

  void browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.settings) {
      void scheduleRefreshAlarm();
    }
  });

  async function handleMessage(message: { type: string; [key: string]: unknown }) {
    switch (message.type) {
      case 'REFRESH_QUOTES': {
        const quotes = await refreshAndUpdateBadge();
        return { ok: true, quotes };
      }
      case 'GET_STATE': {
        return getAppState();
      }
      default:
        return { ok: false };
    }
  }

  async function refreshAndUpdateBadge() {
    const quotes = await refreshAllQuotes();
    await updateBadge(quotes);
    const settings = await getSettings();
    await processAlerts(quotes, settings);
    return quotes;
  }

  async function scheduleRefreshAlarm() {
    const settings = await getSettings();
    const minutes = Math.max(1, settings.refreshIntervalMinutes);
    await browser.alarms.clear(REFRESH_ALARM_NAME);
    await browser.alarms.create(REFRESH_ALARM_NAME, {
      periodInMinutes: minutes,
    });
  }
});
