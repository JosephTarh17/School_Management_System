import { expect } from 'chai'

process.env.JWT_SECRET = 'a'.repeat(64)

const { ApiError } = await import('../src/lib/api.js')
const { clearAuthCookie, requireRole, setAuthCookie, signAccessToken, verifyAccessToken } = await import('../src/middleware/auth.js')

describe('Authentication and RBAC', () => {
  const user = { user_id: '123e4567-e89b-12d3-a456-426614174000', email: 'teacher@example.com', role: 'teacher' }

  it('creates and verifies an access token with an access-token type', () => {
    const token = signAccessToken(user)
    const payload = verifyAccessToken(token)
    expect(payload).to.include({ user_id: user.user_id, email: user.email, role: user.role, token_type: 'access' })
    expect(payload).to.have.property('jti')
    expect(payload).to.have.property('iss', 'school-management-system')
    expect(payload).to.have.property('aud', 'school-management-client')
    expect(payload).to.have.property('instance_id')
  })

  it('rejects tokens signed with an invalid secret', () => {
    const token = signAccessToken(user)
    process.env.JWT_SECRET = 'b'.repeat(64)
    expect(() => verifyAccessToken(token)).to.throw()
    process.env.JWT_SECRET = 'a'.repeat(64)
  })

  it('allows permitted roles and rejects unauthorized roles', () => {
    const next = (error) => error
    expect(requireRole('teacher')({ user }, {}, next)).to.equal(undefined)
    const denied = requireRole('administrator')({ user }, {}, next)
    expect(denied).to.be.instanceOf(ApiError)
    expect(denied.status).to.equal(403)
    const unauthenticated = requireRole('teacher')({}, {}, next)
    expect(unauthenticated.status).to.equal(401)
  })

  it('sets and clears an HttpOnly auth cookie', () => {
    const headers = {}
    setAuthCookie({ setHeader: (name, value) => { headers[name] = value } }, 'token-value')
    expect(headers['Set-Cookie']).to.include('HttpOnly')
    expect(headers['Set-Cookie']).to.include('SameSite=Strict')
    expect(headers['Set-Cookie']).not.to.include('Max-Age=')
    clearAuthCookie({ setHeader: (name, value) => { headers[name] = value } })
    expect(headers['Set-Cookie']).to.include('Max-Age=0')
  })
})
