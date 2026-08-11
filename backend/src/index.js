import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import attendanceRoutes from './routes/attendance.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// Route grouping keeps the server organized. Requests to /auth/* are handled
// by the auth router, and requests to /attendance/* are handled by attendance.
app.use('/auth', authRoutes)
app.use('/attendance', attendanceRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`SMS backend listening on port ${port}`)
})
