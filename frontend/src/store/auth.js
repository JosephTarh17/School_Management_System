import { reactive, computed } from 'vue'

const state = reactive({
  user: JSON.parse(localStorage.getItem('scholastic_user') || 'null'),
  token: localStorage.getItem('scholastic_token') || null,
})

export const authStore = {
  user: computed(() => state.user),
  token: computed(() => state.token),
  isAuthenticated: computed(() => !!state.token && !!state.user),
  userRole: computed(() => state.user?.role || null),

  loginAsStudent() {
    const studentUser = {
      id: '#ST-884920',
      name: 'Julian Dabney',
      email: 'julian.dabney@scholastic.edu',
      role: 'Student',
      department: 'Computer Science & Systems',
      gpa: '3.88',
      avatar: 'JD'
    }
    this.setUser(studentUser, 'demo_student_token_2026')
  },

  setUser(user, token) {
    state.user = user
    state.token = token
    localStorage.setItem('scholastic_user', JSON.stringify(user))
    localStorage.setItem('scholastic_token', token)
  },

  logout() {
    state.user = null
    state.token = null
    localStorage.removeItem('scholastic_user')
    localStorage.removeItem('scholastic_token')
  }
}
