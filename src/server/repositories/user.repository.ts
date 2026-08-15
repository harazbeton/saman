import { Injectable } from '@nestjs/common';
import { IBaseRepository } from './base-repository.interface';
import { getSqliteDb, persistDbToDisk } from '../db/sqlite-db';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  visiblePanels: string[] | null;
  password?: string;
  updatedAt: string;
}

@Injectable()
export class UserRepository implements IBaseRepository<UserRecord> {
  private mapRow(row: any): UserRecord {
    let parsedPanels: string[] | null = null;
    if (row.visiblePanels) {
      try {
        parsedPanels = JSON.parse(row.visiblePanels);
      } catch {
        parsedPanels = null;
      }
    }

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      isAdmin: Boolean(row.isAdmin),
      visiblePanels: parsedPanels,
      password: row.password,
      updatedAt: row.updatedAt,
    };
  }

  async save(user: UserRecord): Promise<UserRecord> {
    const db = await getSqliteDb();
    const id = user.id;
    const name = user.name;
    const email = user.email;
    const role = user.role;
    const isAdmin = user.isAdmin ? 1 : 0;
    const visiblePanels =
      user.visiblePanels && user.visiblePanels.length > 0
        ? JSON.stringify(user.visiblePanels)
        : null;
    const password = user.password || 'saman123';
    const updatedAt = user.updatedAt || new Date().toISOString();

    db.run(
      'INSERT OR REPLACE INTO users (id, name, email, role, isAdmin, visiblePanels, password, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, email, role, isAdmin, visiblePanels, password, updatedAt]
    );
    persistDbToDisk(db);
    return user;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const db = await getSqliteDb();
    const stmt = db.prepare(
      'SELECT id, name, email, role, isAdmin, visiblePanels, password, updatedAt FROM users WHERE id = ?'
    );
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return this.mapRow(row);
    }
    stmt.free();
    return null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const db = await getSqliteDb();
    const stmt = db.prepare(
      'SELECT id, name, email, role, isAdmin, visiblePanels, password, updatedAt FROM users WHERE email = ?'
    );
    stmt.bind([email]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return this.mapRow(row);
    }
    stmt.free();
    return null;
  }

  async findAll(): Promise<UserRecord[]> {
    const db = await getSqliteDb();
    const stmt = db.prepare(
      'SELECT id, name, email, role, isAdmin, visiblePanels, password, updatedAt FROM users ORDER BY id ASC'
    );
    const results: UserRecord[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(this.mapRow(row));
    }
    stmt.free();
    return results;
  }

  async updateVisiblePanels(
    id: string,
    visiblePanels: string[] | null,
    isAdmin?: boolean
  ): Promise<UserRecord | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const panelsVal =
      visiblePanels && visiblePanels.length > 0 ? JSON.stringify(visiblePanels) : null;
    const adminVal = typeof isAdmin === 'boolean' ? (isAdmin ? 1 : 0) : existing.isAdmin ? 1 : 0;
    const now = new Date().toISOString();

    const db = await getSqliteDb();
    db.run(
      'UPDATE users SET visiblePanels = ?, isAdmin = ?, updatedAt = ? WHERE id = ?',
      [panelsVal, adminVal, now, id]
    );
    persistDbToDisk(db);

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = await getSqliteDb();
    db.run('DELETE FROM users WHERE id = ?', [id]);
    persistDbToDisk(db);
    return true;
  }
}

export const userRepository = new UserRepository();
