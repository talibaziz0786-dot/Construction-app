/**
 * Local calculation history + project drafts (non-sensitive only).
 * History survives app restarts via storage.ts; sync queue tracks offline
 * results that still need server verification when connectivity returns.
 */
import type { CalculatorRunResponse } from '../types/calculator';
import { StorageKeys, storageGet, storageSet } from './storage';

export interface HistoryEntry {
  id: string;
  calculatorId: string;
  name: string;
  values: Record<string, unknown>;
  result: CalculatorRunResponse;
  source: 'server' | 'offline';
  verified: boolean;
  createdAt: string;
}

export interface SyncQueueItem {
  id: string;
  calculatorId: string;
  values: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  return storageGet<HistoryEntry[]>(StorageKeys.history, []);
}

export async function appendHistory(entry: Omit<HistoryEntry, 'id' | 'createdAt'>): Promise<HistoryEntry> {
  const full: HistoryEntry = { ...entry, id: uid(), createdAt: new Date().toISOString() };
  const list = await loadHistory();
  const next = [full, ...list].slice(0, 100);
  await storageSet(StorageKeys.history, next);
  return full;
}

export async function markHistoryVerified(id: string, serverResult: CalculatorRunResponse): Promise<void> {
  const list = await loadHistory();
  const next = list.map((e) => (e.id === id ? { ...e, verified: true, source: 'server' as const, result: serverResult } : e));
  await storageSet(StorageKeys.history, next);
}

export async function loadSyncQueue(): Promise<SyncQueueItem[]> {
  return storageGet<SyncQueueItem[]>(StorageKeys.syncQueue, []);
}

export async function enqueueSync(calculatorId: string, values: Record<string, unknown>): Promise<SyncQueueItem> {
  const item: SyncQueueItem = { id: uid(), calculatorId, values, createdAt: new Date().toISOString(), attempts: 0, lastError: null };
  const queue = await loadSyncQueue();
  await storageSet(StorageKeys.syncQueue, [...queue, item]);
  return item;
}

export async function dequeueSync(id: string): Promise<void> {
  const queue = await loadSyncQueue();
  await storageSet(StorageKeys.syncQueue, queue.filter((q) => q.id !== id));
}

export async function failSyncAttempt(id: string, message: string): Promise<void> {
  const queue = await loadSyncQueue();
  await storageSet(
    StorageKeys.syncQueue,
    queue.map((q) => (q.id === id ? { ...q, attempts: q.attempts + 1, lastError: message } : q)),
  );
}
