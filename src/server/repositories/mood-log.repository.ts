import { IBaseRepository } from './base-repository.interface';
import { getSqliteDb, persistDbToDisk } from '../db/sqlite-db';

export class MoodLogRepository implements IBaseRepository<any> {
  async save(log: any): Promise<any> {
    const db = await getSqliteDb();
    const id = log.id;
    const payload = JSON.stringify(log);
    const updatedAt = log.updatedAt || new Date().toISOString();

    db.run(
      'INSERT OR REPLACE INTO mood_logs (id, payload, updatedAt) VALUES (?, ?, ?)',
      [id, payload, updatedAt]
    );
    persistDbToDisk(db);
    return log;
  }

  async findById(id: string): Promise<any | null> {
    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT payload FROM mood_logs WHERE id = ?');
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
    const stmt = db.prepare('SELECT payload FROM mood_logs ORDER BY updatedAt DESC');
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
    db.run('DELETE FROM mood_logs WHERE id = ?', [id]);
    persistDbToDisk(db);
    return true;
  }
}

export const moodLogRepository = new MoodLogRepository();
