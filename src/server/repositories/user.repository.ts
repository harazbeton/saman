import { Injectable } from '@nestjs/common';
import { IBaseRepository } from './base-repository.interface';
import { getValidDatabaseUrl, prisma } from '../db/prisma.service';
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
      password: row.password || undefined,
      updatedAt: row.updatedAt,
    };
  }

  async save(user: UserRecord): Promise<UserRecord> {
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

    if (getValidDatabaseUrl()) {
      try {
        const saved = await prisma.user.upsert({
          where: { id },
          update: { name, email, role, isAdmin, visiblePanels, password, updatedAt },
          create: { id, name, email, role, isAdmin, visiblePanels, password, updatedAt },
        });
        return this.mapRow(saved);
      } catch (err: any) {
        console.warn('Postgres save user failed, using SQLite:', err?.message || err);
      }
    }

    const db = await getSqliteDb();
    db.run(
      'INSERT OR REPLACE INTO users (id, name, email, role, isAdmin, visiblePanels, password, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, email, role, isAdmin, visiblePanels, password, updatedAt]
    );
    persistDbToDisk(db);
    return {
      id,
      name,
      email,
      role,
      isAdmin: Boolean(isAdmin),
      visiblePanels: user.visiblePanels || null,
      password,
      updatedAt,
    };
  }

  async findById(id: string): Promise<UserRecord | null> {
    if (getValidDatabaseUrl()) {
      try {
        const row = await prisma.user.findUnique({ where: { id } });
        if (row) return this.mapRow(row);
      } catch {}
    }

    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    stmt.bind([id]);
    let result: UserRecord | null = null;
    if (stmt.step()) {
      result = this.mapRow(stmt.getAsObject());
    }
    stmt.free();
    return result;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    if (getValidDatabaseUrl()) {
      try {
        const row = await prisma.user.findFirst({ where: { email } });
        if (row) return this.mapRow(row);
      } catch {}
    }

    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    stmt.bind([email]);
    let result: UserRecord | null = null;
    if (stmt.step()) {
      result = this.mapRow(stmt.getAsObject());
    }
    stmt.free();
    return result;
  }

  async findAll(): Promise<UserRecord[]> {
    if (getValidDatabaseUrl()) {
      try {
        const rows = await prisma.user.findMany({ orderBy: { id: 'asc' } });
        if (rows && rows.length > 0) {
          return rows.map((r) => this.mapRow(r));
        }
      } catch {}
    }

    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT * FROM users ORDER BY id ASC');
    const results: UserRecord[] = [];
    while (stmt.step()) {
      results.push(this.mapRow(stmt.getAsObject()));
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
    const adminVal = typeof isAdmin === 'boolean' ? (isAdmin ? 1 : 0) : (existing.isAdmin ? 1 : 0);
    const now = new Date().toISOString();

    if (getValidDatabaseUrl()) {
      try {
        const updated = await prisma.user.update({
          where: { id },
          data: { visiblePanels: panelsVal, isAdmin: adminVal, updatedAt: now },
        });
        return this.mapRow(updated);
      } catch {}
    }

    const db = await getSqliteDb();
    db.run('UPDATE users SET visiblePanels = ?, isAdmin = ?, updatedAt = ? WHERE id = ?', [
      panelsVal,
      adminVal,
      now,
      id,
    ]);
    persistDbToDisk(db);
    return {
      ...existing,
      visiblePanels: visiblePanels || null,
      isAdmin: Boolean(adminVal),
      updatedAt: now,
    };
  }

  async delete(id: string): Promise<boolean> {
    if (getValidDatabaseUrl()) {
      try {
        await prisma.user.delete({ where: { id } });
      } catch {}
    }

    const db = await getSqliteDb();
    db.run('DELETE FROM users WHERE id = ?', [id]);
    persistDbToDisk(db);
    return true;
  }
}

export const userRepository = new UserRepository();
