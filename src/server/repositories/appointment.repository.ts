import { Injectable } from '@nestjs/common';
import { IBaseRepository } from './base-repository.interface';
import { getValidDatabaseUrl, prisma } from '../db/prisma.service';
import { getSqliteDb, persistDbToDisk } from '../db/sqlite-db';

@Injectable()
export class AppointmentRepository implements IBaseRepository<any> {
  async save(appointment: any): Promise<any> {
    const id = appointment.id;
    const payload = JSON.stringify(appointment);
    const updatedAt = appointment.updatedAt || new Date().toISOString();

    if (getValidDatabaseUrl()) {
      try {
        await prisma.appointment.upsert({
          where: { id },
          update: { payload, updatedAt },
          create: { id, payload, updatedAt },
        });
        return appointment;
      } catch {}
    }

    const db = await getSqliteDb();
    db.run('INSERT OR REPLACE INTO appointments (id, payload, updatedAt) VALUES (?, ?, ?)', [
      id,
      payload,
      updatedAt,
    ]);
    persistDbToDisk(db);
    return appointment;
  }

  async findById(id: string): Promise<any | null> {
    if (getValidDatabaseUrl()) {
      try {
        const row = await prisma.appointment.findUnique({ where: { id } });
        if (row) return JSON.parse(row.payload);
      } catch {}
    }

    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT payload FROM appointments WHERE id = ?');
    stmt.bind([id]);
    let result: any = null;
    if (stmt.step()) {
      const obj = stmt.getAsObject();
      if (obj.payload) {
        result = JSON.parse(obj.payload as string);
      }
    }
    stmt.free();
    return result;
  }

  async findAll(): Promise<any[]> {
    if (getValidDatabaseUrl()) {
      try {
        const rows = await prisma.appointment.findMany({ orderBy: { updatedAt: 'desc' } });
        if (rows && rows.length > 0) {
          return rows.map((r) => JSON.parse(r.payload));
        }
      } catch {}
    }

    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT payload FROM appointments ORDER BY updatedAt DESC');
    const results: any[] = [];
    while (stmt.step()) {
      const obj = stmt.getAsObject();
      if (obj.payload) {
        results.push(JSON.parse(obj.payload as string));
      }
    }
    stmt.free();
    return results;
  }

  async delete(id: string): Promise<boolean> {
    if (getValidDatabaseUrl()) {
      try {
        await prisma.appointment.delete({ where: { id } });
      } catch {}
    }

    const db = await getSqliteDb();
    db.run('DELETE FROM appointments WHERE id = ?', [id]);
    persistDbToDisk(db);
    return true;
  }
}

export const appointmentRepository = new AppointmentRepository();
