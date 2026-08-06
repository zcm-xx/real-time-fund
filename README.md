# 基金股票助手

基于 [WXT](https://wxt.dev) + React + TypeScript 的浏览器扩展，通过 [TiantianFundApi](https://kouchao.github.io/TiantianFundApi/) 获取基金与 A 股实时涨跌幅。

> 仅供个人学习，不构成投资建议。

## 功能

- 自选基金 / A 股，分组、拖拽排序、分时迷你图
- **持仓盈亏**：录入成本与份额，自动计算浮动盈亏
- **价格提醒**：涨跌幅 / 到价系统通知（可设冷却时间）
- **发现页**：基金排行、热门主题、大数据热榜
- **新标签页仪表盘**：大盘指数、持仓汇总、自选 K 线大图
- **页面浮窗**：东方财富 / 雪球等网站右下角自选浮窗
- 详情页（增强 K 线）、Side Panel、导入导出

## 开发

**端口说明（重要）**

| 服务 | 端口 |
|------|------|
| WXT 开发服务器 (`npm run dev`) | **3002** |
| TiantianFundApi (`npm run start`) | **3001** |

```bash
# 终端 1：启动 API（在 TiantianFundApi 目录）
PORT=3001 npm run start

# 终端 2：启动扩展（保持运行，不要关）
cd jijin && npm install && npm run dev
```

`npm run dev` 必须保持运行，扩展页面才能加载（开发模式依赖 localhost:3002）。

若开发模式有问题，可用生产构建：

```bash
npm run build
# 在 chrome://extensions 加载 .output/chrome-mv3
```

## 构建

```bash
npm run build
```

## 入口说明

| 入口 | 说明 |
|------|------|
| Popup | 点击扩展图标 |
| 新标签页 | 打开新标签即显示仪表盘（覆盖默认新标签页） |
| Side Panel | Popup 中点 ▤ |
| 页面浮窗 | 访问 eastmoney.com / xueqiu.com 等自动显示 |
| 设置页 | 右键扩展 → 选项 |

## 底部 Tab（Popup / Side Panel）

| Tab | 功能 |
|-----|------|
| 自选 | 搜索添加、分组、实时行情 |
| 持仓 | 成本录入、市值与盈亏汇总 |
| 发现 | 排行 / 主题 / 热榜 |
| 提醒 | 涨跌幅或到价提醒 |

## 技术栈

WXT · React 19 · TypeScript · Tailwind CSS v4 · Zustand · Manifest V3
