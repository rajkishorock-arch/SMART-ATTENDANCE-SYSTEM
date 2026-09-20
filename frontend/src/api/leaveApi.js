/**
 * Leave Management Domain API Module
 */
import { apiGet, apiPost, apiPut } from './client.js';

export const leaveApi = {
  /**
   * Fetch current user's or student's leave requests (/leaves/student/{id} or /leaves/my-requests)
   */
  async fetchMyLeaveRequests(token, studentId = null) {
    const path = studentId
      ? `/leaves/student/${encodeURIComponent(studentId)}`
      : '/leaves/my-requests';
    return apiGet(path, { token });
  },

  /**
   * Create a new student leave request (/leaves/)
   */
  async createLeaveRequest(token, payload) {
    return apiPost('/leaves/', payload, { token });
  },

  /**
   * Fetch all leave requests for admin review (/users/leaves)
   */
  async fetchAllLeaveRequests(token) {
    return apiGet('/users/leaves', { token });
  },

  /**
   * Review/Approve/Reject a leave request (/users/leaves/{id}/review)
   */
  async reviewLeaveRequest(token, id, payload) {
    return apiPut(`/users/leaves/${encodeURIComponent(id)}/review`, payload, { token });
  },

  /**
   * Submit student leave request (/users/students/me/leave-requests)
   */
  async submitStudentLeaveRequest(token, payload) {
    return apiPost('/users/students/me/leave-requests', payload, { token });
  }
};

export default leaveApi;
