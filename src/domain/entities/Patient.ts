import { SyncMetadata } from '../../core/kernel/types';

export interface Patient extends SyncMetadata {
  id: string;
  nationalCode: string;
  fullName: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
  birthDate: string;
  emergencyContact: string;
  assignedTherapistId?: string;
  assignedTherapistName?: string;
  tenantId: string;
  medicalHistory?: string;
  tags?: string[];
}

export interface Appointment extends SyncMetadata {
  id: string;
  patientId: string;
  patientName: string;
  therapistId: string;
  therapistName: string;
  dateTime: string;
  durationMinutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in_progress';
  type: 'in_person' | 'online_video' | 'chat';
  notes?: string;
  tenantId: string;
}

export interface ClinicalNote extends SyncMetadata {
  id: string;
  patientId: string;
  patientName: string;
  therapistId: string;
  therapistName: string;
  appointmentId?: string;
  sessionNumber: number;
  subjective: string; // S in SOAP
  objective: string;  // O in SOAP
  assessment: string; // A in SOAP
  plan: string;       // P in SOAP
  isSigned: boolean;
  signedAt?: string;
  tenantId: string;
}

export interface MoodLog extends SyncMetadata {
  id: string;
  patientId: string;
  score: number; // 1 to 5 scale
  emotions: string[];
  triggers?: string;
  note?: string;
  tenantId: string;
}

export interface User extends SyncMetadata {
  id: string;
  name: string;
  email: string;
  role: 'therapist' | 'patient';
  isAdmin: boolean;
  visiblePanels: string[] | null;
  tenantId: string;
  password?: string;
}
