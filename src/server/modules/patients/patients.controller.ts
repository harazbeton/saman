import { Controller, Get, Param, Inject } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { Roles } from '../auth/roles.decorator';

@Controller('api/patients')
@Roles('reception', 'therapist')
export class PatientsController {
  constructor(@Inject(PatientsService) private readonly patientsService: PatientsService) {}

  @Get()
  async findAll() {
    return this.patientsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.patientsService.findById(id);
  }
}
