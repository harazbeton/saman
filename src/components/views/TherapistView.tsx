import React, { useState, useEffect } from 'react';
import { PluginSlotRenderer } from '../PluginSlotRenderer';
import { Stethoscope, ShieldCheck, CalendarCheck, FileText, History, LayoutDashboard } from 'lucide-react';
import { globalEventBus } from '../../core/kernel/event-bus';

export const TherapistView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'timeline' | 'notes'>('dashboard');

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash.includes('/patients/') && window.location.hash.includes('/timeline')) {
        setActiveTab('timeline');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);

    const unsub = globalEventBus.subscribe('patient.selected', (evt) => {
      if (evt.payload?.targetView === 'timeline') {
        setActiveTab('timeline');
      }
    });

    return () => {
      window.removeEventListener('hashchange', handleHash);
      unsub();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Therapist Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-indigo-700/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full inline-flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5" />
              پنل درمانگر و متخصص روانشناسی
            </span>
            <h2 className="text-xl font-bold tracking-tight">خوش آمدید، دکتر علیرضا محمدی</h2>
            <p className="text-xs text-indigo-100/90 leading-relaxed">
              مدیریت جلسات روزانه، تایم‌لاین یکپارچه سوابق بالینی و نگارش پرونده‌های تشخیصی استاندارد
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs bg-indigo-950/60 p-3 rounded-2xl border border-indigo-500/30">
            <ShieldCheck className="w-5 h-5 text-indigo-300" />
            <div>
              <span className="font-bold block">پروتوکل حفاظت داده‌های بالینی</span>
              <span className="text-indigo-200 text-[11px]">ثبت خودکار لاگ Audit برای تمامی دسترسی‌ها</span>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-indigo-700/50">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-white text-indigo-950 shadow-md'
                : 'bg-indigo-950/40 text-indigo-200 hover:bg-indigo-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            داشبورد جلسات امروز
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'timeline'
                ? 'bg-white text-indigo-950 shadow-md'
                : 'bg-indigo-950/40 text-indigo-200 hover:bg-indigo-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            تایم‌لاین پرونده بالینی مراجع
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'notes'
                ? 'bg-white text-indigo-950 shadow-md'
                : 'bg-indigo-950/40 text-indigo-200 hover:bg-indigo-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            پرونده‌نویسی بالینی (SOAP)
          </button>
        </div>
      </div>

      {/* Grid Layout driven by Plugin Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'dashboard' && (
            <>
              <PluginSlotRenderer name="therapist.dashboard.main" />
              <PluginSlotRenderer name="therapist.clinical.notes" />
            </>
          )}

          {activeTab === 'timeline' && (
            <PluginSlotRenderer name="therapist.session.main" />
          )}

          {activeTab === 'notes' && (
            <PluginSlotRenderer name="therapist.clinical.notes" />
          )}
        </div>

        {/* Sidebar Widgets Column */}
        <div className="space-y-6">
          <PluginSlotRenderer name="therapist.today.widgets" />
          <PluginSlotRenderer name="therapist.dashboard.sidebar" />
        </div>
      </div>
    </div>
  );
};
