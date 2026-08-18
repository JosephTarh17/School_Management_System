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
          placeholder="Search courses or course codes..."
          class="w-full rounded-eight border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-4 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-container font-sans"
          @input="handleSearchInput"
          @focus="searchFocused = true"
          @keydown.esc="closeSearch"
          @keydown.enter.prevent="openFirstSearchResult"
        />
        <div v-if="searchFocused && searchQuery.trim().length >= 2" class="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div v-if="searchLoading" class="px-4 py-4 text-xs text-slate-500">Searching courses…</div>
          <div v-else-if="!searchResults.length" class="px-4 py-4 text-xs text-slate-500">No matching courses or course codes.</div>
          <div v-else class="max-h-80 overflow-y-auto py-1">
            <button v-for="course in searchResults" :key="course.course_id" type="button" class="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50" @mousedown.prevent @click="openSearchResult(course)">
              <span class="mt-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">{{ course.course_code }}</span>
              <span class="min-w-0">
                <span class="block truncate text-sm font-semibold text-slate-800">{{ course.course_name }}</span>
                <span class="mt-0.5 block text-[11px] text-slate-500">{{ Number(course.credit_units || 0) }} credits</span>
              </span>
            </button>
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
import { fetchClassSessionResources, fetchCourses, fetchNotifications, fetchRegistrationCatalog, fetchUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from '../api.js'
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

function handleSearchInput() {
  if (searchTimer) window.clearTimeout(searchTimer)
  const query = searchQuery.value.trim()
  if (query.length < 2 || !authStore.token.value || ['guardian'].includes(currentUser.value?.role)) {
    searchResults.value = []
    searchLoading.value = false
    return
  }
  searchLoading.value = true
  searchTimer = window.setTimeout(() => searchCourses(query), 220)
}

async function searchCourses(query) {
  const requestId = ++searchRequestId
  const role = currentUser.value?.role
  let result
  if (role === 'student') {
    result = await fetchRegistrationCatalog(authStore.token.value)
  } else if (role === 'teacher') {
    result = await fetchClassSessionResources(authStore.token.value)
    if (result.ok) result = { ...result, data: result.data?.available_courses || [] }
  } else {
    result = await fetchCourses(authStore.token.value, { search: query })
  }
  if (requestId !== searchRequestId) return
  searchLoading.value = false
  const rows = result.ok ? (result.data || []) : []
  const normalizedQuery = query.toLocaleLowerCase()
  searchResults.value = (role === 'administrator' ? rows : rows.filter((course) => `${course.course_code || ''} ${course.course_name || ''}`.toLocaleLowerCase().includes(normalizedQuery))).slice(0, 8)
}

function searchTarget() {
  if (currentUser.value?.role === 'student') return '/course-registration'
  if (currentUser.value?.role === 'teacher') return '/teacher-attendance'
  return '/course-catalog'
}

function openSearchResult(course) {
  searchQuery.value = course.course_code || ''
  closeSearch()
  router.push({ path: searchTarget(), query: { search: course.course_code || course.course_name || '' } })
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
