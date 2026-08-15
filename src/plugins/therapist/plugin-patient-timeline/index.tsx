import React, { useState, useEffect, useMemo } from 'react';
import { PluginManifest } from '../../../core/kernel/types';
import { globalSlotRegistry } from '../../../core/kernel/slot-registry';
import {
  patientRepository,
  clinicalNoteRepository,
  moodRepository,
  appointmentRepository,
} from '../../../infrastructure/storage/repositories';
import { auditLogger } from '../../../infrastructure/audit/audit-logger';
import { globalEventBus } from '../../../core/kernel/event-bus';
import { Patient, ClinicalNote, MoodLog, Appointment } from '../../../domain/entities/Patient';
import {
  Calendar,
  Clock,
  FileText,
  Smile,
  Frown,
  Meh,
  Video,
  UserCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Filter,
  Activity,
  CalendarDays,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const patientTimelineManifest: PluginManifest = {
  id: 'therapist.patient.timeline',
  name: 'تایم‌لاین پرونده بالینی مراجع (Patient Clinical Timeline)',
  version: '1.0.0',
  description: 'نمای یکپارچه و به ترتیب زمانی معکوس از کلیه یادداشت‌های SOAP، ثبت خلق و نوبت‌های جلسات مراجع',
  role: 'therapist',
  enabled: true,
  permissions: ['clinical.notes.read', 'mood.read', 'appointments.read'],
  capabilities: ['timeline.view', 'event.aggregation', 'hipaa.audit'],
  slots: [
    {
      target: 'therapist.session.main',
      componentId: 'PatientTimelineComponent',
      title: 'تایم‌لاین یکپارچه سوابق مراجع',
      priority: 25,
    },
  ],
  events: {
    subscribes: ['patient.selected', 'note.saved', 'note.signed', 'mood.logged', 'appointment.scheduled'],
    publishes: ['timeline.viewed'],
  },
};

type TimelineEventType = 'note' | 'mood' | 'appointment';

interface TimelineItem {
  id: string;
  type: TimelineEventType;
  date: string; // ISO string for sorting
  displayDate: string;
  title: string;
  raw: ClinicalNote | MoodLog | Appointment;
}

export const PatientTimelineComponent: React.FC<{ initialPatientId?: string; onBack?: () => void }> = ({
  initialPatientId,
  onBack,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || 'pat-101');
  const [activeFilter, setActiveFilter] = useState<'all' | 'note' | 'mood' | 'appointment'>('all');

  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [moods, setMoods] = useState<MoodLog[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Parse hash route if present: #/patients/:id/timeline
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/\/patients\/([^\/]+)\/timeline/);
      if (match && match[1]) {
        setSelectedPatientId(match[1]);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Listen to patient.selected domain events
  useEffect(() => {
    const unsub = globalEventBus.subscribe('patient.selected', (evt) => {
      if (evt.payload?.patientId) {
        setSelectedPatientId(evt.payload.patientId);
      }
    });
    return () => unsub();
  }, []);

  // Load patients list for switcher
  useEffect(() => {
    async function loadPatientsList() {
      const list = await patientRepository.getAll('clinic-main');
      setPatients(list);
      if (list.length > 0 && !selectedPatientId) {
        setSelectedPatientId(list[0].id);
      }
    }
    loadPatientsList();
  }, []);

  // Load merged timeline data whenever selected patient changes
  const loadTimelineData = async (patientId: string) => {
    if (!patientId) return;
    setLoading(true);

    try {
      const [fetchedNotes, fetchedMoods, fetchedApps] = await Promise.all([
        clinicalNoteRepository.getByPatient(patientId),
        moodRepository.getByPatient(patientId),
        appointmentRepository.getByPatient(patientId),
      ]);

      setNotes(fetchedNotes);
      setMoods(fetchedMoods);
      setAppointments(fetchedApps);

      // Audit Log Access for Compliance
      await auditLogger.logAccess({
        userId: 'therapist-1',
        userName: 'دکتر علیرضا محمدی',
        userRole: 'therapist',
        tenantId: 'clinic-main',
        action: 'VIEW_PATIENT_TIMELINE',
        resourceType: 'Patient',
        resourceId: patientId,
        details: {
          noteCount: fetchedNotes.length,
          moodCount: fetchedMoods.length,
          appointmentCount: fetchedApps.length,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatientId) {
      loadTimelineData(selectedPatientId);
    }
  }, [selectedPatientId]);

  // Subscribe to live events to refresh timeline
  useEffect(() => {
    const refresh = () => {
      if (selectedPatientId) loadTimelineData(selectedPatientId);
    };

    const unsubNoteSaved = globalEventBus.subscribe('note.saved', refresh);
    const unsubNoteSigned = globalEventBus.subscribe('note.signed', refresh);
    const unsubMood = globalEventBus.subscribe('mood.logged', refresh);
    const unsubApp = globalEventBus.subscribe('appointment.scheduled', refresh);

    return () => {
      unsubNoteSaved();
      unsubNoteSigned();
      unsubMood();
      unsubApp();
    };
  }, [selectedPatientId]);

  const currentPatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId);
  }, [patients, selectedPatientId]);

  // Merge and sort items reverse-chronologically (newest first)
  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add notes
    notes.forEach((n) => {
      items.push({
        id: `note-${n.id}`,
        type: 'note',
        date: n.createdAt || new Date().toISOString(),
        displayDate: n.signedAt
          ? new Date(n.signedAt).toLocaleDateString('fa-IR')
          : new Date(n.createdAt || Date.now()).toLocaleDateString('fa-IR'),
        title: `یادداشت بالینی جلسه ${n.sessionNumber} (SOAP)`,
        raw: n,
      });
    });

    // Add mood logs
    moods.forEach((m) => {
      items.push({
        id: `mood-${m.id}`,
        type: 'mood',
        date: m.createdAt || new Date().toISOString(),
        displayDate: new Date(m.createdAt || Date.now()).toLocaleDateString('fa-IR'),
        title: `ثبت وضعیت خلقی روزانه (نمره ${m.score} از ۵)`,
        raw: m,
      });
    });

    // Add appointments
    appointments.forEach((a) => {
      items.push({
        id: `app-${a.id}`,
        type: 'appointment',
        date: a.createdAt || new Date().toISOString(),
        displayDate: a.dateTime,
        title: `جلسه نوبت درمانی (${a.type === 'online_video' ? 'آنلاین' : 'حضوری'})`,
        raw: a,
      });
    });

    // Sort descending (latest date first)
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return items;
  }, [notes, moods, appointments]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return timelineItems;
    return timelineItems.filter((item) => item.type === activeFilter);
  }, [timelineItems, activeFilter]);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-6">
      {/* Top Header & Patient Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
              title="بازگشت"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              تایم‌لاین یکپارچه تاریخچه بالینی
              <span className="text-xs font-normal bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
                {currentPatient ? currentPatient.fullName : 'انتخاب مراجع'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              ترکیب ترتیب زمانی نوت‌های بالینی SOAP، داده‌های ثبت خلق و جلسات درمانی
            </p>
          </div>
        </div>

        {/* Patient Switcher & Summary Info */}
        <div className="flex items-center gap-3">
          <div className="text-left text-xs hidden sm:block">
            <span className="text-slate-400 block text-[10px]">کد ملی مراجع:</span>
            <span className="font-mono font-bold text-slate-700">
              {currentPatient?.nationalCode || '—'}
            </span>
          </div>

          <select
            value={selectedPatientId}
            onChange={(e) => {
              setSelectedPatientId(e.target.value);
              window.location.hash = `/patients/${e.target.value}/timeline`;
            }}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                مراجع: {p.fullName} ({p.nationalCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200/60 text-xs">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
          <span className="text-slate-500 text-[11px] font-medium ml-1">فیلتر نمایش:</span>

          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            همه رویدادها ({timelineItems.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('note')}
            className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
              activeFilter === 'note'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            نوت‌های بالینی SOAP ({notes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('mood')}
            className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
              activeFilter === 'mood'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            ثبت وضعیت خلق ({moods.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('appointment')}
            className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
              activeFilter === 'appointment'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            جلسات و نوبت‌ها ({appointments.length})
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>لاگ ممیزی فعال</span>
        </div>
      </div>

      {/* Timeline Stream */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">در حال بارگذاری تایم‌لاین بالینی...</div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          هیچ رویدادی برای مراجع انتخاب شده با فیلتر فعلی ثبت نشده است.
        </div>
      ) : (
        <div className="relative pl-2 pr-4 border-r-2 border-indigo-100 space-y-6 mr-3">
          {filteredItems.map((item) => {
            if (item.type === 'note') {
              const note = item.raw as ClinicalNote;
              return (
                <div key={item.id} className="relative group">
                  {/* Timeline bullet */}
                  <div className="absolute -right-[23px] top-1.5 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-xs" />

                  <div className="bg-slate-50 hover:bg-indigo-50/30 rounded-2xl p-4 border border-slate-200/80 hover:border-indigo-200 transition-all space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                          <FileText className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs">
                            جلسه بالینی {note.sessionNumber} — یادداشت ارزیابی SOAP
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            ثبت توسط {note.therapistName || 'دکتر علیرضا محمدی'} • {item.displayDate}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {note.isSigned ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                            <Lock className="w-3 h-3" />
                            امضا و قفل شده
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                            پیش‌نویس
                          </span>
                        )}
                      </div>
                    </div>

                    {/* SOAP Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {note.subjective && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                          <span className="font-bold text-indigo-900 block mb-1 text-[11px]">
                            S (Subjective - شکایات و گفته‌های مراجع):
                          </span>
                          <p className="text-slate-600 leading-relaxed">{note.subjective}</p>
                        </div>
                      )}

                      {note.objective && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                          <span className="font-bold text-indigo-900 block mb-1 text-[11px]">
                            O (Objective - مشاهدات بالینی درمانگر):
                          </span>
                          <p className="text-slate-600 leading-relaxed">{note.objective}</p>
                        </div>
                      )}

                      {note.assessment && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                          <span className="font-bold text-indigo-900 block mb-1 text-[11px]">
                            A (Assessment - ارزیابی و فرضیه تشخیصی):
                          </span>
                          <p className="text-slate-600 leading-relaxed">{note.assessment}</p>
                        </div>
                      )}

                      {note.plan && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                          <span className="font-bold text-indigo-900 block mb-1 text-[11px]">
                            P (Plan - طرح درمانی و تکالیف منزل):
                          </span>
                          <p className="text-slate-600 leading-relaxed">{note.plan}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            if (item.type === 'mood') {
              const mood = item.raw as MoodLog;
              const isHigh = mood.score >= 4;
              const isLow = mood.score <= 2;

              return (
                <div key={item.id} className="relative group">
                  {/* Timeline bullet */}
                  <div
                    className={`absolute -right-[23px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                      isHigh ? 'bg-emerald-500' : isLow ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                  />

                  <div className="bg-slate-50 hover:bg-slate-100/70 rounded-2xl p-4 border border-slate-200/80 transition-all space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`p-1.5 rounded-lg ${
                            isHigh
                              ? 'bg-emerald-100 text-emerald-700'
                              : isLow
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {isHigh ? <Smile className="w-4 h-4" /> : isLow ? <Frown className="w-4 h-4" /> : <Meh className="w-4 h-4" />}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                            ثبت خلق و احساس روزانه مراجع
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isHigh
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isLow
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              نمره خلق: {mood.score} از ۵
                            </span>
                          </h4>
                          <span className="text-[10px] text-slate-400">تاریخ ثبت: {item.displayDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Emotions & Triggers */}
                    <div className="text-xs space-y-1.5 bg-white p-3 rounded-xl border border-slate-200/60">
                      {mood.emotions && mood.emotions.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-400 text-[11px]">احساسات غالب:</span>
                          {mood.emotions.map((e, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium"
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      )}

                      {mood.triggers && (
                        <p className="text-slate-600 text-[11px]">
                          <strong className="text-slate-700">محرک یا رویداد محرک:</strong> {mood.triggers}
                        </p>
                      )}

                      {mood.note && (
                        <p className="text-slate-600 text-[11px] italic">
                          <strong className="text-slate-700 not-italic">یادداشت شخصی مراجع:</strong> "{mood.note}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            if (item.type === 'appointment') {
              const app = item.raw as Appointment;
              return (
                <div key={item.id} className="relative group">
                  {/* Timeline bullet */}
                  <div className="absolute -right-[23px] top-1.5 w-4 h-4 rounded-full bg-cyan-600 border-2 border-white shadow-xs" />

                  <div className="bg-slate-50 hover:bg-cyan-50/20 rounded-2xl p-4 border border-slate-200/80 transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-cyan-100 text-cyan-700 rounded-lg">
                          <CalendarDays className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs">
                            جلسه درمانی — {app.type === 'online_video' ? 'مشاوره آنلاین تصویری' : 'مراجعه حضوری کلینیک'}
                          </h4>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            زمان: {app.dateTime} ({app.durationMinutes} دقیقه)
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          app.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : app.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {app.status === 'in_progress'
                          ? 'در حال برگزاری'
                          : app.status === 'completed'
                          ? 'پایان یافته'
                          : 'برنامه‌ریزی شده'}
                      </span>
                    </div>

                    {app.notes && (
                      <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/60">
                        {app.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
};

export function registerPatientTimelinePlugin() {
  globalSlotRegistry.registerSlotComponent(
    'therapist.session.main',
    patientTimelineManifest.slots[0],
    PatientTimelineComponent
  );
}
