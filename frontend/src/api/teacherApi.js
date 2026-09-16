/**
 * Teacher Domain API Module
 */
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export const teacherApi = {
  /**
   * List all teachers/users (/users)
   */
  async listTeachers(token, role = null) {
    const path = role ? `/users?role=${encodeURIComponent(role)}` : '/users';
    return apiGet(path, { token });
  },

  /**
   * Add a new teacher (/users)
   */
  async createTeacher(token, teacherData) {
    return apiPost('/users', teacherData, { token });
  },

  /**
   * Update existing teacher (/users/{id})
   */
  async updateTeacher(token, id, teacherData) {
    return apiPut(`/users/${id}`, teacherData, { token });
  },

  /**
   * Delete teacher record (/users/{id})
   */
  async deleteTeacher(token, id) {
    return apiDelete(`/users/${id}`, { token });
  },

  /**
   * Update teacher self profile (/users/me)
   */
  async updateSelf(token, profileData) {
    return apiPut('/users/me', profileData, { token });
  },

  /**
   * Toggle admin privilege status (/users/{id})
   */
  async toggleAdminStatus(token, id, userData) {
    return apiPut(`/users/${id}`, userData, { token });
  }
};

export default teacherApi;
