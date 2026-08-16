import { Injectable } from '@nestjs/common';
import { getValidDatabaseUrl, prisma } from '../db/prisma.service';
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
    const id = log.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const user_id = log.userId || '';
    const user_name = log.userName || '';
    const user_role = log.userRole || '';
    const action = log.action || '';
    const resource_type = log.resourceType || '';
    const resource_id = log.resourceId || '';
    const details = typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {});
    const impersonated_by = log.impersonatedBy || '';
    const timestamp = log.timestamp || new Date().toISOString();

    if (getValidDatabaseUrl()) {
      try {
        const saved = await prisma.auditLog.upsert({
          where: { id },
          update: {
            user_id,
            user_name,
            user_role,
            action,
            resource_type,
            resource_id,
            details,
            impersonated_by,
            timestamp,
          },
          create: {
            id,
            user_id,
            user_name,
            user_role,
            action,
            resource_type,
            resource_id,
            details,
            impersonated_by,
            timestamp,
          },
        });
        return {
          ...log,
          id,
          userId: user_id,
          userName: user_name,
          userRole: user_role,
          action,
          resourceType: resource_type,
          resourceId: resource_id,
          details,
          impersonatedBy: impersonated_by,
          timestamp,
        };
      } catch {}
    }

    const db = await getSqliteDb();
    db.run(
      'INSERT OR REPLACE INTO audit_logs (id, user_id, user_name, user_role, action, resource_type, resource_id, details, impersonated_by, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        user_id,
        user_name,
        user_role,
        action,
        resource_type,
        resource_id,
        details,
        impersonated_by,
        timestamp,
      ]
    );
    persistDbToDisk(db);
    return {
      ...log,
      id,
      userId: user_id,
      userName: user_name,
      userRole: user_role,
      action,
      resourceType: resource_type,
      resourceId: resource_id,
      details,
      impersonatedBy: impersonated_by,
      timestamp,
    };
  }

  async findAll(limit = 100): Promise<any[]> {
    if (getValidDatabaseUrl()) {
      try {
        const rows = await prisma.auditLog.findMany({
          orderBy: { timestamp: 'desc' },
          take: limit,
        });
        if (rows && rows.length > 0) {
          return rows.map((row) => {
            let parsedDetails = row.details;
            if (typeof row.details === 'string') {
              try {
                parsedDetails = JSON.parse(row.details);
              } catch {
                parsedDetails = row.details;
              }
            }
            return {
              id: row.id,
              userId: row.user_id,
              userName: row.user_name,
              userRole: row.user_role,
              action: row.action,
              resourceType: row.resource_type,
              resourceId: row.resource_id,
              details: parsedDetails,
              impersonatedBy: row.impersonated_by,
              timestamp: row.timestamp,
            };
          });
        }
      } catch {}
    }

    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?');
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
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userRole: row.user_role,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        details: parsedDetails,
        impersonatedBy: row.impersonated_by,
        timestamp: row.timestamp,
      });
    }
    stmt.free();
    return results;
  }
}

export const auditLogRepository = new AuditLogRepository();
