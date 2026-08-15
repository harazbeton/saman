import { Controller, Get, Param, Inject } from '@nestjs/common';
import { MoodLogsService } from './mood-logs.service';
import { Roles } from '../auth/roles.decorator';

@Controller('api/mood-logs')
@Roles('patient', 'therapist')
export class MoodLogsController {
  constructor(
    @Inject(MoodLogsService)
    private readonly moodLogsService: MoodLogsService
  ) {}

  @Get()
  async findAll() {
    return this.moodLogsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.moodLogsService.findById(id);
  }
}
