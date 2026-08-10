import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// WXT 开发服务器用 3002，避免与 TiantianFundApi（默认 3001）端口冲突
const DEV_SERVER_PORT = 3002;

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  dev: {
    server: {
      port: DEV_SERVER_PORT,
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: '基金股票助手',
    description: '自选基金与 A 股实时涨跌幅，仅供学习使用',
    permissions: ['storage', 'alarms', 'notifications', 'tabs'],
    host_permissions: [
      'http://localhost:3001/*',
      'https://tiantian-fund-api.vercel.app/*',
      'https://qt.gtimg.cn/*',
      'https://web.ifzq.gtimg.cn/*',
      'https://money.finance.sina.com.cn/*',
      'https://push2.eastmoney.com/*',
      'https://push2his.eastmoney.com/*',
      'https://push2delay.eastmoney.com/*',
    ],
    action: {
      default_title: '基金股票助手',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
  },
});
