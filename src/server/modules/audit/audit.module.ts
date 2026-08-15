import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLogRepository } from '../../repositories/audit-log.repository';

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditLogRepository],
  exports: [AuditService, AuditLogRepository],
})
export class AuditModule {}
