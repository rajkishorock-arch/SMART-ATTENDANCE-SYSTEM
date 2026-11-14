/**
 * Notification Domain API Module
 */
import { apiGet, apiPost, buildApiUrl } from './client.js';
import { fetchWithDedupe } from '../utils/apiClient.js';

export const notificationApi = {
  /**
   * Fetch unread notification count (/notifications/unread-count)
   */
  async fetchUnreadCount(token) {
    return fetchWithDedupe(buildApiUrl('/notifications/unread-count'), {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  /**
   * Fetch current user's notifications (/notifications/my-notifications)
   */
  async fetchMyNotifications(token, limit = 50) {
    return apiGet(`/notifications/my-notifications?limit=${limit}`, { token });
  },

  /**
   * Mark all notifications as read (/notifications/mark-all-read)
   */
  async markAllNotificationsRead(token) {
    return apiPost('/notifications/mark-all-read', null, { token });
  },

  /**
   * Delete a notification record (/notifications/delete/{id})
   */
  async deleteNotification(token, id) {
    return apiPost(`/notifications/delete/${encodeURIComponent(id)}`, null, { token });
  },

  /**
   * Mark a single notification as read (/notifications/mark-read/{id})
   */
  async markNotificationRead(token, id) {
    return apiPost(`/notifications/mark-read/${encodeURIComponent(id)}`, null, { token });
  },

  /**
   * Broadcast institution announcement across target roles (/notifications/broadcast)
   */
  async broadcastAnnouncement(token, payload) {
    const res = await apiPost('/notifications/broadcast', payload, { token });
    if (res && typeof res.json === 'function') {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'Failed to dispatch broadcast');
      }
      return await res.json();
    }
    return res;
  },

  /**
   * Fetch institution-wide broadcast notice history (/notifications/broadcasts)
   */
  async fetchBroadcastHistory(token, limit = 50, category = '') {
    const query = category ? `?limit=${limit}&category=${encodeURIComponent(category)}` : `?limit=${limit}`;
    const res = await apiGet(`/notifications/broadcasts${query}`, { token });
    if (res && typeof res.json === 'function') {
      if (res.ok) {
        return await res.json();
      }
      return [];
    }
    return Array.isArray(res) ? res : [];
  }
};

export default notificationApi;
