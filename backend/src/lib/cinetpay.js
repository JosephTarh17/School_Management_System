import { ApiError } from './api.js'

const DEFAULT_MODERN_BASE_URLS = {
  sandbox: 'https://api.cinetpay.net',
  production: 'https://api.cinetpay.co',
}
const DEFAULT_LEGACY_BASE_URL = 'https://api-checkout.cinetpay.com/v2/payment'

let cachedAccessToken = ''
let cachedAccessTokenExpiresAt = 0

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function requiredUrl(value, field) {
  const url = clean(value)
  if (!url) throw new ApiError(503, `${field} must be configured for CinetPay`)
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol')
  } catch {
    throw new ApiError(503, `${field} must be a valid HTTP(S) URL`)
  }
  return url
}

export function getCinetPayConfig() {
  const apiKey = clean(process.env.CINETPAY_API_KEY)
  const apiPassword = clean(process.env.CINETPAY_API_PASSWORD)
  const siteId = clean(process.env.CINETPAY_SITE_ID)
  const environment = clean(process.env.CINETPAY_ENVIRONMENT || 'sandbox').toLowerCase()
  if (!['sandbox', 'production'].includes(environment)) throw new ApiError(503, 'CINETPAY_ENVIRONMENT must be sandbox or production')
  if (!apiKey) throw new ApiError(503, 'CINETPAY_API_KEY is not configured')
  if (!apiPassword && !siteId) throw new ApiError(503, 'Configure CINETPAY_API_PASSWORD or CINETPAY_SITE_ID')

  const modern = Boolean(apiPassword)
  const apiBaseUrl = clean(process.env.CINETPAY_API_BASE_URL) || DEFAULT_MODERN_BASE_URLS[environment]
  const legacyBaseUrl = clean(process.env.CINETPAY_LEGACY_API_BASE_URL) || DEFAULT_LEGACY_BASE_URL
  const frontendUrl = requiredUrl(process.env.FRONTEND_URL, 'FRONTEND_URL')
  const backendUrl = requiredUrl(process.env.BACKEND_PUBLIC_URL, 'BACKEND_PUBLIC_URL')

  return {
    apiKey,
    apiPassword,
    siteId,
    environment,
    modern,
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
    legacyBaseUrl: legacyBaseUrl.replace(/\/$/, ''),
    notifyUrl: clean(process.env.CINETPAY_NOTIFY_URL) || `${backendUrl}/cinetpay/notify`,
    returnUrl: clean(process.env.CINETPAY_RETURN_URL) || `${frontendUrl}/guardian-portal?payment=return`,
    failedUrl: clean(process.env.CINETPAY_FAILED_URL) || `${frontendUrl}/guardian-portal?payment=failed`,
  }
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Number(process.env.CINETPAY_REQUEST_TIMEOUT_MS || 15000))
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = payload?.message || payload?.error || `CinetPay request failed (${response.status})`
      throw new ApiError(502, message)
    }
    return payload
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error?.name === 'AbortError') throw new ApiError(504, 'CinetPay request timed out')
    throw new ApiError(502, 'Unable to reach CinetPay')
  } finally {
    clearTimeout(timeout)
  }
}

