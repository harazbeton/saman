import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export function getValidDatabaseUrl(): string | null {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && (envUrl.startsWith('postgresql://') || envUrl.startsWith('postgres://'))) {
    return envUrl;
  }
  return null;
}

let prismaClientInstance: PrismaClient | null = null;
const validUrl = getValidDatabaseUrl();

if (validUrl) {
  try {
    prismaClientInstance = new PrismaClient({
      datasources: {
        db: {
          url: validUrl,
        },
      },
    });
  } catch {
    prismaClientInstance = null;
  }
}

// Fallback client instance with valid connection string format so PrismaClient constructor never throws
export const prisma: PrismaClient = prismaClientInstance || new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5432/postgres',
    },
  },
});

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = getValidDatabaseUrl() || 'postgresql://postgres:postgres@localhost:5432/postgres';
    super({
      datasources: {
        db: { url },
      },
    });
  }

  async onModuleInit() {
    if (getValidDatabaseUrl()) {
      try {
        await this.$connect();
        this.logger.log('Connected to PostgreSQL database');
      } catch (err: any) {
        this.logger.warn(`PostgreSQL connection failed: ${err?.message || err}. Local storage active.`);
      }
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {}
  }
}
