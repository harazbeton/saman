import { Injectable } from '@nestjs/common';
import { IBaseRepository } from './base-repository.interface';
import { prisma } from '../db/prisma.service';

@Injectable()
export class MoodLogRepository implements IBaseRepository<any> {
  async save(moodLog: any): Promise<any> {
    const id = moodLog.id;
    const payload = JSON.stringify(moodLog);
    const updatedAt = moodLog.updatedAt || new Date().toISOString();

    await prisma.moodLog.upsert({
      where: { id },
      update: { payload, updatedAt },
      create: { id, payload, updatedAt },
    });
    return moodLog;
  }

  async findById(id: string): Promise<any | null> {
    const row = await prisma.moodLog.findUnique({ where: { id } });
    if (!row) return null;
    return JSON.parse(row.payload);
  }

  async findAll(): Promise<any[]> {
    const rows = await prisma.moodLog.findMany({ orderBy: { updatedAt: 'desc' } });
    return rows.map((r) => JSON.parse(r.payload));
  }

  async delete(id: string): Promise<boolean> {
    await prisma.moodLog.delete({ where: { id } });
    return true;
  }
}

export const moodLogRepository = new MoodLogRepository();
