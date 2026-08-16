import { Injectable } from '@nestjs/common';
import { IBaseRepository } from './base-repository.interface';
import { prisma } from '../db/prisma.service';

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

    const saved = await prisma.user.upsert({
      where: { id },
      update: { name, email, role, isAdmin, visiblePanels, password, updatedAt },
      create: { id, name, email, role, isAdmin, visiblePanels, password, updatedAt },
    });
    return this.mapRow(saved);
  }

  async findById(id: string): Promise<UserRecord | null> {
    const row = await prisma.user.findUnique({ where: { id } });
    if (!row) return null;
    return this.mapRow(row);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const row = await prisma.user.findFirst({ where: { email } });
    if (!row) return null;
    return this.mapRow(row);
  }

  async findAll(): Promise<UserRecord[]> {
    const rows = await prisma.user.findMany({ orderBy: { id: 'asc' } });
    return rows.map((r) => this.mapRow(r));
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

    const updated = await prisma.user.update({
      where: { id },
      data: { visiblePanels: panelsVal, isAdmin: adminVal, updatedAt: now },
    });
    return this.mapRow(updated);
  }

  async delete(id: string): Promise<boolean> {
    await prisma.user.delete({ where: { id } });
    return true;
  }
}

export const userRepository = new UserRepository();
