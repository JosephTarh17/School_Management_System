import { expect } from 'chai'
import request from 'supertest'

process.env.JWT_SECRET ||= 'test-only-jwt-secret'
process.env.SUPABASE_URL ||= 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= ['test', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'test'].join('.')
process.env.TRANSLATION_CACHE_PERSISTENT = 'false'

const { default: app } = await import('../src/app.js')
const {
  clearTranslationCache,
  normalizeTranslationRequest,
  translateTexts,
  translationLimits,
} = await import('../src/lib/translation.js')

const originalFetch = global.fetch

function mockTranslationProvider() {
  let calls = 0
  let requestedTexts = []
  global.fetch = async (_url, options) => {
    calls += 1
    const body = JSON.parse(options.body)
    requestedTexts = body.text
    return {
      ok: true,
      async json() {
        return { translations: body.text.map((text) => ({ text: `FR:${text}` })) }
      },
    }
  }
  return {
    calls: () => calls,
    requestedTexts: () => requestedTexts,
  }
}

describe('Translation API and cache', () => {
  beforeEach(() => {
    clearTranslationCache()
    process.env.TRANSLATION_CACHE_PERSISTENT = 'false'
    process.env.TRANSLATION_PROVIDER = 'deepl'
    process.env['DEEPL_API_KEY'] = 'test-only-provider-key'
  })

  afterEach(() => {
    clearTranslationCache()
    global.fetch = originalFetch
    delete process.env.DEEPL_API_KEY
  })

  it('supports public English fallback without provider access', async () => {
    const response = await request(app)
      .post('/translations')
      .send({ targetLanguage: 'en', texts: ['Course Registration'] })

    expect(response.status).to.equal(200)
    expect(response.body.data.translations).to.deep.equal({ 'Course Registration': 'Course Registration' })
  })

  it('returns a safe configuration error when French provider access is unavailable', async () => {
    delete process.env.DEEPL_API_KEY
    const response = await request(app)
      .post('/translations')
      .send({ targetLanguage: 'fr', texts: ['Course Registration'] })

    expect(response.status).to.equal(503)
  })

  it('reuses a cached translation instead of calling the provider again', async () => {
    const provider = mockTranslationProvider()

    expect(await translateTexts(['Attendance'], 'fr')).to.deep.equal({ Attendance: 'FR:Attendance' })
    expect(await translateTexts(['Attendance'], 'fr')).to.deep.equal({ Attendance: 'FR:Attendance' })
    expect(provider.calls()).to.equal(1)
  })

  it('deduplicates identical strings inside one provider batch', async () => {
    const provider = mockTranslationProvider()

    const result = await translateTexts(['Attendance', 'Attendance', 'Course Registration'], 'fr')

    expect(result).to.deep.equal({ Attendance: 'FR:Attendance', 'Course Registration': 'FR:Course Registration' })
    expect(provider.calls()).to.equal(1)
    expect(provider.requestedTexts()).to.deep.equal(['Attendance', 'Course Registration'])
  })

  it('coalesces simultaneous cache misses into one provider request', async () => {
    let releaseProvider
    let calls = 0
    global.fetch = async (_url, options) => {
      calls += 1
      const body = JSON.parse(options.body)
      await new Promise((resolve) => {
        releaseProvider = resolve
      })
      return {
        ok: true,
        async json() {
          return { translations: body.text.map((text) => ({ text: `FR:${text}` })) }
        },
      }
    }

    const first = translateTexts(['Attendance'], 'fr')
    await new Promise((resolve) => setImmediate(resolve))
    const second = translateTexts(['Attendance'], 'fr')
    releaseProvider()

    const results = await Promise.all([first, second])
    expect(results).to.deep.equal([{ Attendance: 'FR:Attendance' }, { Attendance: 'FR:Attendance' }])
    expect(calls).to.equal(1)
  })

  it('re-translates an entry after the seven-day cache TTL expires', async () => {
    const provider = mockTranslationProvider()
    const realDateNow = Date.now
    let currentTime = realDateNow()
    Date.now = () => currentTime

    try {
      await translateTexts(['Attendance'], 'fr')
      currentTime += translationLimits.cacheTtlMs + 1
      await translateTexts(['Attendance'], 'fr')
    } finally {
      Date.now = realDateNow
    }

    expect(provider.calls()).to.equal(2)
  })

  it('accepts a valid English-to-French batch request', () => {
    expect(normalizeTranslationRequest({ targetLanguage: 'fr', texts: ['Course Registration', 'Attendance'] })).to.deep.equal({
      targetLanguage: 'fr',
      texts: ['Course Registration', 'Attendance'],
    })
  })

  it('returns English text without provider use when English is selected', () => {
    expect(normalizeTranslationRequest({ targetLanguage: 'en', texts: ['Course Registration'] })).to.deep.equal({
      targetLanguage: 'en',
      texts: ['Course Registration'],
    })
  })

  it('rejects unsupported languages and oversized batches', () => {
    expect(() => normalizeTranslationRequest({ targetLanguage: 'es', texts: ['Hello'] })).to.throw('targetLanguage must be en or fr')
    expect(() => normalizeTranslationRequest({ targetLanguage: 'fr', texts: Array.from({ length: 41 }, () => 'Hello') })).to.throw('texts cannot contain more than 40 items')
  })
})
