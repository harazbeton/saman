import React from 'react';
import { PluginSlotRenderer } from '../PluginSlotRenderer';
import { Sparkles, Heart, Shield, Calendar } from 'lucide-react';

export const PatientView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Patient Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 shadow-md border border-emerald-600/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-3 py-1 rounded-full inline-flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              پنل بیمار / مراجع
            </span>
            <h2 className="text-xl font-bold tracking-tight">خوش آمدید، سارا احمدی عزیزم</h2>
            <p className="text-xs text-emerald-100/90 max-w-xl leading-relaxed">
              جلسه بعدی شما با <strong className="text-white">دکتر علیرضا محمدی</strong> برای روز{' '}
              <span className="underline">پنج‌شنبه ۲۵ مرداد - ساعت ۱۰:۰۰</span> تنظیم شده است.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs bg-emerald-900/50 backdrop-blur-xs p-3 rounded-2xl border border-emerald-500/30">
            <Shield className="w-5 h-5 text-emerald-300" />
            <div>
              <span className="font-bold block">حریم خصوصی محلی (E2EE)</span>
              <span className="text-emerald-200 text-[11px]">ارزیابی‌های شما محفوظ و رمزنگاری‌شده است.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout driven by Plugin Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          <PluginSlotRenderer name="patient.mood.widget" />
          <PluginSlotRenderer name="patient.overview.main" />
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <PluginSlotRenderer name="patient.ai.companion" />
        </div>
      </div>
    </div>
  );
};
