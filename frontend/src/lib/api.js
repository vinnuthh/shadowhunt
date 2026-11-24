const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
export const WS_URL = (
  import.meta.env.VITE_WS_URL || API_URL.replace(/^http/, 'ws')
).replace(/\/$/, '')

async function request(path, { method = 'GET', token, body } = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-Player-Token': token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the game server. Check that the backend is running.')
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    // Empty or non-JSON response; handled below.
  }

  if (!response.ok) {
    throw new Error(data?.detail || `Request failed (${response.status})`)
  }
  return data
}

export const api = {
  createRoom: (displayName) =>
    request('/api/rooms', { method: 'POST', body: { display_name: displayName } }),

  joinRoom: (code, displayName) =>
    request(`/api/rooms/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      body: { display_name: displayName },
    }),

  getRoom: (code, token) =>
    request(`/api/rooms/${encodeURIComponent(code)}`, { token }),

  startMatch: (code, token, hunterCount) =>
    request(`/api/rooms/${encodeURIComponent(code)}/start`, {
      method: 'POST',
      token,
      body: { hunter_count: hunterCount },
    }),

  endMatch: (code, token) =>
    request(`/api/rooms/${encodeURIComponent(code)}/end`, {
      method: 'POST',
      token,
    }),

  leaveRoom: (code, token) =>
    request(`/api/rooms/${encodeURIComponent(code)}/leave`, {
      method: 'POST',
      token,
    }),

  getCampus: () => request('/api/campus'),

  updateLocation: (code, token, lat, lng) =>
    request(`/api/rooms/${encodeURIComponent(code)}/location`, {
      method: 'POST',
      token,
      body: { lat, lng },
    }),
}
