<template>
  <component :is="isAuthenticated ? DashboardPage : LoginPage" />
</template>

<script setup>
import { ref } from 'vue'
import LoginPage from './components/LoginPage.vue'
import DashboardPage from './components/DashboardPage.vue'

const isAuthenticated = ref(!!window.localStorage.getItem('sms_token'))
</script>
