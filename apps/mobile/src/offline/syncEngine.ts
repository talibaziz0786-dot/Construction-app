/**
 * Sync engine — replays the offline queue against the authoritative server
 * when connectivity returns. Deterministic + idempotent:
 * - queue items are replayed FIFO; each successful POST removes the item;
 * - failures increment attempts and keep the item (no data loss, no dupes);
 * - history entries are marked server-verified on success.
 */
import { runCalculator } from '../api/calculatorApi';
import { dequeueSync, failSyncAttempt, loadSyncQueue, markHistoryVerified } from './history';

export type SyncState = 'idle' | 'syncing' | 'pending' | 'failed';

export async function syncPending(historyIdByQueueId: Record<string, string>): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;
  const queue = await loadSyncQueue();
  for (const item of queue) {
    try {
      const serverResult = await runCalculator(item.calculatorId, { values: item.values });
      const historyId = historyIdByQueueId[item.id];
      if (historyId) {
        await markHistoryVerified(historyId, serverResult);
      }
      await dequeueSync(item.id);
      synced += 1;
    } catch (error) {
      failed += 1;
      await failSyncAttempt(item.id, error instanceof Error ? error.message : String(error));
    }
  }
  return { synced, failed };
}
