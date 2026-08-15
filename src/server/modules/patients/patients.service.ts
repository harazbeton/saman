import { Injectable, Inject } from '@nestjs/common';
import { PatientRepository } from '../../repositories/patient.repository';

@Injectable()
export class PatientsService {
  constructor(@Inject(PatientRepository) private readonly patientRepository: PatientRepository) {}

  async findAll() {
    return this.patientRepository.findAll();
  }

  async findById(id: string) {
    return this.patientRepository.findById(id);
  }

  async save(patient: any) {
    return this.patientRepository.save(patient);
  }

  async delete(id: string) {
    return this.patientRepository.delete(id);
  }
}
