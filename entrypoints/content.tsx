import React from 'react';
import ReactDOM from 'react-dom/client';
import { FloatWidget } from '@/components/FloatWidget';
import { STORAGE_KEYS } from '@/utils/constants';

const MATCHES = [
  '*://*.eastmoney.com/*',
  '*://*.1234567.com/*',
  '*://xueqiu.com/*',
  '*://*.xueqiu.com/*',
  '*://*.10jqka.com.cn/*',
  '*://*.hexun.com/*',
];

export default defineContentScript({
  matches: MATCHES,
  cssInjectionMode: 'ui',

  async main(ctx) {
    let mountedUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;

    async function syncWidget() {
      const enabled = await isFloatWidgetEnabled();
      if (enabled && !mountedUi) {
        mountedUi = await createShadowRootUi(ctx, {
          name: 'jijin-float-widget',
          position: 'overlay',
          anchor: 'body',
          append: 'last',
          onMount: (container) => {
            const root = document.createElement('div');
            root.id = 'jijin-float-root';
            container.append(root);
            const reactRoot = ReactDOM.createRoot(root);
            reactRoot.render(
              <React.StrictMode>
                <FloatWidget />
              </React.StrictMode>,
            );
            return reactRoot;
          },
          onRemove: (root) => {
            root?.unmount();
          },
        });
        mountedUi.mount();
      } else if (!enabled && mountedUi) {
        mountedUi.remove();
        mountedUi = null;
      }
    }

    await syncWidget();

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[STORAGE_KEYS.settings]) {
        void syncWidget();
      }
    });
  },
});

async function isFloatWidgetEnabled(): Promise<boolean> {
  const data = await browser.storage.local.get(STORAGE_KEYS.settings);
  const settings = data[STORAGE_KEYS.settings] as
    | { floatWidgetEnabled?: boolean }
    | undefined;
  return settings?.floatWidgetEnabled !== false;
}
