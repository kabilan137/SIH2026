const getApiBaseUrl = () => {
  const envVal = import.meta.env.VITE_API_BASE_URL;

  // If the env variable is set to a full URL (not a relative path like '/api'), use it
  if (envVal && envVal.startsWith('http')) {
    return envVal;
  }

  // Use Vite proxy for local development (avoids CORS entirely)
  const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.') ||
    window.location.hostname.endsWith('.local')
  );

  if (isLocal) {
    return '/api';
  }

  // All Vercel deployments (production + previews) talk to the single production server.
  // The server's CORS configuration allows all marketsense Vercel preview origins.
  return 'https://market-research-server.vercel.app/api';
};

const API_BASE_URL = getApiBaseUrl();
async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error?.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.details = payload?.error?.details;
    throw error;
  }

  return payload.data;
}

export function submitAnalysis(input, token) {
  return request('/analysis', {
    method: 'POST',
    body: JSON.stringify(input),
    token
  });
}

export function fetchHistory(limit = 25, token) {
  return request(`/history?limit=${limit}`, { token });
}

export function fetchHistoryItem(id, token) {
  return request(`/history/${id}`, { token });
}

export function deleteHistoryItem(id, token) {
  return request(`/history/${id}`, {
    method: 'DELETE',
    token
  });
}

export function sendChatMessage(id, messages, byokSettings = {}, token) {
  return request(`/analysis/${id}/chat`, {
    method: 'POST',
    body: JSON.stringify({
      messages,
      provider: byokSettings.provider,
      apiKey: byokSettings.apiKey,
      model: byokSettings.model
    }),
    token
  });
}

export function sendGeneralChatMessage(messages, byokSettings = {}, token) {
  return request('/analysis/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages,
      provider: byokSettings.provider,
      apiKey: byokSettings.apiKey,
      model: byokSettings.model
    }),
    token
  });
}

export function fetchConfig() {
  return request('/config');
}

export function getNicheSuggestions(businessType, location, token) {
  return request('/analysis/niche-suggestions', {
    method: 'POST',
    body: JSON.stringify({
      businessType,
      location: location || undefined
    }),
    token
  });
}

export function fetchAnalysisStatus(id, token) {
  return request(`/analysis/status/${id}`, { token });
}


