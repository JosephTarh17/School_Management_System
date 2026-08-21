import { reactive, ref, watch } from 'vue'
import { authStore } from './auth.js'
import { fetchTranslations } from '../api.js'

const LANGUAGE_STORAGE_KEY = 'sms_language'
const supportedLanguages = ['en', 'fr']
const language = ref(localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'fr' ? 'fr' : 'en')
const translations = reactive({})

const STATIC_FRENCH_TRANSLATIONS = {
  'Institutional Sign In': 'Connexion institutionnelle',
  'Use your institutional account to access your portal.': 'Utilisez votre compte institutionnel pour accéder à votre portail.',
  'Email Address': 'Adresse e-mail',
  'Contact an administrator for help': 'Contactez un administrateur pour obtenir de l’aide',
  Password: 'Mot de passe',
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

  Administration: 'Administration',
  'Account Management': 'Gestion des comptes',
  'Manage access without deleting academic, attendance, financial, or audit history.': 'Gérez les accès sans supprimer l’historique académique, des présences, financier ou d’audit.',
  'Refresh accounts': 'Actualiser les comptes',
  'Refreshing…': 'Actualisation…',
  'Create account': 'Créer un compte',
  'Close create form': 'Fermer le formulaire de création',
  'Create a non-teaching account': 'Créer un compte hors enseignement',
  'Create a Student, Guardian, or Administrator profile with a one-time temporary password. Teacher accounts remain under Staff Management.': 'Créez un profil Étudiant, Tuteur ou Administrateur avec un mot de passe temporaire à usage unique. Les comptes des enseignants restent dans Gestion du personnel.',
  'Administrator only': 'Administrateur uniquement',
  'Account type': 'Type de compte',
  Student: 'Étudiant',
  Students: 'Étudiants',
  Guardian: 'Tuteur',
  Guardians: 'Tuteurs',
  Administrator: 'Administrateur',
  Administrators: 'Administrateurs',
  Teacher: 'Enseignant',
  Teachers: 'Enseignants',
  Email: 'E-mail',
  'Full name': 'Nom complet',
  'Class level': 'Niveau de classe',
  'Not set': 'Non défini',
  Freshman: 'Première année',
  Sophomore: 'Deuxième année',
  Junior: 'Troisième année',
  'Date of birth': 'Date de naissance',
  Phone: 'Téléphone',
  Address: 'Adresse',
  Relationship: 'Lien de parenté',
  Optional: 'Facultatif',
  Department: 'Département',
  'The new Administrator is active and must change the temporary password at first login.': 'Le nouvel administrateur est actif et doit modifier le mot de passe temporaire lors de sa première connexion.',
  'Create account': 'Créer le compte',
  'Creating…': 'Création…',
  'Clear form': 'Effacer le formulaire',
  'Change access without deleting history': 'Modifier l’accès sans supprimer l’historique',
  'Enable, disable, reset, or suspend an account only after checking the target user and reason. These actions affect access and sessions, but preserve academic, attendance, finance, and audit history.': 'Activez, désactivez, réinitialisez ou suspendez un compte après avoir vérifié l’utilisateur ciblé et le motif. Ces actions concernent l’accès et les sessions, mais préservent les historiques académique, des présences, financier et d’audit.',
  'The user receives the existing security outcome, and the action is recorded in audit history. Lifecycle settings may take effect immediately or when the account lifecycle check runs.': 'L’utilisateur reçoit le résultat de sécurité correspondant et l’action est enregistrée dans l’historique d’audit. Les paramètres du cycle de vie peuvent prendre effet immédiatement ou lors du contrôle du cycle de vie du compte.',
  'Review the target account and role before acting.': 'Vérifiez le compte et le rôle ciblés avant d’agir.',
  'Enter a clear reason for security and audit history.': 'Saisissez un motif clair pour la sécurité et l’historique d’audit.',
  'Tell the user what they must do next after a reset or suspension.': 'Indiquez à l’utilisateur ce qu’il doit faire après une réinitialisation ou une suspension.',
  'One-time temporary password': 'Mot de passe temporaire à usage unique',
  'Share this value securely with the user. It is not stored in the audit log, and the user should change it immediately after signing in.': 'Communiquez cette valeur à l’utilisateur de manière sécurisée. Elle n’est pas enregistrée dans le journal d’audit et l’utilisateur doit la modifier immédiatement après sa connexion.',
  Accounts: 'Comptes',
  Enabled: 'Activés',
  Disabled: 'Désactivés',
  'Active administrators': 'Administrateurs actifs',
  'All roles': 'Tous les rôles',
  'All statuses': 'Tous les statuts',
  'All accounts': 'Tous les comptes',
  'Never logged in': 'Jamais connecté',
  'Failed logins': 'Échecs de connexion',
  'Temporary lifecycle': 'Cycle de vie temporaire',
  'Activation required': 'Activation requise',
  Review: 'Révision',
  'Search accounts': 'Rechercher des comptes',
  'Search by name or email': 'Rechercher par nom ou e-mail',
  'No accounts match the selected filters.': 'Aucun compte ne correspond aux filtres sélectionnés.',
  'Loading accounts…': 'Chargement des comptes…',
  Role: 'Rôle',
  Created: 'Créé le',
  'Last login': 'Dernière connexion',
  'Account ID': 'Identifiant du compte',
  'Not recorded': 'Non enregistré',
  'Enable account': 'Activer le compte',
  'Disable account': 'Désactiver le compte',
  'Force logout': 'Forcer la déconnexion',
  'Reset password': 'Réinitialiser le mot de passe',
  'Reset MFA': 'Réinitialiser la MFA',
  'Lifecycle settings': 'Paramètres du cycle de vie',
  'View history': 'Voir l’historique',
  'Your own account cannot be force-logged out or reset here.': 'Votre propre compte ne peut pas être déconnecté de force ou réinitialisé ici.',
  'Keep one active administrator available.': 'Conservez au moins un administrateur actif.',
  'Account history': 'Historique du compte',
  'Recent append-only security events for this account.': 'Événements de sécurité récents et non modifiables pour ce compte.',
  'No account-specific audit events were found.': 'Aucun événement d’audit propre à ce compte n’a été trouvé.',
  'Close history': 'Fermer l’historique',
  'Reason': 'Motif',
  'Reason for disabling': 'Motif de la désactivation',
  'Explain why this administrative action is required.': 'Expliquez pourquoi cette action administrative est nécessaire.',
  'Explain the lifecycle decision.': 'Expliquez la décision liée au cycle de vie.',
  'Explain why this account is being disabled.': 'Expliquez pourquoi ce compte est désactivé.',
  'Set a temporary suspension end date or an account expiration date. Leave a date empty to clear that lifecycle rule.': 'Définissez une date de fin de suspension temporaire ou d’expiration du compte. Laissez une date vide pour supprimer cette règle du cycle de vie.',
  'All active sessions will be revoked immediately. The account and its records will remain in the system.': 'Toutes les sessions actives seront immédiatement révoquées. Le compte et ses données resteront dans le système.',
  Cancel: 'Annuler',
  'Administrative action': 'Action administrative',
  'All active sessions will be revoked, but the account will remain enabled.': 'Toutes les sessions actives seront révoquées, mais le compte restera activé.',
  'A temporary password will be generated, all active sessions will be revoked, and the user should change the password after signing in.': 'Un mot de passe temporaire sera généré, toutes les sessions actives seront révoquées et l’utilisateur devra modifier le mot de passe après sa connexion.',
  'The current MFA enrollment will be cleared, all active sessions will be revoked, and the user will be required to set up MFA again.': 'L’enrôlement MFA actuel sera supprimé, toutes les sessions actives seront révoquées et l’utilisateur devra configurer à nouveau la MFA.',
  'This action will be recorded in the security audit log.': 'Cette action sera enregistrée dans le journal d’audit de sécurité.',
  'Revoke all sessions': 'Révoquer toutes les sessions',
  'Reset MFA enrollment': 'Réinitialiser l’enrôlement MFA',
  'Generate temporary password': 'Générer un mot de passe temporaire',
  'Unable to create the account.': 'Impossible de créer le compte.',
  'Unable to load accounts.': 'Impossible de charger les comptes.',
  'Unable to update account status.': 'Impossible de mettre à jour le statut du compte.',
  'Unable to complete the administrative account action.': 'Impossible de terminer l’action administrative sur le compte.',
  'Administrative account action completed.': 'Action administrative sur le compte terminée.',
  'Unable to update lifecycle settings.': 'Impossible de mettre à jour les paramètres du cycle de vie.',
  'Unable to load account history.': 'Impossible de charger l’historique du compte.',
  Event: 'Événement',
  System: 'Système',
  'Last failed': 'Dernier échec',
  'Last IP': 'Dernière adresse IP',
  Activation: 'Activation',
  Required: 'Requise',
  Complete: 'Terminée',
  'Disabled on': 'Désactivé le',
  'Enable it to allow a new login.': 'Activez-le pour autoriser une nouvelle connexion.',
  'Temporary suspension ends': 'La suspension temporaire se termine le',
  'Account expiration': 'Expiration du compte',
  Continue: 'Continuer',
  'Processing…': 'Traitement…',
  'Saving…': 'Enregistrement…',
  'Enabling…': 'Activation…',
  'Disabling…': 'Désactivation…',
  'Disable account': 'Désactiver le compte',
  'Confirm disable': 'Confirmer la désactivation',
  'Enable': 'Activer',
  'Disable': 'Désactiver',
  'Suspension ends': 'Fin de la suspension',
  'Account expires': 'Expiration du compte',
  'Save lifecycle settings': 'Enregistrer les paramètres du cycle de vie',
  'Loading students…': 'Chargement des étudiants…',
  'No linked students': 'Aucun étudiant lié',
  'Close create form': 'Fermer le formulaire de création',
  'Loading account history…': 'Chargement de l’historique du compte…',
}

