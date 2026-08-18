import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asEnum, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'

const router = express.Router()
router.use(requireAuth, requireRole('administrator'))

const staffTypes = ['teaching', 'non_teaching']
const employmentStatuses = ['active', 'on_leave', 'inactive', 'terminated']
const attendanceStatuses = ['Present', 'Absent', 'Late', 'Excused', 'On Leave']
const leaveTypes = ['Annual', 'Sick', 'Maternity', 'Study', 'Emergency', 'Other']
const leaveStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled']
const staffFields = 'staff_id,user_id,teacher_id,staff_type,employee_number,full_name,email,phone,department,job_title,employment_status,date_joined,date_left,created_by,created_at,updated_at'
const attendanceFields = 'staff_attendance_id,staff_id,attendance_date,attendance_status,notes,recorded_by,created_at,updated_at'
const leaveFields = 'leave_id,staff_id,leave_type,start_date,end_date,reason,status,reviewed_by,reviewed_at,review_notes,created_at,updated_at'

function dateOnly(value, field, { optional = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return null
    throw new ApiError(400, `${field} is required`)
  }
  const text = asText(value, field, { max: 10 })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new ApiError(400, `${field} must be a valid YYYY-MM-DD date`)
  }
  return text
}

function optionalText(body, field, max) {
  if (body?.[field] === undefined) return undefined
  return asText(body[field], field, { max, optional: true })
}

async function teacherForStaff(teacherId) {
  const { data, error } = await supabase
    .from('teacher')
    .select('teacher_id,user_id,full_name,email,department')
    .eq('teacher_id', teacherId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'The selected teacher profile was not found')
  return data
}

