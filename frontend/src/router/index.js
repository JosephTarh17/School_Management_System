import { createRouter, createWebHistory } from 'vue-router'
import { authStore } from '../store/auth'

const routes = [
  { path: '/', name: 'Landing', component: () => import('../pages/LandingPage.vue'), meta: { layout: 'clean' } },
  { path: '/login', name: 'Login', component: () => import('../pages/LoginPage.vue'), meta: { layout: 'clean' } },
  { path: '/signup', name: 'SignUp', component: () => import('../pages/SignUpPage.vue'), meta: { layout: 'clean' } },
  {
    path: '/student-portal',
    name: 'StudentPortal',
    component: () => import('../pages/StudentPortal.vue'),
    meta: { requiresAuth: true, roles: ['student'] }
  },
  {
    path: '/course-catalog',
    name: 'CourseCatalog',
    component: () => import('../pages/CourseCatalog.vue'),
    meta: { requiresAuth: true, roles: ['student', 'teacher', 'administrator'] }
  },
  {
    path: '/course-registration',
    name: 'CourseRegistration',
    component: () => import('../pages/CourseRegistration.vue'),
    meta: { requiresAuth: true, roles: ['student'] }
  },
  {
    path: '/course-registration-review',
    name: 'CourseRegistrationReview',
    component: () => import('../pages/CourseRegistrationReview.vue'),
    meta: { requiresAuth: true, roles: ['administrator'] }
  },
  {
    path: '/assessments',
    name: 'Assessments',
    component: () => import('../pages/Assessments.vue'),
    meta: { requiresAuth: true, roles: ['student', 'teacher'] }
  },
  {
    path: '/gradebook',
    name: 'Gradebook',
    component: () => import('../pages/Gradebook.vue'),
    meta: { requiresAuth: true, roles: ['teacher'] }
  },
  {
    path: '/grading-review',
    name: 'GradingReview',
    component: () => import('../pages/GradingReview.vue'),
    meta: { requiresAuth: true, roles: ['administrator'] }
  },
  {
    path: '/report-card',
    name: 'ReportCard',
    component: () => import('../pages/ReportCard.vue'),
    meta: { requiresAuth: true, roles: ['student', 'guardian'] }
  },
  {
    path: '/announcements',
    name: 'Announcements',
    component: () => import('../pages/Announcements.vue'),
    meta: { requiresAuth: true, roles: ['student', 'teacher', 'administrator', 'guardian'] }
  },
  {
    path: '/profile',
    name: 'UserProfile',
    component: () => import('../pages/UserProfile.vue'),
    meta: { requiresAuth: true, roles: ['student', 'teacher', 'administrator', 'guardian'] }
  },
  {
    path: '/guardian-portal',
    name: 'GuardianPortal',
    component: () => import('../pages/GuardianPortal.vue'),
    meta: { requiresAuth: true, roles: ['guardian'] }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../pages/Dashboard.vue'),
    meta: { requiresAuth: true, roles: ['teacher'] }
  },
  {
    path: '/admin-dashboard',
    name: 'AdminDashboard',
    component: () => import('../pages/AdminDashboard.vue'),
    meta: { requiresAuth: true, roles: ['administrator'] }
  },
  {
    path: '/guardian-management',
    name: 'GuardianManagement',
    component: () => import('../pages/GuardianManagement.vue'),
    meta: { requiresAuth: true, roles: ['administrator'] }
  },
  {
    path: '/staff-management',
    name: 'StaffManagement',
    component: () => import('../pages/StaffManagement.vue'),
    meta: { requiresAuth: true, roles: ['administrator'] }
  },
  {
    path: '/class-locations',
    name: 'ClassLocations',
    component: () => import('../pages/ClassLocations.vue'),
    meta: { requiresAuth: true, roles: ['administrator'] }
  },
  {
    path: '/audit-logs',
    name: 'AuditLogs',
    component: () => import('../pages/AuditLogs.vue'),
    meta: { requiresAuth: true, roles: ['administrator'] }
  },
  {
    path: '/student-enrollment',
    name: 'StudentEnrollment',
    component: () => import('../pages/StudentEnrollment.vue'),
    meta: { requiresAuth: true, roles: ['administrator'] }
  },
  {
    path: '/teacher-attendance',
    name: 'TeacherAttendance',
    component: () => import('../pages/TeacherAttendance.vue'),
    meta: { requiresAuth: true, roles: ['teacher'] }
  },
  {
    path: '/attendance-reports',
    name: 'AttendanceReports',
    component: () => import('../pages/AttendanceReports.vue'),
    meta: { requiresAuth: true, roles: ['teacher', 'administrator'] }
  },
  {
    path: '/attendance-management',
    name: 'AttendanceManagement',
    component: () => import('../pages/AttendanceManagement.vue'),
    meta: { requiresAuth: true, roles: ['teacher'] }
  },
  {
    path: '/class-sessions',
    name: 'ClassSessions',
    component: () => import('../pages/ClassSessions.vue'),
    meta: { requiresAuth: true, roles: ['student', 'teacher'] }
  },
  {
    path: '/timetables',
    name: 'Timetables',
    component: () => import('../pages/Timetables.vue'),
    meta: { requiresAuth: true, roles: ['student', 'teacher', 'administrator', 'guardian'] }
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('../pages/Calendar.vue'),
    meta: { requiresAuth: true, roles: ['student', 'teacher', 'administrator', 'guardian'] }
  },
  {
    path: '/course-hours',
    name: 'CourseHours',
    component: () => import('../pages/CourseHours.vue'),
    meta: { requiresAuth: true, roles: ['administrator'] }
  },
  {
    path: '/school-events',
    name: 'SchoolEvents',
    component: () => import('../pages/SchoolEvents.vue'),
    meta: { requiresAuth: true, roles: ['administrator'] }
  },
  {
    path: '/absence-justifications',
    name: 'AbsenceJustifications',
    component: () => import('../pages/AbsenceJustifications.vue'),
    meta: { requiresAuth: true, roles: ['student', 'administrator'] }
  },
  {
    path: '/teacher-absence-reports',
    name: 'TeacherAbsenceReports',
    component: () => import('../pages/TeacherAbsenceReports.vue'),
    meta: { requiresAuth: true, roles: ['teacher', 'administrator'] }
  },
  {
    path: '/financial-records',
    name: 'FinancialRecords',
    component: () => import('../pages/FinancialRecords.vue'),
    meta: { requiresAuth: true, roles: ['administrator'] }
  },
  {
    path: '/participation-log',
    name: 'ParticipationLog',
    component: () => import('../pages/ParticipationLog.vue'),
    meta: { requiresAuth: true, roles: ['teacher'] }
  },
  {
    path: '/behavior-discipline',
    name: 'BehaviorDiscipline',
    component: () => import('../pages/BehaviorDiscipline.vue'),
    meta: { requiresAuth: true, roles: ['administrator', 'teacher', 'student', 'guardian'] }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// Global Navigation Guard for Authentication & Role Access
router.beforeEach((to, from, next) => {
  const isAuth = authStore.isAuthenticated.value
  const role = authStore.userRole.value

  // If user is logged in and visits login/signup, redirect to their home portal
  if ((to.name === 'Login' || to.name === 'SignUp') && isAuth) {
    if (role === 'student') return next({ name: 'StudentPortal' })
    if (role === 'administrator') return next({ name: 'AdminDashboard' })
    if (role === 'guardian') return next({ name: 'GuardianPortal' })
    return next({ name: 'Dashboard' })
  }

  // If route requires auth and user is not logged in
  if (to.meta.requiresAuth && !isAuth) {
    return next({ name: 'Login', query: { redirect: to.fullPath } })
  }

  if (to.name === 'Dashboard' && role === 'administrator') {
    return next({ name: 'AdminDashboard' })
  }
  if (to.name === 'Dashboard' && role === 'guardian') {
    return next({ name: 'GuardianPortal' })
  }

  // Role check: redirect every authenticated user away from routes outside their role scope
  if (to.meta.roles && role && !to.meta.roles.includes(role)) {
    if (role === 'student') return next({ name: 'StudentPortal' })
    if (role === 'administrator') return next({ name: 'AdminDashboard' })
    if (role === 'guardian') return next({ name: 'GuardianPortal' })
    return next({ name: 'Dashboard' })
  }

  next()
})

export default router
