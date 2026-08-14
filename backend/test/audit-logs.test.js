import { expect } from 'chai'
import request from 'supertest'

process.env.JWT_SECRET = 'a'.repeat(64)
process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature'

const { default: app } = await import('../src/app.js')
const { requireRole, signAccessToken } = await import('../src/middleware/auth.js')

describe('Administrator audit-log route', () => {
  it('requires authentication', async () => {
    const response = await request(app).get('/audit-logs')
    expect(response.status).to.equal(401)
    expect(response.body.error).to.equal('Authentication required')
  })

  it('rejects authenticated non-administrators at the administrator role guard', () => {
    const next = (error) => error
    const error = requireRole('administrator')({
      user: {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'teacher-test@example.invalid',
        role: 'teacher',
      },
    }, {}, next)
    expect(error.status).to.equal(403)
    expect(error.message).to.equal('You do not have permission to perform this action')
  })
})
