import { apiRequest, extractList } from '@/api/client';
import type {
  AppSettings,
  BigDataItem,
  FundRankItem,
  FundRankResponse,
  ThemeItem,
  ThemeListResponse,
} from '@/api/types';

export async function fetchFundRank(
  options: {
    fundType?: number;
    sortColumn?: string;
    pageIndex?: number;
    pageSize?: number;
  } = {},
  settings?: AppSettings,
): Promise<FundRankItem[]> {
  const data = await apiRequest<FundRankResponse | FundRankItem[]>(
    '/fundMNRank',
    {
      FundType: options.fundType ?? 0,
      SortColumn: options.sortColumn ?? 'RZDF',
      Sort: 'desc',
      pageIndex: options.pageIndex ?? 1,
      pageSize: options.pageSize ?? 20,
      DataConstraintType: 0,
      BUY: false,
      ISABNORMAL: true,
    },
    settings,
  );
  return extractList(data);
}

export async function fetchHotThemes(
  rankItem = 'ZDF',
  settings?: AppSettings,
): Promise<ThemeItem[]> {
  const data = await apiRequest<ThemeListResponse | ThemeItem[]>(
    '/fundThemeList',
    {
      RankItems: rankItem,
      RankVectors: 'desc',
      category: 2,
    },
    settings,
  );
  return extractList(data);
}

export async function fetchBigDataList(
  settings?: AppSettings,
): Promise<BigDataItem[]> {
  const data = await apiRequest<BigDataItem[] | { Datas?: BigDataItem[] }>(
    '/bigDataList',
    { ClCategory: 0 },
    settings,
  );
  return extractList(data);
}

export function parseRankChange(item: FundRankItem): number | null {
  const raw = item.RZDF ?? item.HLDWJZ;
  if (raw === undefined || raw === '--') return null;
  const num = Number.parseFloat(String(raw));
  return Number.isNaN(num) ? null : num;
}

export function parseThemeChange(item: ThemeItem, field = 'ZDF'): number | null {
  const raw = item[field as keyof ThemeItem];
  if (raw === undefined || raw === '--') return null;
  const num = Number.parseFloat(String(raw));
  return Number.isNaN(num) ? null : num;
}
