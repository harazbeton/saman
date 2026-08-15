/**
 * Saman Platform - Core Micro-Kernel Type Definitions
 */

export type PluginRole = 'patient' | 'therapist' | 'receptionist' | 'admin' | 'system';

export type PluginSlotName =
  | 'patient.overview.main'
  | 'patient.overview.sidebar'
  | 'patient.mood.widget'
  | 'patient.ai.companion'
  | 'therapist.session.main'
  | 'therapist.today.widgets'
  | 'therapist.clinical.notes'
  | 'therapist.dashboard.main'
  | 'therapist.dashboard.sidebar'
  | 'reception.dashboard.main'
  | 'reception.registry.main'
  | 'reception.scheduling.widget'
  | 'admin.system.widgets'
  | 'global.header.actions';

export interface PluginSlotConfig {
  target: PluginSlotName;
  componentId: string;
  title: string;
  priority: number; // Higher number = rendered first
}

export interface PluginRouteConfig {
  path: string;
  componentId: string;
  label: string;
  iconName?: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  role: PluginRole;
  enabled: boolean;
  permissions: string[];
  capabilities: string[];
  slots: PluginSlotConfig[];
  routes?: PluginRouteConfig[];
  events: {
    subscribes: string[];
    publishes: string[];
  };
}

export interface DomainEvent<T = any> {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: string;
  version: number;
  payload: T;
  tenantId?: string;
  userId?: string;
}

export interface SyncMetadata {
  version: number;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  lastSyncedAt?: string;
  updatedAt: string;
  createdAt: string;
  deletedAt?: string;
}

export interface OutboxItem<T = any> {
  id: string;
  aggregateType: string;
  aggregateId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: T;
  version: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  attempts: number;
  createdAt: string;
  errorMessage?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userRole: PluginRole;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  tenantId: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

export interface UserContext {
  id: string;
  name: string;
  email: string;
  role: PluginRole;
  isAdmin?: boolean;
  visiblePanels?: string[] | null;
  tenantId: string;
  token?: string;
}
