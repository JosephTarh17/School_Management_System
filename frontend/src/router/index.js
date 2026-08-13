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
    meta: { requiresAuth: true, roles: ['student', 'administrator'] }
  },
  {
    path: '/course-catalog',
    name: 'CourseCatalog',
    component: () => import('../pages/CourseCatalog.vue'),
    meta: { requiresAuth: true, roles: ['student', 'teacher', 'administrator'] }
  },
  {
    path: '/assessments',
    name: 'Assessments',
    component: () => import('../pages/Assessments.vue'),
    meta: { requiresAuth: true, roles: ['student', 'teacher', 'administrator'] }
  },
  {
    path: '/profile',
    name: 'UserProfile',
    component: () => import('../pages/UserProfile.vue'),
    meta: { requiresAuth: true, roles: ['student', 'teacher', 'administrator'] }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../pages/Dashboard.vue'),
    meta: { requiresAuth: true, roles: ['administrator', 'teacher'] }
  },
  {
    path: '/admin-dashboard',
    name: 'AdminDashboard',
    component: () => import('../pages/AdminDashboard.vue'),
    meta: { requiresAuth: true, roles: ['administrator'] }
  },
  {
    path: '/teacher-attendance',
    name: 'TeacherAttendance',
    component: () => import('../pages/TeacherAttendance.vue'),
    meta: { requiresAuth: true, roles: ['teacher', 'administrator'] }
  },
  {
    path: '/attendance-management',
    name: 'AttendanceManagement',
    component: () => import('../pages/AttendanceManagement.vue'),
    meta: { requiresAuth: true, roles: ['administrator', 'teacher'] }
  },
  {
    path: '/class-sessions',
    name: 'ClassSessions',
    component: () => import('../pages/ClassSessions.vue'),
    meta: { requiresAuth: true, roles: ['administrator', 'teacher', 'student'] }
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
    meta: { requiresAuth: true, roles: ['administrator', 'teacher'] }
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
    return next({ name: 'Dashboard' })
  }

  // If route requires auth and user is not logged in
  if (to.meta.requiresAuth && !isAuth) {
    return next({ name: 'Login', query: { redirect: to.fullPath } })
  }

  if (to.name === 'Dashboard' && role === 'administrator') {
    return next({ name: 'AdminDashboard' })
  }

  // Role check: If student tries to access restricted admin/teacher routes
  if (to.meta.roles && role && !to.meta.roles.includes(role)) {
    if (role === 'student') return next({ name: 'StudentPortal' })
    if (role === 'administrator') return next({ name: 'AdminDashboard' })
    return next({ name: 'Dashboard' })
  }

  next()
})

export default router
