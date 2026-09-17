import { createContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api';
import { getActiveTenantSlug } from '../utils/tenantConfig';
import { getApiBaseUrl } from '../utils/platform';
import { wakeBackend } from '../utils/cameraScanner';

export const AuthContext = createContext(null);

export const getRoleMismatchMessage = (expectedRole, actualRole) => {
  const portalNames = { student: 'Student', teacher: 'Teacher', hod: 'HOD', admin: 'Admin', parent: 'Parent' };
  const expected = portalNames[expectedRole] || expectedRole;
  const actual = portalNames[actualRole] || actualRole;
  return `This is a ${actual} account. Please navigate to the correct "${expected} Portal" to log in.`;
};

export function AuthProvider({ children }) {
  // Authentication State
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('cached_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [sessionFetchError, setSessionFetchError] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState('admin');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverWarmingUp, setServerWarmingUp] = useState(false);
  const [activeTelemetry, setActiveTelemetry] = useState({ total_active: 0, students: 0, teachers: 0, admins: 0 });

  // Play sound helper
  const playSound = (type) => {
    if (typeof window !== 'undefined' && typeof window.playCyberSound === 'function') {
      window.playCyberSound(type);
    }
  };

  // Heartbeat ping helper
  const sendHeartbeat = useCallback(async () => {
    if (!token) return;
    try {
      await authApi.sendHeartbeat(token, currentUser?.id || 0);
    } catch (err) {
      console.error('Error sending heartbeat:', err);
    }
  }, [token, currentUser]);

  // Active users telemetry helper
  const fetchActiveUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authApi.fetchActiveUsers(token);
      if (res && res.ok) {
        const data = await res.json();
        setActiveTelemetry(data);
      }
    } catch (err) {
      console.error('Error fetching active users:', err);
    }
  }, [token]);

  // Handle Logout
  const handleLogout = useCallback((onLogoutCallback) => {
    playSound('click');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isDemoMode');
    localStorage.removeItem('cached_user');
    localStorage.removeItem('onboarding_tour_done');
    localStorage.removeItem('onboarding_guide_done');
    setToken('');
    setUserRole('');
    setCurrentUser(null);
    if (typeof onLogoutCallback === 'function') {
      onLogoutCallback();
    }
  }, []);

  // Fetch Session Info
  const fetchSessionInfo = useCallback(async (authToken, onSuccess, onError) => {
    const API_BASE_URL = getApiBaseUrl();
    setSessionFetchError(false);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.role);
        setCurrentUser(data);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('cached_user', JSON.stringify(data));
        if (typeof onSuccess === 'function') {
          onSuccess(data, authToken);
        }
        return data;
      } else {
        if (res.status === 401 || res.status === 403) {
          handleLogout(onError);
        } else {
          console.error('Server error when fetching session info:', res.status);
          setSessionFetchError(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch session info (network error):', err);
      setSessionFetchError(true);
    }
  }, [handleLogout]);

  // Handle Login submission with Render cold-start retry logic
  const handleLogin = useCallback(async (e, onSuccess) => {
    if (e && e.preventDefault) e.preventDefault();
    playSound('click');
    setAuthError('');
    setIsLoading(true);
    setServerWarmingUp(true);

    const API_BASE_URL = getApiBaseUrl();

    const isParentLogin = loginRole === 'parent';
    const loginEndpoint = isParentLogin ? `${API_BASE_URL}/parents/login` : `${API_BASE_URL}/auth/token`;
    const loginHeaders = isParentLogin
      ? { 'Content-Type': 'application/json', 'X-Tenant-Slug': getActiveTenantSlug() }
      : { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Tenant-Slug': getActiveTenantSlug() };
    const loginBody = isParentLogin
      ? JSON.stringify({ email: loginEmail.trim().toLowerCase(), password: loginPassword })
      : (() => {
          const fd = new URLSearchParams();
          fd.append('username', loginEmail.trim().toLowerCase());
          fd.append('password', loginPassword);
          return fd;
        })();

    const MAX_RETRIES = 2;
    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          setAuthError(`Cloud server waking up... Retry ${attempt}/${MAX_RETRIES}`);
          await new Promise((r) => setTimeout(r, 2000 + attempt * 1000));
          await wakeBackend(API_BASE_URL, 2500);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);

        const res = await fetch(loginEndpoint, {
          method: 'POST',
          headers: loginHeaders,
          body: loginBody,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        let data = {};
        const raw = await res.text();
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          throw new Error('Server returned invalid response. Backend may still be starting.');
        }

        if (res.ok && data.access_token) {
          const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${data.access_token}` },
          });

          if (!meRes.ok) {
            throw new Error('Session validation failed');
          }
          const meData = await meRes.json();
          if (meData.role !== loginRole) {
            playSound('error');
            setAuthError(getRoleMismatchMessage(loginRole, meData.role));
            setIsLoading(false);
            setServerWarmingUp(false);
            return;
          }

          playSound('success');
          setAuthError('');
          setServerWarmingUp(false);
          localStorage.setItem('token', data.access_token);
          localStorage.setItem('loginRole', loginRole);
          localStorage.setItem('userRole', meData.role);
          localStorage.setItem('cached_user', JSON.stringify(meData));
          sessionStorage.setItem('just_logged_in_tour', 'true');
          setToken(data.access_token);
          setUserRole(meData.role);
          setCurrentUser(meData);
          setIsLoading(false);

          if (typeof onSuccess === 'function') {
            onSuccess({ token: data.access_token, userRole: meData.role, currentUser: meData });
          }
          return;
        }

        const detail = data.detail;
        const msg = Array.isArray(detail)
          ? detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
          : (detail || 'Incorrect email or password');
        playSound('error');
        setAuthError(msg);
        setIsLoading(false);
        setServerWarmingUp(false);
        return;
      } catch (err) {
        lastError = err;
        console.log(`Login attempt ${attempt + 1} failed:`, err.message);
      }
    }

    playSound('error');
    const hint = lastError?.name === 'AbortError'
      ? 'Request timed out — Render server is still waking up.'
      : (lastError?.message || 'Network error');
    setAuthError(`${hint} Tap "Wake Cloud Server" below, wait 45s, then login again. Default admin password: raj@9211`);
    setServerWarmingUp(true);
    setIsLoading(false);
  }, [loginEmail, loginPassword, loginRole]);

  // Handle SSO Login
  const handleSsoLogin = useCallback(async (provider, emailHint, onSuccess) => {
    playSound('click');
    setAuthError('');
    setIsLoading(true);

    const API_BASE_URL = getApiBaseUrl();
    try {
      const res = await fetch(`${API_BASE_URL}/sso/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Slug': getActiveTenantSlug(),
        },
        body: JSON.stringify({ provider, email_hint: emailHint }),
      });

      if (!res.ok) {
        let msg = 'SSO login failed';
        try {
          const errData = await res.json();
          msg = errData.detail || msg;
        } catch { /* ignore */ }
        throw new Error(msg);
      }

      const data = await res.json();
      if (!data.access_token) {
        throw new Error('SSO login failed (no access token)');
      }

      const meRes = await fetch(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${data.access_token}` } });
      const meData = meRes.ok ? await meRes.json() : { role: data.role, email: emailHint };

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('userRole', meData.role);
      localStorage.setItem('cached_user', JSON.stringify(meData));
      setToken(data.access_token);
      setUserRole(meData.role);
      setCurrentUser(meData);
      setLoginRole(meData.role);
      playSound('success');

      if (typeof onSuccess === 'function') {
        onSuccess({ token: data.access_token, userRole: meData.role, currentUser: meData });
      }
    } catch (e) {
      setAuthError(e.message || 'SSO login failed');
      playSound('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Heartbeat ping interval
  useEffect(() => {
    if (!token) return undefined;
    sendHeartbeat();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      sendHeartbeat();
    }, 60000);
    return () => clearInterval(interval);
  }, [token, sendHeartbeat]);

  const value = {
    token,
    setToken,
    userRole,
    setUserRole,
    currentUser,
    setCurrentUser,
    sessionFetchError,
    setSessionFetchError,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    loginRole,
    setLoginRole,
    authError,
    setAuthError,
    isLoading,
    setIsLoading,
    serverWarmingUp,
    setServerWarmingUp,
    activeTelemetry,
    setActiveTelemetry,
    handleLogin,
    handleSsoLogin,
    handleLogout,
    fetchSessionInfo,
    sendHeartbeat,
    fetchActiveUsers,
    getRoleMismatchMessage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
