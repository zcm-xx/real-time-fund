import { useState } from 'react';
import type { WatchlistGroup } from '@/api/types';
import { useAppStore } from '@/hooks/useAppStore';

interface GroupTabsProps {
  activeGroupId: string;
  onSelect: (id: string) => void;
}

export function GroupTabs({ activeGroupId, onSelect }: GroupTabsProps) {
  const groups = useAppStore((s) => s.groups);
  const addGroup = useAppStore((s) => s.addGroup);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    const group = await addGroup(trimmed);
    onSelect(group.id);
    setName('');
    setAdding(false);
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {groups.map((group: WatchlistGroup) => (
        <button
          key={group.id}
          type="button"
          onClick={() => onSelect(group.id)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
            activeGroupId === group.id
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
          }`}
        >
          {group.name}
        </button>
      ))}

      {adding ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleAdd();
            if (e.key === 'Escape') setAdding(false);
          }}
          onBlur={() => void handleAdd()}
          placeholder="分组名"
          className="w-20 shrink-0 rounded-full border border-blue-300 px-2 py-1 text-xs outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="shrink-0 rounded-full px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="新建分组"
        >
          +
        </button>
      )}
    </div>
  );
}
