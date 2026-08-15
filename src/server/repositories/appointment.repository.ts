import { Injectable } from '@nestjs/common';
import { IBaseRepository } from './base-repository.interface';
import { getSqliteDb, persistDbToDisk } from '../db/sqlite-db';

@Injectable()
export class AppointmentRepository implements IBaseRepository<any> {
  async save(appointment: any): Promise<any> {
    const db = await getSqliteDb();
    const id = appointment.id;
    const payload = JSON.stringify(appointment);
    const updatedAt = appointment.updatedAt || new Date().toISOString();

    db.run(
      'INSERT OR REPLACE INTO appointments (id, payload, updatedAt) VALUES (?, ?, ?)',
      [id, payload, updatedAt]
    );
    persistDbToDisk(db);
    return appointment;
  }

  async findById(id: string): Promise<any | null> {
    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT payload FROM appointments WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return JSON.parse(row.payload as string);
    }
    stmt.free();
    return null;
  }

  async findAll(): Promise<any[]> {
    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT payload FROM appointments ORDER BY updatedAt DESC');
    const results: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(JSON.parse(row.payload as string));
    }
    stmt.free();
    return results;
  }

  async delete(id: string): Promise<boolean> {
    const db = await getSqliteDb();
    db.run('DELETE FROM appointments WHERE id = ?', [id]);
    persistDbToDisk(db);
    return true;
  }
}

export const appointmentRepository = new AppointmentRepository();
