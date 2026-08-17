<template>
  <label data-no-translate="true" class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs" aria-label="Language">
    <span class="material-symbols-outlined text-sm text-indigo-600" aria-hidden="true">translate</span>
    <select :value="language" @change="setLanguage($event.target.value)" class="bg-transparent text-xs font-semibold outline-none" :disabled="isTranslating">
      <option value="en">EN</option>
      <option value="fr">FR</option>
    </select>
  </label>
</template>

<script setup>
import { useLanguage } from '../store/language.js'

const { language, setLanguage, isTranslating } = useLanguage()
</script>
