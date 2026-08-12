import React, { useState, useEffect } from 'react';
import { PluginRole } from '../core/kernel/types';
import { outboxSyncEngine } from '../infrastructure/sync/outbox-sync-engine';

import {
  HeartHandshake,
  User,
  Stethoscope,
  ClipboardList,
  ShieldCheck,
  RefreshCw,
  FileCheck2,
  HardDriveUpload,
  Wifi,
} from 'lucide-react';

interface HeaderNavProps {
  currentRole: PluginRole;
  onRoleChange: (role: PluginRole) => void;
  onOpenAuditLogs: () => void;
  onOpenSyncQueue: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentRole,
  onRoleChange,
  onOpenAuditLogs,
  onOpenSyncQueue,
}) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const updateCount = async () => {
    const count = await outboxSyncEngine.getPendingCount();
    setPendingCount(count);
  };

  useEffect(() => {
    updateCount();
    const unsub = outboxSyncEngine.subscribe(() => updateCount());
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    await outboxSyncEngine.processSyncQueue();
    setSyncing(false);
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              سامان
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Saman Platform v1.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              پلتفرم ماژولار سلامت روان • Offline-Ready & Modular Architecture
            </p>
          </div>
        </div>

        {/* Role Navigation Switcher */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
          {[
            { id: 'patient', label: 'مراجع (Patient)', icon: User },
            { id: 'therapist', label: 'درمانگر (Therapist)', icon: Stethoscope },
            { id: 'receptionist', label: 'پذیرش (Reception)', icon: ClipboardList },
            { id: 'admin', label: 'مدیریت و پلاگین‌ها', icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            const active = currentRole === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onRoleChange(item.id as PluginRole)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* System Outbox & Security Controls */}
        <div className="flex items-center gap-2 text-xs">
          {/* Outbox Pending Counter */}
          <button
            type="button"
            onClick={onOpenSyncQueue}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all ${
              pendingCount > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <HardDriveUpload className="w-3.5 h-3.5" />
            <span>صف Outbox:</span>
            <span className="font-bold px-1.5 py-0.2 rounded bg-slate-700 text-white">
              {pendingCount}
            </span>
          </button>

          {/* Sync Trigger */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncing}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl transition-all"
            title="همگام‌سازی دستی با سرور"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Audit Logs Trigger */}
          <button
            type="button"
            onClick={onOpenAuditLogs}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 rounded-xl transition-all"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            لاگ لاینظر (Audit)
          </button>

          <span className="flex items-center gap-1 text-[11px] bg-slate-800 px-2.5 py-1.5 rounded-xl text-emerald-400 border border-slate-700">
            <Wifi className="w-3 h-3" />
            آفلاین آماده
          </span>
        </div>
      </div>
    </header>
  );
};
