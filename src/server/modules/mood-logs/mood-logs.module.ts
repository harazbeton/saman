import { Module } from '@nestjs/common';
import { MoodLogsController } from './mood-logs.controller';
import { MoodLogsService } from './mood-logs.service';
import { MoodLogRepository } from '../../repositories/mood-log.repository';

@Module({
  controllers: [MoodLogsController],
  providers: [MoodLogsService, MoodLogRepository],
  exports: [MoodLogsService, MoodLogRepository],
})
export class MoodLogsModule {}