async function modernAccessToken(config) {
  if (cachedAccessToken && cachedAccessTokenExpiresAt > Date.now() + 30000) return cachedAccessToken
  const payload = await fetchJson(`${config.apiBaseUrl}/v1/oauth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ api_key: config.apiKey, api_password: config.apiPassword }),
  })
  const token = clean(payload?.access_token || payload?.token || payload?.data?.access_token)
  if (!token) throw new ApiError(502, 'CinetPay did not return an access token')
  const expiresIn = Number(payload?.expires_in || payload?.data?.expires_in || 300)
  cachedAccessToken = token
  cachedAccessTokenExpiresAt = Date.now() + Math.max(60, expiresIn) * 1000
  return token
}

function providerValue(payload, ...paths) {
  for (const path of paths) {
    let value = payload
    for (const part of path.split('.')) value = value?.[part]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function normalizeProviderStatus(payload) {
  const rawStatus = String(providerValue(payload, 'status', 'data.status', 'data.transaction_status', 'data.payment_status') || '').toUpperCase()
  const code = String(providerValue(payload, 'code', 'data.code') || '').toUpperCase()
  if (['SUCCESS', 'ACCEPTED', 'COMPLETED', 'PAID'].includes(rawStatus) || ['00', '100'].includes(code)) return 'ACCEPTED'
  if (['REFUSED', 'FAILED', 'CANCELLED', 'CANCELED', 'EXPIRED', 'ERROR'].includes(rawStatus) || ['01', '2005', '2010'].includes(code)) {
    if (rawStatus === 'EXPIRED') return 'EXPIRED'
    if (rawStatus === 'CANCELLED' || rawStatus === 'CANCELED') return 'CANCELLED'
    return 'REFUSED'
  }
  if (['PENDING', 'INITIATED', 'IN_PROGRESS', 'WAITING'].includes(rawStatus)) return rawStatus === 'INITIATED' ? 'INITIATED' : 'PENDING'
  return 'PENDING'
}

function normalizeResponse(payload, fallbackMerchantTransactionId) {
  const data = payload?.data || payload
  const merchantTransactionId = String(providerValue(payload, 'merchant_transaction_id', 'transaction_id', 'data.merchant_transaction_id', 'data.transaction_id') || fallbackMerchantTransactionId)
  const providerTransactionId = providerValue(payload, 'transaction_id', 'provider_transaction_id', 'data.transaction_id', 'data.provider_transaction_id')
  const amountValue = providerValue(payload, 'amount', 'data.amount')
  const amount = amountValue == null || amountValue === '' ? undefined : Number(amountValue)
  const currency = String(providerValue(payload, 'currency', 'data.currency') || '').toUpperCase() || undefined
  const paidAt = providerValue(payload, 'payment_date', 'paid_at', 'data.payment_date', 'data.paid_at')
  const paymentMethod = providerValue(payload, 'payment_method', 'paymentMethod', 'data.payment_method', 'data.paymentMethod')
  return {
    status: normalizeProviderStatus(payload),
    rawStatus: String(providerValue(payload, 'status', 'data.status', 'data.transaction_status', 'data.payment_status') || ''),
    merchantTransactionId,
    providerTransactionId: providerTransactionId ? String(providerTransactionId) : undefined,
    amount: Number.isFinite(amount) ? amount : undefined,
    currency,
    paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
    paymentMethod: paymentMethod ? String(paymentMethod) : 'Mobile money - CinetPay',
    raw: payload,
  }
}

export async function initializeCinetPayPayment({ merchantTransactionId, amount, description, customer }) {
  const config = getCinetPayConfig()
  const customerData = customer || {}
  const body = {
    currency: 'XAF',
    amount,
    merchant_transaction_id: merchantTransactionId,
    transaction_id: merchantTransactionId,
    lang: 'fr',
    designation: description,
    description,
    client_email: customerData.email,
    client_first_name: customerData.firstName,
    client_last_name: customerData.lastName,
    client_phone_number: customerData.phone,
    customer_email: customerData.email,
    customer_name: customerData.firstName,
    customer_surname: customerData.lastName,
    customer_phone_number: customerData.phone,
    success_url: config.returnUrl,
    failed_url: config.failedUrl,
    return_url: config.returnUrl,
    notify_url: config.notifyUrl,
    channels: 'ALL',
    channel: 'ALL',
    metadata: merchantTransactionId,
  }

  let payload
  if (config.modern) {
    const token = await modernAccessToken(config)
    payload = await fetchJson(`${config.apiBaseUrl}/v1/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  } else {
    payload = await fetchJson(config.legacyBaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...body, apikey: config.apiKey, site_id: config.siteId }),
    })
  }

  const paymentToken = providerValue(payload, 'payment_token', 'paymentToken', 'data.payment_token', 'data.paymentToken')
  const paymentUrl = providerValue(payload, 'payment_url', 'paymentUrl', 'data.payment_url', 'data.paymentUrl')
  if (!paymentToken || !paymentUrl) throw new ApiError(502, 'CinetPay did not return a usable payment token and payment URL')
  return { paymentToken: String(paymentToken), paymentUrl: String(paymentUrl), providerResponse: payload, config }
}

export async function verifyCinetPayPayment(merchantTransactionId) {
  const config = getCinetPayConfig()
  let payload
  if (config.modern) {
    const token = await modernAccessToken(config)
    payload = await fetchJson(`${config.apiBaseUrl}/v1/payment/${encodeURIComponent(merchantTransactionId)}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
  } else {
    payload = await fetchJson(`${config.legacyBaseUrl}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ apikey: config.apiKey, site_id: config.siteId, transaction_id: merchantTransactionId }),
    })
  }
  const normalized = normalizeResponse(payload, merchantTransactionId)
  if (normalized.merchantTransactionId !== merchantTransactionId) throw new ApiError(502, 'CinetPay returned a different merchant transaction ID')
  return { ...normalized, providerResponse: payload }
}

export function assertVerifiedPaymentMatchesAttempt(verified, attempt) {
  if (verified.status !== 'ACCEPTED') return
  if (verified.currency && verified.currency !== 'XAF') throw new ApiError(502, 'CinetPay returned an unexpected currency')
  if (verified.amount != null && verified.amount !== Number(attempt.amount)) throw new ApiError(502, 'CinetPay returned an amount different from the payment attempt')
}
