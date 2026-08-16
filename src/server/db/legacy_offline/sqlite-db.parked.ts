// 
// PARKED: This custom AES-256-GCM file-encryption layer and SQLite implementation
// has been removed from the active write/read path in favor of a managed Postgres database via Prisma.
// It is preserved here for the future offline Tauri/desktop implementation.
//
import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

let dbInstance: Database | null = null;
let currentDbPath = '';

const ALGORITHM = 'aes-256-gcm';
function getCandidateKeys(): Buffer[] {
  const pass = process.env.DB_ENCRYPTION_KEY?.replace(/^['"]|['"]$/g, '');
  if (!pass || pass === 'MY_DB_ENCRYPTION_KEY') {
    throw new Error('CRITICAL: Valid DB_ENCRYPTION_KEY environment variable is not set!');
  }
  return [crypto.scryptSync(pass, 'saman-salt-2026', 32)];
}

export function encryptBuffer(buffer: Buffer, key?: Buffer): Buffer {
  const encKey = key || getCandidateKeys()[0];
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, encKey, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Binary format: [12 bytes IV][16 bytes AuthTag][Encrypted SQLite Data]
  return Buffer.concat([iv, authTag, encrypted]);
}

export function decryptBuffer(encryptedBuffer: Buffer): Buffer {
  // Backwards compatibility check for legacy plain SQLite header
  if (
    encryptedBuffer.length >= 15 &&
    encryptedBuffer.subarray(0, 15).toString() === 'SQLite format 3'
  ) {
    return encryptedBuffer;
  }

  if (encryptedBuffer.length < 28) {
    throw new Error('Invalid encrypted database file format: File size too small');
  }

  const iv = encryptedBuffer.subarray(0, 12);
  const authTag = encryptedBuffer.subarray(12, 28);
  const ciphertext = encryptedBuffer.subarray(28);

  const keys = getCandidateKeys();
  let lastError: Error | null = null;

  for (const key of keys) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to decrypt database with all available keys');
}

export async function getSqliteDb(customPath?: string): Promise<Database> {
  if (dbInstance && (!customPath || customPath === currentDbPath)) {
    return dbInstance;
  }

  const SQL = await initSqlJs();
  currentDbPath = customPath || path.join(process.cwd(), 'data', 'saman.db');
  const dir = path.dirname(currentDbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(currentDbPath)) {
    const filebuffer = fs.readFileSync(currentDbPath);
    try {
      const decryptedBuffer = decryptBuffer(filebuffer);
      dbInstance = new SQL.Database(decryptedBuffer);
    } catch (err: any) {
      console.warn(
        `⚠️ Failed to decrypt SQLite database (${currentDbPath}): ${err.message}. Backing up and initializing fresh database.`
      );
      try {
        const bakPath = `${currentDbPath}.bak.${Date.now()}`;
        fs.renameSync(currentDbPath, bakPath);
      } catch (backupErr) {
        console.error('Failed to rename corrupted DB file:', backupErr);
      }
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Initialize schema
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS clinical_notes (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mood_logs (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      user_role TEXT,
      action TEXT,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      impersonated_by TEXT,
      timestamp TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      isAdmin INTEGER NOT NULL DEFAULT 0,
      visiblePanels TEXT,
      password TEXT,
      updatedAt TEXT NOT NULL
    );
  `);

  // Clean up legacy accounts / architecture drift if present in existing DB
  dbInstance.run("DELETE FROM users WHERE id = 'user-admin' OR role = 'admin'");
  dbInstance.run("UPDATE users SET role = 'therapist', visiblePanels = ? WHERE id = 'user-receptionist'", [JSON.stringify(['reception'])]);
  dbInstance.run("UPDATE users SET role = 'therapist' WHERE role = 'receptionist'");

  // Seed default users if table is empty
  const userCheckStmt = dbInstance.prepare('SELECT COUNT(*) as cnt FROM users');
  let userCount = 0;
  if (userCheckStmt.step()) {
    const obj = userCheckStmt.getAsObject();
    userCount = Number(obj.cnt || 0);
  }
  userCheckStmt.free();

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
      },
      {
        id: 'user-therapist-multi',
        name: 'دکتر سمیعی (حساب آزمایشی چندپنله)',
        email: 'therapist.test@saman.ir',
        role: 'therapist',
        isAdmin: 0,
        visiblePanels: JSON.stringify(['reception', 'patient', 'therapist']),
        password: 'saman123',
      },
      {
        id: 'user-patient',
        name: 'سارا احمدی',
        email: 'patient@saman.ir',
        role: 'patient',
        isAdmin: 0,
        visiblePanels: null,
        password: 'saman123',
      },
      {
        id: 'user-receptionist',
        name: 'خانم شریفی (پذیرش)',
        email: 'reception@saman.ir',
        role: 'therapist',
        isAdmin: 0,
        visiblePanels: JSON.stringify(['reception']),
        password: 'saman123',
      },
    ];

    for (const u of defaultUsers) {
      dbInstance.run(
        'INSERT OR REPLACE INTO users (id, name, email, role, isAdmin, visiblePanels, password, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [u.id, u.name, u.email, u.role, u.isAdmin, u.visiblePanels, u.password, now]
      );
    }
  }

  persistDbToDisk(dbInstance, currentDbPath);
  return dbInstance;
}

export function persistDbToDisk(db: Database, targetPath?: string) {
  const p = targetPath || currentDbPath;
  if (!p) return;
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const data = db.export();
  const rawBuffer = Buffer.from(data);
  const encryptedBuffer = encryptBuffer(rawBuffer);
  fs.writeFileSync(p, encryptedBuffer);
}

export function closeSqliteDb() {
  if (dbInstance) {
    persistDbToDisk(dbInstance);
    dbInstance.close();
    dbInstance = null;
    currentDbPath = '';
  }
}

export function getCurrentDbPath(): string {
  return currentDbPath || path.join(process.cwd(), 'data', 'saman.db');
}

