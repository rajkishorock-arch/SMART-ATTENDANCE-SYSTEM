/**
 * Interactive Features & Audit Domain API Module
 */
import { apiGet, apiPost, buildApiUrl } from './client';
import { fetchWithDedupe } from '../utils/apiClient';

export const interactiveApi = {
  /**
   * Fetch extreme live-board mark feed (/extreme/level1/live-board)
   */
  async fetchLiveBoard(token) {
    return fetchWithDedupe(buildApiUrl('/extreme/level1/live-board'), {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  /**
   * Fetch system audit logs (/audit/)
   */
  async fetchAuditLogs(token, limit = 30) {
    return apiGet(`/audit/?limit=${limit}`, { token });
  },

  /**
   * Fetch interactive full health check (/interactive/full-health-check)
   */
  async fetchHealthCheck(token) {
    return apiGet('/interactive/full-health-check', { token });
  },

  /**
   * Fetch active interactive polls (/interactive/polls)
   */
  async fetchPolls(token) {
    return apiGet('/interactive/polls', { token });
  },

  /**
   * Create interactive quick poll (/interactive/polls)
   */
  async createPoll(token, pollData) {
    return apiPost('/interactive/polls', pollData, { token });
  },

  /**
   * Vote on interactive quick poll (/interactive/polls/{id}/vote)
   */
  async votePoll(token, pollId, optionIndex) {
    return apiPost(`/interactive/polls/${pollId}/vote`, { option_index: optionIndex }, { token });
  },

  /**
   * Fetch parent digest preview (/interactive/parent-digest-preview)
   */
  async fetchParentDigest(token) {
    return apiGet('/interactive/parent-digest-preview', { token });
  },

  /**
   * Dispatch batch absentee notifications (/interactive/notify-absent-batch)
   */
  async notifyAbsentBatch(token, payload = { notify_whatsapp: true }) {
    return apiPost('/interactive/notify-absent-batch', payload, { token });
  }
};

export default interactiveApi;
