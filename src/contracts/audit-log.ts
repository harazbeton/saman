import { AuditLogEntry, PluginRole } from '../core/kernel/types';

export interface AuditParams {
  userId: string;
  userName: string;
  userRole: PluginRole;
  tenantId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, any>;
}

export interface IAuditLogService {
  logAccess(params: AuditParams): Promise<AuditLogEntry>;
  getLogs(tenantId: string, limit?: number): Promise<AuditLogEntry[]>;
}
