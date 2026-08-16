import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { getValidDatabaseUrl, prisma } from '../../db/prisma.service';

@Controller('api/health')
export class HealthController {
  @Public()
  @Get()
  async getHealth() {
    let dbMode = 'Postgres / SQLite Hybrid (Local Resilient Storage)';
    if (getValidDatabaseUrl()) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        dbMode = 'Postgres (connected via Prisma)';
      } catch (e: any) {
        dbMode = `Postgres (fallback mode: ${e?.message || 'unreachable'})`;
      }
    }

    return {
      status: 'ok',
      architecture: 'NestJS Modular Monolith (Prisma + Postgres)',
      storage: dbMode,
      database: getValidDatabaseUrl() ? 'postgres-configured' : 'sqlite-embedded',
    };
  }
}
