import { OutboxItem } from '../core/kernel/types';

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  conflictsCount: number;
  errors: string[];
}

export interface IOutboxSyncEngine {
  enqueue<T>(aggregateType: string, aggregateId: string, operation: 'CREATE' | 'UPDATE' | 'DELETE', payload: T, version: number): Promise<OutboxItem<T>>;
  getPendingQueue(): Promise<OutboxItem[]>;
  processSyncQueue(): Promise<SyncResult>;
  clearCompleted(): Promise<void>;
  getPendingCount(): Promise<number>;
  subscribe(listener: () => void): () => void;
}
