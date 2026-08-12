import React, { useState, useEffect } from 'react';
import { PluginManifest } from '../../../core/kernel/types';
import { globalSlotRegistry } from '../../../core/kernel/slot-registry';

import { appointmentRepository, patientRepository } from '../../../infrastructure/storage/repositories';
import { Appointment, Patient } from '../../../domain/entities/Patient';
import { Calendar, Clock, Plus, Video, UserCheck, CheckCircle } from 'lucide-react';

export const schedulingManifest: PluginManifest = {
  id: 'reception.scheduling',
  name: 'تقویم و نوبت‌دهی (Scheduling & Calendar)',
  version: '1.0.0',
  description: 'مدیریت برنامه رزرو وقت جلسات حضوری و آنلاین کلینیک',
  role: 'receptionist',
  enabled: true,
  permissions: ['appointments.read', 'appointments.write'],
  capabilities: ['calendar.management', 'conflict.detection'],
  slots: [
    {
      target: 'reception.scheduling.widget',
      componentId: 'SchedulingWidgetComponent',
      title: 'برنامه زمان‌بندی جلسات',
      priority: 10,
    },
  ],
  events: {
    subscribes: [],
    publishes: ['appointment.scheduled'],
  },
};

export const SchedulingWidgetComponent: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatId, setSelectedPatId] = useState('pat-101');
  const [dateStr, setDateStr] = useState('1403/05/26 - 15:00');
  const [appType, setAppType] = useState<'in_person' | 'online_video'>('in_person');
  const [showForm, setShowForm] = useState(false);

  const loadData = async () => {
    const list = await appointmentRepository.getAllForTenant('clinic-main');
    setAppointments(list);
    const patList = await patientRepository.getAll('clinic-main');
    setPatients(patList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAppointment = async () => {
    const pat = patients.find((p) => p.id === selectedPatId);
    const newApp: Appointment = {
      id: `app-${Date.now()}`,
      patientId: selectedPatId,
      patientName: pat ? pat.fullName : 'سارا احمدی',
      therapistId: 'therapist-1',
      therapistName: 'دکتر علیرضا محمدی',
      dateTime: dateStr,
      durationMinutes: 50,
      status: 'scheduled',
      type: appType,
      tenantId: 'clinic-main',
      version: 1,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await appointmentRepository.save(newApp);
    setShowForm(false);
    loadData();
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">برنامه نوبت‌دهی جلسات امروز</h3>
            <span className="text-[11px] text-slate-400">تقویم رزرو وقت درمانگران</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          ثبت نوبت جدید
        </button>
      </div>

      {showForm && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">انتخاب مراجع:</label>
              <select
                value={selectedPatId}
                onChange={(e) => setSelectedPatId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.nationalCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">تاریخ و ساعت جلسه:</label>
              <input
                type="text"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-slate-700">
                <input
                  type="radio"
                  name="appType"
                  checked={appType === 'in_person'}
                  onChange={() => setAppType('in_person')}
                />
                حضوری
              </label>
              <label className="flex items-center gap-1 text-slate-700">
                <input
                  type="radio"
                  name="appType"
                  checked={appType === 'online_video'}
                  onChange={() => setAppType('online_video')}
                />
                آنلاین (ویدیوکال)
              </label>
            </div>

            <button
              type="button"
              onClick={handleCreateAppointment}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold"
            >
              تایید و رزرو نوبت
            </button>
          </div>
        </div>
      )}

      {/* Appointment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {appointments.map((app) => (
          <div
            key={app.id}
            className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between text-xs"
          >
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                {app.patientName}
              </div>
              <div className="text-slate-500 flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5" />
                زمان: {app.dateTime} ({app.durationMinutes} دقیقه)
              </div>
              <div className="text-slate-500 flex items-center gap-1">
                {app.type === 'online_video' ? (
                  <span className="text-indigo-600 flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" /> مشاوره آنلاین تصویری
                  </span>
                ) : (
                  <span className="text-emerald-700">مراجعه حضوری</span>
                )}
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                app.status === 'in_progress'
                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {app.status === 'in_progress' ? 'در حال برگزاری' : 'تایید شده'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function registerSchedulingPlugin() {
  globalSlotRegistry.registerSlotComponent(
    'reception.scheduling.widget',
    schedulingManifest.slots[0],
    SchedulingWidgetComponent
  );
}
