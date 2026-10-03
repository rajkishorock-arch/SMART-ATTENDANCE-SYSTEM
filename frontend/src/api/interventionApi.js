/**
 * Intervention & Academic Recovery API Module
 */
import { apiGet, apiPost } from './client.js';

export const interventionApi = {
  /**
   * Fetch current intervention tier, deficit classes, counselor and action plan.
   */
  async getMyStatus(token = null) {
    const res = await apiGet('/interventions/my-status', { token });
    if (res && typeof res.json === 'function') {
      if (res.ok) return res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to load intervention status');
    }
    return res;
  },

  /**
   * Request an academic counseling meeting with faculty mentor.
   */
  async requestCounselor(token = null, payload = {}) {
    const res = await apiPost('/interventions/request-counselor', payload, { token });
    if (res && typeof res.json === 'function') {
      if (res.ok) return res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to request counseling meeting');
    }
    return res;
  }
};
