---
name: fund-extension-dev
description: >-
  Develop and debug the fund/stock Chrome extension (real-time-fund).
  WXT, React 19, TypeScript, Manifest V3, Zustand, chrome.storage.
  Use when modifying entrypoints, background worker, content scripts,
  quote APIs, watchlist, dashboard, new tab override, or settings in this repo.
---

# 基金股票助手 - 项目开发 Skill

## 技术栈

WXT · React 19 · TypeScript · Tailwind CSS v4 · Zustand · Manifest V3

```bash
npm run dev      # 开发，WXT 端口 3002，输出 .output/chrome-mv3-dev
npm run build    # 生产构建，输出 .output/chrome-mv3
npx tsc --noEmit # 类型检查
```

改 manifest 权限或 entrypoints 后，提醒用户在 `chrome://extensions` 重新加载扩展。

## 目录结构

| 路径 | 用途 |
|------|------|
| `entrypoints/background.ts` | alarms 定时刷新、角标、runtime message |
| `entrypoints/popup/`、`sidepanel/` | 主 UI，共用 `MainApp` |
| `entrypoints/newtab/` | 新标签页仪表盘（`chrome_url_overrides`） |
| `entrypoints/content.tsx` | 财经站浮窗（Shadow DOM） |
| `entrypoints/detail/` | 基金/股票详情页 |
| `api/fund.ts` | 基金行情（TiantianFundApi） |
| `api/stock.ts` | 股票行情入口 |
| `api/tencent.ts` | 腾讯行情 + 日 K（主源） |
| `api/eastmoney.ts` | 东方财富（分时/K 线兜底） |
| `api/client.ts` | API 请求封装（local / vercel 模式） |
| `lib/quotes.ts` | 行情刷新、storage 读写、getAppState |
| `hooks/useAppStore.ts` | Zustand store + storage 同步 |
| `utils/indices.ts` | 大盘指数列表与说明文案 |
| `utils/market.ts` | 股票/基金类型识别、市场代码 |
| `wxt.config.ts` | manifest、host_permissions、端口 |

## 数据流

```
Background refreshAllQuotes()
  → 并发拉取（CONCURRENCY=5）→ 写 chrome.storage.local
  → updateBadge / processAlerts

UI: refreshQuotes() → sendMessage('REFRESH_QUOTES') → 直接用返回的 quotes patch
UI: useStorageSync 监听 storage；仅 quotes 变化时局部 patch，避免全量 hydrate
```

storage keys 定义在 `utils/constants.ts` 的 `STORAGE_KEYS`。

## 数据源规则

**基金**

- `settings.apiMode`: `local`（localhost:3001）或 `vercel`
- 接口走 `api/client.ts` → TiantianFundApi

**股票**

- 实时行情：腾讯 `qt.gtimg.cn`（`api/tencent.ts`），GBK 解码
- 日 K：腾讯 `web.ifzq.gtimg.cn` → 新浪 → 东方财富兜底
- 不依赖 TiantianFundApi 的 stockGet（Vercel 上常 500）

**添加自选**

- `fundSearch` 会混入股票结果，必须用 `isStockSearchResult()` 区分
- 6 位代码直接添加股票时，先 `fetchStockQuote` 拿正式名称
- watchlist item 的 `type` 必须是 `'fund' | 'stock'`，否则行情接口用错

## 新标签页覆盖

- 设置项：`settings.overrideNewTab`（默认 false）
- 实现：`entrypoints/newtab` + `components/NewTabGate.tsx`
- 开启：manifest 原生覆盖，地址栏为空白搜索框，渲染 `Dashboard`
- 关闭：尝试 `chrome.tabs.update` → `chrome://new-tab-page/`；失败则 fallback 页
- 手动打开仪表盘：`newtab.html?dashboard=1`
- 不要用已失效的 `chrome-search://local-ntp/local-ntp.html`

## 性能注意

- 自选列表不要每行独立拉 sparkline（已移除 MiniChart）
- `refreshQuotes` 不要重复全量 `getAppState` + hydrate
- `useSparkline` 依赖整个 `settings` 对象会触发多余 effect（若恢复使用需注意）
- 开发态 content script ~3MB，生产约 200KB

## 代码规范

- 最小改动，匹配现有命名与目录约定
- 不主动 commit / 不主动写 README，除非用户要求
- 用户沟通用中文
- 新增外部域名必须加入 `wxt.config.ts` 的 `host_permissions`

## 常见改动检查清单

- [ ] 股票/基金 type 与 market 是否正确
- [ ] 新 API host 已加入 manifest
- [ ] storage 写入后 UI 是否走局部 patch
- [ ] 指数列表改 `utils/indices.ts`
- [ ] 类型定义改 `api/types.ts`
- [ ] 改完跑 `npx tsc --noEmit`

## 入口与功能映射

| 入口 | 功能 |
|------|------|
| Popup / Side Panel | 自选、持仓、发现、提醒、设置 |
| New Tab | 大盘指数、自选列表、K 线大图 |
| Content Script | 东方财富/雪球等站右下角浮窗 |
| Detail | 基金净值 / 股票分时与日 K |
| Options | 完整设置页 |