const elementStates = new WeakMap()
const attributeStates = new WeakMap()
const trackedTextNodes = new Set()
const trackedAttributeElements = new Set()
let observer = null
let scanTimer = null
let translating = false
let applying = false
const isTranslating = ref(false)

const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'INPUT', 'TEXTAREA', 'PRE', 'CODE'])
const SKIPPED_CLASSES = ['material-symbols-outlined', 'iconify']
const NUMERIC_OR_SYMBOL_ONLY = /^[-—\d\s.,:/+%#()]+$/
const CODE_VALUE = /^(?=.*\d)[A-Z0-9_-]{2,}$|^(XAF|MFA|ID|URL|API)$/i
const EMAIL_VALUE = /^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/i
const UUID_VALUE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function shouldSkipValue(value) {
  const text = normalizeText(value)
  return !text || NUMERIC_OR_SYMBOL_ONLY.test(text) || CODE_VALUE.test(text) || EMAIL_VALUE.test(text) || UUID_VALUE.test(text) || text.length > 2000
}

function isSkippedElement(element) {
  return !element || SKIPPED_TAGS.has(element.tagName) || SKIPPED_CLASSES.some((className) => element.classList.contains(className)) || element.dataset.noTranslate === 'true' || Boolean(element.closest('[data-no-translate="true"]'))
}

function isSkippedAttributeElement(element) {
  return !element || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName) || element.dataset.noTranslate === 'true' || Boolean(element.closest('[data-no-translate="true"]'))
}

