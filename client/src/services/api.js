const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });

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
