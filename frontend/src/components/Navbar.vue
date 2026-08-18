<template>
  <header class="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-2 border-b border-border-subtle bg-white px-3 shadow-xs sm:px-6">
    <button
      class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
      type="button"
      aria-label="Open navigation"
      @click="emit('toggle-menu')"
    >
      <span class="material-symbols-outlined">menu</span>
    </button>

    <div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-4 lg:max-w-xl">
      <div class="relative hidden w-full max-w-md sm:block">
        <span class="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search students, courses, announcements..."
          class="w-full rounded-eight border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-4 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-container font-sans"
          @input="handleSearchInput"
          @focus="searchFocused = true"
          @keydown.esc="closeSearch"
          @keydown.enter.prevent="openFirstSearchResult"
        />
        <div v-if="searchFocused && searchQuery.trim().length >= 2" class="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div v-if="searchLoading" class="px-4 py-4 text-xs text-slate-500">Searching the system…</div>
          <div v-else-if="!searchResults.length" class="px-4 py-4 text-xs text-slate-500">No matching records found.</div>
          <div v-else class="max-h-96 overflow-y-auto py-1">
            <section v-for="group in searchGroups" :key="group.type" class="border-b border-slate-100 last:border-0">
              <h2 class="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{{ resultTypeLabel(group.type) }}</h2>
              <button v-for="item in group.items" :key="`${item.type}-${item.id}`" type="button" class="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50" @mousedown.prevent @click="openSearchResult(item)">
                <span class="mt-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-700">{{ item.type }}</span>
                <span class="min-w-0">
                  <span class="block truncate text-sm font-semibold text-slate-800">{{ item.title }}</span>
                  <span v-if="item.subtitle" class="mt-0.5 block truncate text-[11px] text-slate-500">{{ item.subtitle }}</span>
                </span>
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-2 sm:gap-4">
      <span v-if="currentUser" class="hidden items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800 sm:inline-flex font-geist">
        <span class="h-2 w-2 animate-pulse rounded-full bg-indigo-600"></span>
        {{ currentUser.role }} Portal
      </span>

      <LanguagePicker v-if="currentUser" class="hidden sm:inline-flex" />

      <div v-if="currentUser" class="relative">
        <button
          type="button"
          class="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Open notifications"
          :aria-expanded="notificationsOpen"
          @click="toggleNotifications"
        >
          <span class="material-symbols-outlined text-xl">notifications</span>
          <span v-if="unreadCount > 0" class="absolute right-1 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </button>

        <div v-if="notificationsOpen" class="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <div class="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-sm font-bold text-slate-900">Notifications</h2>
              <p class="mt-0.5 text-[11px] text-slate-500">{{ unreadCount ? `${unreadCount} unread` : 'All caught up' }}</p>
            </div>
            <button v-if="unreadCount" type="button" class="text-[11px] font-semibold text-primary-container hover:underline" @click="markAllRead">Mark all read</button>
          </div>
          <div v-if="notificationsLoading" class="py-6 text-center text-xs text-slate-500">Loading notifications…</div>
          <div v-else-if="!notifications.length" class="py-6 text-center text-xs text-slate-500">No notifications yet.</div>
          <div v-else class="max-h-80 overflow-y-auto divide-y divide-slate-100">
            <router-link
              v-for="notification in notifications"
              :key="notification.notification_id"
              :to="notification.link_path || '/announcements'"
              class="block py-3 first:pt-3 hover:bg-slate-50"
              @click="openNotification(notification)"
            >
              <div class="flex items-start gap-2">
                <span :class="notification.read_at ? 'bg-slate-300' : 'bg-primary-container'" class="mt-1.5 h-2 w-2 shrink-0 rounded-full"></span>
                <div class="min-w-0">
                  <p class="truncate text-xs font-semibold text-slate-800">{{ notification.title }}</p>
                  <p class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{{ notification.body }}</p>
                  <p class="mt-1 text-[10px] text-slate-400">{{ formatNotificationDate(notification.created_at) }}</p>
                </div>
              </div>
            </router-link>
          </div>
        </div>
      </div>

      <div v-if="currentUser" class="h-6 w-px bg-slate-200"></div>

      <div v-if="currentUser" class="flex items-center gap-3">
        <span class="hidden text-xs font-semibold text-slate-800 md:inline-block font-geist">{{ currentUser.name }}</span>
        <button
          @click="handleLogout"
          class="flex items-center gap-1 rounded-eight border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 font-geist"
        >
          <span class="material-symbols-outlined text-base">logout</span>
          Sign Out
        </button>
      </div>

      <div v-else class="flex items-center gap-2">
        <router-link to="/login" class="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-primary-container font-geist">Sign In</router-link>
        <router-link to="/signup" class="rounded-eight bg-primary-container px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-primary-600 font-geist">Register</router-link>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchNotifications, fetchUniversalSearch, fetchUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from '../api.js'
