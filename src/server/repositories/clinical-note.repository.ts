import { Injectable } from '@nestjs/common';
import { IBaseRepository } from './base-repository.interface';
import { getSqliteDb, persistDbToDisk } from '../db/sqlite-db';

@Injectable()
export class ClinicalNoteRepository implements IBaseRepository<any> {
  async save(note: any): Promise<any> {
    const db = await getSqliteDb();
    const id = note.id;
    const payload = JSON.stringify(note);
    const updatedAt = note.updatedAt || new Date().toISOString();

    db.run(
      'INSERT OR REPLACE INTO clinical_notes (id, payload, updatedAt) VALUES (?, ?, ?)',
      [id, payload, updatedAt]
    );
    persistDbToDisk(db);
    return note;
  }

  async findById(id: string): Promise<any | null> {
    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT payload FROM clinical_notes WHERE id = ?');
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
    const stmt = db.prepare('SELECT payload FROM clinical_notes ORDER BY updatedAt DESC');
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
    db.run('DELETE FROM clinical_notes WHERE id = ?', [id]);
    persistDbToDisk(db);
    return true;
  }
}

export const clinicalNoteRepository = new ClinicalNoteRepository();
