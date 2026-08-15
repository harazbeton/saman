import { Injectable } from '@nestjs/common';
import { getSqliteDb, persistDbToDisk } from '../db/sqlite-db';

export interface AuditLogEntry {
  id?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  impersonatedBy?: string;
  timestamp?: string;
}

@Injectable()
export class AuditLogRepository {
  async save(log: AuditLogEntry): Promise<any> {
    const db = await getSqliteDb();
    const id = log.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const userId = log.userId || '';
    const userName = log.userName || '';
    const userRole = log.userRole || '';
    const action = log.action || '';
    const resourceType = log.resourceType || '';
    const resourceId = log.resourceId || '';
    const details = typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {});
    const impersonatedBy = log.impersonatedBy || '';
    const timestamp = log.timestamp || new Date().toISOString();

    db.run(
      `INSERT OR REPLACE INTO audit_logs 
       (id, user_id, user_name, user_role, action, resource_type, resource_id, details, impersonated_by, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, userName, userRole, action, resourceType, resourceId, details, impersonatedBy, timestamp]
    );
    persistDbToDisk(db);
    return { ...log, id, userId, userName, userRole, action, resourceType, resourceId, details, impersonatedBy, timestamp };
  }

  async findAll(limit = 100): Promise<any[]> {
    const db = await getSqliteDb();
    const stmt = db.prepare(
      'SELECT id, user_id as userId, user_name as userName, user_role as userRole, action, resource_type as resourceType, resource_id as resourceId, details, impersonated_by as impersonatedBy, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT ?'
    );
    stmt.bind([limit]);
    const results: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      let parsedDetails = row.details;
      if (typeof row.details === 'string') {
        try {
          parsedDetails = JSON.parse(row.details);
        } catch {
          parsedDetails = row.details;
        }
      }
      results.push({
        ...row,
        details: parsedDetails,
      });
    }
    stmt.free();
    return results;
  }
}

export const auditLogRepository = new AuditLogRepository();
