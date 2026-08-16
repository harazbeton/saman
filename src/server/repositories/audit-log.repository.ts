import { Injectable } from '@nestjs/common';
import { prisma } from '../db/prisma.service';

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
      id: saved.id,
      userId: saved.user_id,
      userName: saved.user_name,
      userRole: saved.user_role,
      action: saved.action,
      resourceType: saved.resource_type,
      resourceId: saved.resource_id,
      details,
      impersonatedBy: saved.impersonated_by,
      timestamp: saved.timestamp,
    };
  }

  async findAll(limit = 100): Promise<any[]> {
    const rows = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

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
}

export const auditLogRepository = new AuditLogRepository();