function preserveWhitespace(original, replacement) {
  const leading = String(original).match(/^\s*/)?.[0] || ''
  const trailing = String(original).match(/\s*$/)?.[0] || ''
  return `${leading}${replacement}${trailing}`
}

function captureTextNode(node) {
  const parent = node.parentElement
  const current = normalizeText(node.textContent)
  if (!parent || !current || shouldSkipValue(current) || isSkippedElement(parent)) return
  trackedTextNodes.add(node)
  const state = elementStates.get(node)
  if (!state) {
    elementStates.set(node, { source: current, applied: null })
    return
  }
  const knownTranslation = translations[state.source]
  if (current !== state.source && current !== knownTranslation && current !== state.applied) {
    state.source = current
    state.applied = null
  }
}

function captureAttribute(element, attribute) {
  const value = element.getAttribute(attribute)
  if (!value || shouldSkipValue(value) || isSkippedAttributeElement(element)) return
  trackedAttributeElements.add(element)
  const state = attributeStates.get(element) || {}
  if (!state[attribute]) state[attribute] = { source: value, applied: null, attribute }
  else {
    const attributeState = state[attribute]
    const knownTranslation = translations[attributeState.source]
    if (value !== attributeState.source && value !== knownTranslation && value !== attributeState.applied) {
      attributeState.source = value
      attributeState.applied = null
    }
  }
  attributeStates.set(element, state)
}

