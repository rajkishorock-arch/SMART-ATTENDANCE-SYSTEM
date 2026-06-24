const QUEUE_KEY = 'smart_attendance_offline_queue';
const MAX_QUEUE_ITEMS = 500;

export function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addToOfflineQueue(item) {
  const queue = getOfflineQueue().slice(-MAX_QUEUE_ITEMS + 1);
  const clientId = item.client_id || `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  queue.push({ ...item, client_id: clientId, queued_at: new Date().toISOString(), retry_count: item.retry_count || 0 });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return clientId;
}

export function clearOfflineQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export function removeOfflineQueueItems(clientIds = []) {
  if (!clientIds.length) return;
  const idSet = new Set(clientIds);
  const remaining = getOfflineQueue().filter((item) => !idSet.has(item.client_id));
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

export function markOfflineQueueFailures(clientIds = []) {
  if (!clientIds.length) return;
  const idSet = new Set(clientIds);
  const updated = getOfflineQueue().map((item) => (
    idSet.has(item.client_id)
      ? { ...item, retry_count: (item.retry_count || 0) + 1, last_failed_at: new Date().toISOString() }
      : item
  ));
  localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export async function syncOfflineQueue(apiBaseUrl, token) {
  const queue = getOfflineQueue();
  if (!queue.length || !navigator.onLine) return { synced: 0, skipped: 0 };

  const res = await fetch(`${apiBaseUrl}/offline/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items: queue }),
  });

  if (!res.ok) {
    throw new Error('Offline sync failed');
  }

  const result = await res.json();
  removeOfflineQueueItems(result.processed_client_ids || []);
  markOfflineQueueFailures(result.failed_client_ids || []);
  return result;
}

export function setupOfflineSyncListener(apiBaseUrl, getToken) {
  const handler = async () => {
    if (!navigator.onLine) return;
    const token = getToken();
    if (!token) return;
    try {
      await syncOfflineQueue(apiBaseUrl, token);
    } catch (e) {
      console.warn('Offline sync:', e);
    }
  };
  window.addEventListener('online', handler);
  const interval = window.setInterval(handler, 60000);
  handler();
  return () => {
    window.removeEventListener('online', handler);
    window.clearInterval(interval);
  };
}
