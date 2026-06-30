self.addEventListener('sync', (event) => {
  if (event.tag !== 'bac-offline-queue') return;

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => {
      client.postMessage({ type: 'FLUSH_OFFLINE_QUEUE' });
    });
  })());
});
