import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from './components/LoginPage.vue'
import DashboardPage from './components/DashboardPage.vue'
import AttendancePage from './pages/AttendancePage.vue'
import LandingPage from './pages/LandingPage.vue'
import CoursesPage from './pages/CoursesPage.vue'
import AssessmentsPage from './pages/AssessmentsPage.vue'
import FinancePage from './pages/FinancePage.vue'
import ProfilePage from './pages/ProfilePage.vue'
import ClassSessionsPage from './pages/ClassSessionsPage.vue'
import ParticipationPage from './pages/ParticipationPage.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboard',
    name: 'DashboardAlias',
    component: DashboardPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
  },
  {
    path: '/landing',
    name: 'Landing',
    component: LandingPage,
  },
  {
    path: '/attendance',
    name: 'Attendance',
    component: AttendancePage,
    meta: { requiresAuth: true },
  },
  {
    path: '/courses',
    name: 'Courses',
    component: CoursesPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/assessments',
    name: 'Assessments',
    component: AssessmentsPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/finance',
    name: 'Finance',
    component: FinancePage,
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfilePage,
    meta: { requiresAuth: true },
  },
  {
    path: '/sessions',
    name: 'ClassSessions',
    component: ClassSessionsPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/participation',
    name: 'Participation',
    component: ParticipationPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
  const token = window.localStorage.getItem('sms_token')
  if (to.meta.requiresAuth && !token) {
    return next('/login')
  }
  if (to.path === '/login' && token) {
    return next('/')
  }
  next()
})

export default router
