/**
 * System Administration & Multi-Tenant Domain API Module
 */
import { apiGet, apiPost, apiPut, apiDelete, buildApiUrl } from './client.js';
import { fetchWithDedupe } from '../utils/apiClient.js';

export const systemApi = {
  /**
   * Fetch tenant branding (/institutions/branding/{slug})
   */
  async fetchBranding(slug) {
    return apiGet(`/institutions/branding/${slug}`);
  },

  /**
   * Fetch system institutions list (/institutions/)
   */
  async listInstitutions(token) {
    if (token) {
      return apiGet('/institutions/', { token });
    }
    return fetchWithDedupe(buildApiUrl('/institutions/'));
  },

  /**
   * Fetch premium + subscription status (/premium/status)
   */
  async fetchPremiumStatus(token) {
    return fetchWithDedupe(buildApiUrl('/premium/status'), {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  /**
   * Fetch active automated attendance session (/schedules-auto/current-session)
   */
  async fetchCurrentAutoSession(token) {
    return fetchWithDedupe(buildApiUrl('/schedules-auto/current-session'), {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  /**
   * Create new institution tenant (/institutions/)
   */
  async createInstitution(token, instData) {
    return apiPost('/institutions/', instData, { token });
  },

  /**
   * Update institution tenant (/institutions/{id})
   */
  async updateInstitution(token, id, instData) {
    return apiPut(`/institutions/${id}`, instData, { token });
  },

  /**
   * Delete institution tenant (/institutions/{id})
   */
  async deleteInstitution(token, id) {
    return apiDelete(`/institutions/${id}`, { token });
  },

  /**
   * Change institution master key (/institutions/master-key)
   */
  async changeMasterKey(token, masterKey) {
    return apiPut('/institutions/master-key', { master_key: masterKey }, { token });
  },

  /**
   * Fetch system settings (/settings/)
   */
  async fetchSettings(token) {
    return apiGet('/settings/', { token });
  },

  /**
   * Save system settings (/settings/)
   */
  async saveSettings(token, settingsData) {
    return apiPut('/settings/', settingsData, { token });
  },

  /**
   * Publish release update (/settings/release-update)
   */
  async publishRelease(token, releaseData) {
    return apiPost('/settings/release-update', releaseData, { token });
  },

  /**
   * Toggle beta update active status (/settings/toggle-beta-active)
   */
  async toggleUpdateActive(token, payload) {
    return apiPost('/settings/toggle-beta-active', payload, { token });
  },

  /**
   * Trigger automated build callback (/settings/trigger-build)
   */
  async triggerBuild(token, buildPayload) {
    return apiPost('/settings/trigger-build', buildPayload, { token });
  },

  /**
   * Test SMTP mail server (/health/test-smtp)
   */
  async testSmtp(token, smtpData) {
    return apiPost('/health/test-smtp', smtpData, { token });
  },

  /**
   * Fetch system health details (/health/detailed)
   */
  async fetchSystemHealth() {
    return apiGet('/health/detailed');
  },

  /**
   * Fetch user feedback submissions (/feedbacks/)
   */
  async fetchFeedbacks(token) {
    return apiGet('/feedbacks/', { token });
  },

  /**
   * Submit user feedback (/feedbacks/)
   */
  async submitFeedback(token, feedbackData) {
    return apiPost('/feedbacks/', feedbackData, { token });
  },

  /**
   * Fetch departments list (/departments/)
   */
  async fetchDepartments(token) {
    return apiGet('/departments/', { token });
  },

  /**
   * Fetch subjects list (/subjects)
   */
  async fetchSubjects(token) {
    return apiGet('/subjects', { token });
  },

  /**
   * Create new subject (/subjects)
   */
  async createSubject(token, subjectData) {
    return apiPost('/subjects', subjectData, { token });
  },

  /**
   * Fetch timetable schedules (/schedules)
   */
  async fetchSchedules(token) {
    return apiGet('/schedules', { token });
  },

  /**
   * Create new schedule (/schedules)
   */
  async createSchedule(token, scheduleData) {
    return apiPost('/schedules', scheduleData, { token });
  }
};

export default systemApi;
