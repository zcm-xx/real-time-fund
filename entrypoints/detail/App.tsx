import { FundDetailView } from '@/components/FundDetailView';
import { StockDetailView } from '@/components/StockDetailView';
import type { AssetType } from '@/api/types';

function getParams(): { type: AssetType; code: string; market?: number } {
  const params = new URLSearchParams(window.location.search);
  const type = (params.get('type') || 'fund') as AssetType;
  const code = params.get('code') || '';
  const marketStr = params.get('market');
  const market = marketStr ? Number.parseInt(marketStr, 10) : undefined;
  return { type, code, market };
}

export default function DetailApp() {
  const { type, code, market } = getParams();

  if (!code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        缺少 code 参数
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">详情</h1>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        {type === 'fund' ? (
          <FundDetailView code={code} />
        ) : (
          <StockDetailView code={code} market={market} />
        )}
      </main>
      <footer className="px-6 py-4 text-center text-[10px] text-gray-400">
        仅供学习，不构成投资建议
      </footer>
    </div>
  );
}
