import { Injectable } from '@nestjs/common';
import { IBaseRepository } from './base-repository.interface';
import { prisma } from '../db/prisma.service';

@Injectable()
export class PatientRepository implements IBaseRepository<any> {
  async save(patient: any): Promise<any> {
    const id = patient.id;
    const payload = JSON.stringify(patient);
    const updatedAt = patient.updatedAt || new Date().toISOString();

    await prisma.patient.upsert({
      where: { id },
      update: { payload, updatedAt },
      create: { id, payload, updatedAt },
    });
    return patient;
  }

  async findById(id: string): Promise<any | null> {
    const row = await prisma.patient.findUnique({ where: { id } });
    if (!row) return null;
    return JSON.parse(row.payload);
  }

  async findAll(): Promise<any[]> {
    const rows = await prisma.patient.findMany({ orderBy: { updatedAt: 'desc' } });
    return rows.map((r) => JSON.parse(r.payload));
  }

  async delete(id: string): Promise<boolean> {
    await prisma.patient.delete({ where: { id } });
    return true;
  }
}

export const patientRepository = new PatientRepository();
