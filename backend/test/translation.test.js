import { expect } from 'chai'
import request from 'supertest'

process.env.JWT_SECRET = 'a'.repeat(64)
process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature'

const { default: app } = await import('../src/app.js')
const { normalizeTranslationRequest } = await import('../src/lib/translation.js')

describe('Translation API', () => {
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
