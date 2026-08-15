import React, { useState } from 'react';
import { PluginSlotRenderer } from '../PluginSlotRenderer';
import { ClipboardList, Calendar, Building2, Users, UserPlus } from 'lucide-react';

export const ReceptionView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'register' | 'list'>('all');

  return (
    <div className="space-y-6">
      {/* Reception Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-slate-700/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full inline-flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5" />
              دفتر پذیرش و نوبت‌دهی کلینیک
            </span>
            <h2 className="text-xl font-bold tracking-tight">میز پذیرش - کلینیک تخصصی سامان</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              مدیریت نوبت‌ها، تشکیل پرونده اولیه مراجعین و دسترسی به فهرست کلی پرونده‌ها
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <div>
              <span className="font-bold block">شعبه مرکزی - طبقه ۳</span>
              <span className="text-slate-400 text-[11px]">وضعیت خطوط رزرو: فعال و آنلاین</span>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-md'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
            }`}
          >
            نمای جامع پذیرش
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'list'
                ? 'bg-white text-slate-900 shadow-md'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
            }`}
          >
            <Users className="w-4 h-4" />
            فهرست پرونده‌های مراجعین
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'register'
                ? 'bg-white text-slate-900 shadow-md'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            تشکیل پرونده جدید
          </button>
        </div>
      </div>

      {/* Grid Layout driven by Plugin Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {(activeTab === 'all' || activeTab === 'register') && (
            <PluginSlotRenderer name="reception.registry.main" />
          )}

          {(activeTab === 'all' || activeTab === 'list') && (
            <PluginSlotRenderer name="reception.dashboard.main" />
          )}
        </div>

        <div className="space-y-6">
          <PluginSlotRenderer name="reception.scheduling.widget" />
        </div>
      </div>
    </div>
  );
};
