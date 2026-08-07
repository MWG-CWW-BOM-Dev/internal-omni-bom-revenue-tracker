const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options
  });

  if (res.status === 401 || res.status === 403) {
    // If we get an unauthorized error and we are not on the login path, clear token and trigger reload
    if (!path.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth_error'));
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  baseUrl: API_BASE,
  list: (path) => request(path),
  create: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  update: (path, id, body) => request(`${path}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (path, id) => request(`${path}/${id}`, { method: 'DELETE' }),
  dashboard: (params) => request(`/dashboard/summary?${new URLSearchParams(params)}`)
};
