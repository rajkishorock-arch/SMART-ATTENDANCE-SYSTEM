/**
 * Enterprise Kiosk & RFID/NFC Attendance API Module
 */
import { apiGet, apiPost } from './client.js';

export const enterpriseApi = {
  /**
   * Fetch kiosk mode branding and configurations.
   */
  async getKioskConfig(token = null) {
    const res = await apiGet('/enterprise/kiosk/config', { token });
    if (res && typeof res.json === 'function') {
      if (res.ok) return res.json();
      return null;
    }
    return res;
  },

  /**
   * Mark student attendance via RFID / NFC card tap.
   */
  async markRfidAttendance(token = null, payload = {}) {
    const res = await apiPost('/enterprise/rfid/mark', payload, { token });
    if (res && typeof res.json === 'function') {
      if (res.ok) return res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Card tap verification failed');
    }
    return res;
  },

  /**
   * Live frame recognition for Kiosk camera stream.
   */
  async recognizeFrame(token = null, payload = {}) {
    const res = await apiPost('/attendance/recognize-frame', payload, { token });
    if (res && typeof res.json === 'function') {
      if (res.ok) return res.json();
      return null;
    }
    return res;
  }
};
