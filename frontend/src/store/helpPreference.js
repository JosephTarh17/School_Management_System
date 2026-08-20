import { ref } from 'vue'

const STORAGE_KEY = 'sms.contextHelpEnabled'
const enabled = ref(true)
let restored = false

function restore() {
  if (restored) return
  restored = true
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored !== null) enabled.value = stored !== 'false'
  } catch {
    enabled.value = true
  }
}

function setEnabled(value) {
  enabled.value = Boolean(value)
  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled.value))
  } catch {
    // The preference remains available for the current session when storage is unavailable.
  }
}

function toggle() {
  setEnabled(!enabled.value)
}

restore()

export const helpPreference = {
  enabled,
  restore,
  setEnabled,
  toggle,
}
