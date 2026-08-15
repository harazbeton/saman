import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { getCurrentDbPath } from '../../db/sqlite-db';

@Controller('api/health')
export class HealthController {
  @Public()
  @Get()
  getHealth() {
    const dbPath = getCurrentDbPath();
    return {
      status: 'ok',
      architecture: 'NestJS Modular Monolith (SQLite Encrypted File Store + Repositories)',
      storage: `SQLite ${dbPath}`,
      database: dbPath,
    };
  }
}
