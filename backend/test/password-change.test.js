import { expect } from 'chai'
import request from 'supertest'

process.env.JWT_SECRET ||= 'test-only-jwt-secret'
process.env.SUPABASE_URL ||= 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= ['test', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'test'].join('.')

const { default: app } = await import('../src/app.js')
const { parsePasswordChange } = await import('../src/routes/users.js')

describe('Change-password API', () => {
  it('requires authentication', async () => {
    const response = await request(app)
      .post('/users/me/change-password')
      .send({ current_password: 'current-value', new_password: 'new-value-123' })

    expect(response.status).to.equal(401)
  })

  it('validates password length and prevents reusing the current password', () => {
    expect(() => parsePasswordChange({ current_password: 'old-value', new_password: 'short' })).to.throw('new_password must be at least 8 characters')
    expect(() => parsePasswordChange({ current_password: 'same-value', new_password: 'same-value' })).to.throw('new_password must be different from the current password')
  })

  it('returns normalized password values for a valid payload', () => {
    expect(parsePasswordChange({ current_password: 'old-value', new_password: 'new-value-123' })).to.deep.equal({
      currentPassword: 'old-value',
      newPassword: 'new-value-123',
    })
  })
})
