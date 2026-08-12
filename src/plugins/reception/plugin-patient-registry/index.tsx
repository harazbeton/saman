import React, { useState, useEffect } from 'react';
import { PluginManifest } from '../../../core/kernel/types';
import { globalSlotRegistry } from '../../../core/kernel/slot-registry';

import { patientRepository } from '../../../infrastructure/storage/repositories';
import { auditLogger } from '../../../infrastructure/audit/audit-logger';
import { Patient } from '../../../domain/entities/Patient';
import { UserPlus, Users, Search, CheckCircle2, UserCheck } from 'lucide-react';

export const patientRegistryManifest: PluginManifest = {
  id: 'reception.patient.registry',
  name: 'پذیرش و تشکیل پرونده (Patient Registry)',
  version: '1.0.0',
  description: 'مدیریت لیست مراجعین، ثبت پرونده اولیه و تخصیص درمانگر',
  role: 'receptionist',
  enabled: true,
  permissions: ['patient.registry.read', 'patient.registry.write'],
  capabilities: ['patient.onboarding', 'tenant.isolation'],
  slots: [
    {
      target: 'reception.registry.main',
      componentId: 'PatientRegistryComponent',
      title: 'مدیریت و پذیرش مراجعین',
      priority: 20,
    },
  ],
  events: {
    subscribes: [],
    publishes: ['patient.created'],
  },
};

export const PatientRegistryComponent: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [nationalCode, setNationalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [emergency, setEmergency] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');

  const loadPatients = async () => {
    const list = await patientRepository.getAll('clinic-main');
    setPatients(list);
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !nationalCode) return;

    const newPat: Patient = {
      id: `pat-${Date.now()}`,
      fullName,
      nationalCode,
      phone: phone || '09120000000',
      gender: 'female',
      birthDate: '1375/01/01',
      emergencyContact: emergency || 'نامشخص',
      assignedTherapistId: 'therapist-1',
      assignedTherapistName: 'دکتر علیرضا محمدی',
      tenantId: 'clinic-main',
      medicalHistory,
      version: 1,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await patientRepository.save(newPat);

    await auditLogger.logAccess({
      userId: 'reception-1',
      userName: 'خانم شریفی (پذیرش)',
      userRole: 'receptionist',
      tenantId: 'clinic-main',
      action: 'CREATE_PATIENT',
      resourceType: 'Patient',
      resourceId: newPat.id,
      details: { fullName, nationalCode },
    });

    setShowForm(false);
    setFullName('');
    setNationalCode('');
    setPhone('');
    setEmergency('');
    setMedicalHistory('');
    loadPatients();
  };

  const filtered = patients.filter(
    (p) => p.fullName.includes(search) || p.nationalCode.includes(search)
  );

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">دفتر پذیرش و پرونده‌های مراجعین</h3>
            <span className="text-[11px] text-slate-400">سامانه یکپارچه کلینیک تخصصی</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          تشکیل پرونده جدید
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreatePatient}
          className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3 text-xs"
        >
          <h4 className="font-bold text-indigo-900 mb-2">اطلاعات پرونده جدید:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">نام و نام خانوادگی:</label>
              <input
                required
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: مریم کریمی"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">کد ملی:</label>
              <input
                required
                type="text"
                value={nationalCode}
                onChange={(e) => setNationalCode(e.target.value)}
                placeholder="0012345678"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">شماره همراه:</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09123456789"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">تماس اضطراری:</label>
              <input
                type="text"
                value={emergency}
                onChange={(e) => setEmergency(e.target.value)}
                placeholder="09121112233 (همسر)"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">خلاصه سابقه یا علت مراجعه:</label>
              <input
                type="text"
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                placeholder="مثلا: اضطراب، مشاوره ازدواج..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold"
            >
              ثبت و ذخیره پرونده
            </button>
          </div>
        </form>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در نام یا کد ملی..."
          className="w-full text-xs pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Patients Table */}
      <div className="overflow-x-auto text-xs">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <th className="p-2.5">نام مراجع</th>
              <th className="p-2.5">کد ملی</th>
              <th className="p-2.5">شماره همراه</th>
              <th className="p-2.5">درمانگر اختصاصی</th>
              <th className="p-2.5">وضعیت همگام‌سازی</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="p-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  {p.fullName}
                </td>
                <td className="p-2.5 font-mono text-slate-600">{p.nationalCode}</td>
                <td className="p-2.5 text-slate-600">{p.phone}</td>
                <td className="p-2.5 text-indigo-700 font-medium">{p.assignedTherapistName}</td>
                <td className="p-2.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                      p.syncStatus === 'synced'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {p.syncStatus === 'synced' ? 'همگام ابری' : 'آماده صف Outbox'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export function registerPatientRegistryPlugin() {
  globalSlotRegistry.registerSlotComponent(
    'reception.registry.main',
    patientRegistryManifest.slots[0],
    PatientRegistryComponent
  );
}
