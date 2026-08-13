import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Algorithm, hash as argonHash, verify as argonVerify } from '@node-rs/argon2'
import { ApiError } from './api.js'

const ARGON_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: Number(process.env.ARGON2_MEMORY_KIB || 19456),
  timeCost: Number(process.env.ARGON2_TIME_COST || 2),
  parallelism: Number(process.env.ARGON2_PARALLELISM || 1),
  outputLen: 32,
}

export function isArgon2Hash(value) {
  return typeof value === 'string' && value.startsWith('$argon2id$')
}

export async function hashPassword(password) {
  return argonHash(password, ARGON_OPTIONS)
}

export async function verifyPassword(passwordHash, password) {
  if (isArgon2Hash(passwordHash)) return argonVerify(passwordHash, password)
  return bcrypt.compare(password, passwordHash)
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function encryptionKey() {
  const configured = process.env.MFA_ENCRYPTION_KEY
  if (!configured) throw new ApiError(500, 'MFA_ENCRYPTION_KEY must be configured before MFA can be used')
  const raw = /^[0-9a-f]{64}$/i.test(configured) ? Buffer.from(configured, 'hex') : Buffer.from(configured, 'base64')
  if (raw.length !== 32) throw new ApiError(500, 'MFA_ENCRYPTION_KEY must be a 32-byte hex or base64 value')
  return raw
}

export function encryptSecret(secret) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, ciphertext].map((value) => value.toString('base64url')).join('.')
}

export function decryptSecret(payload) {
  try {
    const [ivValue, tagValue, ciphertextValue] = String(payload).split('.')
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    throw new ApiError(500, 'Stored MFA secret could not be decrypted')
  }
}

export function safeSecurityMetadata(body = {}) {
  const forbidden = /password|token|cookie|secret|code|authorization/i
  return Object.fromEntries(Object.entries(body).filter(([key, value]) => !forbidden.test(key) && ['string', 'number', 'boolean'].includes(typeof value)).slice(0, 20))
}
