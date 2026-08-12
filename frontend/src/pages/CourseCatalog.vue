<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Academic Course Catalog</h1>
      <p class="text-xs text-slate-500 font-geist mt-1">Master directory of active curriculum offerings, credit values, and syllabus prerequisites.</p>
    </div>

    <div class="bg-white rounded-xl border border-border-subtle p-6 shadow-xs">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-for="c in catalog" :key="c.code" class="p-5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-primary-container font-geist px-2 py-0.5 bg-blue-50 rounded border border-blue-200">{{ c.code }}</span>
            <span class="text-xs font-semibold text-slate-600 font-geist">{{ c.credits }} Credits</span>
          </div>
          <h3 class="text-base font-bold text-slate-900 font-sans mb-1">{{ c.title }}</h3>
          <p class="text-xs text-slate-600 font-sans mb-3 line-clamp-2">{{ c.description }}</p>
          <div class="text-[11px] text-slate-500 font-geist border-t border-slate-200 pt-2 flex justify-between">
            <span>Department: {{ c.dept }}</span>
            <span>Prereq: {{ c.prereq }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const catalog = [
  { code: 'CS-101', title: 'Introduction to Computer Science', credits: 4, dept: 'Computer Science', prereq: 'None', description: 'Foundational programming concepts, data types, control flow, and basic algorithm design.' },
  { code: 'CS-301', title: 'Database Management Systems', credits: 4, dept: 'Computer Science', prereq: 'CS-101', description: 'Relational model, SQL schema design, normalization, transactions, and indexing strategies.' },
  { code: 'CS-304', title: 'Software Architecture & Design', credits: 4, dept: 'Software Eng', prereq: 'CS-301', description: 'Design patterns, component-based architectures, microservices, and system modeling.' },
  { code: 'MATH-202', title: 'Discrete Mathematics & Logic', credits: 3, dept: 'Mathematics', prereq: 'MATH-101', description: 'Set theory, propositional logic, graph algorithms, and combinatorics for system engineering.' }
]
</script>
