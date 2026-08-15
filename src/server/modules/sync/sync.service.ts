import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { PatientRepository } from '../../repositories/patient.repository';
import { ClinicalNoteRepository } from '../../repositories/clinical-note.repository';
import { MoodLogRepository } from '../../repositories/mood-log.repository';
import { AppointmentRepository } from '../../repositories/appointment.repository';
import { AuditLogRepository } from '../../repositories/audit-log.repository';

@Injectable()
export class SyncService {
  constructor(
    @Inject(PatientRepository)
    private readonly patientRepository: PatientRepository,
    @Inject(ClinicalNoteRepository)
    private readonly clinicalNoteRepository: ClinicalNoteRepository,
    @Inject(MoodLogRepository)
    private readonly moodLogRepository: MoodLogRepository,
    @Inject(AppointmentRepository)
    private readonly appointmentRepository: AppointmentRepository,
    @Inject(AuditLogRepository)
    private readonly auditLogRepository: AuditLogRepository
  ) {}

  async processOutbox(items: any, userContext?: any) {
    if (!Array.isArray(items)) {
      throw new HttpException(
        { error: 'items must be an array' },
        HttpStatus.BAD_REQUEST
      );
    }

    const syncedIds: string[] = [];

    for (const item of items) {
      try {
        if (item.aggregateType === 'Patient') {
          await this.patientRepository.save(item.payload);
          syncedIds.push(item.id);
        } else if (item.aggregateType === 'ClinicalNote') {
          await this.clinicalNoteRepository.save(item.payload);
          syncedIds.push(item.id);
        } else if (item.aggregateType === 'MoodLog') {
          await this.moodLogRepository.save(item.payload);
          syncedIds.push(item.id);
        } else if (item.aggregateType === 'Appointment') {
          await this.appointmentRepository.save(item.payload);
          syncedIds.push(item.id);
        } else {
          console.error(
            `[TEST LOG] Unrecognized aggregate type for outbox item ${item.id}: '${item.aggregateType}'`
          );
        }
      } catch (err: any) {
        console.error(`Failed to persist outbox item ${item.id}:`, err);
      }
    }

    // Write audit log with actor identity and impersonatedBy tracing
    if (userContext) {
      await this.auditLogRepository.save({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: userContext.userId || 'system',
        userName: userContext.name || userContext.user || 'سیستم',
        userRole: userContext.role || 'therapist',
        action: 'SYNC_OUTBOX_BATCH',
        resourceType: 'SyncEngine',
        details: {
          total: items.length,
          syncedCount: syncedIds.length,
        },
        impersonatedBy: userContext.impersonatedBy || '',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'success',
      syncedIds,
      processedAt: new Date().toISOString(),
    };
  }
}
