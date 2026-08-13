import { reactive, computed } from 'vue'
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest } from '../api.js'

const state = reactive({
  user: JSON.parse(localStorage.getItem('sms_user') || 'null'),
  token: localStorage.getItem('sms_token') || null,
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

function persist() {
  if (state.user) localStorage.setItem('sms_user', JSON.stringify(state.user))
  else localStorage.removeItem('sms_user')
  if (state.token) localStorage.setItem('sms_token', state.token)
  else localStorage.removeItem('sms_token')
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
    }
    return state.user
  },

  async restoreSession() {
    if (!state.token) return null
    try {
      const result = await fetchCurrentUser(state.token)
      if (!result.ok || !result.data) throw new Error('Session expired')
      state.user = profileRecord(result.data)
      persist()
      return state.user
    } catch {
      this.clear()
      return null
    }
  },

  clear() {
    state.user = null
    state.token = null
    persist()
  },

  async logout() {
    if (state.token) await logoutRequest(state.token).catch(() => {})
    this.clear()
  },
}
