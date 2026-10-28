import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'LedgerLineOffline';
const STORE = 'transactions';

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function initOfflineDB(): Promise<void> {
  if (navigator.storage?.persist) {
    await navigator.storage.persist();
  }
  dbPromise = openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('synced', 'synced');
      }
    },
  });
}

export async function saveOffline(tx: Record<string, unknown> & { id: string }): Promise<void> {
  if (!dbPromise) await initOfflineDB();
  const db = await dbPromise!;
  await db.add(STORE, { ...tx, synced: 0, createdAt: Date.now() });
}

export async function pendingTransactions(): Promise<Array<Record<string, unknown>>> {
  if (!dbPromise) await initOfflineDB();
  const db = await dbPromise!;
  return db.getAllFromIndex(STORE, 'synced', 0);
}

export async function markSynced(id: string): Promise<void> {
  if (!dbPromise) await initOfflineDB();
  const db = await dbPromise!;
  const tx = await db.get(STORE, id);
  if (tx) {
    tx.synced = 1;
    await db.put(STORE, tx);
  }
}

export async function syncAll(
  apiBase: string,
  token: string,
  outletId: string,
): Promise<void> {
  const all = await pendingTransactions();
  if (!all.length) return;
  for (let i = 0; i < all.length; i += 20) {
    const batch = all.slice(i, i + 20);
    const res = await fetch(`${apiBase}/offline/sync-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ outletId, transactions: batch }),
    });
    if (res.status === 202) {
      for (const tx of batch) await markSynced(tx.id as string);
    } else {
      break;
    }
  }
}
