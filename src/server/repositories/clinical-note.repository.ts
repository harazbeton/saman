import { Injectable } from '@nestjs/common';
import { IBaseRepository } from './base-repository.interface';
import { prisma } from '../db/prisma.service';

@Injectable()
export class ClinicalNoteRepository implements IBaseRepository<any> {
  async save(note: any): Promise<any> {
    const id = note.id;
    const payload = JSON.stringify(note);
    const updatedAt = note.updatedAt || new Date().toISOString();

    await prisma.clinicalNote.upsert({
      where: { id },
      update: { payload, updatedAt },
      create: { id, payload, updatedAt },
    });
    return note;
  }

  async findById(id: string): Promise<any | null> {
    const row = await prisma.clinicalNote.findUnique({ where: { id } });
    if (!row) return null;
    return JSON.parse(row.payload);
  }

  async findAll(): Promise<any[]> {
    const rows = await prisma.clinicalNote.findMany({ orderBy: { updatedAt: 'desc' } });
    return rows.map((r) => JSON.parse(r.payload));
  }

  async delete(id: string): Promise<boolean> {
    await prisma.clinicalNote.delete({ where: { id } });
    return true;
  }
}

export const clinicalNoteRepository = new ClinicalNoteRepository();
