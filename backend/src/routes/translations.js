import express from 'express'
import { ApiError, asyncRoute, sendData } from '../lib/api.js'
import { normalizeTranslationRequest, translateTexts } from '../lib/translation.js'

const router = express.Router()
const requestWindows = new Map()
const WINDOW_MS = 5 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 60

function enforceRateLimit(req) {
  const now = Date.now()
  const key = req.ip || 'unknown'
  const current = requestWindows.get(key)
  if (!current || current.resetAt <= now) {
    requestWindows.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) throw new ApiError(429, 'Translation request limit reached. Try again later.')
  current.count += 1
}

router.post('/', asyncRoute(async (req, res) => {
  enforceRateLimit(req)
  const { targetLanguage, texts } = normalizeTranslationRequest(req.body)
  const translations = await translateTexts(texts, targetLanguage)
  return sendData(res, { targetLanguage, translations })
}))

export default router
