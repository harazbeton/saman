import React, { useState, useEffect } from 'react';
import { PluginManifest } from '../../../core/kernel/types';
import { globalSlotRegistry } from '../../../core/kernel/slot-registry';
import { appointmentRepository } from '../../../infrastructure/storage/repositories';
import { globalEventBus } from '../../../core/kernel/event-bus';
import { Appointment } from '../../../domain/entities/Patient';
import { Calendar, Clock, Video, UserCheck, ChevronLeft, CalendarCheck2, Activity } from 'lucide-react';

export const todayDashboardManifest: PluginManifest = {
  id: 'therapist.today.dashboard',
  name: 'داشبورد جلسات امروز درمانگر (Today Appointments Dashboard)',
  version: '1.0.0',
  description: 'نمایش لیست نوبت‌ها و جلسات برنامه‌ریزی‌شده امروز همراه با دسترسی مستقیم به تایم‌لاین مراجع',
  role: 'therapist',
  enabled: true,
  permissions: ['appointments.read'],
  capabilities: ['dashboard.today', 'timeline.navigation'],
  slots: [
    {
      target: 'therapist.dashboard.main',
      componentId: 'TodayDashboardComponent',
      title: 'جلسات و مراجعین امروز',
      priority: 30,
    },
  ],
  events: {
    subscribes: ['appointment.scheduled', 'note.signed'],
    publishes: ['patient.selected'],
  },
};

export const TodayDashboardComponent: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTodayAppointments = async () => {
    setLoading(true);
    const list = await appointmentRepository.getAllForTenant('clinic-main');
    // Sort so in_progress and scheduled are on top
    const sorted = [...list].sort((a, b) => {
      if (a.status === 'in_progress') return -1;
      if (b.status === 'in_progress') return 1;
      return 0;
    });
    setAppointments(sorted);
    setLoading(false);
  };

  useEffect(() => {
    loadTodayAppointments();

    const unsubApp = globalEventBus.subscribe('appointment.scheduled', () => {
      loadTodayAppointments();
    });

    return () => {
      unsubApp();
    };
  }, []);

  const handleNavigateToTimeline = (patientId: string, patientName: string) => {
    // Update hash for URL-based navigation
    window.location.hash = `/patients/${patientId}/timeline`;

    // Publish domain event for active views
    globalEventBus.publish({
      id: `evt-nav-${Date.now()}`,
      type: 'patient.selected',
      aggregateId: patientId,
      aggregateType: 'Patient',
      timestamp: new Date().toISOString(),
      version: 1,
      payload: { patientId, patientName, targetView: 'timeline' },
    });
  };

  const activeCount = appointments.filter((a) => a.status === 'in_progress').length;
  const scheduledCount = appointments.filter((a) => a.status === 'scheduled').length;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              برنامه جلسات امروز درمانگر
              <span className="text-xs font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                {appointments.length} جلسه ثبت‌شده
              </span>
            </h3>
            <span className="text-[11px] text-slate-400">
              مرور سریع مراجعین روز جاری، وضعیت جلسه و ورود مستقیم به پرونده بالینی
            </span>
          </div>
        </div>

        {/* Quick summary badges */}
        <div className="flex items-center gap-2 text-xs">
          {activeCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg font-medium border border-amber-200/60 animate-pulse">
              <Activity className="w-3.5 h-3.5" />
              {activeCount} جلسه در حال برگزاری
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            {scheduledCount} در انتظار شروع
          </span>
        </div>
      </div>

      {/* Appointment items list */}
      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">در حال دریافت جلسات...</div>
      ) : appointments.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          هیچ جلسه‌ای برای امروز برنامه‌ریزی نشده است.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {appointments.map((app) => (
            <div
              key={app.id}
              onClick={() => handleNavigateToTimeline(app.patientId, app.patientName)}
              className="p-4 bg-slate-50 hover:bg-indigo-50/40 rounded-xl border border-slate-200/80 hover:border-indigo-300 transition-all duration-150 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      {app.patientName.slice(0, 1)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs group-hover:text-indigo-700 transition-colors">
                        {app.patientName}
                      </h4>
                      <span className="text-[10px] text-slate-400">شناسه مراجع: {app.patientId}</span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      app.status === 'in_progress'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : app.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}
                  >
                    {app.status === 'in_progress'
                      ? 'در حال برگزاری'
                      : app.status === 'completed'
                      ? 'پایان یافته'
                      : 'برنامه‌ریزی شده'}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-600 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>زمان: {app.dateTime}</span>
                    <span className="text-slate-400">({app.durationMinutes} دقیقه)</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {app.type === 'online_video' ? (
                      <span className="text-indigo-600 flex items-center gap-1 font-medium">
                        <Video className="w-3.5 h-3.5" /> جلسه آنلاین تصویری
                      </span>
                    ) : (
                      <span className="text-emerald-700 flex items-center gap-1 font-medium">
                        <UserCheck className="w-3.5 h-3.5" /> مشاوره حضوری (اتاق درمان ۱)
                      </span>
                    )}
                  </div>

                  {app.notes && (
                    <p className="text-[11px] text-slate-500 bg-white/70 p-1.5 rounded-lg border border-slate-100 mt-1 line-clamp-1">
                      {app.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-indigo-600 font-medium group-hover:underline flex items-center gap-1">
                  مشاهده تایم‌لاین و پرونده مراجع
                  <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                </span>
                <span className="text-[10px] text-slate-400">کلیک برای انتقال</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export function registerTodayDashboardPlugin() {
  globalSlotRegistry.registerSlotComponent(
    'therapist.dashboard.main',
    todayDashboardManifest.slots[0],
    TodayDashboardComponent
  );
}
