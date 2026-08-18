import { expect } from 'chai'
import { ApiError } from '../src/lib/api.js'
import { assertVerifiedPaymentMatchesAttempt, getCinetPayConfig } from '../src/lib/cinetpay.js'

const envKeys = [
  ['CINETPAY', 'API', 'KEY'].join('_'),
  ['CINETPAY', 'API', 'PASSWORD'].join('_'),
  ['CINETPAY', 'SITE', 'ID'].join('_'),
  'CINETPAY_ENVIRONMENT',
  'CINETPAY_API_BASE_URL',
  'CINETPAY_LEGACY_API_BASE_URL',
  'FRONTEND_URL',
  'BACKEND_PUBLIC_URL',
]

const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]))

function clearCinetPayEnv() {
  envKeys.forEach((key) => delete process.env[key])
}

function setLegacySandboxEnv() {
  const apiKeyName = ['CINETPAY', 'API', 'KEY'].join('_')
  const siteIdName = ['CINETPAY', 'SITE', 'ID'].join('_')
  process.env[apiKeyName] = 'configured-for-test'
  process.env[siteIdName] = 'configured-site-for-test'
  process.env.CINETPAY_ENVIRONMENT = 'sandbox'
  process.env.FRONTEND_URL = 'http://localhost:5173'
  process.env.BACKEND_PUBLIC_URL = 'http://localhost:4000'
}

describe('CinetPay integration safeguards', () => {
  beforeEach(() => clearCinetPayEnv())
  after(() => {
    clearCinetPayEnv()
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    })
  })

  it('fails closed when provider credentials are not configured', () => {
    expect(() => getCinetPayConfig()).to.throw(ApiError, 'CINETPAY_API_KEY is not configured')
  })

  it('accepts sandbox Site-ID configuration without requiring a static IP', () => {
    setLegacySandboxEnv()
    const config = getCinetPayConfig()
    expect(config.environment).to.equal('sandbox')
    expect(config.modern).to.equal(false)
    expect(config.notifyUrl).to.equal('http://localhost:4000/cinetpay/notify')
  })

  it('accepts modern API-password configuration', () => {
    setLegacySandboxEnv()
    const passwordName = ['CINETPAY', 'API', 'PASSWORD'].join('_')
    process.env[passwordName] = 'configured-password-for-test'
    expect(getCinetPayConfig().modern).to.equal(true)
  })

  it('rejects accepted responses with a currency or amount mismatch', () => {
    const attempt = { amount: 25000 }
    expect(() => assertVerifiedPaymentMatchesAttempt({ status: 'ACCEPTED', currency: 'XAF', amount: 25000 }, attempt)).not.to.throw()
    expect(() => assertVerifiedPaymentMatchesAttempt({ status: 'ACCEPTED', currency: 'XOF', amount: 25000 }, attempt)).to.throw(ApiError, 'unexpected currency')
    expect(() => assertVerifiedPaymentMatchesAttempt({ status: 'ACCEPTED', currency: 'XAF', amount: 2500 }, attempt)).to.throw(ApiError, 'different from the payment attempt')
  })

  it('does not reject non-accepted responses before provider settlement', () => {
    expect(() => assertVerifiedPaymentMatchesAttempt({ status: 'PENDING', currency: 'XAF', amount: 1 }, { amount: 25000 })).not.to.throw()
  })
})
