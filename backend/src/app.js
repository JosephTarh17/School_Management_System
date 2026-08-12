import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import attendanceRoutes from './routes/attendance.js'
import usersRoutes from './routes/users.js'
import studentsRoutes from './routes/students.js'
import coursesRoutes from './routes/courses.js'
import classSessionsRoutes from './routes/classSessions.js'
import assessmentsRoutes from './routes/assessments.js'
import participationRoutes from './routes/participationLogs.js'
import financialRoutes from './routes/financialRecords.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/attendance', attendanceRoutes)
app.use('/users', usersRoutes)
app.use('/students', studentsRoutes)
app.use('/courses', coursesRoutes)
app.use('/class-sessions', classSessionsRoutes)
app.use('/assessments', assessmentsRoutes)
app.use('/participation-logs', participationRoutes)
app.use('/financial-records', financialRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

export default app
