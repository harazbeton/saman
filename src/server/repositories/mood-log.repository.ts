import { Injectable } from '@nestjs/common';
import { IBaseRepository } from './base-repository.interface';
import { getValidDatabaseUrl, prisma } from '../db/prisma.service';
import { getSqliteDb, persistDbToDisk } from '../db/sqlite-db';

@Injectable()
export class MoodLogRepository implements IBaseRepository<any> {
  async save(moodLog: any): Promise<any> {
    const id = moodLog.id;
    const payload = JSON.stringify(moodLog);
    const updatedAt = moodLog.updatedAt || new Date().toISOString();

    if (getValidDatabaseUrl()) {
      try {
        await prisma.moodLog.upsert({
          where: { id },
          update: { payload, updatedAt },
          create: { id, payload, updatedAt },
        });
        return moodLog;
      } catch {}
    }

    const db = await getSqliteDb();
    db.run('INSERT OR REPLACE INTO mood_logs (id, payload, updatedAt) VALUES (?, ?, ?)', [
      id,
      payload,
      updatedAt,
    ]);
    persistDbToDisk(db);
    return moodLog;
  }

  async findById(id: string): Promise<any | null> {
    if (getValidDatabaseUrl()) {
      try {
        const row = await prisma.moodLog.findUnique({ where: { id } });
        if (row) return JSON.parse(row.payload);
      } catch {}
    }

    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT payload FROM mood_logs WHERE id = ?');
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
        const rows = await prisma.moodLog.findMany({ orderBy: { updatedAt: 'desc' } });
        if (rows && rows.length > 0) {
          return rows.map((r) => JSON.parse(r.payload));
        }
      } catch {}
    }

    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT payload FROM mood_logs ORDER BY updatedAt DESC');
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
        await prisma.moodLog.delete({ where: { id } });
      } catch {}
    }

    const db = await getSqliteDb();
    db.run('DELETE FROM mood_logs WHERE id = ?', [id]);
    persistDbToDisk(db);
    return true;
  }
}

export const moodLogRepository = new MoodLogRepository();