router.get('/', asyncRoute(async (req, res) => {
  const type = req.query?.staff_type ? asEnum(req.query.staff_type, 'staff_type', staffTypes) : null
  const status = req.query?.employment_status ? asEnum(req.query.employment_status, 'employment_status', employmentStatuses) : null
  const search = req.query?.search ? asText(req.query.search, 'search', { max: 120 }) : null

  let query = supabase.from('staff_member').select(staffFields).order('full_name', { ascending: true })
  if (type) query = query.eq('staff_type', type)
  if (status) query = query.eq('employment_status', status)
  if (search) query = query.or(`full_name.ilike.%${search}%,employee_number.ilike.%${search}%,department.ilike.%${search}%,job_title.ilike.%${search}%`)

  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.get('/teachers', asyncRoute(async (req, res) => {
  const [{ data: teachers, error: teacherError }, { data: linked, error: linkedError }] = await Promise.all([
    supabase.from('teacher').select('teacher_id,user_id,full_name,email,department').order('full_name', { ascending: true }),
    supabase.from('staff_member').select('staff_id,teacher_id').not('teacher_id', 'is', null),
  ])
  if (teacherError) throw teacherError
  if (linkedError) throw linkedError
  const linkedByTeacher = new Map((linked || []).map((row) => [row.teacher_id, row.staff_id]))
  return sendData(res, (teachers || []).map((teacher) => ({ ...teacher, staff_id: linkedByTeacher.get(teacher.teacher_id) || null })))
}))

router.post('/', asyncRoute(async (req, res) => {
  const staff_type = asEnum(req.body?.staff_type, 'staff_type', staffTypes)
  const employee_number = optionalText(req.body, 'employee_number', 40)
  const phone = optionalText(req.body, 'phone', 40)
  let department = optionalText(req.body, 'department', 120)
  const date_joined = dateOnly(req.body?.date_joined, 'date_joined', { optional: true })
  const date_left = dateOnly(req.body?.date_left, 'date_left', { optional: true })
  const job_title = asText(req.body?.job_title || (staff_type === 'teaching' ? 'Teacher' : ''), 'job_title', { max: 120 })
  if (date_joined && date_left && date_left < date_joined) throw new ApiError(400, 'date_left cannot be before date_joined')

  let teacher_id = null
  let user_id = null
  let full_name = req.body?.full_name ? asText(req.body.full_name, 'full_name', { max: 160 }) : null
  let email = optionalText(req.body, 'email', 320)

  if (staff_type === 'teaching') {
    teacher_id = asUuid(req.body?.teacher_id, 'teacher_id')
    const teacher = await teacherForStaff(teacher_id)
    user_id = teacher.user_id
    full_name = teacher.full_name
    email = teacher.email
    if (department === undefined) department = teacher.department || null
  }
  if (!full_name) throw new ApiError(400, 'full_name is required for non-teaching staff')

  const payload = {
    user_id,
    teacher_id,
    staff_type,
    employee_number: employee_number || null,
    full_name,
    email: email || null,
    phone: phone || null,
    department: department === undefined ? null : department || null,
    job_title,
    employment_status: 'active',
    date_joined,
    date_left,
    created_by: req.user.user_id,
  }

  const { data, error } = await supabase.from('staff_member').insert(payload).select(staffFields).single()
  if (error?.code === '23505') throw new ApiError(409, 'This teacher or employee number is already linked to a staff record')
  if (error) throw error
  return sendData(res, data, 201)
}))

router.get('/attendance', asyncRoute(async (req, res) => {
  const attendance_date = dateOnly(req.query?.date, 'date', { optional: true }) || new Date().toISOString().slice(0, 10)
  const [{ data: staff, error: staffError }, { data: attendance, error: attendanceError }] = await Promise.all([
    supabase.from('staff_member').select(staffFields).neq('employment_status', 'terminated').order('full_name', { ascending: true }),
    supabase.from('staff_attendance').select(attendanceFields).eq('attendance_date', attendance_date),
  ])
  if (staffError) throw staffError
  if (attendanceError) throw attendanceError
  const byStaff = new Map((attendance || []).map((row) => [row.staff_id, row]))
  return sendData(res, {
    date: attendance_date,
    rows: (staff || []).map((member) => ({ ...member, attendance: byStaff.get(member.staff_id) || null })),
  })
}))

router.post('/attendance', asyncRoute(async (req, res) => {
  const staff_id = asUuid(req.body?.staff_id, 'staff_id')
  const attendance_date = dateOnly(req.body?.attendance_date, 'attendance_date')
  const attendance_status = asEnum(req.body?.attendance_status, 'attendance_status', attendanceStatuses)
  const notes = optionalText(req.body, 'notes', 1000)
  const { data, error } = await supabase
    .from('staff_attendance')
    .upsert({ staff_id, attendance_date, attendance_status, notes: notes || null, recorded_by: req.user.user_id }, { onConflict: 'staff_id,attendance_date' })
    .select(attendanceFields)
    .single()
  if (error) throw error
  return sendData(res, data)
}))

router.get('/leave', asyncRoute(async (req, res) => {
  const status = req.query?.status ? asEnum(req.query.status, 'status', leaveStatuses) : null
  const staff_id = req.query?.staff_id ? asUuid(req.query.staff_id, 'staff_id') : null
  let query = supabase.from('staff_leave_request').select(`${leaveFields},staff_member(staff_id,full_name,staff_type,department)`).order('start_date', { ascending: false })
  if (status) query = query.eq('status', status)
  if (staff_id) query = query.eq('staff_id', staff_id)
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/leave', asyncRoute(async (req, res) => {
  const staff_id = asUuid(req.body?.staff_id, 'staff_id')
  const leave_type = asEnum(req.body?.leave_type, 'leave_type', leaveTypes)
  const start_date = dateOnly(req.body?.start_date, 'start_date')
  const end_date = dateOnly(req.body?.end_date, 'end_date')
  const reason = asText(req.body?.reason, 'reason', { max: 1000 })
  if (end_date < start_date) throw new ApiError(400, 'end_date cannot be before start_date')
  const { data, error } = await supabase
    .from('staff_leave_request')
    .insert({ staff_id, leave_type, start_date, end_date, reason, status: 'Pending' })
    .select(leaveFields)
    .single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.patch('/leave/:leaveId', asyncRoute(async (req, res) => {
  const leaveId = asUuid(req.params.leaveId, 'leaveId')
  const status = asEnum(req.body?.status, 'status', leaveStatuses)
  const review_notes = optionalText(req.body, 'review_notes', 1000)
  const { data, error } = await supabase
    .from('staff_leave_request')
    .update({ status, review_notes: review_notes || null, reviewed_by: req.user.user_id, reviewed_at: new Date().toISOString() })
    .eq('leave_id', leaveId)
    .select(leaveFields)
    .single()
  if (error?.code === 'PGRST116') throw new ApiError(404, 'Leave record not found')
  if (error) throw error
  return sendData(res, data)
}))

router.patch('/:staffId', asyncRoute(async (req, res) => {
  const staffId = asUuid(req.params.staffId, 'staffId')
  const updates = {}
  for (const field of ['employee_number', 'full_name', 'email', 'phone', 'department', 'job_title']) {
    const value = optionalText(req.body, field, field === 'full_name' ? 160 : field === 'job_title' ? 120 : field === 'email' ? 320 : field === 'employee_number' ? 40 : field === 'department' ? 120 : 40)
    if (value !== undefined) updates[field] = value || null
  }
  if (req.body?.employment_status !== undefined) updates.employment_status = asEnum(req.body.employment_status, 'employment_status', employmentStatuses)
  if (req.body?.date_joined !== undefined) updates.date_joined = dateOnly(req.body.date_joined, 'date_joined', { optional: true })
  if (req.body?.date_left !== undefined) updates.date_left = dateOnly(req.body.date_left, 'date_left', { optional: true })
  if (updates.date_joined && updates.date_left && updates.date_left < updates.date_joined) throw new ApiError(400, 'date_left cannot be before date_joined')
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable staff field is required')

  const { data, error } = await supabase.from('staff_member').update(updates).eq('staff_id', staffId).select(staffFields).single()
  if (error?.code === '23505') throw new ApiError(409, 'This employee number is already used by another staff record')
  if (error?.code === 'PGRST116') throw new ApiError(404, 'Staff record not found')
  if (error) throw error
  return sendData(res, data)
}))

router.delete('/:staffId', asyncRoute(async (req, res) => {
  const staffId = asUuid(req.params.staffId, 'staffId')
  const { error } = await supabase.from('staff_member').delete().eq('staff_id', staffId)
  if (error?.code === '23503') throw new ApiError(409, 'This staff record has attendance, leave, or teaching history and cannot be deleted. Mark it inactive instead.')
  if (error) throw error
  return sendData(res, { deleted: true })
}))

export default router
