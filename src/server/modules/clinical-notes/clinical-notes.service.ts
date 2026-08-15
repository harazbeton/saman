import { Injectable, Inject } from '@nestjs/common';
import { ClinicalNoteRepository } from '../../repositories/clinical-note.repository';

@Injectable()
export class ClinicalNotesService {
  constructor(
    @Inject(ClinicalNoteRepository)
    private readonly clinicalNoteRepository: ClinicalNoteRepository
  ) {}

  async findAll() {
    return this.clinicalNoteRepository.findAll();
  }

  async findById(id: string) {
    return this.clinicalNoteRepository.findById(id);
  }

  async save(note: any) {
    return this.clinicalNoteRepository.save(note);
  }

  async delete(id: string) {
    return this.clinicalNoteRepository.delete(id);
  }
}
