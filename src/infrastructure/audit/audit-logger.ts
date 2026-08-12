import { IAuditLogService, AuditParams } from '../../contracts/audit-log';
import { AuditLogEntry } from '../../core/kernel/types';
import { localStore } from '../storage/local-store-adapter';
import { ensureAuthenticated } from '../auth/auth-token-store';

export class AuditLogger implements IAuditLogService {
  private static instance: AuditLogger;

  private constructor() {}

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  async logAccess(params: AuditParams): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: params.userId,
      userRole: params.userRole,
      userName: params.userName,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      tenantId: params.tenantId,
      details: params.details || {},
    };

    localStore.saveAuditLog(entry);

    // Asynchronously send to backend audit log service with auth token
    ensureAuthenticated().then((token) => {
      fetch('/api/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(entry),
      }).catch(() => {
        // Offline fallback
      });
    });

    return entry;
  }

  async getLogs(tenantId: string, limit = 50): Promise<AuditLogEntry[]> {
    const logs = localStore.getAuditLogs();
    return logs.filter((l) => l.tenantId === tenantId).slice(0, limit);
  }
}

export const auditLogger = AuditLogger.getInstance();
