/**
 * Attendance & Session Domain API Module
 */
import { apiGet, apiPost, apiPut } from './client';

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
   * Fetch session history by subject/date (/attendance/sessions-history)
   */
  async fetchSessionHistory(token, subjectId = null, dateVal = null) {
    let url = '/attendance/sessions-history';
    const params = [];
    if (subjectId) params.push(`subject_id=${subjectId}`);
    if (dateVal) params.push(`date=${dateVal}`);
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
  async sendAbsenteeAlerts(token, payload) {
    return apiPost('/attendance/send-absentee-alerts', payload, { token });
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
   * Fetch attendance report data (/attendance/report)
   */
  async fetchReport(token, startDate = null, endDate = null) {
    let url = '/attendance/report';
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return apiGet(url, { token });
  }
};

export default attendanceApi;
