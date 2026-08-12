import React, { useState, useEffect } from 'react';
import { auditLogger } from '../infrastructure/audit/audit-logger';
import { AuditLogEntry } from '../core/kernel/types';
import { ShieldCheck, X, FileText, Clock, User, Lock } from 'lucide-react';

interface AuditLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    if (isOpen) {
      auditLogger.getLogs('clinic-main', 100).then(setLogs);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-slate-900 text-white h-full shadow-2xl border-l border-slate-800 flex flex-col p-5 animate-in slide-in-from-left">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">دفتر لاگ نظارت و امنیت (Audit Log)</h2>
              <p className="text-[11px] text-slate-400">ثبت خط‌به‌خط دسترسی‌ها و تغییرات پرونده‌های بالینی</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1 text-xs">
          {logs.length === 0 ? (
            <p className="text-slate-500 text-center py-10">هنوز رویدادی در دفتر لاگ ثبت نشده است.</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-indigo-300 font-semibold bg-indigo-950/80 px-2 py-0.5 rounded">
                    {log.action}
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleTimeString('fa-IR')}
                  </span>
                </div>

                <div className="text-slate-200 font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  کاربر: {log.userName} ({log.userRole})
                </div>

                <div className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  منبع: {log.resourceType} [{log.resourceId}]
                </div>

                {log.details && Object.keys(log.details).length > 0 && (
                  <pre className="text-[10px] bg-slate-950 p-2 rounded-lg text-slate-300 overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
          کلینیک سامان • تضمین ایزوله‌سازی داده‌های بالینی مراجعین
        </div>
      </div>
    </div>
  );
};
