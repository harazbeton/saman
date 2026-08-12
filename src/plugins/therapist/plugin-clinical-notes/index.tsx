import React, { useState, useEffect } from 'react';
import { PluginManifest } from '../../../core/kernel/types';
import { globalSlotRegistry } from '../../../core/kernel/slot-registry';

import { clinicalNoteRepository, patientRepository } from '../../../infrastructure/storage/repositories';
import { auditLogger } from '../../../infrastructure/audit/audit-logger';
import { globalEventBus } from '../../../core/kernel/event-bus';
import { ClinicalNote, Patient } from '../../../domain/entities/Patient';
import { FileText, CheckCircle2, ShieldAlert, Lock, Save } from 'lucide-react';

export const clinicalNotesManifest: PluginManifest = {
  id: 'therapist.clinical.notes',
  name: 'پرونده‌نویسی بالینی (SOAP Clinical Notes)',
  version: '1.0.0',
  description: 'ماژول استانداردهای ارزیابی روانپزشکی و یادداشت‌های بالینی با ثبت لاگ لاینظر (Audit)',
  role: 'therapist',
  enabled: true,
  permissions: ['clinical.notes.read', 'clinical.notes.write', 'clinical.notes.sign'],
  capabilities: ['soap.formatter', 'hipaa.audit'],
  slots: [
    {
      target: 'therapist.clinical.notes',
      componentId: 'ClinicalNotesComponent',
      title: 'یادداشت بالینی جلسه (SOAP)',
      priority: 15,
    },
  ],
  events: {
    subscribes: [],
    publishes: ['note.signed', 'note.saved'],
  },
};

export const ClinicalNotesComponent: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('pat-101');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [sessionNum, setSessionNum] = useState(4);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function init() {
      const list = await patientRepository.getAll('clinic-main');
      setPatients(list);

      // Audit Log for accessing clinical record
      auditLogger.logAccess({
        userId: 'therapist-1',
        userName: 'دکتر علیرضا محمدی',
        userRole: 'therapist',
        tenantId: 'clinic-main',
        action: 'VIEW_CLINICAL_NOTES_EDITOR',
        resourceType: 'Patient',
        resourceId: selectedPatientId,
      });

      // Load existing notes for selected patient
      const existing = await clinicalNoteRepository.getByPatient(selectedPatientId);
      if (existing.length > 0) {
        const last = existing[existing.length - 1];
        setSubjective(last.subjective || '');
        setObjective(last.objective || '');
        setAssessment(last.assessment || '');
        setPlan(last.plan || '');
        setIsSigned(last.isSigned || false);
      }
    }
    init();
  }, [selectedPatientId]);

  const handleSaveNote = async (signNow = false) => {
    const pat = patients.find((p) => p.id === selectedPatientId);
    const note: ClinicalNote = {
      id: `note-${Date.now()}`,
      patientId: selectedPatientId,
      patientName: pat ? pat.fullName : 'سارا احمدی',
      therapistId: 'therapist-1',
      therapistName: 'دکتر علیرضا محمدی',
      sessionNumber: sessionNum,
      subjective,
      objective,
      assessment,
      plan,
      isSigned: signNow || isSigned,
      signedAt: signNow ? new Date().toISOString() : undefined,
      tenantId: 'clinic-main',
      version: 1,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await clinicalNoteRepository.save(note);

    // Audit Logging
    await auditLogger.logAccess({
      userId: 'therapist-1',
      userName: 'دکتر علیرضا محمدی',
      userRole: 'therapist',
      tenantId: 'clinic-main',
      action: signNow ? 'SIGN_CLINICAL_NOTE' : 'SAVE_CLINICAL_NOTE',
      resourceType: 'ClinicalNote',
      resourceId: note.id,
      details: { patientId: selectedPatientId, sessionNumber: sessionNum, isSigned: signNow },
    });

    await globalEventBus.publish({
      id: `evt-${Date.now()}`,
      type: signNow ? 'note.signed' : 'note.saved',
      aggregateId: note.id,
      aggregateType: 'ClinicalNote',
      timestamp: new Date().toISOString(),
      version: 1,
      payload: note,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">پرونده‌نویسی بالینی استاندارد SOAP</h3>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              تضمین امنیت داده با Audit Logging و Outbox Sync
            </span>
          </div>
        </div>

        {/* Patient selector */}
        <select
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              مراجع: {p.fullName} ({p.nationalCode})
            </option>
          ))}
        </select>
      </div>

      {/* SOAP Form Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <label className="block font-bold text-slate-700 mb-1">
            S - Subjective (نقل‌قول‌ها و گزارش مراجع):
          </label>
          <textarea
            rows={3}
            value={subjective}
            onChange={(e) => setSubjective(e.target.value)}
            placeholder="شکایات اصلی، صحبت‌های مستقیم مراجع..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <label className="block font-bold text-slate-700 mb-1">
            O - Objective (مشاهدات بالینی و رفتار):
          </label>
          <textarea
            rows={3}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="علامت‌های بالینی، افکت، تماس چشمی، تست‌های سنجش..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <label className="block font-bold text-slate-700 mb-1">
            A - Assessment (ارزیابی و تشخيص بالینی):
          </label>
          <textarea
            rows={3}
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            placeholder="تحلیل روند بهبودی، تشخيص‌ها یا فرضیات تشخیصی..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <label className="block font-bold text-slate-700 mb-1">
            P - Plan (برنامه درمانی و تکالیف):
          </label>
          <textarea
            rows={3}
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="تکالیف منزل، تاریخ جلسه بعدی، ارجاعات..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">شماره جلسه:</span>
          <input
            type="number"
            value={sessionNum}
            onChange={(e) => setSessionNum(Number(e.target.value))}
            className="w-16 text-xs p-1 border border-slate-200 rounded-lg text-center font-bold"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSaveNote(false)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
          >
            <Save className="w-4 h-4" />
            ذخیره پیش‌نویس
          </button>

          <button
            type="button"
            onClick={() => handleSaveNote(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95"
          >
            {savedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {savedSuccess ? 'ثبت و نهایی شد' : 'امضا و امانت بالینی'}
          </button>
        </div>
      </div>
    </div>
  );
};

export function registerClinicalNotesPlugin() {
  globalSlotRegistry.registerSlotComponent(
    'therapist.clinical.notes',
    clinicalNotesManifest.slots[0],
    ClinicalNotesComponent
  );
}
