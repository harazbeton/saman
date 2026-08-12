import { getSqliteDb, persistDbToDisk } from '../db/sqlite-db';

export class AuditLogRepository {
  async save(log: any): Promise<any> {
    const db = await getSqliteDb();
    const id = log.id;
    const userId = log.userId || '';
    const userName = log.userName || '';
    const userRole = log.userRole || '';
    const action = log.action || '';
    const resourceType = log.resourceType || '';
    const resourceId = log.resourceId || '';
    const details = JSON.stringify(log.details || {});
    const timestamp = log.timestamp || new Date().toISOString();

    db.run(
      `INSERT OR REPLACE INTO audit_logs 
       (id, user_id, user_name, user_role, action, resource_type, resource_id, details, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, userName, userRole, action, resourceType, resourceId, details, timestamp]
    );
    persistDbToDisk(db);
    return log;
  }

  async findAll(limit = 100): Promise<any[]> {
    const db = await getSqliteDb();
    const stmt = db.prepare(
      'SELECT id, user_id as userId, user_name as userName, user_role as userRole, action, resource_type as resourceType, resource_id as resourceId, details, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT ?'
    );
    stmt.bind([limit]);
    const results: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        ...row,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
      });
    }
    stmt.free();
    return results;
  }
}

export const auditLogRepository = new AuditLogRepository();
