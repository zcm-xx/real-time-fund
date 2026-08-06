import { useMemo } from 'react';
import type { ColorScheme, FundNavPoint, KlineBar } from '@/api/types';

interface KlineChartProps {
  bars?: KlineBar[];
  navPoints?: FundNavPoint[];
  height?: number;
  colorScheme?: ColorScheme;
  mode?: 'candle' | 'line';
  label?: string;
}

function downsampleNavPoints(
  points: FundNavPoint[],
  maxPoints = 320,
): FundNavPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const sampled = points.filter((_, i) => i % step === 0);
  const last = points[points.length - 1]!;
  if (sampled[sampled.length - 1]?.date !== last.date) {
    sampled.push(last);
  }
  return sampled;
}

export function KlineChart({
  bars = [],
  navPoints = [],
  height = 220,
  colorScheme = 'china',
  mode = 'candle',
  label,
}: KlineChartProps) {
  const displayNavPoints = useMemo(
    () => downsampleNavPoints(navPoints),
    [navPoints],
  );

  const chart = useMemo(() => {
    const width = 640;
    const padding = { top: 12, right: 12, bottom: 24, left: 48 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    if (mode === 'candle' && bars.length > 0) {
      const lows = bars.map((b) => b.low);
      const highs = bars.map((b) => b.high);
      const min = Math.min(...lows);
      const max = Math.max(...highs);
      const range = max - min || 1;
      const barW = Math.max(2, innerW / bars.length - 2);

      const elements = bars.map((bar, i) => {
        const x = padding.left + (i / bars.length) * innerW + barW / 2;
        const yHigh = padding.top + innerH - ((bar.high - min) / range) * innerH;
        const yLow = padding.top + innerH - ((bar.low - min) / range) * innerH;
        const yOpen = padding.top + innerH - ((bar.open - min) / range) * innerH;
        const yClose = padding.top + innerH - ((bar.close - min) / range) * innerH;
        const up = bar.close >= bar.open;
        const upColor = colorScheme === 'china' ? '#ef4444' : '#22c55e';
        const downColor = colorScheme === 'china' ? '#22c55e' : '#ef4444';
        const color = up ? upColor : downColor;
        const bodyTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(1, Math.abs(yClose - yOpen));

        return (
          <g key={`${bar.date}-${i}`}>
            <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth={1} />
            <rect
              x={x - barW / 2}
              y={bodyTop}
              width={barW}
              height={bodyH}
              fill={up ? color : color}
              stroke={color}
              strokeWidth={1}
            />
          </g>
        );
      });

      return { width, elements, empty: false };
    }

    if (displayNavPoints.length > 0) {
      const values = displayNavPoints.map((p) => p.nav);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      const denom = Math.max(displayNavPoints.length - 1, 1);

      const coords = displayNavPoints.map((p, i) => {
        const x = padding.left + (i / denom) * innerW;
        const y = padding.top + innerH - ((p.nav - min) / range) * innerH;
        return { x, y };
      });

      const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
      const area = `${line} L${coords[coords.length - 1].x},${padding.top + innerH} L${coords[0].x},${padding.top + innerH} Z`;
      const trend = values[values.length - 1] - values[0];
      const upColor = colorScheme === 'china' ? '#ef4444' : '#22c55e';
      const downColor = colorScheme === 'china' ? '#22c55e' : '#ef4444';
      const color = trend >= 0 ? upColor : downColor;

      return {
        width,
        elements: (
          <>
            <path d={area} fill={color} fillOpacity={0.1} />
            <path d={line} fill="none" stroke={color} strokeWidth={2} />
          </>
        ),
        empty: false,
      };
    }

    return { width: 640, elements: null, empty: true };
  }, [bars, displayNavPoints, height, colorScheme, mode]);

  if (chart.empty) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-sm text-gray-400"
        style={{ height }}
      >
        暂无{label ?? 'K线'}数据
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      {label && <div className="mb-2 text-xs text-gray-500">{label}</div>}
      <svg
        viewBox={`0 0 ${chart.width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {chart.elements}
      </svg>
    </div>
  );
}
