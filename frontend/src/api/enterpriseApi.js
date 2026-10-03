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
   * Live frame recognition for Kiosk camera stream (multipart/form-data).
   */
  async recognizeFrame(token = null, formData, queryParams = {}) {
    let url = '/attendance/recognize-frame';
    const params = new URLSearchParams();
    if (queryParams.subject_id) params.append('subject_id', queryParams.subject_id);
    if (queryParams.custom_date) params.append('custom_date', queryParams.custom_date);
    if (queryParams.custom_time) params.append('custom_time', queryParams.custom_time);
    const qStr = params.toString();
    if (qStr) url += `?${qStr}`;

    const res = await apiPost(url, formData, { token });
    if (res && typeof res.json === 'function') {
      if (res.ok) return res.json();
      return null;
    }
    return res;
  }
};
