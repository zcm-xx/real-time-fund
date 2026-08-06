import { useRef, useState } from 'react';
import { AlertsPanel } from '@/components/AlertsPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useAppStore, useStorageSync } from '@/hooks/useAppStore';

export default function OptionsApp() {
  useStorageSync();
  const hydrated = useAppStore((s) => s.hydrated);
  const groups = useAppStore((s) => s.groups);
  const removeGroup = useAppStore((s) => s.removeGroup);
  const exportWatchlist = useAppStore((s) => s.exportWatchlist);
  const importWatchlist = useAppStore((s) => s.importWatchlist);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-400">
        加载中...
      </div>
    );
  }

  async function handleExport() {
    const json = await exportWatchlist();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jijin-watchlist-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('导出成功');
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      await importWatchlist(text);
      setMessage('导入成功');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '导入失败');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-bold text-gray-900">基金股票助手 - 设置</h1>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <SettingsPanel onClose={() => undefined} showBack={false} />
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <AlertsPanel />
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">自选分组</h2>
          <ul className="space-y-2">
            {groups.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
              >
                <span>{g.name}</span>
                {g.id !== 'default' && (
                  <button
                    type="button"
                    onClick={() => void removeGroup(g.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    删除
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            导入 / 导出
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleExport()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              导出全部数据
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              导入全部数据
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImport(file);
              }}
            />
          </div>
          {message && (
            <p className="mt-2 text-xs text-gray-500">{message}</p>
          )}
        </section>
      </main>
    </div>
  );
}
