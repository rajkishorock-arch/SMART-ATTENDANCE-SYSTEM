import { useEffect } from 'react';
import { setupOfflineSyncListener } from '../utils/offlineQueue';

export default function useOfflineSync(token, apiBaseUrl) {
  useEffect(() => {
    if (!token || !apiBaseUrl) return undefined;
    return setupOfflineSyncListener(apiBaseUrl, () => token);
  }, [token, apiBaseUrl]);
}
