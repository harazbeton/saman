import { Controller, Get, Param, Inject } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { Roles } from '../auth/roles.decorator';

@Controller('api/appointments')
@Roles('reception', 'therapist')
export class AppointmentsController {
  constructor(
    @Inject(AppointmentsService)
    private readonly appointmentsService: AppointmentsService
  ) {}

  @Get()
  async findAll() {
    return this.appointmentsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.appointmentsService.findById(id);
  }
}
