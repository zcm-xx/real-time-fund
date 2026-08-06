export type AssetType = 'fund' | 'stock';

export type ApiMode = 'local' | 'vercel';

export type ColorScheme = 'china' | 'western';

export type MainTab = 'watchlist' | 'holdings' | 'discover' | 'alerts';

export type AlertCondition =
  | 'change_up'
  | 'change_down'
  | 'price_above'
  | 'price_below';

export interface WatchlistGroup {
  id: string;
  name: string;
  order: number;
}

export interface WatchlistItem {
  code: string;
  name: string;
  type: AssetType;
  market?: number;
  groupId?: string;
  order?: number;
  addedAt: number;
  /** 重点关注：单选，用于浏览器图标角标展示 */
  pinned?: boolean;
}

export interface Holding {
  id: string;
  code: string;
  name: string;
  type: AssetType;
  market?: number;
  /** 成本价（基金为净值，股票为每股价格） */
  costPrice: number;
  /** 持有份额或股数 */
  shares: number;
  buyDate?: string;
  note?: string;
}

export interface HoldingPnl {
  marketValue: number;
  costValue: number;
  pnl: number;
  pnlPercent: number;
  currentPrice: number;
}

export interface PriceAlert {
  id: string;
  code: string;
  name: string;
  type: AssetType;
  market?: number;
  condition: AlertCondition;
  threshold: number;
  enabled: boolean;
  lastTriggeredAt?: number;
}

export interface Quote {
  code: string;
  name: string;
  type: AssetType;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  prevClose: number | null;
  updatedAt: string;
  error?: string;
  isEstimated?: boolean;
}

export interface AppSettings {
  apiMode: ApiMode;
  apiBaseUrl: string;
  vercelApiUrl: string;
  refreshIntervalMinutes: number;
  colorScheme: ColorScheme;
  notificationsEnabled: boolean;
  alertCooldownMinutes: number;
  /** 财经网站页面浮窗 */
  floatWidgetEnabled: boolean;
}

export interface FundSearchResult {
  CODE: string;
  NAME: string;
  FundBaseInfo?: {
    SHORTNAME?: string;
    DWJZ?: number;
    FTYPE?: string;
  };
}

export interface FundValuationExpansion {
  FCODE?: string;
  SHORTNAME?: string;
  GZTIME?: string;
  GZ?: string;
  GSZZL?: string;
  DWJZ?: string;
  JZRQ?: string;
  SGZT?: string;
  SHZT?: string;
}

export interface FundValuationResponse {
  Expansion?: FundValuationExpansion;
  Datas?: string[];
}

export interface FundDetailData {
  FCODE?: string;
  SHORTNAME?: string;
  FULLNAME?: string;
  FTYPE?: string;
  ESTABDATE?: string;
  ENDNAV?: string;
  JJGS?: string;
  JJJL?: string;
  RLEVEL_SZ?: string;
  RISKLEVEL?: string;
  INVTGT?: string;
}

export interface FundDetailResponse {
  Datas?: FundDetailData;
}

export interface FundBriefResponse {
  FCODE?: string;
  SHORTNAME?: string;
  FTYPE?: string;
  ESTABDATE?: string;
}

export interface FundPeriodItem {
  title?: string;
  syl?: string;
  avg?: string;
  rank?: string;
  sc?: string;
}

export interface FundPeriodResponse {
  Datas?: FundPeriodItem[];
}

export interface StockDetailResponse {
  f57?: string;
  f58?: string;
  f43?: number;
  f169?: number;
  f170?: number;
  f60?: number;
  f44?: number;
  f45?: number;
  f168?: number;
  f47?: number;
  f162?: number;
  f116?: number;
  f117?: number;
  f127?: string;
  decimal?: number;
}

export interface StockTrendsResponse {
  code?: string;
  name?: string;
  decimal?: number;
  prePrice?: number;
  trends?: string[];
}

export interface StockKlineResponse {
  code?: string;
  name?: string;
  decimal?: number;
  klines?: string[];
}

export interface FundRankItem {
  FCODE?: string;
  SHORTNAME?: string;
  FTYPE?: string;
  DWJZ?: string | number;
  RZDF?: string | number;
  HLDWJZ?: string | number;
  SYL_Y?: string | number;
  SYL_1N?: string | number;
}

export interface FundRankResponse {
  Datas?: FundRankItem[];
  data?: FundRankItem[];
  Data?: FundRankItem[];
}

export interface ThemeItem {
  TTYPE?: string;
  TTYPENAME?: string;
  ZDF?: string | number;
  SYL_W?: string | number;
  SYL_M?: string | number;
  SYL_Q?: string | number;
  D?: string | number;
}

export interface ThemeListResponse {
  Datas?: ThemeItem[];
  data?: ThemeItem[];
}

export interface BigDataItem {
  ClType?: string;
  Title?: string;
  SubTitle?: string;
  FundCode?: string;
  FundName?: string;
  SYL?: string;
  ShowunitMark?: string;
}

export interface AppState {
  watchlist: WatchlistItem[];
  groups: WatchlistGroup[];
  holdings: Holding[];
  alerts: PriceAlert[];
  quotes: Record<string, Quote>;
  settings: AppSettings;
  lastRefreshAt: number | null;
}

export interface ExportData {
  version: 2;
  exportedAt: string;
  watchlist: WatchlistItem[];
  groups: WatchlistGroup[];
  holdings?: Holding[];
  alerts?: PriceAlert[];
}

/** @deprecated 兼容 v1 导入 */
export interface ExportDataV1 {
  version: 1;
  exportedAt: string;
  watchlist: WatchlistItem[];
  groups: WatchlistGroup[];
}

export interface QuoteTarget {
  code: string;
  name: string;
  type: AssetType;
  market?: number;
}

export interface KlineBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface FundNavPoint {
  date: string;
  nav: number;
  changePercent?: number;
}

/** 基金净值走势图时间范围 */
export type FundNavRange = '1m' | '6m' | '3y' | '5y' | 'all';

export interface IndexQuote {
  code: string;
  name: string;
  price: number | null;
  changePercent: number | null;
}
