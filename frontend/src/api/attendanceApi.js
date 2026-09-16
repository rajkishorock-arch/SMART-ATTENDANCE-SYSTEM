/**
 * Attendance & Session Domain API Module
 */
import { apiGet, apiPost, apiPut, buildApiUrl } from './client';
import { fetchWithDedupe } from '../utils/apiClient';

export const attendanceApi = {
  /**
   * Fetch attendance logs (/attendance/logs)
   */
  async fetchLogs(token, skip = 0, limit = 100) {
    return apiGet(`/attendance/logs?skip=${skip}&limit=${limit}`, { token });
  },

  /**
   * Fetch overall dashboard attendance statistics (/attendance/stats)
   */
  async fetchStats(token) {
    return apiGet('/attendance/stats', { token });
  },

  /**
   * Fetch session history by subject/date/period (/attendance/sessions-history)
   */
  async fetchSessionHistory(token, subjectId = null, dateVal = null, periodVal = null) {
    let url = '/attendance/sessions-history';
    const params = [];
    if (typeof subjectId === 'object' && subjectId !== null) {
      const obj = subjectId;
      if (obj.subject_id) params.push(`subject_id=${encodeURIComponent(obj.subject_id)}`);
      if (obj.date_filter) params.push(`date_filter=${encodeURIComponent(obj.date_filter)}`);
      else if (obj.date) params.push(`date=${encodeURIComponent(obj.date)}`);
      if (obj.period) params.push(`period=${encodeURIComponent(obj.period)}`);
    } else {
      if (subjectId) params.push(`subject_id=${encodeURIComponent(subjectId)}`);
      if (dateVal) params.push(`date_filter=${encodeURIComponent(dateVal)}`);
      if (periodVal) params.push(`period=${encodeURIComponent(periodVal)}`);
    }
    if (params.length > 0) url += `?${params.join('&')}`;
    return apiGet(url, { token });
  },

  /**
   * Submit manual attendance register (/attendance/manual)
   */
  async submitManualAttendance(token, payload) {
    return apiPost('/attendance/manual', payload, { token });
  },

  /**
   * Toggle student attendance status for session (/attendance/status)
   */
  async toggleSessionStatus(token, payload) {
    return apiPut('/attendance/status', payload, { token });
  },

  /**
   * Dispatch absentee alerts (/attendance/send-absentee-alerts)
   */
  async sendAbsenteeAlerts(token, subjectId = null, dateVal = null) {
    let url = '/attendance/send-absentee-alerts';
    const params = [];
    if (typeof subjectId === 'object' && subjectId !== null) {
      const obj = subjectId;
      if (obj.subject_id) params.push(`subject_id=${encodeURIComponent(obj.subject_id)}`);
      if (obj.date) params.push(`date=${encodeURIComponent(obj.date)}`);
    } else {
      if (subjectId) params.push(`subject_id=${encodeURIComponent(subjectId)}`);
      if (dateVal) params.push(`date=${encodeURIComponent(dateVal)}`);
    }
    if (params.length > 0) url += `?${params.join('&')}`;
    return apiPost(url, null, { token });
  },

  /**
   * Scan dynamic QR token for attendance (/attendance/scan-qr)
   */
  async scanQr(token, payload) {
    return apiPost('/attendance/scan-qr', payload, { token });
  },

  /**
   * Perform face recognition on camera frame blob (/attendance/recognize-frame)
   */
  async recognizeFrame(token, formData) {
    return apiPost('/attendance/recognize-frame', formData, { token });
  },

  /**
   * Fetch student's academic blueprint timetable (/attendance/my-calendar)
   */
  async fetchBlueprint(token) {
    return apiGet('/attendance/my-calendar', { token });
  },

  /**
   * Fetch subject-wise stats for student (/attendance/my-report)
   */
  async fetchSubjectStats(token) {
    return apiGet('/attendance/my-report', { token });
  },

  /**
   * Fetch student's attendance report for specific subject (/attendance/my-report?subject_id=...)
   */
  async fetchMyReport(token, subjectId) {
    return fetchWithDedupe(buildApiUrl(`/attendance/my-report?subject_id=${encodeURIComponent(subjectId)}`), {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  /**
   * Fetch attendance report data (/attendance/report)
   */
  async fetchReport(token, startDate = null, endDate = null, subjectId = null, department = null) {
    let url = '/attendance/report';
    const params = [];
    if (typeof startDate === 'object' && startDate !== null) {
      const obj = startDate;
      if (obj.subject_id) params.push(`subject_id=${encodeURIComponent(obj.subject_id)}`);
      if (obj.start_date) params.push(`start_date=${encodeURIComponent(obj.start_date)}`);
      if (obj.end_date) params.push(`end_date=${encodeURIComponent(obj.end_date)}`);
      if (obj.department) params.push(`department=${encodeURIComponent(obj.department)}`);
    } else {
      if (subjectId) params.push(`subject_id=${encodeURIComponent(subjectId)}`);
      if (startDate) params.push(`start_date=${encodeURIComponent(startDate)}`);
      if (endDate) params.push(`end_date=${encodeURIComponent(endDate)}`);
      if (department) params.push(`department=${encodeURIComponent(department)}`);
    }
    if (params.length > 0) url += `?${params.join('&')}`;
    return apiGet(url, { token });
  }
};

export default attendanceApi;
