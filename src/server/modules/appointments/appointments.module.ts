import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentRepository } from '../../repositories/appointment.repository';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentRepository],
  exports: [AppointmentsService, AppointmentRepository],
})
export class AppointmentsModule {}
