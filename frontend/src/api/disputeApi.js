/**
 * Attendance Dispute Domain API Module
 */
import { apiGet, apiPost } from './client.js';

export const disputeApi = {
  /**
   * Fetch current student's disputes (/disputes/my-disputes)
   */
  async fetchMyDisputes(token) {
    return apiGet('/disputes/my-disputes', { token });
  },

  /**
   * Fetch single dispute detail by ID (/disputes/{id})
   */
  async fetchDispute(token, id) {
    return apiGet(`/disputes/${encodeURIComponent(id)}`, { token });
  },

  /**
   * Cancel a pending dispute (/disputes/{id}/cancel)
   */
  async cancelDispute(token, id) {
    return apiPost(`/disputes/${encodeURIComponent(id)}/cancel`, null, { token });
  },

  /**
   * Add a comment to a dispute thread (/disputes/{id}/comments)
   */
  async addDisputeComment(token, id, payload) {
    return apiPost(`/disputes/${encodeURIComponent(id)}/comments`, payload, { token });
  },

  /**
   * Fetch disputes queue for admin/teacher review (/disputes/queue?status=...)
   */
  async fetchDisputeQueue(token, statusFilter = 'ALL') {
    const path = statusFilter && statusFilter !== 'ALL'
      ? `/disputes/queue?status=${encodeURIComponent(statusFilter)}`
      : '/disputes/queue';
    return apiGet(path, { token });
  },

  /**
   * Review/Approve/Reject a dispute (/disputes/{id}/review)
   */
  async reviewDispute(token, id, payload) {
    return apiPost(`/disputes/${encodeURIComponent(id)}/review`, payload, { token });
  },

  /**
   * Escalate a dispute to HOD/Admin (/disputes/{id}/escalate)
   */
  async escalateDispute(token, id, payload) {
    return apiPost(`/disputes/${encodeURIComponent(id)}/escalate`, payload, { token });
  }
};

export default disputeApi;
