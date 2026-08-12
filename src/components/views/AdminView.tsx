import React, { useState, useEffect } from 'react';
import { globalPluginRegistry } from '../../core/kernel/plugin-registry';
import { PluginManifest } from '../../core/kernel/types';
import { ShieldCheck, Blocks, Power, Lock, Layers, Eye, CheckCircle2 } from 'lucide-react';

export const AdminView: React.FC = () => {
  const [manifests, setManifests] = useState<PluginManifest[]>([]);

  const refreshManifests = () => {
    setManifests(globalPluginRegistry.getAllManifests());
  };

  useEffect(() => {
    refreshManifests();
  }, []);

  const handleToggle = (id: string) => {
    globalPluginRegistry.togglePlugin(id);
    refreshManifests();
  };

  return (
    <div className="space-y-6">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-700/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full inline-flex items-center gap-1">
              <Blocks className="w-3.5 h-3.5" />
              مدیریت اکوسیستم و پلاگین‌ها (Micro-Kernel Admin)
            </span>
            <h2 className="text-xl font-bold tracking-tight">کنترل پلتفرم و تزریق دینامیک ماژول‌ها</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              افزودن، فعال‌سازی یا غیرفعال‌سازی لحظه‌ای پلاگین‌ها بدون ایجاد اختلال در هسته برنامه (Zero Breakdown)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-bold block">کنترل مجوزها و امنیت</span>
              <span className="text-slate-400 text-[11px]">ایزوله‌سازی دسترسی ذخیره‌سازی پلاگین‌ها</span>
            </div>
          </div>
        </div>
      </div>

      {/* Installed Plugins Grid */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            لیست پلاگین‌های فعال اکوسیستم سامان
          </h3>
          <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold">
            {manifests.filter((m) => m.enabled).length} از {manifests.length} پلاگین فعال
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {manifests.map((m) => (
            <div
              key={m.id}
              className={`p-4 rounded-2xl border transition-all ${
                m.enabled
                  ? 'bg-slate-50/80 border-slate-200 shadow-sm'
                  : 'bg-slate-100/50 border-slate-200/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{m.name}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                      v{m.version}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono block mt-0.5">{m.id}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    m.enabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-300 hover:bg-slate-400 text-slate-800'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {m.enabled ? 'فعال' : 'غیرفعال'}
                </button>
              </div>

              <p className="text-xs text-slate-600 mb-3">{m.description}</p>

              {/* Manifest Metadata */}
              <div className="space-y-2 pt-2 border-t border-slate-200/60 text-[11px]">
                <div>
                  <span className="font-bold text-slate-700 block mb-1">اسلات‌های تزریق UI:</span>
                  <div className="flex wrap gap-1">
                    {m.slots.map((s, idx) => (
                      <span
                        key={idx}
                        className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono text-[10px]"
                      >
                        {s.target} (P:{s.priority})
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-700 block mb-1">مجوزهای امنیتی (Permissions):</span>
                  <div className="flex wrap gap-1">
                    {m.permissions.map((p, idx) => (
                      <span
                        key={idx}
                        className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-mono text-[10px]"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
