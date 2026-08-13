import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asDate, asDateTime, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { enrolledStudentIdsForTeacher } from '../lib/enrollmentScope.js'

const router = express.Router()
router.use(requireAuth)
const select = 'student_id,user_id,full_name,dob,phone,address,emergency_contact_name,emergency_contact_phone,medical_information,disability_accommodations,archived_at,user_account(user_id,email,role)'
const guardianSelect = 'student_guardian_id,student_id,guardian_id,primary_contact,guardian(guardian_id,user_id,full_name,email,phone,relationship)'

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('student').select(select).order('full_name')
  if (req.user.role === 'student') query = query.eq('user_id', req.user.user_id)
  if (req.user.role === 'teacher') {
    const studentIds = await enrolledStudentIdsForTeacher(req.user.user_id)
    if (!studentIds.length) return sendData(res, [])
    query = query.in('student_id', studentIds)
  }
  if (req.query.user_id) query = query.eq('user_id', asUuid(req.query.user_id, 'user_id'))
  if (req.query.archived !== 'true') query = query.is('archived_at', null)
  if (req.query.search) query = query.ilike('full_name', `%${asText(req.query.search, 'search', { max: 80 })}%`)
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

router.get('/:studentId/guardians', asyncRoute(async (req, res) => {
  const studentId = asUuid(req.params.studentId, 'studentId')
  const { data: student, error: studentError } = await supabase.from('student').select('student_id,user_id').eq('student_id', studentId).maybeSingle()
  if (studentError) throw studentError
  if (!student) throw new ApiError(404, 'Student not found')
  if (req.user.role === 'student' && student.user_id !== req.user.user_id) throw new ApiError(403, 'You do not have permission to view this student')
  if (req.user.role === 'teacher') {
    const studentIds = await enrolledStudentIdsForTeacher(req.user.user_id)
    if (!studentIds.includes(studentId)) throw new ApiError(403, 'You do not have permission to view this student')
  }
  const { data, error } = await supabase.from('student_guardian').select(guardianSelect).eq('student_id', studentId)
  if (error) throw error
  return sendData(res, data)
}))

router.post('/', requireRole('administrator'), asyncRoute(async (req, res) => {
  const user_id = asUuid(req.body?.user_id, 'user_id')
  const full_name = asText(req.body?.full_name, 'full_name', { max: 160 })
  const dob = asDate(req.body?.dob, 'dob', { optional: true })
  const phone = asText(req.body?.phone, 'phone', { max: 40, optional: true })
  const address = asText(req.body?.address, 'address', { max: 500, optional: true })
  const emergency_contact_name = asText(req.body?.emergency_contact_name, 'emergency_contact_name', { max: 160, optional: true })
  const emergency_contact_phone = asText(req.body?.emergency_contact_phone, 'emergency_contact_phone', { max: 40, optional: true })
  const medical_information = asText(req.body?.medical_information, 'medical_information', { max: 2000, optional: true })
  const disability_accommodations = asText(req.body?.disability_accommodations, 'disability_accommodations', { max: 2000, optional: true })
  const { data: account, error: accountError } = await supabase.from('user_account').select('user_id,role').eq('user_id', user_id).maybeSingle()
  if (accountError) throw accountError
  if (!account) throw new ApiError(400, 'Linked user account does not exist')
  if (account.role !== 'student') throw new ApiError(400, 'Linked user account must have the student role')
  const { data, error } = await supabase.from('student').insert({ user_id, full_name, dob, phone, address, emergency_contact_name, emergency_contact_phone, medical_information, disability_accommodations }).select(select).single()
  if (error?.code === '23505') throw new ApiError(409, 'This user account already has a student profile')
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
  if (req.user.role === 'administrator') {
    if (req.body?.emergency_contact_name !== undefined) updates.emergency_contact_name = asText(req.body.emergency_contact_name, 'emergency_contact_name', { max: 160, optional: true })
    if (req.body?.emergency_contact_phone !== undefined) updates.emergency_contact_phone = asText(req.body.emergency_contact_phone, 'emergency_contact_phone', { max: 40, optional: true })
    if (req.body?.medical_information !== undefined) updates.medical_information = asText(req.body.medical_information, 'medical_information', { max: 2000, optional: true })
    if (req.body?.disability_accommodations !== undefined) updates.disability_accommodations = asText(req.body.disability_accommodations, 'disability_accommodations', { max: 2000, optional: true })
    if (req.body?.archived_at !== undefined) updates.archived_at = req.body.archived_at === null ? null : asDateTime(req.body.archived_at, 'archived_at')
  }
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  const { data, error } = await supabase.from('student').update(updates).eq('student_id', studentId).select(select).single()
  if (error) throw error
  return sendData(res, data)
}))

router.post('/:studentId/guardians', requireRole('administrator'), asyncRoute(async (req, res) => {
  const student_id = asUuid(req.params.studentId, 'studentId')
  const guardian_id = asUuid(req.body?.guardian_id, 'guardian_id')
  const primary_contact = req.body?.primary_contact === true
  const { data: guardian, error: guardianError } = await supabase.from('guardian').select('guardian_id').eq('guardian_id', guardian_id).maybeSingle()
  if (guardianError) throw guardianError
  if (!guardian) throw new ApiError(400, 'Guardian profile does not exist')
  const { data, error } = await supabase.from('student_guardian').upsert({ student_id, guardian_id, primary_contact }, { onConflict: 'student_id,guardian_id' }).select(guardianSelect).single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.delete('/:studentId/guardians/:guardianId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const student_id = asUuid(req.params.studentId, 'studentId')
  const guardian_id = asUuid(req.params.guardianId, 'guardianId')
  const { data, error } = await supabase.from('student_guardian').delete().eq('student_id', student_id).eq('guardian_id', guardian_id).select('student_guardian_id').maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Guardian relationship not found')
  return res.status(204).send()
}))

router.delete('/:studentId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const studentId = asUuid(req.params.studentId, 'studentId')
  const { error } = await supabase.from('student').update({ archived_at: new Date().toISOString() }).eq('student_id', studentId)
  if (error) throw error
  return res.status(204).send()
}))

export default router
