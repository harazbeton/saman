import React, { useState, useEffect } from 'react';
import { outboxSyncEngine } from '../infrastructure/sync/outbox-sync-engine';
import { OutboxItem } from '../core/kernel/types';
import { localStore } from '../infrastructure/storage/local-store-adapter';
import { HardDriveUpload, RefreshCw, Trash2, X, CheckCircle, Clock } from 'lucide-react';

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncQueueModal: React.FC<SyncQueueModalProps> = ({ isOpen, onClose }) => {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadItems = () => {
    const queue = localStore.getOutboxItems();
    setItems(queue);
  };

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen]);

  const handleRunSync = async () => {
    setSyncing(true);
    await outboxSyncEngine.processSyncQueue();
    loadItems();
    setSyncing(false);
  };

  const handleClearSynced = async () => {
    await outboxSyncEngine.clearCompleted();
    loadItems();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <HardDriveUpload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">صف تغییرات آفلاین (Outbox Sync Queue)</h2>
              <p className="text-[11px] text-slate-400">
                تغییرات محلی ابتدا در Outbox ذخیره و سپس به صورت Delta با سرور همگام می‌شوند.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
          <span className="text-slate-600 font-medium">
            تعداد کل موارد صف: <strong className="text-slate-900">{items.length}</strong> | در انتظار:{' '}
            <strong className="text-amber-600">
              {items.filter((i) => i.status === 'pending' || i.status === 'failed').length}
            </strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearSynced}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              پاکسازی همگام‌شده‌ها
            </button>

            <button
              type="button"
              onClick={handleRunSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              همگام‌سازی با سرور
            </button>
          </div>
        </div>

        {/* Queue Items Table */}
        <div className="max-h-80 overflow-y-auto text-xs space-y-2 pr-1">
          {items.length === 0 ? (
            <div className="text-center py-8 text-slate-400 flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              صف Outbox خالی است. تمام تغییرات با سرور همگام شده‌اند.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-[10px]">
                      {item.operation}
                    </span>
                    <span>
                      {item.aggregateType} [{item.aggregateId}]
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    تاریخ ثبت: {new Date(item.createdAt).toLocaleTimeString('fa-IR')} | نسخه:{' '}
                    {item.version}
                  </span>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    item.status === 'synced'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.status === 'syncing'
                      ? 'bg-indigo-100 text-indigo-800 animate-pulse'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.status === 'synced'
                    ? 'همگام‌شده'
                    : item.status === 'syncing'
                    ? 'در حال همگام‌سازی...'
                    : 'در انتظار ارسال (Pending)'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
