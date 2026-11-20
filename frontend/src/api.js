// Small fetch wrapper for the Vidya API. The JWT is kept in localStorage.
const TOKEN_KEY = 'vidya.token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  } catch {
    throw new ApiError(0, 'Cannot reach the Vidya server. Is the backend running on port 5050?');
  }
  if (res.status === 204) return null;
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    const fallback = res.status === 502 || res.status === 504 ? 'Cannot reach the Vidya server. Is the backend running on port 5050?' : `Request failed (${res.status})`;
    throw new ApiError(res.status, data?.error || fallback);
  }
  return data;
}
