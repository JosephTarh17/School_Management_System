import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asDate, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { enrolledStudentIdsForTeacher } from '../lib/enrollmentScope.js'

const router = express.Router()
router.use(requireAuth)
const select = 'student_id,user_id,full_name,dob,phone,address,user_account(user_id,email,role)'

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('student').select(select).order('full_name')
  if (req.user.role === 'student') query = query.eq('user_id', req.user.user_id)
  if (req.user.role === 'teacher') {
    const studentIds = await enrolledStudentIdsForTeacher(req.user.user_id)
    if (!studentIds.length) return sendData(res, [])
    query = query.in('student_id', studentIds)
  }
  if (req.query.user_id) query = query.eq('user_id', asUuid(req.query.user_id, 'user_id'))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data)
}))

router.get('/:studentId', asyncRoute(async (req, res) => {
  const studentId = asUuid(req.params.studentId, 'studentId')
  const { data, error } = await supabase.from('student').select(select).eq('student_id', studentId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Student not found')
  if (req.user.role === 'student' && data.user_id !== req.user.user_id) throw new ApiError(403, 'You do not have permission to view this student')
  if (req.user.role === 'teacher') {
    const studentIds = await enrolledStudentIdsForTeacher(req.user.user_id)
    if (!studentIds.includes(studentId)) throw new ApiError(403, 'You do not have permission to view this student')
  }
  return sendData(res, data)
}))

router.post('/', requireRole('administrator'), asyncRoute(async (req, res) => {
  const user_id = asUuid(req.body?.user_id, 'user_id')
  const full_name = asText(req.body?.full_name, 'full_name', { max: 160 })
  const dob = asDate(req.body?.dob, 'dob', { optional: true })
  const phone = asText(req.body?.phone, 'phone', { max: 40, optional: true })
  const address = asText(req.body?.address, 'address', { max: 500, optional: true })
  const { data: account, error: accountError } = await supabase.from('user_account').select('user_id,role').eq('user_id', user_id).maybeSingle()
  if (accountError) throw accountError
  if (!account) throw new ApiError(400, 'Linked user account does not exist')
  if (account.role !== 'student') throw new ApiError(400, 'Linked user account must have the student role')
  const { data, error } = await supabase.from('student').insert({ user_id, full_name, dob, phone, address }).select(select).single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.patch('/:studentId', asyncRoute(async (req, res) => {
  const studentId = asUuid(req.params.studentId, 'studentId')
  const { data: current, error: currentError } = await supabase.from('student').select('student_id,user_id').eq('student_id', studentId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Student not found')
  if (req.user.role !== 'administrator' && current.user_id !== req.user.user_id) throw new ApiError(403, 'You do not have permission to update this student')
  const updates = {}
  if (req.body?.full_name !== undefined) updates.full_name = asText(req.body.full_name, 'full_name', { max: 160 })
  if (req.body?.dob !== undefined) updates.dob = asDate(req.body.dob, 'dob', { optional: true })
  if (req.body?.phone !== undefined) updates.phone = asText(req.body.phone, 'phone', { max: 40, optional: true })
  if (req.body?.address !== undefined) updates.address = asText(req.body.address, 'address', { max: 500, optional: true })
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  const { data, error } = await supabase.from('student').update(updates).eq('student_id', studentId).select(select).single()
  if (error) throw error
  return sendData(res, data)
}))

router.delete('/:studentId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const studentId = asUuid(req.params.studentId, 'studentId')
  const { error } = await supabase.from('student').delete().eq('student_id', studentId)
  if (error) throw error
  return res.status(204).send()
}))

export default router
