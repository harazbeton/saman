import { Injectable, Inject } from '@nestjs/common';
import { MoodLogRepository } from '../../repositories/mood-log.repository';

@Injectable()
export class MoodLogsService {
  constructor(
    @Inject(MoodLogRepository)
    private readonly moodLogRepository: MoodLogRepository
  ) {}

  async findAll() {
    return this.moodLogRepository.findAll();
  }

  async findById(id: string) {
    return this.moodLogRepository.findById(id);
  }

  async save(log: any) {
    return this.moodLogRepository.save(log);
  }

  async delete(id: string) {
    return this.moodLogRepository.delete(id);
  }
}
