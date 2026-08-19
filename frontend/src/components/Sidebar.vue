<template>
  <aside :class="[
    'fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col bg-slate-900 text-white shadow-xl transition-transform duration-200 lg:static lg:z-20 lg:min-h-screen lg:w-64 lg:max-w-none lg:translate-x-0 lg:shrink-0',
    mobileOpen ? 'translate-x-0' : '-translate-x-full'
  ]">
    <!-- Brand Header -->
    <div class="h-16 px-6 flex items-center justify-between border-b border-slate-800 bg-slate-950">
      <router-link :to="homeRoute" class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-inner">
          <span class="material-symbols-outlined text-xl">school</span>
        </div>
        <div>
          <span class="font-bold text-base tracking-tight text-white block">Scholastic</span>
          <span class="text-[10px] text-blue-400 font-geist uppercase tracking-widest block -mt-0.5">Management System</span>
        </div>
      </router-link>
    </div>

    <!-- Navigation Groups based on Role -->
    <div class="flex-1 overflow-y-auto py-4 px-3 space-y-6">
      <div v-for="group in activeMenuGroups" :key="group.title">
        <p class="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-geist mb-2">
          {{ group.title }}
        </p>
        <div class="space-y-1">
          <router-link
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            v-slot="{ isActive }"
          >
            <span
              @click="closeMobile"
              :class="[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              ]"
            >
              <span class="material-symbols-outlined text-xl opacity-90">{{ item.icon }}</span>
              <span class="truncate">{{ item.label }}</span>
            </span>
          </router-link>
        </div>
      </div>
    </div>

    <!-- User Card -->
    <div class="p-3 border-t border-slate-800 bg-slate-950/60" v-if="currentUser">
      <router-link to="/profile" class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 transition-colors">
        <div class="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center font-bold text-xs font-geist">
          {{ currentUser.avatar || 'U' }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-white truncate">{{ currentUser.name }}</p>
          <p class="text-[11px] text-slate-400 truncate font-geist">{{ currentUser.role }}</p>
        </div>
        <span class="material-symbols-outlined text-slate-400 text-lg">chevron_right</span>
      </router-link>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { authStore } from '../store/auth'

const props = defineProps({ mobileOpen: { type: Boolean, default: false } })
const emit = defineEmits(['close'])
const mobileOpen = computed(() => props.mobileOpen)
const closeMobile = () => emit('close')

const currentUser = computed(() => authStore.user.value)
const isStudent = computed(() => authStore.userRole.value === 'student')
const isAdministrator = computed(() => authStore.userRole.value === 'administrator')
const isTeacher = computed(() => authStore.userRole.value === 'teacher')
const isGuardian = computed(() => authStore.userRole.value === 'guardian')
const homeRoute = computed(() => {
  if (isStudent.value) return '/student-portal'
  if (isAdministrator.value) return '/admin-dashboard'
  if (isGuardian.value) return '/guardian-portal'
  return '/dashboard'
})

const studentMenuGroups = [
  {
    title: 'Student Portal',
    items: [
      { label: 'My Portal Overview', path: '/student-portal', icon: 'person' },
      { label: 'Announcements', path: '/announcements', icon: 'campaign' },
      { label: 'My Semester Calendar', path: '/calendar', icon: 'calendar_month' },
      { label: 'Timetables', path: '/timetables', icon: 'schedule' },
      { label: 'Course Catalog', path: '/course-catalog', icon: 'auto_stories' },
      { label: 'Course Registration', path: '/course-registration', icon: 'how_to_reg' },
      { label: 'My Assessments', path: '/assessments', icon: 'assignment' },
      { label: 'Absence Justifications', path: '/absence-justifications', icon: 'event_available' },
      { label: 'My Report Card', path: '/report-card', icon: 'description' },
      { label: 'Behavior & Discipline', path: '/behavior-discipline', icon: 'gavel' },
    ]
  },
  {
    title: 'Account',
    items: [
      { label: 'My Profile & Info', path: '/profile', icon: 'account_circle' },
    ]
  }
]

const administratorMenuGroups = [
  {
    title: 'Core Portals',
    items: [
      { label: 'Admin Dashboard', path: '/admin-dashboard', icon: 'admin_panel_settings' },
      { label: 'Announcements', path: '/announcements', icon: 'campaign' },
      { label: 'Operations Calendar', path: '/calendar', icon: 'today' },
      { label: 'Student Enrollment', path: '/student-enrollment', icon: 'how_to_reg' },
      { label: 'Grading Review & Publication', path: '/grading-review', icon: 'fact_check' },
      { label: 'Behavior & Discipline', path: '/behavior-discipline', icon: 'gavel' },
    ]
  },
  {
    title: 'Course Management',
    items: [
      { label: 'Course Catalog', path: '/course-catalog', icon: 'auto_stories' },
      { label: 'Course Hours', path: '/course-hours', icon: 'timer' },
      { label: 'Timetables', path: '/timetables', icon: 'schedule' },
      { label: 'School Events', path: '/school-events', icon: 'event' },
      { label: 'Configure Locations', path: '/class-locations', icon: 'location_on' },
      { label: 'Registration Review', path: '/course-registration-review', icon: 'fact_check' },
    ]
  },
  {
    title: 'Administration',
    items: [
      { label: 'Financial Records', path: '/financial-records', icon: 'payments' },
      { label: 'Guardian Management', path: '/guardian-management', icon: 'family_restroom' },
      { label: 'Staff Management', path: '/staff-management', icon: 'badge' },
      { label: 'Audit Logs', path: '/audit-logs', icon: 'history' },
      { label: 'Attendance Reports & Alerts', path: '/attendance-reports', icon: 'monitoring' },
      { label: 'Absence Justifications', path: '/absence-justifications', icon: 'event_available' },
      { label: 'Teacher Absence Reviews', path: '/teacher-absence-reports', icon: 'event_busy' },
      { label: 'User Profile', path: '/profile', icon: 'account_circle' },
    ]
  }
]

const guardianMenuGroups = [
  {
    title: 'Guardian Portal',
    items: [
      { label: 'Children Overview', path: '/guardian-portal', icon: 'family_restroom' },
      { label: 'Semester Calendar', path: '/calendar', icon: 'calendar_month' },
      { label: 'Announcements', path: '/announcements', icon: 'campaign' },
      { label: 'Published Report Cards', path: '/report-card', icon: 'description' },
      { label: 'Behavior & Discipline', path: '/behavior-discipline', icon: 'gavel' },
    ]
  },
  {
    title: 'Account',
    items: [
      { label: 'User Profile', path: '/profile', icon: 'account_circle' },
    ]
  }
]

const teacherMenuGroups = [
  {
    title: 'Teaching',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'space_dashboard' },
      { label: 'Monthly Calendar', path: '/calendar', icon: 'calendar_month' },
      { label: 'Timetables', path: '/timetables', icon: 'schedule' },
      { label: 'Attendance', path: '/teacher-attendance', icon: 'co_present' },
      { label: 'Assessments', path: '/assessments', icon: 'assignment' },
      { label: 'Gradebook', path: '/gradebook', icon: 'grading' },
    ]
  },
  {
    title: 'More',
    items: [
      { label: 'Class Sessions', path: '/class-sessions', icon: 'calendar_month' },
      { label: 'Announcements', path: '/announcements', icon: 'campaign' },
      { label: 'Attendance Reports', path: '/attendance-reports', icon: 'monitoring' },
      { label: 'Teacher Absence Reports', path: '/teacher-absence-reports', icon: 'event_busy' },
      { label: 'Participation', path: '/participation-log', icon: 'how_to_reg' },
      { label: 'Behavior & Discipline', path: '/behavior-discipline', icon: 'gavel' },
    ]
  },
  {
    title: 'Account',
    items: [
      { label: 'User Profile', path: '/profile', icon: 'account_circle' },
    ]
  }
]

const activeMenuGroups = computed(() => {
  if (isStudent.value) return studentMenuGroups
  if (isTeacher.value) return teacherMenuGroups
  if (isAdministrator.value) return administratorMenuGroups
  if (isGuardian.value) return guardianMenuGroups
  return []
})
</script>
