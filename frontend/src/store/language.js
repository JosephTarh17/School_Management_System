import { reactive, ref, watch } from 'vue'
import { authStore } from './auth.js'
import { fetchTranslations } from '../api.js'

const LANGUAGE_STORAGE_KEY = 'sms_language'
const supportedLanguages = ['en', 'fr']
const language = ref(localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'fr' ? 'fr' : 'en')
const translations = reactive({})
const trackedTextNodes = new Set()
const originalText = new WeakMap()
let observer = null
let translationTimer = null
const translating = ref(false)

function isSupportedLanguage(value) {
  return supportedLanguages.includes(value)
}

function shouldSkipTextNode(node) {
  const parent = node.parentElement
  if (!parent || !node.isConnected) return true
  if (parent.closest('[data-no-translate], script, style, noscript, textarea, pre, code')) return true
  const text = node.nodeValue?.trim() || ''
  if (!text || /^[-—\d\s.,:/+%#()]+$/.test(text)) return true
  if (/^[A-Z]{2,}[\d_-]*$/.test(text) || /^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(text)) return true
  return false
}

function registerTextNodes(root = document.body) {
  if (!root) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    if (shouldSkipTextNode(node)) continue
    if (!originalText.has(node)) originalText.set(node, node.nodeValue.trim())
    trackedTextNodes.add(node)
  }
}

function activeSources() {
  const sources = []
  for (const node of trackedTextNodes) {
    if (!node.isConnected || shouldSkipTextNode(node)) continue
    const source = originalText.get(node)
    if (source && !translations[source]) sources.push(source)
  }
  return [...new Set(sources)]
}

function applyTranslations() {
  for (const node of trackedTextNodes) {
    if (!node.isConnected) continue
    const source = originalText.get(node)
    if (!source) continue
    node.nodeValue = language.value === 'fr' ? (translations[source] || source) : source
  }
  if (document.documentElement) document.documentElement.lang = language.value
}

async function translateRegisteredText() {
  if (language.value !== 'fr' || translating.value) return
  const token = authStore.token.value
  if (!token) return
  registerTextNodes()
  const sources = activeSources()
  if (!sources.length) {
    applyTranslations()
    return
  }

  translating.value = true
  try {
    for (let index = 0; index < sources.length; index += 40) {
      const batch = sources.slice(index, index + 40)
      const result = await fetchTranslations(token, batch, 'fr')
      if (result.ok && result.data?.translations) Object.assign(translations, result.data.translations)
    }
  } finally {
    translating.value = false
    applyTranslations()
  }
}

function scheduleTranslation() {
  if (translationTimer) window.clearTimeout(translationTimer)
  translationTimer = window.setTimeout(() => {
    translationTimer = null
    translateRegisteredText()
  }, 120)
}

export function setLanguage(value) {
  if (!isSupportedLanguage(value) || language.value === value) return
  language.value = value
  localStorage.setItem(LANGUAGE_STORAGE_KEY, value)
  if (value === 'en') applyTranslations()
  else scheduleTranslation()
}

export function useLanguage() {
  return {
    language,
    translations,
    setLanguage,
    supportedLanguages,
    isTranslating: translating,
  }
}

export function installLanguageTranslation() {
  if (observer || typeof document === 'undefined') return
  registerTextNodes()
  observer = new MutationObserver(() => {
    if (translating.value) return
    registerTextNodes()
    if (language.value === 'fr') scheduleTranslation()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  applyTranslations()
  if (language.value === 'fr') scheduleTranslation()
}

watch(language, (value) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, value)
  if (value === 'en') applyTranslations()
  else scheduleTranslation()
})

watch(authStore.token, (value) => {
  if (value && language.value === 'fr') scheduleTranslation()
})
