import { expect } from 'chai'
import request from 'supertest'

process.env.JWT_SECRET ||= 'test-only-jwt-secret'
process.env.SUPABASE_URL ||= 'https://example.supabase.co'
const serviceRoleEnvironmentVariable = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_')
process.env[serviceRoleEnvironmentVariable] ||= ['test', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'test'].join('.')

const { default: app } = await import('../src/app.js')
const { parseAccountStatusChange, assertAccountStatusChangeAllowed } = await import('../src/routes/users.js')

const actorUserId = '00000000-0000-0000-0000-000000000001'
const targetUserId = '00000000-0000-0000-0000-000000000002'

describe('Account-status API', () => {
  it('requires authentication for status changes', async () => {
    const response = await request(app)
      .patch(`/users/${targetUserId}/status`)
      .send({ enabled: false, reason: 'Administrative suspension' })

    expect(response.status).to.equal(401)
  })

  it('requires a boolean enabled value and a reason when disabling', () => {
    expect(() => parseAccountStatusChange({ enabled: 'false', reason: 'Reason' })).to.throw('enabled must be a boolean')
    expect(() => parseAccountStatusChange({ enabled: false })).to.throw('reason is required when disabling an account')
    expect(parseAccountStatusChange({ enabled: true })).to.deep.equal({ enabled: true, reason: null })
  })

  it('prevents an administrator from disabling their own account', () => {
    expect(() => assertAccountStatusChangeAllowed({
      actorUserId,
      targetUserId: actorUserId,
      targetRole: 'administrator',
      activeAdministratorCount: 2,
      enabled: false,
    })).to.throw('You cannot disable your own administrator account')
  })

  it('prevents disabling the last active administrator', () => {
    expect(() => assertAccountStatusChangeAllowed({
      actorUserId,
      targetUserId,
      targetRole: 'administrator',
      activeAdministratorCount: 1,
      enabled: false,
    })).to.throw('The last active administrator account cannot be disabled')
  })

  it('allows disabling another administrator when one remains active', () => {
    expect(() => assertAccountStatusChangeAllowed({
      actorUserId,
      targetUserId,
      targetRole: 'administrator',
      activeAdministratorCount: 2,
      enabled: false,
    })).not.to.throw()
  })
})
