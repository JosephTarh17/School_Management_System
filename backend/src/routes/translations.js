import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncRoute, sendData } from '../lib/api.js'
import { normalizeTranslationRequest, translateTexts } from '../lib/translation.js'

const router = express.Router()

router.post('/', requireAuth, asyncRoute(async (req, res) => {
  const { targetLanguage, texts } = normalizeTranslationRequest(req.body)
  const translations = await translateTexts(texts, targetLanguage)
  return sendData(res, { targetLanguage, translations })
}))

export default router
