import { useState, useEffect, useCallback } from 'react';
import { openDB } from 'idb';

const DB_NAME = 'roadsos-offline';
const STORE = 'offline_queue';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    }
  });
}

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedItems, setQueuedItems] = useState([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadQueue = useCallback(async () => {
    const db = await getDB();
    const items = await db.getAll(STORE);
    setQueuedItems(items);
    return items;
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const enqueue = useCallback(async (type, payload) => {
    const db = await getDB();
    const item = { type, payload, createdAt: Date.now() };
    await db.add(STORE, item);
    await loadQueue();
    return item;
  }, [loadQueue]);

  const dequeue = useCallback(async (id) => {
    const db = await getDB();
    await db.delete(STORE, id);
    await loadQueue();
  }, [loadQueue]);

  const clearAll = useCallback(async () => {
    const db = await getDB();
    await db.clear(STORE);
    setQueuedItems([]);
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && queuedItems.length > 0) {
      console.log(`[RoadSOS] Back online — ${queuedItems.length} items in queue`);
    }
  }, [isOnline, queuedItems]);

  return { isOnline, queuedItems, enqueue, dequeue, clearAll, loadQueue };
}
