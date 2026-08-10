import { useEffect, useState } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { getSettings } from '@/lib/quotes';

/** 关闭覆盖时尝试跳回 Chrome 默认新标签页 */
const CHROME_DEFAULT_NEW_TAB = 'chrome://new-tab-page/';

function shouldForceDashboard(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('dashboard') === '1';
}

function NewTabDisabledFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
      <p className="text-sm text-gray-600">新标签页覆盖已关闭</p>
      <p className="max-w-xs text-xs leading-relaxed text-gray-400">
        请关闭此标签后重新打开新标签页；若仍看到本页，可在扩展设置中重新开启「覆盖新标签页」
      </p>
      <button
        type="button"
        onClick={() =>
          void browser.tabs.create({
            url: `${browser.runtime.getURL('/newtab.html')}?dashboard=1`,
          })
        }
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
      >
        打开仪表盘
      </button>
    </div>
  );
}

export function NewTabGate() {
  const [view, setView] = useState<'loading' | 'dashboard' | 'disabled'>('loading');

  useEffect(() => {
    void (async () => {
      try {
        if (shouldForceDashboard()) {
          document.body.style.visibility = 'visible';
          setView('dashboard');
          return;
        }

        const settings = await getSettings();
        if (settings.overrideNewTab) {
          document.body.style.visibility = 'visible';
          setView('dashboard');
          return;
        }

        const tab = await browser.tabs.getCurrent();
        if (tab?.id !== undefined) {
          try {
            await browser.tabs.update(tab.id, { url: CHROME_DEFAULT_NEW_TAB });
            return;
          } catch {
            // 部分 Chrome 版本不允许跳转到 chrome://new-tab-page/
          }
        }

        document.body.style.visibility = 'visible';
        setView('disabled');
      } catch (error) {
        console.error('[基金助手] 新标签页初始化失败', error);
        document.body.style.visibility = 'visible';
        setView('dashboard');
      }
    })();
  }, []);

  if (view === 'loading') return null;
  if (view === 'disabled') return <NewTabDisabledFallback />;
  return <Dashboard />;
}
