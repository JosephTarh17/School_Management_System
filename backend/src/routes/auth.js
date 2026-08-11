import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '../supabaseClient.js'

const router = express.Router()

// This secret is used to sign JWT tokens. In production, keep this secret safe
// and store it in environment variables.
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key'

// POST /auth/login
// This route validates credentials and returns a JWT if successful.
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  // Look up the user in the user_account table.
  const { data: users, error } = await supabase
    .from('user_account')
    .select('*')
    .eq('email', email)
    .limit(1)

  if (error) {
    return res.status(500).json({ error: 'Database error' })
  }

  const user = users?.[0]
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  // Compare the provided password with the hashed password from the DB.
  const passwordMatches = await bcrypt.compare(password, user.password_hash)
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const token = jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  )

  return res.json({ token })
})

export default router
