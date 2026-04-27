export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const WS_URL = API_URL.replace('http', 'ws');

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Erro ${response.status} em ${path}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  getCameras: () => request('/cameras'),
  createCamera: (payload) => request('/cameras', { method: 'POST', body: JSON.stringify(payload) }),
  getZones: () => request('/zones'),
  createZone: (payload) => request('/zones', { method: 'POST', body: JSON.stringify(payload) }),
  getAlerts: (filters = {}) => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    return request(`/alerts${params.toString() ? `?${params}` : ''}`);
  },
  getRecentAlerts: () => request('/alerts/recent'),
  resolveAlert: (id) => request(`/alerts/${id}/resolve`, { method: 'PUT' }),
  convertAlertToOccurrence: (id) => request(`/alerts/${id}/convert-to-occurrence`, { method: 'POST' }),
  getOccurrences: (filters = {}) => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    return request(`/occurrences${params.toString() ? `?${params}` : ''}`);
  },
  createOccurrence: (payload) => request('/occurrences', { method: 'POST', body: JSON.stringify(payload) }),
  updateOccurrence: (id, payload) => request(`/occurrences/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getWatchlist: () => request('/watchlist'),
  getOverview: () => request('/analytics/overview'),
  getCashiersRanking: () => request('/analytics/cashiers-ranking'),
  streamUrl: (cameraId) => `${API_URL}/stream/${cameraId}`,
};