function captureTargets(root = document.body) {
  if (!root || typeof document === 'undefined') return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) captureTextNode(node)
  const elements = root.querySelectorAll ? root.querySelectorAll('*') : []
  elements.forEach((element) => ['placeholder', 'title', 'aria-label'].forEach((attribute) => captureAttribute(element, attribute)))
}

function collectMissingSources() {
  const sources = []
  const collect = (source) => {
    if (source && !translations[source]) sources.push(source)
  }
  trackedTextNodes.forEach((node) => {
    if (!node.isConnected) return trackedTextNodes.delete(node)
    const state = elementStates.get(node)
    if (state) collect(state.source)
  })
  trackedAttributeElements.forEach((element) => {
    if (!element.isConnected) return trackedAttributeElements.delete(element)
    const attributes = attributeStates.get(element)
    if (attributes) Object.values(attributes).forEach((attributeState) => collect(attributeState.source))
  })
  return [...new Set(sources)]
}

function applyLanguage() {
  applying = true
  try {
    trackedTextNodes.forEach((node) => {
      if (!node.isConnected) return trackedTextNodes.delete(node)
      const state = elementStates.get(node)
      if (!state) return
      const desired = language.value === 'fr' ? (translations[state.source] || state.source) : state.source
      if (normalizeText(node.textContent) !== desired) node.textContent = preserveWhitespace(node.textContent, desired)
      state.applied = desired
    })
    trackedAttributeElements.forEach((element) => {
      if (!element.isConnected) return trackedAttributeElements.delete(element)
      const attributes = attributeStates.get(element)
      if (!attributes) return
      Object.entries(attributes).forEach(([attribute, attributeState]) => {
        const desired = language.value === 'fr' ? (translations[attributeState.source] || attributeState.source) : attributeState.source
        if (element.getAttribute(attribute) !== desired) element.setAttribute(attribute, desired)
        attributeState.applied = desired
      })
    })
    document.documentElement.lang = language.value
  } finally {
    applying = false
  }
}

async function translateMissingSources() {
  if (language.value !== 'fr' || translating || typeof document === 'undefined') return
  Object.assign(translations, STATIC_FRENCH_TRANSLATIONS)
  captureTargets()
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
  if (value === 'fr') Object.assign(translations, STATIC_FRENCH_TRANSLATIONS)
  applyLanguage()
  if (value === 'fr') scheduleTranslation()
}

export function useLanguage() {
  return { language, translations, setLanguage, supportedLanguages, isTranslating }
}

export function refreshLanguageTranslation() {
  if (typeof document === 'undefined') return
  captureTargets()
  if (language.value === 'fr') scheduleTranslation()
}

export function installLanguageTranslation() {
  if (observer || typeof document === 'undefined') return
  captureTargets()
  observer = new MutationObserver(() => {
    if (applying) return
    captureTargets()
    if (language.value === 'fr') scheduleTranslation()
  })
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] })
  document.documentElement.lang = language.value
  refreshLanguageTranslation()
}

watch(language, (value) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, value)
  document.documentElement.lang = value
})
