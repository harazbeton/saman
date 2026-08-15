# Saman Platform - Architectural Roadmap & Status

## 🚀 Pre-Launch Security Checklist
- **Rotate the seeded therapist password before any real patient data is entered — current password was shared in plaintext during development.**

## ✅ Completed Milestones

### 1. SQLite AES-256-GCM Database Encryption at Rest
- **Status:** COMPLETED & VERIFIED (`/tests/database-encryption.test.ts`).
- **Implementation:** Integrated Node hardware-accelerated `crypto` (AES-256-GCM with PBKDF2/scrypt key derivation) directly into `src/server/db/sqlite-db.ts`.
- **Security Features:**
  - Database binary files on disk (`./data/saman.db`) are encrypted with AES-256-GCM.
  - Plaintext SQLite magic headers (`SQLite format 3`), patient records, clinical SOAP notes, and table names are strictly masked/encrypted at rest.
  - Authenticated Tag verification prevents file tampering or unauthorized byte modification.

---

## 🔮 Future Architectural Milestones

### 2. NestJS / Prisma Infrastructure Migration (Future Phase)
- **Status:** Post-MVP architectural upgrade.
- **Requirement:** Migrate from Express + Modular Monolith kernel to NestJS framework with Prisma ORM for enterprise dependency injection and type-safe database migrations.

### 3. Key Management & Audit Log Archiving
- Store JWT secrets and database encryption keys (`DB_ENCRYPTION_KEY`) in Google Secret Manager or Cloud KMS.
- Implement automated rotation and cold-storage archiving for audit logs (`IAuditLogService`).
