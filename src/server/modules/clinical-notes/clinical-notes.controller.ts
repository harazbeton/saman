import { Controller, Get, Param, Inject } from '@nestjs/common';
import { ClinicalNotesService } from './clinical-notes.service';
import { Roles } from '../auth/roles.decorator';

@Controller('api/clinical-notes')
@Roles('therapist')
export class ClinicalNotesController {
  constructor(
    @Inject(ClinicalNotesService)
    private readonly clinicalNotesService: ClinicalNotesService
  ) {}

  @Get()
  async findAll() {
    return this.clinicalNotesService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.clinicalNotesService.findById(id);
  }
}
