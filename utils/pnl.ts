import type { Holding, HoldingPnl, Quote } from '@/api/types';

export function calcHoldingPnl(
  holding: Holding,
  quote: Quote | undefined,
): HoldingPnl | null {
  const currentPrice = quote?.price;
  if (currentPrice === null || currentPrice === undefined || quote?.error) {
    return null;
  }

  const marketValue = currentPrice * holding.shares;
  const costValue = holding.costPrice * holding.shares;
  const pnl = marketValue - costValue;
  const pnlPercent = costValue > 0 ? (pnl / costValue) * 100 : 0;

  return {
    marketValue,
    costValue,
    pnl,
    pnlPercent,
    currentPrice,
  };
}

export function calcPortfolioSummary(
  holdings: Holding[],
  quotes: Record<string, Quote>,
): {
  totalMarketValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
  validCount: number;
} {
  let totalMarketValue = 0;
  let totalCost = 0;
  let validCount = 0;

  for (const holding of holdings) {
    const key = `${holding.type}:${holding.code}`;
    const pnl = calcHoldingPnl(holding, quotes[key]);
    if (!pnl) continue;
    totalMarketValue += pnl.marketValue;
    totalCost += pnl.costValue;
    validCount += 1;
  }

  const totalPnl = totalMarketValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return {
    totalMarketValue,
    totalCost,
    totalPnl,
    totalPnlPercent,
    validCount,
  };
}
