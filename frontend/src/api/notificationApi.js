/**
 * Notification Domain API Module
 */
import { apiGet, apiPost, buildApiUrl } from './client';
import { fetchWithDedupe } from '../utils/apiClient';

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
  }
};

export default notificationApi;
