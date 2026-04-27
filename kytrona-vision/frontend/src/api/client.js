export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const WS_URL = API_URL.replace('http', 'ws');

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text();
    let detail = body;
    try {
      const parsed = JSON.parse(body);
      detail = parsed.detail || parsed.error || body;
    } catch {
      detail = body;
    }
    throw new Error(`Erro ${response.status} em ${path}${detail ? `: ${detail}` : ''}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  getCameras: () => request('/cameras'),
  createCamera: (payload) => request('/cameras', { method: 'POST', body: JSON.stringify(payload) }),
  deleteCamera: (id) => request(`/cameras/${id}`, { method: 'DELETE' }),
  updateCamera: (id, payload) => request(`/cameras/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getCameraControls: (id) => request(`/cameras/${id}/controls`),
  updateCameraControls: (id, payload) => request(`/cameras/${id}/controls`, { method: 'PUT', body: JSON.stringify(payload) }),
  startRecording: (id) => request(`/cameras/${id}/recording/start`, { method: 'POST' }),
  stopRecording: (id) => request(`/cameras/${id}/recording/stop`, { method: 'POST' }),
  getDetectionStatus: () => request('/cameras/detection/status'),
  getCameraDetections: (id) => request(`/cameras/${id}/detections`),
  createCameraDetection: (id, payload) => request(`/cameras/${id}/detections`, { method: 'POST', body: JSON.stringify(payload) }),
  updateCameraDetection: (cameraId, ruleId, payload) => request(`/cameras/${cameraId}/detections/${ruleId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCameraDetection: (cameraId, ruleId) => request(`/cameras/${cameraId}/detections/${ruleId}`, { method: 'DELETE' }),
  getZones: () => request('/zones'),
  createZone: (payload) => request('/zones', { method: 'POST', body: JSON.stringify(payload) }),
  updateZone: (id, payload) => request(`/zones/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteZone: (id) => request(`/zones/${id}`, { method: 'DELETE' }),
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
  streamUrl: (cameraId, version = '') => `${API_URL}/stream/${cameraId}${version ? `?v=${version}` : ''}`,
};
