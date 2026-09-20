/**
 * Auth & Session Domain API Module
 */
import { apiGet, apiPost } from './client.js';

export const authApi = {
  /**
   * Primary User & Student Login (/auth/token)
   */
  async login(username, password) {
    return apiPost('/auth/token', { username, password });
  },

  /**
   * SSO OAuth Login (/sso/login)
   */
  async ssoLogin(provider, emailHint = null, idToken = null) {
    return apiPost('/sso/login', { provider, email_hint: emailHint, id_token: idToken });
  },

  /**
   * Fetch Authenticated Session Info (/auth/me)
   */
  async fetchMe(token) {
    return apiGet('/auth/me', { token });
  },

  /**
   * Fetch Active Online Users (/auth/active-users)
   */
  async fetchActiveUsers(token, userIds = []) {
    return apiPost('/auth/active-users', { active_user_ids: userIds }, { token });
  },

  /**
   * User Heartbeat (/auth/heartbeat)
   */
  async sendHeartbeat(token, userId, status = 'online') {
    return apiPost('/auth/heartbeat', { user_id: userId, status }, { token });
  }
};

export default authApi;
