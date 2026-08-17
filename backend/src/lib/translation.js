import { createHash } from 'node:crypto'
import { ApiError } from './api.js'

const SUPPORTED_LANGUAGES = new Set(['en', 'fr'])
const MAX_TEXTS_PER_REQUEST = 40
const MAX_TEXT_LENGTH = 2000
const MAX_TOTAL_CHARACTERS = 20000
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7
const translationCache = new Map()

function cacheKey(source, targetLanguage) {
  return createHash('sha256').update(`${targetLanguage}:${source}`).digest('hex')
}

function readCached(source, targetLanguage) {
  const entry = translationCache.get(cacheKey(source, targetLanguage))
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    translationCache.delete(cacheKey(source, targetLanguage))
    return null
  }
  return entry.value
}

function writeCached(source, targetLanguage, value) {
  translationCache.set(cacheKey(source, targetLanguage), { value, expiresAt: Date.now() + CACHE_TTL_MS })
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
  if (targetLanguage === 'en') return Object.fromEntries(texts.map((text) => [text, text]))

  const result = {}
  const missing = []
  for (const text of texts) {
    const cached = readCached(text, targetLanguage)
    if (cached) result[text] = cached
    else missing.push(text)
  }

  if (missing.length) {
    const provider = String(process.env.TRANSLATION_PROVIDER || 'deepl').toLowerCase()
    if (provider !== 'deepl') throw new ApiError(503, `Unsupported translation provider: ${provider}`)
    const translated = await translateWithDeepL(missing)
    missing.forEach((source, index) => {
      result[source] = translated[index] || source
      writeCached(source, targetLanguage, result[source])
    })
  }

  return result
}

export const translationLimits = {
  maxTextsPerRequest: MAX_TEXTS_PER_REQUEST,
  maxTextLength: MAX_TEXT_LENGTH,
  maxTotalCharacters: MAX_TOTAL_CHARACTERS,
}
