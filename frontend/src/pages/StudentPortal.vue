<template>
  <div class="space-y-6">
    <!-- Student Header Banner -->
    <div class="bg-white rounded-xl p-6 border border-border-subtle shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
          {{ student.avatar }}
        </div>
        <div>
          <h1 class="text-xl font-bold text-slate-900 font-sans">{{ student.name }}</h1>
          <p class="text-xs text-slate-500 font-geist mt-0.5">Student ID: {{ student.id }}</p>
          <div class="flex items-center gap-2 mt-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 font-geist">{{ student.email }}</span>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <button @click="downloadTranscript" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-eight font-geist transition-colors shadow-xs flex items-center gap-1.5">
          <span class="material-symbols-outlined text-base">download</span>
          Official Transcript
        </button>
      </div>
    </div>

    <!-- Student Key Metrics -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatCard title="Available Courses" :value="countLabel(courses.length, 'Course', 'Courses')" change="From the course catalog" :changeIsPositive="true" icon="auto_stories" variant="tertiary" />
      <StatCard title="Attendance Records" :value="countLabel(attendanceLogs.length, 'Record', 'Records')" change="Loaded from the backend" :changeIsPositive="true" icon="check_circle" variant="emerald" />
      <StatCard title="Assessments" :value="countLabel(gradeItems.length, 'Item', 'Items')" change="Loaded from the backend" :changeIsPositive="true" icon="assignment" variant="amber" />
      <StatCard title="Account Role" value="Student" change="Authenticated account" :changeIsPositive="true" icon="verified_user" variant="primary" />
    </div>

    <!-- Interactive Section Tabs -->
    <div class="bg-white rounded-xl border border-border-subtle shadow-xs">
      <div class="flex gap-4 overflow-x-auto border-b border-slate-200 px-4 pt-4 sm:gap-6 sm:px-6">
        <button
          v-for="tab in ['Overview & Courses', 'Gradebook Breakdown', 'Attendance History', 'Announcements']"
          :key="tab"
          @click="activeTab = tab"
          :class="[
            'shrink-0 whitespace-nowrap pb-3 text-xs font-bold font-geist transition-all border-b-2',
            activeTab === tab
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          ]"
        >
          {{ tab }}
        </button>
      </div>

      <!-- Tab 1: Overview & Courses -->
      <div v-if="activeTab === 'Overview & Courses'" class="p-6">
        <h2 class="text-base font-bold text-slate-900 mb-4 font-sans">Registered Academic Courses</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs font-geist">
            <thead>
              <tr class="bg-slate-50 text-slate-500 border-b border-slate-200">
                <th class="py-3 px-4 font-semibold">Course Code</th>
                <th class="py-3 px-4 font-semibold">Course Name</th>
                <th class="py-3 px-4 font-semibold">Instructor</th>
                <th class="py-3 px-4 font-semibold">Credits</th>
                <th class="py-3 px-4 font-semibold">Current Score</th>
                <th class="py-3 px-4 font-semibold">Attendance</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              <tr v-if="!courses.length"><td colspan="6" class="py-8 px-4 text-center text-slate-500">No course records are available for this account.</td></tr>
              <tr v-for="course in courses" :key="course.code" class="hover:bg-slate-50/80">
                <td class="py-3.5 px-4 font-bold text-slate-900">{{ course.code }}</td>
                <td class="py-3.5 px-4 font-medium text-slate-900">{{ course.name }}</td>
                <td class="py-3.5 px-4 text-slate-600">{{ course.instructor }}</td>
                <td class="py-3.5 px-4 font-geist">{{ course.credits }} CR</td>
                <td class="py-3.5 px-4 font-bold text-indigo-700">{{ course.grade }}</td>
                <td class="py-3.5 px-4">
                  <Badge type="present" :text="course.attendance" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 2: Gradebook Breakdown -->
      <div v-else-if="activeTab === 'Gradebook Breakdown'" class="p-6">
        <h2 class="text-base font-bold text-slate-900 mb-4 font-sans">Detailed Assignment & Exam Breakdown</h2>
        <div class="space-y-4">
          <p v-if="!gradeItems.length" class="p-6 rounded-eight border border-slate-200 bg-slate-50 text-sm text-slate-500">No assessments are available for this account.</p>
          <div v-for="item in gradeItems" :key="item.title" class="p-4 rounded-eight border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-900 text-sm font-sans">{{ item.title }}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 font-geist">{{ item.code }}</span>
              </div>
              <p class="text-xs text-slate-500 font-geist mt-0.5">Weight: {{ item.weight }} • Due: {{ item.date }}</p>
            </div>
            <div class="text-right">
              <span class="text-base font-extrabold text-indigo-700 font-geist block">{{ item.score }}</span>
              <span class="text-[11px] text-emerald-600 font-medium font-geist">Graded & Verified</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: Attendance History -->
      <div v-else-if="activeTab === 'Attendance History'" class="p-6">
        <h2 class="text-base font-bold text-slate-900 mb-4 font-sans">Personal Attendance Log (Term 2026-A)</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs font-geist">
            <thead>
              <tr class="bg-slate-50 text-slate-500 border-b border-slate-200">
                <th class="py-3 px-4 font-semibold">Session Date</th>
                <th class="py-3 px-4 font-semibold">Course Code</th>
                <th class="py-3 px-4 font-semibold">Time Slot</th>
                <th class="py-3 px-4 font-semibold">Status</th>
                <th class="py-3 px-4 font-semibold">Participation</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              <tr v-if="!attendanceLogs.length"><td colspan="5" class="py-8 px-4 text-center text-slate-500">No attendance records are available for this account.</td></tr>
              <tr v-for="log in attendanceLogs" :key="log.date" class="hover:bg-slate-50/80">
                <td class="py-3 px-4 font-medium text-slate-900">{{ log.date }}</td>
                <td class="py-3 px-4 font-bold text-primary-container">{{ log.code }}</td>
                <td class="py-3 px-4 text-slate-500">{{ log.time }}</td>
                <td class="py-3 px-4">
                  <Badge :type="log.status.toLowerCase()" :text="log.status" />
                </td>
                <td class="py-3 px-4 text-slate-600">{{ log.participation }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 4: Announcements -->
      <div v-else-if="activeTab === 'Announcements'" class="p-6 space-y-4">
        <h2 class="text-base font-bold text-slate-900 mb-4 font-sans">Academic Announcements & Alerts</h2>
        <p v-if="!announcements.length" class="p-6 rounded-eight border border-slate-200 bg-slate-50 text-sm text-slate-500">No announcements are available.</p>
        <div v-for="announcement in announcements" :key="announcement.id" class="p-4 rounded-eight border border-slate-200 bg-blue-50/40 flex items-start gap-3">
          <span class="material-symbols-outlined text-indigo-600 text-xl mt-0.5">campaign</span>
          <div>
            <h3 class="text-sm font-bold text-slate-900 font-sans">{{ announcement.title }}</h3>
            <p class="text-xs text-slate-600 font-sans mt-1">{{ announcement.body }}</p>
            <p class="text-[11px] text-slate-400 font-geist mt-2">Posted on {{ announcement.date }} by {{ announcement.author }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import StatCard from '../components/StatCard.vue'
import Badge from '../components/Badge.vue'
import { authStore } from '../store/auth'
import { fetchAcademicRecords, fetchAssessments, fetchAttendance, fetchEnrollments, fetchFinalGrades } from '../api.js'
import { clampPercent, countLabel, formatPercent } from '../lib/formatters.js'

const activeTab = ref('Overview & Courses')

const currentUser = computed(() => authStore.user.value)
const student = computed(() => ({
  id: currentUser.value?.profile?.student_id || currentUser.value?.user_id || '—',
  name: currentUser.value?.name || currentUser.value?.email || 'Student',
  email: currentUser.value?.email || '—',
  avatar: currentUser.value?.avatar || 'U',
}))

const courses = ref([])
const gradeItems = ref([])
const attendanceLogs = ref([])
const announcements = ref([])
const finalGrades = ref([])
const academicRecords = ref([])

onMounted(async () => {
  const token = authStore.token.value
  if (!token) return
  const [enrollmentResult, assessmentResult, attendanceResult, recordsResult, finalGradesResult] = await Promise.all([
    fetchEnrollments(token, { status: 'active' }),
    fetchAssessments(token),
    fetchAttendance(token),
    fetchAcademicRecords(token),
    fetchFinalGrades(token),
  ])
  if (recordsResult.ok) academicRecords.value = recordsResult.data || []
  if (finalGradesResult.ok) finalGrades.value = finalGradesResult.data || []
  if (enrollmentResult.ok) courses.value = (enrollmentResult.data || []).map((enrollment) => ({
    code: enrollment.course?.course_code || enrollment.course_id,
    name: enrollment.course?.course_name || 'Course',
    instructor: 'Not assigned',
    credits: enrollment.course?.credit_units || '—',
    grade: finalGrades.value.find((grade) => grade.course_id === enrollment.course_id)?.letter_grade || 'Not graded',
    attendance: 'Not available',
  }))
  if (assessmentResult.ok) gradeItems.value = (assessmentResult.data || []).map((item) => ({
    title: item.title,
    code: item.course?.course_code || item.course_id,
    weight: formatPercent(clampPercent(item.weight)),
    date: item.due_date || 'Not scheduled',
    score: academicRecords.value.find((record) => record.assessment_id === item.assessment_id)?.score != null
      ? `${academicRecords.value.find((record) => record.assessment_id === item.assessment_id).score}/${item.max_score}`
      : 'Not graded',
  }))
  if (attendanceResult.ok) attendanceLogs.value = (attendanceResult.data || []).map((log) => ({
    date: log.session_date,
    code: log.session?.course?.course_code || log.session_id,
    time: 'See class session',
    status: log.status,
    participation: 'Not available',
  }))
})

const downloadTranscript = () => {
  const lines = finalGrades.value.map((grade) => `${grade.course?.course_code || grade.course_id}: ${formatPercent(clampPercent(grade.computed_score ?? 0))} (${grade.letter_grade || 'Pending'})`)
  if (!lines.length) return alert('No published final grades are available yet.')
  const blob = new Blob([`Academic results\n\n${lines.join('\n')}`], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'academic-results.txt'
  link.click()
  URL.revokeObjectURL(url)
}
</script>
