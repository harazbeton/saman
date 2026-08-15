# Saman Platform - Architectural Roadmap & Status

## 🚀 Pre-Launch Security Checklist & Completed Audits
- **[COMPLETED - 2026-08-15]** Seeded credentials and encryption keys rotated successfully; strict environment variable enforcement enabled (`DB_ENCRYPTION_KEY`, `JWT_SECRET`, `THERAPIST_PASSWORD`).
- **[COMPLETED - 2026-08-15]** Git history purged of exposed secrets and database files; `.gitignore` updated to exclude `/data/` and `.env`.

---

## ✅ Completed Milestones

### 1. SQLite AES-256-GCM Database Encryption at Rest
- **Status:** COMPLETED & VERIFIED (`/tests/database-encryption.test.ts`).
- **Implementation:** Integrated Node hardware-accelerated `crypto` (AES-256-GCM with scrypt key derivation) directly into `src/server/db/sqlite-db.ts`.
- **Security Features:** 
  - Database binary files on disk (`./data/saman.db`) are encrypted with AES-256-GCM.
  - Plaintext SQLite magic headers (`SQLite format 3`), patient records, clinical SOAP notes, and table names are strictly masked/encrypted at rest.
  - Authenticated Tag verification prevents file tampering or unauthorized byte modification.

### 2. NestJS Modular Monolith & Backend Architecture
- **Status:** COMPLETED & VERIFIED (`/tests/integration.test.ts`, `/tests/e2e-vertical-slice.test.ts`).
- **Implementation:** Full NestJS modular backend with Auth, AI Gateway, Sync, Audit Logging, and RBAC panel visibility control.

---

## 🔮 Future Architectural Milestones

### 3. Key Management & Audit Log Archiving
- Store JWT secrets and database encryption keys (`DB_ENCRYPTION_KEY`) in Google Secret Manager or Cloud KMS.
- Implement automated rotation and cold-storage archiving for audit logs (`IAuditLogService`).
- Secrets rotated and git history purged on 2026-08-15 — see commit history.
