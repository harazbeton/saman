# Saman Engineering Rules & Vibe Coding Guidelines (v1.0)

## 1. Architectural Mandate: Modular Monolith + Micro-Kernel
- **Frontend Architecture**: Clean Architecture (Shell -> UI -> Application -> Domain -> Contracts -> Infrastructure -> Core Kernel).
- **Backend Architecture**: NestJS-styled Modular Monolith (Auth, Tenancy, Permissions, Patients, Appointments, Clinical, Sync, AI Gateway).
- **Offline Strategy**: Entity State + Outbox Pattern / Change Log + Sync Metadata + Domain Events (NO Event Sourcing / NO CRDT in MVP).
- **Plugin System**: 4-Level Plugin Architecture (Manifest, Capabilities, Backend Contract, Frontend Module/Slot, Events). Plugins MUST NOT access raw database/storage directly; they MUST interact through Domain Services / Repository Contracts.
- **AI Gateway**: Direct LLM calls from React frontend are STRICTLY FORBIDDEN. All AI operations MUST route through the Server AI Gateway contract (`/api/ai/gateway`).
- **Security & Compliance**: Every clinical & patient data read/write MUST generate a structured Audit Log (`IAuditLogService`). Tenant isolation and RBAC MUST be respected.

## 2. Directory Structure & Layer Boundaries
```
src/
├── core/               # Micro-Kernel (Plugin Registry, EventBus, Slot Manager)
├── domain/             # Entities, Value Objects, Domain Events, Rules
├── contracts/          # Interfaces (Repositories, AI Gateway, Sync Engine, Audit Logger)
├── infrastructure/     # Implementations (IndexedDB, Outbox Engine, AI Client, REST API)
├── application/        # Use Cases, Handlers, Services
├── plugins/            # Isolated 4-Level Plugins (Patient, Therapist, Reception)
├── components/         # Reusable UI & Slot Renderers
└── server/             # Modular Backend Services
```

## 3. Strict Rules for Agent
1. Never bypass the Repository pattern for direct storage access inside plugins.
2. Every state modification that needs offline durability MUST write to both local state/DB AND the Outbox queue with `syncStatus = 'pending'`.
3. Keep Domain Entities pure with `id`, `version`, `updatedAt`, `createdAt`, `deletedAt`, `syncStatus`.
4. Never import Gemini SDK or API key directly in client-side React components.
5. Add structured Audit Logging (`therapist_id`, `patient_id`, `action`, `resource`, `timestamp`) for all clinical data accesses.
