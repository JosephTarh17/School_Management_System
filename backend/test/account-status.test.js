import { expect } from 'chai'
import request from 'supertest'

process.env.JWT_SECRET ||= 'test-only-jwt-secret'
process.env.SUPABASE_URL ||= 'https://example.supabase.co'
const serviceRoleEnvironmentVariable = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_')
process.env[serviceRoleEnvironmentVariable] ||= ['test', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'test'].join('.')

const { default: app } = await import('../src/app.js')
const { parseAccountStatusChange, parseAccountLifecycleChange, assertAccountStatusChangeAllowed, parseAdministrativeReason, generateTemporaryPassword } = await import('../src/routes/users.js')

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

  it('validates future suspension and expiration dates', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    expect(parseAccountLifecycleChange({ reason: 'Temporary leave', suspension_until: future })).to.deep.include({ reason: 'Temporary leave', suspensionUntil: future, accountExpiresAt: null })
    expect(() => parseAccountLifecycleChange({ reason: 'Expired date', account_expires_at: new Date(Date.now() - 1000).toISOString() })).to.throw('account_expires_at must be in the future')
  })

  it('requires reasons for administrative actions and generates a non-empty temporary password', () => {
    expect(() => parseAdministrativeReason({})).to.throw('reason is required')
    expect(parseAdministrativeReason({ reason: 'Security review' })).to.deep.equal({ reason: 'Security review' })
    expect(generateTemporaryPassword()).to.be.a('string').and.have.length.greaterThan(15)
  })

  it('requires authentication for force logout and administrator password reset', async () => {
    const logoutResponse = await request(app)
      .post(`/users/${targetUserId}/force-logout`)
      .send({ reason: 'Security review' })
    const resetResponse = await request(app)
      .post(`/users/${targetUserId}/reset-password`)
      .send({ reason: 'Account recovery' })

    expect(logoutResponse.status).to.equal(401)
    expect(resetResponse.status).to.equal(401)
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
