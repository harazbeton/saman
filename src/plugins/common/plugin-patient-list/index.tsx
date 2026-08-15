import React, { useState, useEffect } from 'react';
import { PluginManifest } from '../../../core/kernel/types';
import { globalSlotRegistry } from '../../../core/kernel/slot-registry';
import { patientRepository } from '../../../infrastructure/storage/repositories';
import { globalEventBus } from '../../../core/kernel/event-bus';
import { Patient } from '../../../domain/entities/Patient';
import { Search, Users, History, ChevronLeft, ShieldCheck, Phone, CheckCircle2 } from 'lucide-react';

export const patientListManifest: PluginManifest = {
  id: 'common.patient.list',
  name: 'فهرست جامع مراجعین (Patient Directory & Quick Access)',
  version: '1.0.0',
  description: 'لیست مراجعین کلینیک با قابلیت جستجو، فیلتر و انتقال مستقیم به تایم‌لاین پرونده',
  role: 'therapist',
  enabled: true,
  permissions: ['patient.registry.read'],
  capabilities: ['patient.directory', 'timeline.navigation'],
  slots: [
    {
      target: 'reception.dashboard.main',
      componentId: 'PatientListReceptionComponent',
      title: 'فهرست مراجعین کلینیک',
      priority: 15,
    },
    {
      target: 'therapist.dashboard.sidebar',
      componentId: 'PatientListTherapistSidebarComponent',
      title: 'فهرست سریع مراجعین درمانگر',
      priority: 10,
    },
  ],
  events: {
    subscribes: ['patient.created', 'outbox.synced'],
    publishes: ['patient.selected'],
  },
};

export const PatientListComponent: React.FC<{ isSidebar?: boolean }> = ({ isSidebar = false }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadPatients = async () => {
    setLoading(true);
    const list = await patientRepository.getAll('clinic-main');
    setPatients(list);
    setLoading(false);
  };

  useEffect(() => {
    loadPatients();

    const unsubCreate = globalEventBus.subscribe('patient.created', () => {
      loadPatients();
    });
    const unsubSync = globalEventBus.subscribe('outbox.synced', () => {
      loadPatients();
    });

    return () => {
      unsubCreate();
      unsubSync();
    };
  }, []);

  const handleSelectPatient = (patient: Patient) => {
    window.location.hash = `/patients/${patient.id}/timeline`;
    globalEventBus.publish({
      id: `evt-pat-${Date.now()}`,
      type: 'patient.selected',
      aggregateId: patient.id,
      aggregateType: 'Patient',
      timestamp: new Date().toISOString(),
      version: 1,
      payload: { patientId: patient.id, patientName: patient.fullName, targetView: 'timeline' },
    });
  };

  const filtered = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.nationalCode.includes(search) ||
      p.phone.includes(search)
  );

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              {isSidebar ? 'دسترسی سریع به پرونده مراجعین' : 'فهرست کلیه مراجعین کلینیک'}
              <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {patients.length} پرونده فعال
              </span>
            </h3>
            <span className="text-[11px] text-slate-400">
              جستجو و انتقال به تایم‌لاین و تاریخچه بالینی
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی نام مراجع، کد ملی یا شماره همراه..."
          className="w-full text-xs pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
        />
      </div>

      {/* Patients Display */}
      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">در حال بارگذاری لیست مراجعین...</div>
      ) : filtered.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          مراجعی با مشخصات جستجو شده یافت نشد.
        </div>
      ) : isSidebar ? (
        // Compact sidebar list
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => handleSelectPatient(p)}
              className="p-3 bg-slate-50 hover:bg-indigo-50/60 rounded-xl border border-slate-200/70 hover:border-indigo-300 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  {p.fullName.slice(0, 1)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs group-hover:text-indigo-700 transition-colors">
                    {p.fullName}
                  </h4>
                  <span className="text-[10px] text-slate-400">کد ملی: {p.nationalCode}</span>
                </div>
              </div>
              <button
                type="button"
                className="text-[11px] text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-600 hover:text-white px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 font-medium shadow-2xs"
              >
                <History className="w-3 h-3" />
                تایم‌لاین
              </button>
            </div>
          ))}
        </div>
      ) : (
        // Full table view
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="p-2.5">نام مراجع</th>
                <th className="p-2.5">کد ملی</th>
                <th className="p-2.5">شماره همراه</th>
                <th className="p-2.5">درمانگر اختصاصی</th>
                <th className="p-2.5">برچسب‌ها / سابقه</th>
                <th className="p-2.5 text-center">اقدامات بالینی</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                  <td className="p-2.5 font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {p.fullName.slice(0, 1)}
                      </div>
                      <div>
                        <span>{p.fullName}</span>
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {p.gender === 'female' ? 'خانم' : 'آقا'} • متولد {p.birthDate || 'نامشخص'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-2.5 font-mono text-slate-600">{p.nationalCode}</td>
                  <td className="p-2.5 text-slate-600 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {p.phone}
                  </td>
                  <td className="p-2.5 text-indigo-700 font-medium">{p.assignedTherapistName || 'دکتر محمدی'}</td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {p.tags?.map((t, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      )) || <span className="text-[10px] text-slate-400">{p.medicalHistory?.slice(0, 20) || '—'}</span>}
                    </div>
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleSelectPatient(p)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 rounded-xl text-xs font-semibold transition-all shadow-2xs"
                    >
                      <History className="w-3.5 h-3.5" />
                      مشاهده تایم‌لاین
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export function registerPatientListPlugin() {
  globalSlotRegistry.registerSlotComponent(
    'reception.dashboard.main',
    patientListManifest.slots[0],
    () => <PatientListComponent isSidebar={false} />
  );

  globalSlotRegistry.registerSlotComponent(
    'therapist.dashboard.sidebar',
    patientListManifest.slots[1],
    () => <PatientListComponent isSidebar={true} />
  );
}
