import assert from 'node:assert/strict'
import request from 'supertest'

process.env.JWT_SECRET ||= 'test-only-jwt-secret'
process.env.SUPABASE_URL ||= 'https://example.supabase.co'
const serviceRoleEnvironmentVariable = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_')
process.env[serviceRoleEnvironmentVariable] ||= ['test', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'test'].join('.')

const { default: app } = await import('../src/app.js')
const { assertGuardianJustificationOpen } = await import('../src/routes/guardianPortal.js')

describe('Guardian Release 1 API', () => {
  it('requires authentication for the guardian portal', async () => {
    const response = await request(app).get('/guardian-portal/children')
    assert.equal(response.status, 401)
  })

  it('allows an absent record with an open deadline', () => {
    assert.doesNotThrow(() => assertGuardianJustificationOpen({
      status: 'Absent',
      justificationStatus: 'PENDING',
      deadlineAt: new Date(Date.now() + 60_000).toISOString(),
    }))
  })

  it('rejects non-absent and already reviewed records', () => {
    assert.throws(() => assertGuardianJustificationOpen({ status: 'Present', justificationStatus: 'PENDING' }), /Only an absent attendance record/)
    assert.throws(() => assertGuardianJustificationOpen({ status: 'Absent', justificationStatus: 'APPROVED' }), /already been reviewed/)
  })

  it('rejects an expired absence deadline', () => {
    assert.throws(() => assertGuardianJustificationOpen({
      status: 'Absent',
      justificationStatus: 'SUBMITTED',
      deadlineAt: new Date(Date.now() - 60_000).toISOString(),
    }), /deadline.*expired/)
  })
})
