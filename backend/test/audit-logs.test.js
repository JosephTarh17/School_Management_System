import { expect } from 'chai'
import request from 'supertest'

process.env.JWT_SECRET ||= 'test-only-jwt-secret'
process.env.SUPABASE_URL ||= 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= ['test', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'test'].join('.')

const { default: app } = await import('../src/app.js')
const { requireRole, signAccessToken } = await import('../src/middleware/auth.js')
const { shouldAuditRequest } = await import('../src/lib/audit.js')

describe('Administrator audit-log route', () => {
  it('requires authentication', async () => {
    const response = await request(app).get('/audit-logs')
    expect(response.status).to.equal(401)
    expect(response.body.error).to.equal('Authentication required')
  })

  it('does not create routine logout audit noise', () => {
    expect(shouldAuditRequest({ method: 'POST', path: '/auth/logout' })).to.equal(false)
    expect(shouldAuditRequest({ method: 'POST', path: '/users/register' })).to.equal(true)
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
