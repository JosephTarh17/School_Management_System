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
import dashboardRoutes from './routes/dashboard.js'
import enrollmentRoutes from './routes/enrollments.js'
import academicRecordsRoutes from './routes/academicRecords.js'
import guardianPortalRoutes from './routes/guardianPortal.js'
import { ApiError, errorHandler } from './lib/api.js'

dotenv.config()

const app = express()
app.set('trust proxy', process.env.TRUST_PROXY === 'false' ? false : 1)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean)
app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.use('/auth', authRoutes)
app.use('/attendance', attendanceRoutes)
app.use('/users', usersRoutes)
app.use('/students', studentsRoutes)
app.use('/courses', coursesRoutes)
app.use('/class-sessions', classSessionsRoutes)
app.use('/assessments', assessmentsRoutes)
app.use('/participation-logs', participationRoutes)
app.use('/financial-records', financialRoutes)
app.use('/dashboard', dashboardRoutes)
app.use('/enrollments', enrollmentRoutes)
app.use('/academic-records', academicRecordsRoutes)
app.use('/guardian-portal', guardianPortalRoutes)

app.get('/health', (req, res) => res.json({ status: 'ok' }))
app.use((req, res, next) => next(new ApiError(404, 'Route not found')))
app.use(errorHandler)

export default app
