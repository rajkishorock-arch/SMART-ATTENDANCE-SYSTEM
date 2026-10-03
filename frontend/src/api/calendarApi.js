/**
 * Academic Calendar Domain API Module
 */
import { apiGet, apiPost, apiDelete } from './client.js';

export const calendarApi = {
  /**
   * Fetch academic calendar events (/calendar/events)
   */
  async fetchEvents(token, eventType = null) {
    let url = '/calendar/events';
    if (eventType && eventType !== 'ALL') {
      url += `?event_type=${encodeURIComponent(eventType)}`;
    }
    const res = await apiGet(url, { token });
    if (res && typeof res.json === 'function') {
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : (data?.events || []);
      }
      return [];
    }
    if (Array.isArray(res)) return res;
    return [];
  },

  /**
   * Fetch calendar attendance metrics (/calendar/attendance-metrics)
   */
  async fetchAttendanceMetrics(token, subjectId = null) {
    let url = '/calendar/attendance-metrics';
    if (subjectId) {
      url += `?subject_id=${encodeURIComponent(subjectId)}`;
    }
    const res = await apiGet(url, { token });
    if (res && typeof res.json === 'function') {
      if (res.ok) {
        return res.json();
      }
      return null;
    }
    return res || null;
  },

  /**
   * Schedule new calendar event (/calendar/events)
   */
  async createEvent(token, eventData) {
    const res = await apiPost('/calendar/events', eventData, { token });
    if (res && typeof res.json === 'function') {
      if (res.ok) return res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to schedule calendar event');
    }
    return res;
  },

  /**
   * Record class cancellation (/calendar/cancel-class)
   */
  async cancelClass(token, cancelData) {
    const res = await apiPost('/calendar/cancel-class', cancelData, { token });
    if (res && typeof res.json === 'function') {
      if (res.ok) return res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to record class cancellation');
    }
    return res;
  },

  /**
   * Record teacher substitution (/calendar/substitute)
   */
  async substituteClass(token, substituteData) {
    const res = await apiPost('/calendar/substitute', substituteData, { token });
    if (res && typeof res.json === 'function') {
      if (res.ok) return res.json();
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to assign substitute faculty');
    }
    return res;
  },

  /**
   * Delete calendar event (/calendar/events/{id})
   */
  async deleteEvent(token, eventId) {
    const res = await apiDelete(`/calendar/events/${eventId}`, { token });
    if (res && typeof res.json === 'function') {
      if (res.ok) return res.json().catch(() => ({}));
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to remove calendar event');
    }
    return res;
  }
};

export default calendarApi;
