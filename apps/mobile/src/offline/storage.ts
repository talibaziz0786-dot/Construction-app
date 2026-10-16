/**
 * Minimal persistent key-value storage for the Expo app.
 *
 * Uses AsyncStorage when installed (Expo Go includes the native module), and
 * falls back to an in-memory map so the app never crashes without it.
 * Only non-sensitive data is stored here: history, drafts, sync queue,
 * cached catalog, language. NEVER tokens, passwords or secrets.
 */
type Adapter = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

declare const require: undefined | ((id: string) => unknown);

const memory = new Map<string, string>();
const memoryAdapter: Adapter = {
  getItem: async (key) => (memory.has(key) ? memory.get(key) ?? null : null),
  setItem: async (key, value) => {
    memory.set(key, value);
  },
  removeItem: async (key) => {
    memory.delete(key);
  },
};

let adapter: Adapter = memoryAdapter;
let adapterName = 'memory';

// AsyncStorage is an optional peer: when present (installed + native module)
// it is used; otherwise the memory fallback keeps the app functional.
try {
  const req = typeof require === 'function' ? (require('@react-native-async-storage/async-storage') as unknown) : null;
  const mod = (req as { default?: unknown } | null)?.default ?? req;
  if (mod && typeof (mod as Adapter).getItem === 'function') {
    adapter = mod as Adapter;
    adapterName = 'async-storage';
  }
} catch {
  adapter = memoryAdapter;
}

export function storageBackend(): string {
  return adapterName;
}

export async function storageGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await adapter.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function storageSet(key: string, value: unknown): Promise<void> {
  try {
    await adapter.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is best-effort; calculation must never crash without it.
  }
}

export async function storageRemove(key: string): Promise<void> {
  try {
    await adapter.removeItem(key);
  } catch {
    // ignore
  }
}

export const StorageKeys = {
  history: 'cunstruction.history.v1',
  syncQueue: 'cunstruction.sync-queue.v1',
  catalogCache: 'cunstruction.catalog-cache.v1',
  drafts: 'cunstruction.drafts.v1',
  language: 'cunstruction.language.v1',
  ratesCache: 'cunstruction.rates-cache.v1',
} as const;
