import { reactive, computed } from 'vue'
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest, refreshSession as refreshSessionRequest } from '../api.js'

const state = reactive({
  user: JSON.parse(sessionStorage.getItem('sms_user') || 'null'),
  token: sessionStorage.getItem('sms_token') || null,
})

function profileRecord(profile) {
  if (!profile) return null
  const roleProfile = profile.student || profile.teacher || profile.guardian || profile.administrator
  const name = roleProfile?.full_name || profile.email
  return {
    ...profile,
    id: profile.user_id,
    name,
    avatar: name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    role: String(profile.role || '').toLowerCase(),
    profile: roleProfile || null,
  }
}

let refreshTimer = null
let refreshInFlight = null

function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

function scheduleRefresh() {
  if (refreshTimer) window.clearTimeout(refreshTimer)
  if (!state.token) return
  const payload = decodeToken(state.token)
  const expiresAt = payload?.exp ? payload.exp * 1000 : Date.now() + 60 * 60 * 1000
  const delay = Math.max(30_000, expiresAt - Date.now() - 60_000)
  refreshTimer = window.setTimeout(() => { refresh().catch(() => {}) }, delay)
}

function clearState() {
  if (refreshTimer) window.clearTimeout(refreshTimer)
  refreshTimer = null
  state.user = null
  state.token = null
  persist()
}

async function refresh() {
  if (!state.token) return null
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = refreshSessionRequest(state.token).then(async (result) => {
    if (!result.ok || !result.token) {
      const error = new Error(result.error || 'Session expired')
      error.status = result.status
      throw error
    }
    state.token = result.token
    const current = await fetchCurrentUser(state.token)
    if (!current.ok || !current.data) throw new Error('Session expired')
    state.user = profileRecord(current.data)
    persist()
    scheduleRefresh()
    return state.user
  }).catch((error) => {
    if (error.status === 401 || error.status === 403) clearState()
    throw error
  }).finally(() => { refreshInFlight = null })
  return refreshInFlight
}

function persist() {
  // Session storage survives reloads in the same tab but is cleared when the tab closes.
  if (state.user) sessionStorage.setItem('sms_user', JSON.stringify(state.user))
  else sessionStorage.removeItem('sms_user')
  if (state.token) sessionStorage.setItem('sms_token', state.token)
  else sessionStorage.removeItem('sms_token')
  // Remove tokens created by older builds that used persistent localStorage.
  localStorage.removeItem('sms_user')
  localStorage.removeItem('sms_token')
}

export const authStore = {
  user: computed(() => state.user),
  token: computed(() => state.token),
  isAuthenticated: computed(() => !!state.token && !!state.user),
  userRole: computed(() => state.user?.role || null),

  async login(email, password) {
    const result = await loginRequest(email, password)
    if (!result.ok || !result.token) throw new Error(result.error || result.message || 'Unable to sign in')
    state.token = result.token
    state.user = profileRecord(result.data?.user || result.user)
    try {
      const current = await fetchCurrentUser(state.token)
      if (current.ok && current.data) state.user = profileRecord(current.data)
    } finally {
      persist()
      scheduleRefresh()
    }
    return state.user
  },

  async restoreSession() {
    if (!state.token) return null
    const current = await fetchCurrentUser(state.token)
    if (current.ok && current.data) {
      state.user = profileRecord(current.data)
      persist()
      scheduleRefresh()
      return state.user
    }
    if (current.status !== 401 && current.status !== 403) return state.user
    try {
      await refresh()
      return state.user
    } catch (error) {
      if (error.status === 401 || error.status === 403) this.clear()
      return state.user
    }
  },

  clear() {
    clearState()
  },

  async logout() {
    if (state.token) await logoutRequest(state.token).catch(() => {})
    this.clear()
  },
}
