import { useMemo } from 'react';
import type { ColorScheme } from '@/api/types';

interface MiniChartProps {
  points: number[];
  width?: number;
  height?: number;
  colorScheme?: ColorScheme;
  className?: string;
}

function buildPaths(points: number[], width: number, height: number) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * innerW;
    const y = padding + innerH - ((p - min) / range) * innerH;
    return { x, y };
  });

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x},${height} L${coords[0].x},${height} Z`;

  return { line, area };
}

export function MiniChart({
  points,
  width = 72,
  height = 28,
  colorScheme = 'china',
  className = '',
}: MiniChartProps) {
  const chart = useMemo(() => {
    if (points.length < 2) return null;

    const { line, area } = buildPaths(points, width, height);
    const trend = points[points.length - 1] - points[0];
    const isUp = trend >= 0;
    const upColor = colorScheme === 'china' ? '#ef4444' : '#22c55e';
    const downColor = colorScheme === 'china' ? '#22c55e' : '#ef4444';
    const color = trend === 0 ? '#9ca3af' : isUp ? upColor : downColor;

    return { line, area, color };
  }, [points, width, height, colorScheme]);

  if (!chart) {
    return (
      <svg
        width={width}
        height={height}
        className={`shrink-0 ${className}`}
        aria-hidden
      >
        <line
          x1={4}
          y1={height / 2}
          x2={width - 4}
          y2={height / 2}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      className={`shrink-0 ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <path d={chart.area} fill={chart.color} fillOpacity={0.12} stroke="none" />
      <path
        d={chart.line}
        fill="none"
        stroke={chart.color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface LargeChartProps {
  points: number[];
  height?: number;
  colorScheme?: ColorScheme;
  label?: string;
}

export function LargeChart({
  points,
  height = 160,
  colorScheme = 'china',
  label = '走势',
}: LargeChartProps) {
  if (points.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-sm text-gray-400"
        style={{ height }}
      >
        暂无{label}数据
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <div className="mb-2 text-xs text-gray-500">{label}</div>
      <div className="w-full overflow-hidden">
        <MiniChart
          points={points}
          width={560}
          height={height - 32}
          colorScheme={colorScheme}
          className="w-full max-w-full"
        />
      </div>
    </div>
  );
}
