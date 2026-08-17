import { createHash } from 'node:crypto'
import { ApiError } from './api.js'

const SUPPORTED_LANGUAGES = new Set(['en', 'fr'])
const MAX_TEXTS_PER_REQUEST = 40
const MAX_TEXT_LENGTH = 2000
const MAX_TOTAL_CHARACTERS = 20000
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7
const translationCache = new Map()
const translationInFlight = new Map()
let supabaseClientPromise

async function getSupabaseClient() {
  if (!supabaseClientPromise) {
    supabaseClientPromise = import('../supabaseClient.js').then(({ supabase }) => supabase)
  }
  return supabaseClientPromise
}

function cacheKey(source, targetLanguage) {
  return createHash('sha256').update(`${targetLanguage}:${source}`).digest('hex')
}

function readCached(source, targetLanguage) {
  const key = cacheKey(source, targetLanguage)
  const entry = translationCache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    translationCache.delete(key)
    return null
  }
  return entry.value
}

function writeCached(source, targetLanguage, value) {
  translationCache.set(cacheKey(source, targetLanguage), {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

function persistentCacheEnabled() {
  return String(process.env.TRANSLATION_CACHE_PERSISTENT || 'true').toLowerCase() !== 'false'
}

async function readPersistentCached(sources, targetLanguage) {
  if (!persistentCacheEnabled() || sources.length === 0) return {}

  const keys = sources.map((source) => cacheKey(source, targetLanguage))
  const now = new Date().toISOString()
  try {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase
      .from('translation_cache')
      .select('cache_key, source_text, target_language, translated_text, expires_at')
      .in('cache_key', keys)
      .eq('target_language', targetLanguage)
      .gt('expires_at', now)

    if (error) throw error

    const result = {}
    for (const row of data || []) {
      if (
        typeof row?.source_text !== 'string' ||
        typeof row?.translated_text !== 'string' ||
        row.target_language !== targetLanguage ||
        row.expires_at <= now
      ) {
        continue
      }
      result[row.source_text] = row.translated_text
      writeCached(row.source_text, targetLanguage, row.translated_text)
    }
    return result
  } catch (error) {
    console.warn('[Translation cache] Persistent read failed:', error?.message || error)
    return {}
  }
}

async function writePersistentCached(entries, targetLanguage) {
  if (!persistentCacheEnabled() || entries.length === 0) return

  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString()
  const rows = entries.map(({ source, value }) => ({
    cache_key: cacheKey(source, targetLanguage),
    source_text: source,
    target_language: targetLanguage,
    translated_text: value,
    expires_at: expiresAt,
  }))

  try {
    const supabase = await getSupabaseClient()
    const { error } = await supabase.from('translation_cache').upsert(rows, { onConflict: 'cache_key' })
    if (error) throw error
  } catch (error) {
    // Translation must continue to work if the optional cache table has not yet
    // been migrated or Supabase is temporarily unavailable.
    console.warn('[Translation cache] Persistent write failed:', error?.message || error)
  }
}

export function normalizeTranslationRequest(body = {}) {
  const targetLanguage = String(body.targetLanguage || 'fr').trim().toLowerCase()
  if (!SUPPORTED_LANGUAGES.has(targetLanguage)) throw new ApiError(400, 'targetLanguage must be en or fr')
  if (!Array.isArray(body.texts) || body.texts.length === 0) throw new ApiError(400, 'texts must be a non-empty array')
  if (body.texts.length > MAX_TEXTS_PER_REQUEST) throw new ApiError(400, `texts cannot contain more than ${MAX_TEXTS_PER_REQUEST} items`)

  const texts = body.texts.map((value, index) => {
    if (typeof value !== 'string' || value.trim().length === 0) throw new ApiError(400, `texts[${index}] must be a non-empty string`)
    const text = value.trim()
    if (text.length > MAX_TEXT_LENGTH) throw new ApiError(400, `texts[${index}] must be at most ${MAX_TEXT_LENGTH} characters`)
    return text
  })
  const totalCharacters = texts.reduce((total, text) => total + text.length, 0)
  if (totalCharacters > MAX_TOTAL_CHARACTERS) throw new ApiError(400, `texts cannot exceed ${MAX_TOTAL_CHARACTERS} total characters`)

  return { targetLanguage, texts: [...new Set(texts)] }
}

async function translateWithDeepL(texts) {
  const apiKey = process.env.DEEPL_API_KEY
  if (!apiKey) throw new ApiError(503, 'French translation is not configured on the backend')

  const baseUrl = process.env.DEEPL_API_URL || 'https://api-free.deepl.com'
  let response
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/v2/translate`, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texts, source_lang: 'EN', target_lang: 'FR', preserve_formatting: true }),
    })
  } catch {
    throw new ApiError(503, 'The translation provider is unavailable')
  }

  if (!response.ok) {
    const status = response.status === 429 || response.status === 456 ? 503 : 502
    throw new ApiError(status, 'The translation provider rejected the request')
  }

  const payload = await response.json().catch(() => null)
  const translations = payload?.translations?.map((item) => item?.text).filter((value) => typeof value === 'string') || []
  if (translations.length !== texts.length) throw new ApiError(502, 'The translation provider returned an incomplete response')
  return translations
}

export async function translateTexts(texts, targetLanguage = 'fr') {
  const uniqueTexts = [...new Set(texts)]
  if (targetLanguage === 'en') return Object.fromEntries(uniqueTexts.map((text) => [text, text]))

  const result = {}
  const missing = []
  for (const text of uniqueTexts) {
    const cached = readCached(text, targetLanguage)
    if (cached !== null) result[text] = cached
    else missing.push(text)
  }

  if (!missing.length) return result

  // L2 lookup survives a Render restart and avoids a provider call when the
  // same string was translated by an earlier backend process.
  const persistent = await readPersistentCached(missing, targetLanguage)
  const providerMissing = []
  for (const source of missing) {
    if (persistent[source] !== undefined) result[source] = persistent[source]
    else providerMissing.push(source)
  }

  if (providerMissing.length) {
    const pending = new Map()
    const newProviderMissing = []
    for (const source of providerMissing) {
      const key = cacheKey(source, targetLanguage)
      const existing = translationInFlight.get(key)
      if (existing) pending.set(source, existing)
      else newProviderMissing.push(source)
    }

    if (newProviderMissing.length) {
      const providerPromise = (async () => {
        const provider = String(process.env.TRANSLATION_PROVIDER || 'deepl').toLowerCase()
        if (provider !== 'deepl') throw new ApiError(503, `Unsupported translation provider: ${provider}`)
        const translated = await translateWithDeepL(newProviderMissing)
        const entries = newProviderMissing.map((source, index) => ({ source, value: translated[index] || source }))
        for (const { source, value } of entries) writeCached(source, targetLanguage, value)
        await writePersistentCached(entries, targetLanguage)
        return Object.fromEntries(entries.map(({ source, value }) => [source, value]))
      })()

      for (const source of newProviderMissing) {
        const key = cacheKey(source, targetLanguage)
        const sourcePromise = providerPromise.then((values) => values[source])
        translationInFlight.set(key, sourcePromise)
        pending.set(source, sourcePromise)
      }

      const cleanup = () => {
        for (const source of newProviderMissing) {
          const key = cacheKey(source, targetLanguage)
          const sourcePromise = translationInFlight.get(key)
          if (sourcePromise) translationInFlight.delete(key)
        }
      }
      providerPromise.then(cleanup, cleanup)
    }

    for (const [source, promise] of pending) result[source] = await promise
  }

  return result
}

export function clearTranslationCache() {
  translationCache.clear()
  translationInFlight.clear()
}

export const translationLimits = {
  maxTextsPerRequest: MAX_TEXTS_PER_REQUEST,
  maxTextLength: MAX_TEXT_LENGTH,
  maxTotalCharacters: MAX_TOTAL_CHARACTERS,
  cacheTtlMs: CACHE_TTL_MS,
}
