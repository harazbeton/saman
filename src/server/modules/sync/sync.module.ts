import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { PatientRepository } from '../../repositories/patient.repository';
import { ClinicalNoteRepository } from '../../repositories/clinical-note.repository';
import { MoodLogRepository } from '../../repositories/mood-log.repository';
import { AppointmentRepository } from '../../repositories/appointment.repository';
import { AuditLogRepository } from '../../repositories/audit-log.repository';

@Module({
  controllers: [SyncController],
  providers: [
    SyncService,
    PatientRepository,
    ClinicalNoteRepository,
    MoodLogRepository,
    AppointmentRepository,
    AuditLogRepository,
  ],
  exports: [SyncService],
})
export class SyncModule {}
