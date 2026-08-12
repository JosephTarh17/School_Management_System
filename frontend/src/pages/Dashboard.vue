<template>
  <div class="space-y-6">
    <!-- Header banner -->
    <div class="bg-gradient-to-r from-slate-900 to-blue-900 rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold font-geist border border-blue-400/30 mb-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Institutional System Ready
        </div>
        <h1 class="text-2xl font-bold font-sans tracking-tight">System Overview & Dashboard</h1>
        <p class="text-slate-300 text-xs mt-1 font-geist">Welcome to Scholastic Management System — Select a module to manage academic data.</p>
      </div>
      <div class="flex gap-2">
        <router-link to="/admin-dashboard" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-eight font-geist transition-colors shadow-xs">
          Admin Portal
        </router-link>
        <router-link to="/teacher-attendance" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-eight font-geist transition-colors border border-slate-700">
          Attendance Entry
        </router-link>
      </div>
    </div>

    <!-- Stat Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatCard title="Total Students" value="2,845" change="4.2% from last term" :changeIsPositive="true" icon="groups" variant="primary" />
      <StatCard title="Active Faculty" value="184" change="2 new onboarded" :changeIsPositive="true" icon="co_present" variant="secondary" />
      <StatCard title="Daily Attendance" value="96.4%" change="1.1% vs target" :changeIsPositive="true" icon="fact_check" variant="emerald" />
      <StatCard title="Pending Submissions" value="12" change="Requires review" :changeIsPositive="false" icon="pending_actions" variant="amber" />
    </div>

    <!-- Main Navigation Grid of Modules -->
    <div class="bg-white rounded-xl p-6 border border-border-subtle shadow-xs">
      <h2 class="text-base font-bold text-slate-900 mb-4 font-sans flex items-center gap-2">
        <span class="material-symbols-outlined text-primary-container">widgets</span>
        Academic & Administrative Modules
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <router-link
          v-for="mod in modules"
          :key="mod.path"
          :to="mod.path"
          class="p-4 rounded-eight border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all group flex items-start gap-4 bg-slate-50/50 hover:bg-white"
        >
          <div :class="['w-10 h-10 rounded-lg flex items-center justify-center shrink-0', mod.bgClass]">
            <span class="material-symbols-outlined text-xl" :class="mod.iconClass">{{ mod.icon }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-bold text-slate-900 group-hover:text-primary-container transition-colors">{{ mod.title }}</h3>
            <p class="text-xs text-slate-500 font-geist mt-0.5 line-clamp-2">{{ mod.desc }}</p>
          </div>
          <span class="material-symbols-outlined text-slate-400 group-hover:text-primary-container text-lg transition-transform group-hover:translate-x-1">chevron_right</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import StatCard from '../components/StatCard.vue'

const modules = [
  { title: 'Administrator Dashboard', path: '/admin-dashboard', icon: 'admin_panel_settings', bgClass: 'bg-blue-50', iconClass: 'text-blue-700', desc: 'High-level system metrics, security logs, and role-based policy administration.' },
  { title: 'Student Portal', path: '/student-portal', icon: 'person', bgClass: 'bg-teal-50', iconClass: 'text-teal-700', desc: 'Student profile overview, GPA breakdown, registered classes, and schedule.' },
  { title: 'Teacher Attendance', path: '/teacher-attendance', icon: 'co_present', bgClass: 'bg-indigo-50', iconClass: 'text-indigo-700', desc: 'Rapid matrix for marking student attendance and recording classroom participation.' },
  { title: 'Attendance Management', path: '/attendance-management', icon: 'fact_check', bgClass: 'bg-emerald-50', iconClass: 'text-emerald-700', desc: 'Full institutional attendance audit trails, excuse processing, and stats.' },
  { title: 'Class Sessions', path: '/class-sessions', icon: 'calendar_month', bgClass: 'bg-amber-50', iconClass: 'text-amber-700', desc: 'Schedule management, room allocations, and session status tracking.' },
  { title: 'Course Catalog', path: '/course-catalog', icon: 'auto_stories', bgClass: 'bg-purple-50', iconClass: 'text-purple-700', desc: 'Master listing of active academic courses, syllabus specs, and prerequisites.' },
  { title: 'Assessments', path: '/assessments', icon: 'assignment', bgClass: 'bg-sky-50', iconClass: 'text-sky-700', desc: 'Gradebook matrices, exam scheduling, weighted rubric evaluations.' },
  { title: 'Financial Records', path: '/financial-records', icon: 'payments', bgClass: 'bg-rose-50', iconClass: 'text-rose-700', desc: 'Tuition tracking, fee structure ledgers, and payment transaction logs.' },
  { title: 'Participation Log', path: '/participation-log', icon: 'how_to_reg', bgClass: 'bg-emerald-50', iconClass: 'text-emerald-700', desc: 'Detailed log of student engagement, active participation, and alerts.' }
]
</script>
