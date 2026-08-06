import { useRef, useState } from 'react';
import { MiniChart } from '@/components/MiniChart';
import type { Quote, WatchlistGroup, WatchlistItem } from '@/api/types';
import { useAppStore } from '@/hooks/useAppStore';
import { useSparkline } from '@/hooks/useSparkline';
import { itemsInGroup } from '@/lib/groups';
import {
  formatPercent,
  formatPrice,
  getChangeColor,
  getQuoteKey,
} from '@/utils/format';
import { openDetailPage } from '@/utils/navigation';

interface WatchlistItemRowProps {
  item: WatchlistItem;
  quote?: Quote;
  groups: WatchlistGroup[];
  onDragStart: (key: string) => void;
  onDragOver: (key: string) => void;
  onDrop: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}

function WatchlistItemRow({
  item,
  quote,
  groups,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isDragOver,
}: WatchlistItemRowProps) {
  const removeItem = useAppStore((s) => s.removeItem);
  const moveItemToGroup = useAppStore((s) => s.moveItemToGroup);
  const togglePinned = useAppStore((s) => s.togglePinned);
  const colorScheme = useAppStore((s) => s.settings.colorScheme);
  const changePercent = quote?.changePercent ?? null;
  const sparkline = useSparkline(item);
  const key = getQuoteKey(item.code, item.type);
  const [showMove, setShowMove] = useState(false);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(key)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(key);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={`group flex items-center gap-2 rounded-xl border bg-white px-2 py-2 shadow-sm transition ${
        isDragging ? 'opacity-40' : ''
      } ${isDragOver ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100'}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void togglePinned(item.code, item.type);
        }}
        className={`shrink-0 rounded-md p-1 text-sm transition ${
          item.pinned
            ? 'text-blue-600'
            : 'text-gray-300 opacity-0 hover:text-blue-500 group-hover:opacity-100'
        }`}
        title={item.pinned ? '取消重点关注' : '重点关注'}
      >
        {item.pinned ? '★' : '☆'}
      </button>

      <div
        className="cursor-grab px-0.5 text-gray-300 active:cursor-grabbing"
        title="拖拽排序"
      >
        ⠿
      </div>

      <button
        type="button"
        onClick={() =>
          openDetailPage(item.type, item.code, item.market)
        }
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <MiniChart
          points={sparkline}
          colorScheme={colorScheme}
          width={64}
          height={26}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-gray-900">
              {quote?.name || item.name}
            </span>
            <span className="shrink-0 rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-500">
              {item.type === 'fund' ? '基' : '股'}
            </span>
          </div>
          <div className="text-xs text-gray-400">{item.code}</div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold tabular-nums text-gray-900">
            {formatPrice(quote?.price ?? null)}
          </div>
          <div
            className={`text-xs font-medium tabular-nums ${getChangeColor(changePercent, colorScheme)}`}
          >
            {quote?.error ? (
              '—'
            ) : (
              <>
                {formatPercent(changePercent)}
                {item.type === 'fund' && quote?.isEstimated === false && (
                  <span className="ml-0.5 text-[9px] font-normal text-gray-400">
                    昨
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowMove((v) => !v)}
          className="rounded-md p-1 text-xs text-gray-300 opacity-0 transition hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
          title="移动分组"
        >
          ⋯
        </button>
        {showMove && (
          <div className="absolute right-0 top-6 z-10 min-w-24 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  void moveItemToGroup(item.code, item.type, g.id);
                  setShowMove(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => void removeItem(item.code, item.type)}
        className="rounded-md p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        title="移除"
      >
        ✕
      </button>
    </div>
  );
}

interface WatchlistProps {
  items: WatchlistItem[];
  quotes: Record<string, Quote>;
  groupId: string;
}

export function Watchlist({ items, quotes, groupId }: WatchlistProps) {
  const groups = useAppStore((s) => s.groups);
  const reorderInGroup = useAppStore((s) => s.reorderInGroup);
  const groupItems = itemsInGroup(items, groupId);
  const dragKey = useRef<string | null>(null);
  const overKey = useRef<string | null>(null);
  const [, forceRender] = useState(0);

  if (groupItems.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center">
        <p className="text-sm text-gray-500">该分组暂无自选</p>
        <p className="mt-1 text-xs text-gray-400">
          搜索基金或输入股票代码添加
        </p>
      </div>
    );
  }

  function handleDrop() {
    const from = dragKey.current;
    const to = overKey.current;
    dragKey.current = null;
    overKey.current = null;

    if (!from || !to || from === to) return;

    const fromItem = groupItems.find((i) => getQuoteKey(i.code, i.type) === from);
    const toItem = groupItems.find((i) => getQuoteKey(i.code, i.type) === to);
    if (!fromItem || !toItem) return;

    const reordered = [...groupItems];
    const fromIdx = reordered.indexOf(fromItem);
    const toIdx = reordered.indexOf(toItem);
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, fromItem);

    void reorderInGroup(groupId, reordered);
    forceRender((n) => n + 1);
  }

  return (
    <div className="space-y-2">
      {groupItems.map((item) => {
        const key = getQuoteKey(item.code, item.type);
        return (
          <WatchlistItemRow
            key={key}
            item={item}
            quote={quotes[key]}
            groups={groups}
            isDragging={dragKey.current === key}
            isDragOver={overKey.current === key}
            onDragStart={(k) => {
              dragKey.current = k;
            }}
            onDragOver={(k) => {
              overKey.current = k;
              forceRender((n) => n + 1);
            }}
            onDrop={handleDrop}
          />
        );
      })}
    </div>
  );
}