import { authStore } from '../store/auth'
import LanguagePicker from './LanguagePicker.vue'

const router = useRouter()
const emit = defineEmits(['toggle-menu'])
const currentUser = computed(() => authStore.user.value)
const notificationsOpen = ref(false)
const notificationsLoading = ref(false)
const notifications = ref([])
const unreadCount = ref(0)
const searchQuery = ref('')
const searchResults = ref([])
const searchLoading = ref(false)
const searchFocused = ref(false)
let searchTimer = null
let searchRequestId = 0

function closeSearch() {
  searchFocused.value = false
}

const searchGroups = computed(() => {
  const grouped = new Map()
  for (const item of searchResults.value) {
    if (!grouped.has(item.type)) grouped.set(item.type, [])
    grouped.get(item.type).push(item)
  }
  return [...grouped.entries()].map(([type, items]) => ({ type, items }))
})

function resultTypeLabel(type) {
  const labels = {
    course: 'Courses',
    student: 'Students',
    teacher: 'Teachers',
    announcement: 'Announcements',
    assessment: 'Assessments',
    grade: 'Grades',
    session: 'Class sessions',
    financial: 'Financial records',
  }
  return labels[type] || 'Results'
}

function handleSearchInput() {
  if (searchTimer) window.clearTimeout(searchTimer)
  const query = searchQuery.value.trim()
  if (query.length < 2 || !authStore.token.value) {
    searchResults.value = []
    searchLoading.value = false
    return
  }
  searchLoading.value = true
  searchTimer = window.setTimeout(() => searchUniversal(query), 220)
}

async function searchUniversal(query) {
  const requestId = ++searchRequestId
  const result = await fetchUniversalSearch(authStore.token.value, query)
  if (requestId !== searchRequestId) return
  searchLoading.value = false
  searchResults.value = result.ok ? (result.data?.results || []) : []
}

function openSearchResult(item) {
  searchQuery.value = item.title || ''
  closeSearch()
  if (item.link_path) router.push(item.link_path)
}

function openFirstSearchResult() {
  if (searchResults.value[0]) openSearchResult(searchResults.value[0])
}

async function loadNotifications() {
  const token = authStore.token.value
  if (!token) {
    notifications.value = []
    unreadCount.value = 0
    return
  }
  notificationsLoading.value = true
  const [listResult, countResult] = await Promise.all([
    fetchNotifications(token, { limit: 20 }),
    fetchUnreadNotificationCount(token),
  ])
  if (listResult.ok) notifications.value = listResult.data || []
  if (countResult.ok) unreadCount.value = Number(countResult.data?.unread_count || 0)
  notificationsLoading.value = false
}

async function toggleNotifications() {
  notificationsOpen.value = !notificationsOpen.value
  if (notificationsOpen.value) await loadNotifications()
}

async function openNotification(notification) {
  if (!notification.read_at) {
    const result = await markNotificationRead(authStore.token.value, notification.notification_id)
    if (result.ok) {
      notification.read_at = result.data?.read_at || new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }
  notificationsOpen.value = false
}

async function markAllRead() {
  const result = await markAllNotificationsRead(authStore.token.value)
  if (result.ok) {
    notifications.value = notifications.value.map((notification) => ({ ...notification, read_at: notification.read_at || new Date().toISOString() }))
    unreadCount.value = 0
  }
}

function formatNotificationDate(value) {
  if (!value) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

const handleLogout = async () => {
  notificationsOpen.value = false
  await authStore.logout()
  await router.replace('/')
}

watch(() => authStore.token.value, () => {
  loadNotifications()
  searchQuery.value = ''
  searchResults.value = []
})
onMounted(loadNotifications)
</script>
