import { Injectable, Inject } from '@nestjs/common';
import { AppointmentRepository } from '../../repositories/appointment.repository';

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(AppointmentRepository)
    private readonly appointmentRepository: AppointmentRepository
  ) {}

  async findAll() {
    return this.appointmentRepository.findAll();
  }

  async findById(id: string) {
    return this.appointmentRepository.findById(id);
  }

  async save(appointment: any) {
    return this.appointmentRepository.save(appointment);
  }

  async delete(id: string) {
    return this.appointmentRepository.delete(id);
  }
}
