import { Injectable } from '@nestjs/common';
import { IBaseRepository } from './base-repository.interface';
import { getValidDatabaseUrl, prisma } from '../db/prisma.service';
import { getSqliteDb, persistDbToDisk } from '../db/sqlite-db';

@Injectable()
export class ClinicalNoteRepository implements IBaseRepository<any> {
  async save(note: any): Promise<any> {
    const id = note.id;
    const payload = JSON.stringify(note);
    const updatedAt = note.updatedAt || new Date().toISOString();

    if (getValidDatabaseUrl()) {
      try {
        await prisma.clinicalNote.upsert({
          where: { id },
          update: { payload, updatedAt },
          create: { id, payload, updatedAt },
        });
        return note;
      } catch {}
    }

    const db = await getSqliteDb();
    db.run('INSERT OR REPLACE INTO clinical_notes (id, payload, updatedAt) VALUES (?, ?, ?)', [
      id,
      payload,
      updatedAt,
    ]);
    persistDbToDisk(db);
    return note;
  }

  async findById(id: string): Promise<any | null> {
    if (getValidDatabaseUrl()) {
      try {
        const row = await prisma.clinicalNote.findUnique({ where: { id } });
        if (row) return JSON.parse(row.payload);
      } catch {}
    }

    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT payload FROM clinical_notes WHERE id = ?');
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
        const rows = await prisma.clinicalNote.findMany({ orderBy: { updatedAt: 'desc' } });
        if (rows && rows.length > 0) {
          return rows.map((r) => JSON.parse(r.payload));
        }
      } catch {}
    }

    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT payload FROM clinical_notes ORDER BY updatedAt DESC');
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
        await prisma.clinicalNote.delete({ where: { id } });
      } catch {}
    }

    const db = await getSqliteDb();
    db.run('DELETE FROM clinical_notes WHERE id = ?', [id]);
    persistDbToDisk(db);
    return true;
  }
}

export const clinicalNoteRepository = new ClinicalNoteRepository();
