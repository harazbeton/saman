import { Injectable, Inject } from '@nestjs/common';
import { AuditLogRepository } from '../../repositories/audit-log.repository';

@Injectable()
export class AuditService {
  constructor(
    @Inject(AuditLogRepository)
    private readonly auditLogRepository: AuditLogRepository
  ) {}

  async log(entry: any) {
    await this.auditLogRepository.save(entry);
    return { status: 'logged', id: entry?.id };
  }

  async findAll() {
    return this.auditLogRepository.findAll();
  }
}
