import { getValidDatabaseUrl, prisma } from './prisma.service';
import { getSqliteDb } from './sqlite-db';

export async function seedDatabase() {
  // 1. Initialize SQLite (Embedded / Local storage engine)
  try {
    await getSqliteDb();
    console.log('✅ SQLite local database initialized and ready.');
  } catch (err: any) {
    console.warn('⚠️ SQLite init warning:', err?.message || err);
  }

  // 2. If Postgres is configured, attempt seed in Postgres as well
  if (getValidDatabaseUrl()) {
    try {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        const now = new Date().toISOString();
        const defaultUsers = [
          {
            id: 'user-therapist',
            name: 'دکتر علیرضا محمدی',
            email: 'therapist@saman.ir',
            role: 'therapist',
            isAdmin: 1,
            visiblePanels: null,
            password: 'saman123',
            updatedAt: now,
          },
          {
            id: 'user-therapist-multi',
            name: 'دکتر سمیعی (حساب آزمایشی چندپنله)',
            email: 'therapist.test@saman.ir',
            role: 'therapist',
            isAdmin: 0,
            visiblePanels: JSON.stringify(['reception', 'patient', 'therapist']),
            password: 'saman123',
            updatedAt: now,
          },
          {
            id: 'user-patient',
            name: 'سارا احمدی',
            email: 'patient@saman.ir',
            role: 'patient',
            isAdmin: 0,
            visiblePanels: null,
            password: 'saman123',
            updatedAt: now,
          },
          {
            id: 'user-receptionist',
            name: 'خانم شریفی (پذیرش)',
            email: 'reception@saman.ir',
            role: 'therapist', // mapped from receptionist
            isAdmin: 0,
            visiblePanels: JSON.stringify(['reception']),
            password: 'saman123',
            updatedAt: now,
          },
        ];

        for (const u of defaultUsers) {
          await prisma.user.upsert({
            where: { id: u.id },
            update: u,
            create: u,
          });
        }
        console.log('✅ PostgreSQL database seeded with default users.');
      }
    } catch (err: any) {
      console.warn('ℹ️ PostgreSQL not available for seeding (using local storage):', err?.message || err);
    }
  }
}
