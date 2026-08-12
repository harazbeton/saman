import { OutboxItem } from '../../core/kernel/types';
import { IOutboxSyncEngine, SyncResult } from '../../contracts/sync';
import { localStore } from '../storage/local-store-adapter';
import { ensureAuthenticated } from '../auth/auth-token-store';

export class OutboxSyncEngine implements IOutboxSyncEngine {
  private static instance: OutboxSyncEngine;
  private listeners: Set<() => void> = new Set();
  private isProcessing = false;

  private constructor() {}

  public static getInstance(): OutboxSyncEngine {
    if (!OutboxSyncEngine.instance) {
      OutboxSyncEngine.instance = new OutboxSyncEngine();
    }
    return OutboxSyncEngine.instance;
  }

  public async enqueue<T>(
    aggregateType: string,
    aggregateId: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    payload: T,
    version: number
  ): Promise<OutboxItem<T>> {
    const item: OutboxItem<T> = {
      id: `outbox-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      aggregateType,
      aggregateId,
      operation,
      payload,
      version,
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    const queue = localStore.getOutboxItems();
    queue.push(item);
    localStore.setOutboxItems(queue);
    this.notify();

    // Auto-trigger sync attempt
    this.processSyncQueue().catch(() => {});

    return item;
  }

  public async getPendingQueue(): Promise<OutboxItem[]> {
    const queue = localStore.getOutboxItems();
    return queue.filter((item) => item.status === 'pending' || item.status === 'failed');
  }

  public async getPendingCount(): Promise<number> {
    const queue = localStore.getOutboxItems();
    return queue.filter((item) => item.status === 'pending' || item.status === 'failed').length;
  }

  public async processSyncQueue(): Promise<SyncResult> {
    if (this.isProcessing) {
      return { syncedCount: 0, failedCount: 0, conflictsCount: 0, errors: ['Sync already in progress'] };
    }

    this.isProcessing = true;
    this.notify();

    const queue = localStore.getOutboxItems();
    const pending = queue.filter((i) => i.status === 'pending' || i.status === 'failed');

    if (pending.length === 0) {
      this.isProcessing = false;
      this.notify();
      return { syncedCount: 0, failedCount: 0, conflictsCount: 0, errors: [] };
    }

    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Mark as syncing
    pending.forEach((i) => (i.status = 'syncing'));
    localStore.setOutboxItems(queue);
    this.notify();

    try {
      const token = await ensureAuthenticated();
      // POST outbox items batch to Server Sync API
      const res = await fetch('/api/sync/outbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: pending }),
      });

      if (res.ok) {
        const data = await res.json();
        const processedIds = new Set(data.syncedIds || pending.map((p) => p.id));

        const updatedQueue = localStore.getOutboxItems().map((item) => {
          if (processedIds.has(item.id)) {
            return { ...item, status: 'synced' as const };
          }
          return item;
        });

        localStore.setOutboxItems(updatedQueue);
        syncedCount = processedIds.size;
      } else {
        failedCount = pending.length;
        errors.push(`Server returned ${res.status}: ${res.statusText}`);
        // Revert pending
        const updatedQueue = localStore.getOutboxItems().map((item) => {
          if (item.status === 'syncing') {
            return { ...item, status: 'failed' as const, attempts: item.attempts + 1 };
          }
          return item;
        });
        localStore.setOutboxItems(updatedQueue);
      }
    } catch (err: any) {
      failedCount = pending.length;
      errors.push(err.message || 'Network connectivity offline or server unreachable');

      const updatedQueue = localStore.getOutboxItems().map((item) => {
        if (item.status === 'syncing') {
          return { ...item, status: 'failed' as const, attempts: item.attempts + 1, errorMessage: err.message };
        }
        return item;
      });
      localStore.setOutboxItems(updatedQueue);
    } finally {
      this.isProcessing = false;
      this.notify();
    }

    return { syncedCount, failedCount, conflictsCount: 0, errors };
  }

  public async clearCompleted(): Promise<void> {
    const queue = localStore.getOutboxItems();
    const remaining = queue.filter((i) => i.status !== 'synced');
    localStore.setOutboxItems(remaining);
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const outboxSyncEngine = OutboxSyncEngine.getInstance();
