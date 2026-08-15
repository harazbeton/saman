import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthGuard } from './modules/auth/auth.guard';
import { PatientsModule } from './modules/patients/patients.module';
import { ClinicalNotesModule } from './modules/clinical-notes/clinical-notes.module';
import { MoodLogsModule } from './modules/mood-logs/mood-logs.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { SyncModule } from './modules/sync/sync.module';
import { AuditModule } from './modules/audit/audit.module';
import { AiGatewayModule } from './modules/ai-gateway/ai-gateway.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    HealthModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    ClinicalNotesModule,
    MoodLogsModule,
    AppointmentsModule,
    SyncModule,
    AuditModule,
    AiGatewayModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
