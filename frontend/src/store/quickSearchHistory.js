import { ref } from 'vue'

const STORAGE_PREFIX = 'sms.quickSearchHistory'
const MAX_HISTORY_ENTRIES = 10
const entries = ref([])
let activeStorageKey = ''

function userKey(user) {
  const identity = user?.user_id || user?.id || user?.email || 'anonymous'
  const role = user?.role || 'unknown'
  return `${STORAGE_PREFIX}.${role}.${identity}`
}

function sortEntries(values) {
  return [...values]
    .sort((left, right) => {
      const countDifference = Number(right.count || 0) - Number(left.count || 0)
      if (countDifference !== 0) return countDifference
      return Number(right.lastSearchedAt || 0) - Number(left.lastSearchedAt || 0)
    })
    .slice(0, MAX_HISTORY_ENTRIES)
}

function restore(user) {
  const key = userKey(user)
  if (key === activeStorageKey) return entries.value
  activeStorageKey = key
  try {
    const stored = window.localStorage.getItem(key)
    const parsed = stored ? JSON.parse(stored) : []
    entries.value = sortEntries(Array.isArray(parsed) ? parsed.filter((item) => item?.path && item?.label) : [])
  } catch {
    entries.value = []
  }
  return entries.value
}

function persist() {
  if (!activeStorageKey) return
  try {
    window.localStorage.setItem(activeStorageKey, JSON.stringify(entries.value))
  } catch {
    // The history remains available for the current session when storage is unavailable.
  }
}

function record(item, user) {
  restore(user)
  const now = Date.now()
  const existing = entries.value.find((entry) => entry.path === item.path)
  if (existing) {
    existing.count = Number(existing.count || 0) + 1
    existing.lastSearchedAt = now
    existing.label = item.label || existing.label
    existing.category = item.category || existing.category
    existing.purpose = item.purpose || existing.purpose
  } else {
    entries.value.push({
      path: item.path,
      label: item.label,
      category: item.category || 'Quick setting',
      purpose: item.purpose || '',
      count: 1,
      lastSearchedAt: now,
    })
  }
  entries.value = sortEntries(entries.value)
  persist()
}

function clear(user) {
  const key = userKey(user)
  activeStorageKey = key
  entries.value = []
  try {
    window.localStorage.removeItem(key)
  } catch {
    // The current-session history is still cleared when storage is unavailable.
  }
}

export const quickSearchHistory = {
  entries,
  restore,
  record,
  clear,
  maxEntries: MAX_HISTORY_ENTRIES,
}
