import { reactive, ref, watch } from 'vue'
import { authStore } from './auth.js'
import { fetchTranslations } from '../api.js'

const LANGUAGE_STORAGE_KEY = 'sms_language'
const supportedLanguages = ['en', 'fr']
const language = ref(localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'fr' ? 'fr' : 'en')
const translations = reactive({})
const elementStates = new WeakMap()
const attributeStates = new WeakMap()
let observer = null
let scanTimer = null
const isTranslating = ref(false)
let translating = false
let applying = false

const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'PRE', 'CODE'])
const SKIPPED_CLASSES = ['material-symbols-outlined', 'iconify']
const NUMERIC_OR_SYMBOL_ONLY = /^[-—\d\s.,:/+%#()]+$/
const UPPERCASE_CODE = /^[A-Z]{2,}[\d_-]*$/
const EMAIL_VALUE = /^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/i
const UUID_VALUE = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i

function shouldSkipValue(value) {
  const text = String(value || '').trim()
  return !text || NUMERIC_OR_SYMBOL_ONLY.test(text) || UPPERCASE_CODE.test(text) || EMAIL_VALUE.test(text) || UUID_VALUE.test(text) || text.length > 2000
}

function isTranslatableElement(element) {
  if (!element || SKIPPED_TAGS.has(element.tagName)) return false
  if (element.dataset.noTranslate === 'true' || element.closest('[data-no-translate="true"]')) return false
  if (SKIPPED_CLASSES.some((className) => element.classList.contains(className))) return false
  if (element.children.length > 0) return false
  return !shouldSkipValue(element.textContent)
}

function captureElements(root = document.body) {
  if (!root || typeof document === 'undefined') return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let element
  while ((element = walker.nextNode())) {
    if (isTranslatableElement(element)) {
      const current = element.textContent.trim()
      const state = elementStates.get(element)
      if (!state) elementStates.set(element, { source: current, applied: null })
      else {
        const knownTranslation = translations[state.source]
        const isExpectedValue = current === state.source || (knownTranslation && current === knownTranslation)
        if (!isExpectedValue && state.applied !== current) {
          state.source = current
          state.applied = null
        }
      }
    }

    for (const attribute of ['placeholder', 'title', 'aria-label']) {
      const value = element.getAttribute(attribute)
      if (!value || shouldSkipValue(value) || element.dataset.noTranslate === 'true') continue
      const state = attributeStates.get(element) || {}
      if (!state[attribute]) state[attribute] = { source: value, applied: null, attribute }
      else {
        const attributeState = state[attribute]
        const knownTranslation = translations[attributeState.source]
        const isExpectedValue = value === attributeState.source || (knownTranslation && value === knownTranslation)
        if (!isExpectedValue && attributeState.applied !== value) {
          attributeState.source = value
          attributeState.applied = null
        }
      }
      attributeStates.set(element, state)
    }
  }
}

function collectMissingSources() {
  const sources = []
  const collect = (source) => {
    if (source && !translations[source]) sources.push(source)
  }

  document.querySelectorAll('*').forEach((element) => {
    const state = elementStates.get(element)
    if (state && element.isConnected && state.applied !== element.textContent.trim()) collect(state.source)
    const attributes = attributeStates.get(element)
    if (attributes) Object.values(attributes).forEach((state) => {
      if (state && element.isConnected && state.applied !== element.getAttribute(state.attribute)) collect(state.source)
    })
  })

  return [...new Set(sources)]
}

function applyLanguage() {
  applying = true
  try {
    document.querySelectorAll('*').forEach((element) => {
      const state = elementStates.get(element)
      if (state && element.isConnected) {
        const desired = language.value === 'fr' ? (translations[state.source] || state.source) : state.source
        if (element.textContent.trim() !== desired) element.textContent = desired
        state.applied = desired
      }

      const attributes = attributeStates.get(element)
      if (attributes && element.isConnected) {
        Object.entries(attributes).forEach(([attribute, state]) => {
          const desired = language.value === 'fr' ? (translations[state.source] || state.source) : state.source
          if (element.getAttribute(attribute) !== desired) element.setAttribute(attribute, desired)
          state.applied = desired
          state.attribute = attribute
        })
      }
    })
    document.documentElement.lang = language.value
  } finally {
    applying = false
  }
}

async function translateMissingSources() {
  if (language.value !== 'fr' || translating || typeof document === 'undefined') return
  captureElements()
  const sources = collectMissingSources()
  if (!sources.length) {
    applyLanguage()
    return
  }

  translating = true
  isTranslating.value = true
  try {
    for (let index = 0; index < sources.length; index += 40) {
      const result = await fetchTranslations(authStore.token.value || undefined, sources.slice(index, index + 40), 'fr')
      if (result.ok && result.data?.translations) Object.assign(translations, result.data.translations)
    }
  } finally {
    translating = false
    isTranslating.value = false
    applyLanguage()
  }
}

function scheduleTranslation() {
  if (scanTimer) window.clearTimeout(scanTimer)
  scanTimer = window.setTimeout(() => {
    scanTimer = null
    translateMissingSources()
  }, 180)
}

export function setLanguage(value) {
  if (!supportedLanguages.includes(value) || language.value === value) return
  language.value = value
  localStorage.setItem(LANGUAGE_STORAGE_KEY, value)
  if (value === 'en') applyLanguage()
  else scheduleTranslation()
}

export function useLanguage() {
  return { language, translations, setLanguage, supportedLanguages, isTranslating }
}

export function installLanguageTranslation() {
  if (observer || typeof document === 'undefined') return
  captureElements()
  observer = new MutationObserver(() => {
    if (applying) return
    captureElements()
    if (language.value === 'fr') scheduleTranslation()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  document.documentElement.lang = language.value
  if (language.value === 'fr') scheduleTranslation()
}

watch(language, (value) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, value)
  document.documentElement.lang = value
})
