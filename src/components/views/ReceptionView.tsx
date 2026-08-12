import React from 'react';
import { PluginSlotRenderer } from '../PluginSlotRenderer';
import { ClipboardList, Calendar, Building2 } from 'lucide-react';

export const ReceptionView: React.FC = () => {
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
              مدیریت نوبت‌ها، تشکیل پرونده اولیه مراجعین و تخصیص درمانگر با هماهنگی کامل
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
      </div>

      {/* Grid Layout driven by Plugin Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PluginSlotRenderer name="reception.registry.main" />
        </div>

        <div className="space-y-6">
          <PluginSlotRenderer name="reception.scheduling.widget" />
        </div>
      </div>
    </div>
  );
};
