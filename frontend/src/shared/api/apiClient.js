const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
let token = '';

export const apiConfigured = Boolean(API_BASE_URL);
export const setApiToken = (value) => {
  token = value || '';
};
export const getApiToken = () => token;

export async function api(path, { method = 'GET', body, auth = true, ...options } = {}) {
  if (!API_BASE_URL)
    throw new Error('The API URL is missing. Set VITE_API_URL in the frontend environment.');
  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      payload?.error?.message || payload?.message || `API request failed (${response.status})`,
    );
    error.status = response.status;
    error.code = payload?.error?.code;
    error.details = payload?.error?.details;
    throw error;
  }
  return payload;
}

export const apiList = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.value) ? value.value : [];
