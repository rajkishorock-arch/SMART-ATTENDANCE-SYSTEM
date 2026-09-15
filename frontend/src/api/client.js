/**
 * Low-level HTTP Client for SMART-ATTENDANCE-SYSTEM API Service Layer.
 * Reuses existing getApiBaseUrl() and fetchWithDedupe() while preserving 100% contract compatibility.
 */
import { getApiBaseUrl } from '../utils/platform';
import { fetchWithDedupe } from '../utils/apiClient';

/**
 * Builds canonical full API URL for a given path.
 */
export function buildApiUrl(path) {
  const baseUrl = getApiBaseUrl();
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Constructs HTTP headers including optional Bearer token and JSON content-type.
 */
export function buildHeaders(token = null, customHeaders = {}, isFormData = false) {
  const headers = { ...customHeaders };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isFormData && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

/**
 * Low-level HTTP GET request handler.
 */
export async function apiGet(path, options = {}) {
  const url = buildApiUrl(path);
  const headers = buildHeaders(options.token, options.headers, false);

  return fetchWithDedupe(url, {
    method: 'GET',
    headers,
    signal: options.signal,
    skipDedupe: options.skipDedupe,
    abortGroupKey: options.abortGroupKey,
  });
}

/**
 * Low-level HTTP POST request handler.
 */
export async function apiPost(path, body = null, options = {}) {
  const url = buildApiUrl(path);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = buildHeaders(options.token, options.headers, isFormData);

  const reqBody = isFormData ? body : (body !== null ? JSON.stringify(body) : undefined);

  return fetchWithDedupe(url, {
    method: 'POST',
    headers,
    body: reqBody,
    signal: options.signal,
    skipDedupe: true,
  });
}

/**
 * Low-level HTTP PUT request handler.
 */
export async function apiPut(path, body = null, options = {}) {
  const url = buildApiUrl(path);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = buildHeaders(options.token, options.headers, isFormData);

  const reqBody = isFormData ? body : (body !== null ? JSON.stringify(body) : undefined);

  return fetchWithDedupe(url, {
    method: 'PUT',
    headers,
    body: reqBody,
    signal: options.signal,
    skipDedupe: true,
  });
}

/**
 * Low-level HTTP DELETE request handler.
 */
export async function apiDelete(path, options = {}) {
  const url = buildApiUrl(path);
  const headers = buildHeaders(options.token, options.headers, false);

  return fetchWithDedupe(url, {
    method: 'DELETE',
    headers,
    signal: options.signal,
    skipDedupe: true,
  });
}
