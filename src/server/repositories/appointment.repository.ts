import { Injectable } from '@nestjs/common';
import { IBaseRepository } from './base-repository.interface';
import { prisma } from '../db/prisma.service';

@Injectable()
export class AppointmentRepository implements IBaseRepository<any> {
  async save(appointment: any): Promise<any> {
    const id = appointment.id;
    const payload = JSON.stringify(appointment);
    const updatedAt = appointment.updatedAt || new Date().toISOString();

    await prisma.appointment.upsert({
      where: { id },
      update: { payload, updatedAt },
      create: { id, payload, updatedAt },
    });
    return appointment;
  }

  async findById(id: string): Promise<any | null> {
    const row = await prisma.appointment.findUnique({ where: { id } });
    if (!row) return null;
    return JSON.parse(row.payload);
  }

  async findAll(): Promise<any[]> {
    const rows = await prisma.appointment.findMany({ orderBy: { updatedAt: 'desc' } });
    return rows.map((r) => JSON.parse(r.payload));
  }

  async delete(id: string): Promise<boolean> {
    await prisma.appointment.delete({ where: { id } });
    return true;
  }
}

export const appointmentRepository = new AppointmentRepository();
