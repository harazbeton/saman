import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

let dbInstance: Database | null = null;
let currentDbPath = '';

const ALGORITHM = 'aes-256-gcm';
const MASTER_PASSPHRASE = process.env.DB_ENCRYPTION_KEY || 'saman-aes256-secret-master-key-2026';
const ENCRYPTION_KEY = crypto.scryptSync(MASTER_PASSPHRASE, 'saman-salt-2026', 32);

export function encryptBuffer(buffer: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
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

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
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
      console.error('❌ Failed to decrypt SQLite database at rest:', err.message);
      throw new Error(`Database Decryption Failed: Unable to unlock ${currentDbPath}`);
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
      timestamp TEXT NOT NULL
    );
  `);

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
