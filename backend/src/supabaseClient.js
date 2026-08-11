import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

// The backend uses the Supabase service role key because it needs permission
// to bypass row-level security and perform secure server-side operations.
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
}

function parseJwtPayload(token) {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(payload)
  } catch {
    return null
  }
}

const payload = parseJwtPayload(supabaseServiceRoleKey)
if (!payload || payload.role !== 'service_role') {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY must be a Supabase service role key, not an anon key')
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
