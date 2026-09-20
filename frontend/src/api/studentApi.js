/**
 * Student Domain API Module
 */
import { apiGet, apiPost, apiPut, apiDelete } from './client.js';

export const studentApi = {
  /**
   * List students registered in the system (/users/students)
   */
  async listStudents(token, skip = 0, limit = 100) {
    return apiGet(`/users/students?skip=${skip}&limit=${limit}`, { token });
  },

  /**
   * Add a new student (/users/students)
   */
  async createStudent(token, studentData) {
    return apiPost('/users/students', studentData, { token });
  },

  /**
   * Update existing student (/users/students/{id})
   */
  async updateStudent(token, id, studentData) {
    return apiPut(`/users/students/${id}`, studentData, { token });
  },

  /**
   * Delete student record (/users/students/{id})
   */
  async deleteStudent(token, id) {
    return apiDelete(`/users/students/${id}`, { token });
  },

  /**
   * Bulk delete students (/users/students/bulk-delete or sequential)
   */
  async deleteStudentBulk(token, id) {
    return apiDelete(`/users/students/${id}`, { token });
  },

  /**
   * Trigger face recognition model training (/users/students/train)
   */
  async trainModel(token) {
    return apiPost('/users/students/train', {}, { token });
  },

  /**
   * Upload face sample for student (/users/students/{id}/upload-sample)
   */
  async uploadSample(token, id, formData) {
    return apiPost(`/users/students/${id}/upload-sample`, formData, { token });
  },

  /**
   * Fetch current student's personal attendance logs (/users/students/me/attendance)
   */
  async fetchMyAttendance(token) {
    return apiGet('/users/students/me/attendance', { token });
  },

  /**
   * Fetch current student's leave requests (/users/students/me/leave-requests)
   */
  async fetchMyLeaves(token) {
    return apiGet('/users/students/me/leave-requests', { token });
  },

  /**
   * Apply for student leave (/users/students/me/leave-requests)
   */
  async applyLeave(token, leaveData) {
    return apiPost('/users/students/me/leave-requests', leaveData, { token });
  },

  /**
   * Change student password (/users/students/me/change-password)
   */
  async changePassword(token, passwordData) {
    return apiPost('/users/students/me/change-password', passwordData, { token });
  },

  /**
   * Submit biometric consent (/users/students/me/consent)
   */
  async submitConsent(token) {
    return apiPost('/users/students/me/consent', {}, { token });
  },

  /**
   * Revoke biometric consent (/users/students/me/revoke-consent)
   */
  async revokeConsent(token) {
    return apiPost('/users/students/me/revoke-consent', {}, { token });
  },

  /**
   * Upload selfie photo (/users/students/me/upload-selfie)
   */
  async uploadSelfie(token, formData) {
    return apiPost('/users/students/me/upload-selfie', formData, { token });
  },

  /**
   * Update student self profile (/users/students/me)
   */
  async updateSelf(token, profileData) {
    return apiPut('/users/students/me', profileData, { token });
  }
};

export default studentApi;
