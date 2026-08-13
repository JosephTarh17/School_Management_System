import { expect } from 'chai'
import bcrypt from 'bcryptjs'
import { generate, generateSecret, verify as verifyTotp } from 'otplib'
process.env.JWT_SECRET = 'a'.repeat(64)
process.env.MFA_ENCRYPTION_KEY = 'b'.repeat(64)
const { hashPassword, verifyPassword, encryptSecret, decryptSecret, safeSecurityMetadata } = await import('../src/lib/security.js')
const { signMfaChallenge, verifyMfaChallenge } = await import('../src/middleware/auth.js')

describe('Chapter 8 security controls', () => {
  const user = { user_id: '123e4567-e89b-12d3-a456-426614174000', email: 'admin@example.com', role: 'administrator' }

  it('hashes new passwords with Argon2id and verifies them', async () => {
    const digest = await hashPassword('ChangeMe123!')
    expect(digest).to.match(/^\$argon2id\$/)
    expect(await verifyPassword(digest, 'ChangeMe123!')).to.equal(true)
    expect(await verifyPassword(digest, 'wrong-password')).to.equal(false)
  })

  it('continues to verify legacy bcrypt hashes during migration', async () => {
    const bcryptHash = await bcrypt.hash('ChangeMe123!', 4)
    expect(bcryptHash).to.match(/^\$2[aby]\$/)
    expect(await verifyPassword(bcryptHash, 'ChangeMe123!')).to.equal(true)
  })

  it('encrypts and decrypts MFA secrets without exposing plaintext storage', () => {
    const encrypted = encryptSecret('JBSWY3DPEHPK3PXP')
    expect(encrypted).not.to.include('JBSWY3DPEHPK3PXP')
    expect(decryptSecret(encrypted)).to.equal('JBSWY3DPEHPK3PXP')
  })

  it('generates and verifies a TOTP authenticator code', async () => {
    const secret = generateSecret()
    const token = await generate({ secret })
    const result = await verifyTotp({ secret, token })
    expect(result.valid).to.equal(true)
  })

  it('creates and verifies a short-lived MFA challenge token', () => {
    const challenge = signMfaChallenge(user)
    expect(verifyMfaChallenge(challenge)).to.include({ user_id: user.user_id, token_type: 'mfa_challenge' })
  })

  it('removes sensitive keys from audit metadata', () => {
    const safe = safeSecurityMetadata({ action: 'update', password: 'secret', token: 'bearer', status: 'ok' })
    expect(safe).to.deep.equal({ action: 'update', status: 'ok' })
  })
})
