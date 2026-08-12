<template>
  <div class="space-y-6">
    <!-- Student Header Banner -->
    <div class="bg-white rounded-xl p-6 border border-border-subtle shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
          {{ student.avatar }}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold text-slate-900 font-sans">{{ student.name }}</h1>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 font-geist uppercase tracking-wider">Central Student Actor</span>
          </div>
          <p class="text-xs text-slate-500 font-geist mt-0.5">Student ID: {{ student.id }} • {{ student.department }}</p>
          <div class="flex items-center gap-2 mt-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 font-geist">Cumulative GPA: {{ student.gpa }}</span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 font-geist">Term 2026-A Active</span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 font-geist">Dean's Honor Roll</span>
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
      <StatCard title="Enrolled Courses" value="4 Courses" change="15 Academic Credits" :changeIsPositive="true" icon="auto_stories" variant="tertiary" />
      <StatCard title="Attendance Rate" value="98.5%" change="Present: 42/43 Sessions" :changeIsPositive="true" icon="check_circle" variant="emerald" />
      <StatCard title="Current GPA" value="3.88 / 4.00" change="Top 5% of Class" :changeIsPositive="true" icon="grade" variant="amber" />
      <StatCard title="Next Assessment" value="Aug 14" change="CS-301 Midterm Exam" :changeIsPositive="true" icon="event" variant="primary" />
    </div>

    <!-- Interactive Section Tabs -->
    <div class="bg-white rounded-xl border border-border-subtle shadow-xs">
      <div class="border-b border-slate-200 px-6 pt-4 flex gap-6">
        <button
          v-for="tab in ['Overview & Courses', 'Gradebook Breakdown', 'Attendance History', 'Announcements']"
          :key="tab"
          @click="activeTab = tab"
          :class="[
            'pb-3 text-xs font-bold font-geist transition-all border-b-2',
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
import { ref } from 'vue'
import StatCard from '../components/StatCard.vue'
import Badge from '../components/Badge.vue'

const activeTab = ref('Overview & Courses')

const student = {
  id: '#ST-884920',
  name: 'Julian Dabney',
  department: 'Computer Science & Systems Engineering',
  gpa: '3.88',
  avatar: 'JD'
}

const courses = [
  { code: 'CS-301', name: 'Database Management Systems', instructor: 'Dr. Eleanor Vance', credits: 4, grade: 'A (94%)', attendance: '100%' },
  { code: 'CS-304', name: 'Software Architecture & Design', instructor: 'Prof. Marcus Brody', credits: 4, grade: 'A- (91%)', attendance: '96%' },
  { code: 'MATH-202', name: 'Discrete Mathematics & Logic', instructor: 'Dr. Sarah Connor', credits: 3, grade: 'A (95%)', attendance: '100%' },
  { code: 'SYS-110', name: 'Network Protocol Engineering', instructor: 'Eng. Alan Turing', credits: 4, grade: 'B+ (88%)', attendance: '95%' }
]

const gradeItems = [
  { title: 'Relational Database Schema Design', code: 'CS-301', weight: '20%', date: 'Aug 05, 2026', score: '98 / 100' },
  { title: 'Software Architecture Quiz 2', code: 'CS-304', weight: '10%', date: 'Aug 10, 2026', score: '92 / 100' },
  { title: 'Discrete Math Logic Homework 3', code: 'MATH-202', weight: '15%', date: 'Aug 08, 2026', score: '95 / 100' }
]

const attendanceLogs = [
  { date: 'Aug 12, 2026', code: 'CS-301', time: '09:00 - 10:30 AM', status: 'Present', participation: 'High (Active)' },
  { date: 'Aug 11, 2026', code: 'CS-304', time: '11:00 - 01:00 PM', status: 'Present', participation: 'Normal' },
  { date: 'Aug 10, 2026', code: 'MATH-202', time: '02:00 - 04:00 PM', status: 'Present', participation: 'High (Active)' },
  { date: 'Aug 08, 2026', code: 'SYS-110', time: '10:00 - 12:00 PM', status: 'Late', participation: 'Normal' }
]

const announcements = [
  { id: 1, title: 'CS-301 Midterm Examination Schedule', body: 'The CS-301 Midterm Exam will be held on Friday, Aug 14 in Auditorium 101. Bring your Student ID card.', date: 'Aug 10, 2026', author: 'Dr. Eleanor Vance' },
  { id: 2, title: 'Fall 2026 Course Registration Notice', body: 'Pre-registration for Fall 2026 opens next Monday for students with GPA > 3.50.', date: 'Aug 08, 2026', author: 'Academic Registrar' }
]

const downloadTranscript = () => {
  alert('Downloading Official Academic Transcript for Julian Dabney (#ST-884920)...')
}
</script>
