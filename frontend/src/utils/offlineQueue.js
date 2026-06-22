const QUEUE_KEY = 'smart_attendance_offline_queue';

export function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addToOfflineQueue(item) {
  const queue = getOfflineQueue();
  const clientId = item.client_id || `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  queue.push({ ...item, client_id: clientId, queued_at: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return clientId;
}

export function clearOfflineQueue() {
  localStorage.removeItem(QUEUE_KEY);
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
  if (result.synced > 0 || result.skipped > 0) {
    clearOfflineQueue();
  }
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
  return () => window.removeEventListener('online', handler);
}
