import assert from 'node:assert/strict'
import request from 'supertest'

process.env.JWT_SECRET ||= 'test-only-jwt-secret'
process.env.SUPABASE_URL ||= 'https://example.supabase.co'
const serviceRoleEnvironmentVariable = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_')
process.env[serviceRoleEnvironmentVariable] ||= ['test', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'test'].join('.')

const { default: app } = await import('../src/app.js')

describe('Guardian Implementation 3 API boundaries', () => {
  it('requires authentication for guardian engagement requests', async () => {
    const response = await request(app).get('/guardian-engagement/communications')
    assert.equal(response.status, 401)
  })

  it('requires authentication for administrator engagement review', async () => {
    const response = await request(app).get('/guardian-engagement/admin/profile-change-requests')
    assert.equal(response.status, 401)
  })

  it('requires authentication for disciplinary acknowledgement', async () => {
    const response = await request(app).post('/guardian-engagement/discipline-notices/00000000-0000-0000-0000-000000000000/acknowledge')
    assert.equal(response.status, 401)
  })

  it('requires authentication for document response and appointment creation', async () => {
    const documentResponse = await request(app).post('/guardian-engagement/documents/00000000-0000-0000-0000-000000000000/respond').send({ decision: 'Accepted' })
    const appointmentResponse = await request(app).post('/guardian-engagement/appointments').send({ purpose: 'Meeting', preferred_start_at: '2030-01-01T10:00:00Z', preferred_end_at: '2030-01-01T11:00:00Z' })
    assert.equal(documentResponse.status, 401)
    assert.equal(appointmentResponse.status, 401)
  })
})
