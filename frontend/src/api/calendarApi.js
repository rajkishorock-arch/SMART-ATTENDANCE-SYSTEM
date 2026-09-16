/**
 * Academic Calendar Domain API Module
 */
import { apiGet, apiPost, apiDelete } from './client';

export const calendarApi = {
  /**
   * Fetch academic calendar events (/calendar/events)
   */
  async fetchEvents(token, eventType = null) {
    let url = '/calendar/events';
    if (eventType && eventType !== 'ALL') {
      url += `?event_type=${encodeURIComponent(eventType)}`;
    }
    return apiGet(url, { token });
  },

  /**
   * Fetch calendar attendance metrics (/calendar/attendance-metrics)
   */
  async fetchAttendanceMetrics(token, subjectId = null) {
    let url = '/calendar/attendance-metrics';
    if (subjectId) {
      url += `?subject_id=${encodeURIComponent(subjectId)}`;
    }
    return apiGet(url, { token });
  },

  /**
   * Schedule new calendar event (/calendar/events)
   */
  async createEvent(token, eventData) {
    return apiPost('/calendar/events', eventData, { token });
  },

  /**
   * Record class cancellation (/calendar/cancel-class)
   */
  async cancelClass(token, cancelData) {
    return apiPost('/calendar/cancel-class', cancelData, { token });
  },

  /**
   * Record teacher substitution (/calendar/substitute)
   */
  async substituteClass(token, substituteData) {
    return apiPost('/calendar/substitute', substituteData, { token });
  },

  /**
   * Delete calendar event (/calendar/events/{id})
   */
  async deleteEvent(token, eventId) {
    return apiDelete(`/calendar/events/${eventId}`, { token });
  }
};

export default calendarApi;
