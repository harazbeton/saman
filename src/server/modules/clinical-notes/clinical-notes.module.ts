import { Module } from '@nestjs/common';
import { ClinicalNotesController } from './clinical-notes.controller';
import { ClinicalNotesService } from './clinical-notes.service';
import { ClinicalNoteRepository } from '../../repositories/clinical-note.repository';

@Module({
  controllers: [ClinicalNotesController],
  providers: [ClinicalNotesService, ClinicalNoteRepository],
  exports: [ClinicalNotesService, ClinicalNoteRepository],
})
export class ClinicalNotesModule {}
