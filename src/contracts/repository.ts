import { Patient, Appointment, ClinicalNote, MoodLog } from '../domain/entities/Patient';

export interface IPatientRepository {
  getById(id: string): Promise<Patient | null>;
  getAll(tenantId: string): Promise<Patient[]>;
  save(patient: Patient): Promise<Patient>;
  delete(id: string): Promise<void>;
}

export interface IAppointmentRepository {
  getById(id: string): Promise<Appointment | null>;
  getAllForTenant(tenantId: string): Promise<Appointment[]>;
  getByPatient(patientId: string): Promise<Appointment[]>;
  save(appointment: Appointment): Promise<Appointment>;
}

export interface IClinicalNoteRepository {
  getById(id: string): Promise<ClinicalNote | null>;
  getByPatient(patientId: string): Promise<ClinicalNote[]>;
  save(note: ClinicalNote): Promise<ClinicalNote>;
}

export interface IMoodRepository {
  getByPatient(patientId: string): Promise<MoodLog[]>;
  save(moodLog: MoodLog): Promise<MoodLog>;
}
