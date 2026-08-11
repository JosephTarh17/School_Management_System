import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from './components/LoginPage.vue'
import DashboardPage from './components/DashboardPage.vue'
import AttendancePage from './pages/AttendancePage.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
  },
  {
    path: '/attendance',
    name: 'Attendance',
    component: AttendancePage,
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
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
