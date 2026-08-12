import { OutboxItem } from '../../core/kernel/types';
import { Patient, Appointment, ClinicalNote, MoodLog } from '../../domain/entities/Patient';

class LocalStore {
  private static instance: LocalStore;

  private patientsKey = 'saman_patients_v1';
  private appointmentsKey = 'saman_appointments_v1';
  private clinicalNotesKey = 'saman_clinical_notes_v1';
  private moodLogsKey = 'saman_mood_logs_v1';
  private outboxKey = 'saman_outbox_v1';
  private auditLogsKey = 'saman_audit_logs_v1';

  private constructor() {
    this.seedInitialDataIfEmpty();
  }

  public static getInstance(): LocalStore {
    if (!LocalStore.instance) {
      LocalStore.instance = new LocalStore();
    }
    return LocalStore.instance;
  }

  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving to localStorage [${key}]:`, e);
    }
  }

  // Patients
  public getPatients(): Patient[] {
    return this.getItem<Patient[]>(this.patientsKey, []);
  }

  public savePatient(patient: Patient): void {
    const list = this.getPatients();
    const index = list.findIndex((p) => p.id === patient.id);
    if (index >= 0) {
      list[index] = patient;
    } else {
      list.push(patient);
    }
    this.setItem(this.patientsKey, list);
  }

  // Appointments
  public getAppointments(): Appointment[] {
    return this.getItem<Appointment[]>(this.appointmentsKey, []);
  }

  public saveAppointment(appointment: Appointment): void {
    const list = this.getAppointments();
    const index = list.findIndex((a) => a.id === appointment.id);
    if (index >= 0) {
      list[index] = appointment;
    } else {
      list.push(appointment);
    }
    this.setItem(this.appointmentsKey, list);
  }

  // Clinical Notes
  public getClinicalNotes(): ClinicalNote[] {
    return this.getItem<ClinicalNote[]>(this.clinicalNotesKey, []);
  }

  public saveClinicalNote(note: ClinicalNote): void {
    const list = this.getClinicalNotes();
    const index = list.findIndex((n) => n.id === note.id);
    if (index >= 0) {
      list[index] = note;
    } else {
      list.push(note);
    }
    this.setItem(this.clinicalNotesKey, list);
  }

  // Mood Logs
  public getMoodLogs(): MoodLog[] {
    return this.getItem<MoodLog[]>(this.moodLogsKey, []);
  }

  public saveMoodLog(mood: MoodLog): void {
    const list = this.getMoodLogs();
    const index = list.findIndex((m) => m.id === mood.id);
    if (index >= 0) {
      list[index] = mood;
    } else {
      list.push(mood);
    }
    this.setItem(this.moodLogsKey, list);
  }

  // Outbox Queue
  public getOutboxItems(): OutboxItem[] {
    return this.getItem<OutboxItem[]>(this.outboxKey, []);
  }

  public setOutboxItems(items: OutboxItem[]): void {
    this.setItem(this.outboxKey, items);
  }

  // Audit Logs
  public getAuditLogs(): any[] {
    return this.getItem<any[]>(this.auditLogsKey, []);
  }

  public saveAuditLog(log: any): void {
    const logs = this.getAuditLogs();
    logs.unshift(log);
    if (logs.length > 500) logs.pop();
    this.setItem(this.auditLogsKey, logs);
  }

  private seedInitialDataIfEmpty() {
    if (!localStorage.getItem(this.patientsKey)) {
      const initialPatients: Patient[] = [
        {
          id: 'pat-101',
          nationalCode: '0012345678',
          fullName: 'سارا احمدی',
          phone: '09121112233',
          gender: 'female',
          birthDate: '1372/05/14',
          emergencyContact: '09123334455 (همسر)',
          assignedTherapistId: 'therapist-1',
          assignedTherapistName: 'دکتر علیرضا محمدی',
          tenantId: 'clinic-main',
          medicalHistory: 'سابقه اضطراب فراگیر (GAD)، اختلال خواب خفیف',
          tags: ['CBT', 'اضطراب', 'ارجاعی'],
          version: 1,
          syncStatus: 'synced',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'pat-102',
          nationalCode: '0023456789',
          fullName: 'رضا قاسمی',
          phone: '09128889900',
          gender: 'male',
          birthDate: '1368/11/20',
          emergencyContact: '09124445566 (مادر)',
          assignedTherapistId: 'therapist-1',
          assignedTherapistName: 'دکتر علیرضا محمدی',
          tenantId: 'clinic-main',
          medicalHistory: 'کاهش انگیزه شغلی، علائم افسردگی خفیف',
          tags: ['افسردگی', 'زوج درمانی'],
          version: 1,
          syncStatus: 'synced',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      this.setItem(this.patientsKey, initialPatients);
    }

    if (!localStorage.getItem(this.appointmentsKey)) {
      const initialAppointments: Appointment[] = [
        {
          id: 'app-501',
          patientId: 'pat-101',
          patientName: 'سارا احمدی',
          therapistId: 'therapist-1',
          therapistName: 'دکتر علیرضا محمدی',
          dateTime: '1403/05/25 - 10:00',
          durationMinutes: 50,
          status: 'scheduled',
          type: 'in_person',
          notes: 'جلسه چهارم CBT - بررسی بازخورد ثبت خلق',
          tenantId: 'clinic-main',
          version: 1,
          syncStatus: 'synced',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'app-502',
          patientId: 'pat-102',
          patientName: 'رضا قاسمی',
          therapistId: 'therapist-1',
          therapistName: 'دکتر علیرضا محمدی',
          dateTime: '1403/05/25 - 11:30',
          durationMinutes: 50,
          status: 'in_progress',
          type: 'online_video',
          notes: 'بررسی پرونده شغلی و تکنیک‌های بازسازی شناختی',
          tenantId: 'clinic-main',
          version: 1,
          syncStatus: 'synced',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      this.setItem(this.appointmentsKey, initialAppointments);
    }

    if (!localStorage.getItem(this.clinicalNotesKey)) {
      const initialNotes: ClinicalNote[] = [
        {
          id: 'note-1',
          patientId: 'pat-101',
          patientName: 'سارا احمدی',
          therapistId: 'therapist-1',
          therapistName: 'دکتر علیرضا محمدی',
          appointmentId: 'app-501',
          sessionNumber: 3,
          subjective: 'مراجع بیان می‌کند طی هفته گذشته نوسانات خلقی کمتری داشته اما هنگام مواجهه با ضرب‌العجل کاری دچار تپش قلب می‌شود.',
          objective: 'ظاهر آراسته، تماس چشمی مناسب، علائم انقباض عضلانی در شانه هنگام صحبت از کار.',
          assessment: 'پاسخ‌های اضطرابی به استرس شغلی. تکنیک‌های مواجهه تدریجی و تنفس شکمی اثرگذار بوده است.',
          plan: 'تمرین تنفس ۴-۷-۸ روزانه دوبار. تکمیل فرم ثبت فکرهای ناکارآمد قبل از جلسه بعدی.',
          isSigned: true,
          signedAt: new Date().toISOString(),
          tenantId: 'clinic-main',
          version: 1,
          syncStatus: 'synced',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      this.setItem(this.clinicalNotesKey, initialNotes);
    }

    if (!localStorage.getItem(this.moodLogsKey)) {
      const initialMoods: MoodLog[] = [
        {
          id: 'mood-1',
          patientId: 'pat-101',
          score: 4,
          emotions: ['امیدوار', 'آرام', 'تمرکز خوب'],
          triggers: 'کاهش ساعات کار در فضا‌های شلوغ',
          note: 'امروز تمرین تنفس شکمی را قبل از جلسه کاری انجام دادم.',
          tenantId: 'clinic-main',
          version: 1,
          syncStatus: 'synced',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'mood-2',
          patientId: 'pat-101',
          score: 2,
          emotions: ['مضطرب', 'خسته'],
          triggers: 'فشار کاری بالا و کم‌خوابی',
          note: 'ساعت ۴ صبح بیدار شدم و دیگر نتوانستم بخوابم.',
          tenantId: 'clinic-main',
          version: 1,
          syncStatus: 'synced',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      this.setItem(this.moodLogsKey, initialMoods);
    }
  }
}

export const localStore = LocalStore.getInstance();
