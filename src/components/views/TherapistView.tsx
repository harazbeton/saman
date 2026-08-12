import React from 'react';
import { PluginSlotRenderer } from '../PluginSlotRenderer';
import { Stethoscope, ShieldCheck, Clock, Users } from 'lucide-react';

export const TherapistView: React.FC = () => {
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
              شما امروز <strong className="text-white">۲ جلسه فعال</strong> دارید. آخرین نوت بالینی
              مراجع (سارا احمدی) در حال ویرایش است.
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
      </div>

      {/* Grid Layout driven by Plugin Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Clinical Editor Column */}
        <div className="lg:col-span-2 space-y-6">
          <PluginSlotRenderer name="therapist.clinical.notes" />
        </div>

        {/* Sidebar Widgets Column (AI Copilot, Todays Patients) */}
        <div className="space-y-6">
          <PluginSlotRenderer name="therapist.today.widgets" />
        </div>
      </div>
    </div>
  );
};
