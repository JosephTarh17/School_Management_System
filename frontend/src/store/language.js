import { reactive, ref, watch } from 'vue'
import { authStore } from './auth.js'
import { fetchTranslations } from '../api.js'

const LANGUAGE_STORAGE_KEY = 'sms_language'
const supportedLanguages = ['en', 'fr']
const language = ref(localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'fr' ? 'fr' : 'en')
const translations = reactive({})
const LOGIN_STATIC_TRANSLATIONS = {
  'Institutional Sign In': 'Connexion institutionnelle',
  'Use your institutional account to access your portal.': 'Utilisez votre compte institutionnel pour accéder à votre portail.',
  'Email Address': 'Adresse e-mail',
  'Contact an administrator for help': 'Contactez un administrateur pour obtenir de l’aide',
  'Password': 'Mot de passe',
  'Your password': 'Votre mot de passe',
  'Signing in…': 'Connexion…',
  'Sign In': 'Se connecter',
  'Verify administrator MFA': 'Vérifier l’authentification multifacteur de l’administrateur',
  'Enter the six-digit code from your authenticator application.': 'Saisissez le code à six chiffres de votre application d’authentification.',
  'Verifying…': 'Vérification…',
  'Verify and Sign In': 'Vérifier et se connecter',
  'Use a different account': 'Utiliser un autre compte',
  'Need an account?': 'Besoin d’un compte ?',
  'Create Account': 'Créer un compte',
  'Enter the one-time code from your authenticator application.': 'Saisissez le code à usage unique de votre application d’authentification.',
  'Unable to sign in. Check your credentials and try again.': 'Impossible de se connecter. Vérifiez vos identifiants et réessayez.',
  'Unable to verify the MFA code.': 'Impossible de vérifier le code MFA.',
  Email: 'E-mail',
}
const elementStates = new WeakMap()
const attributeStates = new WeakMap()
let observer = null
let scanTimer = null
let translating = false
let applying = false
const isTranslating = ref(false)

const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'PRE', 'CODE'])
const SKIPPED_CLASSES = ['material-symbols-outlined', 'iconify']
const NUMERIC_OR_SYMBOL_ONLY = /^[-—\d\s.,:/+%#()]+$/
const UPPERCASE_CODE = /^[A-Z]{2,}[\d_-]*$/
const EMAIL_VALUE = /^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/i
const UUID_VALUE = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i

function shouldSkipValue(value) {
  const text = String(value || '').trim()
  return !text || NUMERIC_OR_SYMBOL_ONLY.test(text) || UPPERCASE_CODE.test(text) || EMAIL_VALUE.test(text) || UUID_VALUE.test(text) || text.length > 2000
}

function isSkippedElement(element) {
  return !element || SKIPPED_TAGS.has(element.tagName) || SKIPPED_CLASSES.some((className) => element.classList.contains(className)) || element.dataset.noTranslate === 'true' || Boolean(element.closest('[data-no-translate="true"]'))
}

function isSkippedAttributeElement(element) {
  return !element || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName) || element.dataset.noTranslate === 'true' || Boolean(element.closest('[data-no-translate="true"]'))
}

function collectTextTargets(element) {
  const targets = []
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.trim()) targets.push(node)
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE || isSkippedElement(node)) return
    node.childNodes.forEach(walk)
  }
  element.childNodes.forEach(walk)
  return targets
}

function normalizeTextTargets(targets) {
  return targets.map((target) => target.textContent.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

function isSemanticElement(element) {
  if (isSkippedElement(element)) return false
  const meaningfulChildren = [...element.children].filter((child) => !isSkippedElement(child))
  if (meaningfulChildren.length > 1) return false
  const targets = collectTextTargets(element)
  return targets.length === 1 && !shouldSkipValue(normalizeTextTargets(targets))
}

function captureElements(root = document.body) {
  if (!root || typeof document === 'undefined') return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let element
  while ((element = walker.nextNode())) {
    if (isSemanticElement(element)) {
      const targets = collectTextTargets(element)
      const current = normalizeTextTargets(targets)
      const state = elementStates.get(element)
      if (!state) elementStates.set(element, { source: current, applied: null, targets })
      else {
        const knownTranslation = translations[state.source]
        const isExpectedValue = current === state.source || (knownTranslation && current === knownTranslation)
        if (!isExpectedValue && state.applied !== current) {
          state.source = current
          state.applied = null
        }
        state.targets = targets
      }
    }

    for (const attribute of ['placeholder', 'title', 'aria-label']) {
      const value = element.getAttribute(attribute)
      if (!value || shouldSkipValue(value) || isSkippedAttributeElement(element)) continue
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
    if (state && element.isConnected && state.targets?.some((target) => target.isConnected) && state.applied !== normalizeTextTargets(state.targets)) collect(state.source)
    const attributes = attributeStates.get(element)
    if (attributes) Object.values(attributes).forEach((attributeState) => {
      if (attributeState && element.isConnected && attributeState.applied !== element.getAttribute(attributeState.attribute)) collect(attributeState.source)
    })
  })

  return [...new Set(sources)]
}

function applyLanguage() {
  applying = true
  try {
    document.querySelectorAll('*').forEach((element) => {
      const state = elementStates.get(element)
      if (state && element.isConnected && state.targets?.length === 1) {
        const desired = language.value === 'fr' ? (translations[state.source] || state.source) : state.source
        if (state.targets[0].textContent.trim() !== desired) state.targets[0].textContent = desired
        state.applied = desired
      }

      const attributes = attributeStates.get(element)
      if (attributes && element.isConnected) {
        Object.entries(attributes).forEach(([attribute, attributeState]) => {
          const desired = language.value === 'fr' ? (translations[attributeState.source] || attributeState.source) : attributeState.source
          if (element.getAttribute(attribute) !== desired) element.setAttribute(attribute, desired)
          attributeState.applied = desired
          attributeState.attribute = attribute
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
  Object.assign(translations, LOGIN_STATIC_TRANSLATIONS)
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
  if (value === 'fr') Object.assign(translations, LOGIN_STATIC_TRANSLATIONS)
  if (value === 'en') applyLanguage()
  else {
    applyLanguage()
    scheduleTranslation()
  }
}

export function useLanguage() {
  return { language, translations, setLanguage, supportedLanguages, isTranslating }
}

export function refreshLanguageTranslation() {
  if (typeof document === 'undefined') return
  captureElements()
  if (language.value === 'fr') scheduleTranslation()
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
  refreshLanguageTranslation()
}

watch(language, (value) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, value)
  document.documentElement.lang = value
})
