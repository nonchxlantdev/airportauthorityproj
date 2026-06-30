import { openDB } from 'idb';

const DB_NAME = 'bac-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'queue';

const listeners = new Set();

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    }
  });
}

async function notifyListeners() {
  const count = await getQueueCount();
  listeners.forEach((listener) => listener(count));
}

export function subscribeQueueCount(listener) {
  listener(0);
  getQueueCount().then(listener);
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getQueueCount() {
  const database = await getDb();
  return database.count(STORE_NAME);
}

export async function listQueueItems() {
  const database = await getDb();
  const items = await database.getAll(STORE_NAME);
  return items.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function enqueueQueueItem(item) {
  const database = await getDb();
  const entry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    attempts: 0,
    ...item
  };
  await database.put(STORE_NAME, entry);
  await notifyListeners();
  return entry;
}

export async function removeQueueItem(id) {
  const database = await getDb();
  await database.delete(STORE_NAME, id);
  await notifyListeners();
}

export async function markQueueAttempt(id) {
  const database = await getDb();
  const item = await database.get(STORE_NAME, id);
  if (!item) return null;
  const nextItem = { ...item, attempts: (item.attempts || 0) + 1, lastAttemptAt: new Date().toISOString() };
  await database.put(STORE_NAME, nextItem);
  return nextItem;
}

export async function clearQueue() {
  const database = await getDb();
  await database.clear(STORE_NAME);
  await notifyListeners();
}
