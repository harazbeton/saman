import { Patient, Appointment, ClinicalNote, MoodLog } from '../../domain/entities/Patient';
import {
  IPatientRepository,
  IAppointmentRepository,
  IClinicalNoteRepository,
  IMoodRepository,
} from '../../contracts/repository';
import { localStore } from './local-store-adapter';
import { outboxSyncEngine } from '../sync/outbox-sync-engine';

export class LocalPatientRepository implements IPatientRepository {
  async getById(id: string): Promise<Patient | null> {
    const list = localStore.getPatients();
    return list.find((p) => p.id === id) || null;
  }

  async getAll(tenantId: string): Promise<Patient[]> {
    const list = localStore.getPatients();
    return list.filter((p) => p.tenantId === tenantId && !p.deletedAt);
  }

  async save(patient: Patient): Promise<Patient> {
    const isNew = !patient.id || patient.id.startsWith('temp-');
    const finalPatient: Patient = {
      ...patient,
      id: patient.id || `pat-${Date.now()}`,
      version: (patient.version || 0) + 1,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
      createdAt: patient.createdAt || new Date().toISOString(),
    };

    localStore.savePatient(finalPatient);
    await outboxSyncEngine.enqueue(
      'Patient',
      finalPatient.id,
      isNew ? 'CREATE' : 'UPDATE',
      finalPatient,
      finalPatient.version
    );

    return finalPatient;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;

    const deleted: Patient = {
      ...existing,
      deletedAt: new Date().toISOString(),
      version: existing.version + 1,
      syncStatus: 'pending',
    };

    localStore.savePatient(deleted);
    await outboxSyncEngine.enqueue('Patient', id, 'DELETE', { id }, deleted.version);
  }
}

export class LocalAppointmentRepository implements IAppointmentRepository {
  async getById(id: string): Promise<Appointment | null> {
    const list = localStore.getAppointments();
    return list.find((a) => a.id === id) || null;
  }

  async getAllForTenant(tenantId: string): Promise<Appointment[]> {
    const list = localStore.getAppointments();
    return list.filter((a) => a.tenantId === tenantId && !a.deletedAt);
  }

  async getByPatient(patientId: string): Promise<Appointment[]> {
    const list = localStore.getAppointments();
    return list.filter((a) => a.patientId === patientId && !a.deletedAt);
  }

  async save(appointment: Appointment): Promise<Appointment> {
    const isNew = !appointment.id || appointment.id.startsWith('temp-');
    const finalApp: Appointment = {
      ...appointment,
      id: appointment.id || `app-${Date.now()}`,
      version: (appointment.version || 0) + 1,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
      createdAt: appointment.createdAt || new Date().toISOString(),
    };

    localStore.saveAppointment(finalApp);
    await outboxSyncEngine.enqueue(
      'Appointment',
      finalApp.id,
      isNew ? 'CREATE' : 'UPDATE',
      finalApp,
      finalApp.version
    );

    return finalApp;
  }
}

export class LocalClinicalNoteRepository implements IClinicalNoteRepository {
  async getById(id: string): Promise<ClinicalNote | null> {
    const list = localStore.getClinicalNotes();
    return list.find((n) => n.id === id) || null;
  }

  async getByPatient(patientId: string): Promise<ClinicalNote[]> {
    const list = localStore.getClinicalNotes();
    return list.filter((n) => n.patientId === patientId && !n.deletedAt);
  }

  async save(note: ClinicalNote): Promise<ClinicalNote> {
    const isNew = !note.id || note.id.startsWith('temp-');
    const finalNote: ClinicalNote = {
      ...note,
      id: note.id || `note-${Date.now()}`,
      version: (note.version || 0) + 1,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
      createdAt: note.createdAt || new Date().toISOString(),
    };

    localStore.saveClinicalNote(finalNote);
    await outboxSyncEngine.enqueue(
      'ClinicalNote',
      finalNote.id,
      isNew ? 'CREATE' : 'UPDATE',
      finalNote,
      finalNote.version
    );

    return finalNote;
  }
}

export class LocalMoodRepository implements IMoodRepository {
  async getByPatient(patientId: string): Promise<MoodLog[]> {
    const list = localStore.getMoodLogs();
    return list.filter((m) => m.patientId === patientId && !m.deletedAt);
  }

  async save(moodLog: MoodLog): Promise<MoodLog> {
    const isNew = !moodLog.id || moodLog.id.startsWith('temp-');
    const finalMood: MoodLog = {
      ...moodLog,
      id: moodLog.id || `mood-${Date.now()}`,
      version: (moodLog.version || 0) + 1,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString(),
      createdAt: moodLog.createdAt || new Date().toISOString(),
    };

    localStore.saveMoodLog(finalMood);
    await outboxSyncEngine.enqueue(
      'MoodLog',
      finalMood.id,
      isNew ? 'CREATE' : 'UPDATE',
      finalMood,
      finalMood.version
    );

    return finalMood;
  }
}

export const patientRepository = new LocalPatientRepository();
export const appointmentRepository = new LocalAppointmentRepository();
export const clinicalNoteRepository = new LocalClinicalNoteRepository();
export const moodRepository = new LocalMoodRepository();
