const DB_NAME = 'bac-offline';
const DB_VERSION = 1;
const STORE_NAME = 'workspace';
const WORKSPACE_KEY = 'latest';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runStoreRequest(mode, operation) {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  }));
}

export async function saveWorkspaceSnapshot(snapshot) {
  const payload = {
    ...snapshot,
    savedAt: new Date().toISOString()
  };

  await runStoreRequest('readwrite', (store) => store.put(payload, WORKSPACE_KEY));
  return payload;
}

export async function loadWorkspaceSnapshot() {
  const snapshot = await runStoreRequest('readonly', (store) => store.get(WORKSPACE_KEY));
  return snapshot || null;
}

export async function clearWorkspaceSnapshot() {
  await runStoreRequest('readwrite', (store) => store.delete(WORKSPACE_KEY));
}
