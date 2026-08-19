import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asAcademicYear, asNumber, asText, asUuid, asSemester, asyncRoute, sendData } from '../lib/api.js'
import { activeAssignmentsForTeacher } from '../lib/teacherAssignments.js'
import { progressForAllocation, voidFutureExcessOccurrences } from '../lib/timetable.js'

const router = express.Router()
router.use(requireAuth)

async function allocationRows(req) {
  let query = supabase.from('course_hour_allocation')
    .select('allocation_id,assignment_id,course_id,teacher_id,academic_year,semester,approved_hours,status,created_by,updated_by,created_at,updated_at,course(course_id,course_name,course_code,credit_units),teacher(teacher_id,full_name,email),teacher_course_assignment(assignment_id,status)')
    .order('academic_year', { ascending: false })
    .order('semester')
  if (req.user.role === 'teacher') {
    const { assignments } = await activeAssignmentsForTeacher(req.user.user_id)
    const assignmentIds = assignments.map((row) => row.assignment_id)
    if (!assignmentIds.length) return []
    query = query.in('assignment_id', assignmentIds)
  } else if (req.user.role !== 'administrator') {
    throw new ApiError(403, 'You do not have permission to view course-hour allocations')
  }
  if (req.query.academic_year || req.query.year) query = query.eq('academic_year', asAcademicYear(req.query.academic_year ?? req.query.year))
  if (req.query.semester) query = query.eq('semester', asSemester(req.query.semester))
  if (req.query.assignment_id) query = query.eq('assignment_id', asUuid(req.query.assignment_id, 'assignment_id'))
  const { data, error } = await query
  if (error) throw error
  return data || []
}

router.get('/', asyncRoute(async (req, res) => {
  const rows = await allocationRows(req)
  const data = await Promise.all(rows.map((row) => progressForAllocation(row.allocation_id)))
  return sendData(res, data)
}))

router.get('/:allocationId', asyncRoute(async (req, res) => {
  const allocationId = asUuid(req.params.allocationId, 'allocationId')
  const rows = await allocationRows({ ...req, query: { ...req.query, allocation_id: allocationId } })
  const row = rows.find((item) => item.allocation_id === allocationId)
  if (!row) throw new ApiError(404, 'Course-hour allocation not found')
  return sendData(res, await progressForAllocation(allocationId))
}))

router.post('/', requireRole('administrator'), asyncRoute(async (req, res) => {
  const assignment_id = asUuid(req.body?.assignment_id, 'assignment_id')
  const approved_hours = asNumber(req.body?.approved_hours, 'approved_hours', { min: 0, max: 10000 })
  const reason = asText(req.body?.reason, 'reason', { max: 1000 })
  const { data: assignment, error: assignmentError } = await supabase.from('teacher_course_assignment')
    .select('assignment_id,teacher_id,course_id,academic_year,semester,status')
    .eq('assignment_id', assignment_id)
    .maybeSingle()
  if (assignmentError) throw assignmentError
  if (!assignment || assignment.status !== 'active') throw new ApiError(400, 'An active teacher-course assignment is required')
  const { data, error } = await supabase.from('course_hour_allocation').insert({
    assignment_id,
    course_id: assignment.course_id,
    teacher_id: assignment.teacher_id,
    academic_year: assignment.academic_year,
    semester: assignment.semester,
    approved_hours,
    created_by: req.user.user_id,
    updated_by: req.user.user_id,
  }).select('allocation_id').single()
  if (error) throw error
  await supabase.from('course_hour_allocation_revision').insert({ allocation_id: data.allocation_id, previous_hours: null, new_hours: approved_hours, action: 'Created', reason, changed_by: req.user.user_id })
  return sendData(res, await progressForAllocation(data.allocation_id), 201)
}))

router.patch('/:allocationId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const allocationId = asUuid(req.params.allocationId, 'allocationId')
  const approved_hours = asNumber(req.body?.approved_hours, 'approved_hours', { min: 0, max: 10000 })
  const reason = asText(req.body?.reason, 'reason', { max: 1000 })
  const { data: current, error: currentError } = await supabase.from('course_hour_allocation')
    .select('allocation_id,approved_hours,status')
    .eq('allocation_id', allocationId)
    .maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Course-hour allocation not found')
  if (current.status === 'Archived') throw new ApiError(400, 'Archived allocations cannot be edited')
  const action = approved_hours < Number(current.approved_hours) ? 'Reduced' : approved_hours > Number(current.approved_hours) ? 'Increased' : 'Updated'
  const { error: updateError } = await supabase.from('course_hour_allocation').update({ approved_hours, updated_by: req.user.user_id }).eq('allocation_id', allocationId)
  if (updateError) throw updateError
  const { error: revisionError } = await supabase.from('course_hour_allocation_revision').insert({ allocation_id: allocationId, previous_hours: current.approved_hours, new_hours: approved_hours, action, reason, changed_by: req.user.user_id })
  if (revisionError) throw revisionError
  if (approved_hours < Number(current.approved_hours)) await voidFutureExcessOccurrences(allocationId, approved_hours, reason, req.user.user_id)
  return sendData(res, await progressForAllocation(allocationId))
}))

router.delete('/:allocationId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const allocationId = asUuid(req.params.allocationId, 'allocationId')
  const [{ count: entries }, { count: occurrences }, { data: current, error: currentError }] = await Promise.all([
    supabase.from('timetable_entry').select('timetable_entry_id', { count: 'exact', head: true }).eq('allocation_id', allocationId),
    supabase.from('timetable_occurrence').select('occurrence_id', { count: 'exact', head: true }).eq('allocation_id', allocationId),
    supabase.from('course_hour_allocation').select('allocation_id').eq('allocation_id', allocationId).maybeSingle(),
  ])
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Course-hour allocation not found')
  if ((entries || 0) > 0 || (occurrences || 0) > 0) throw new ApiError(409, 'This allocation has timetable history and must be archived instead of deleted')
  const { error } = await supabase.from('course_hour_allocation').delete().eq('allocation_id', allocationId)
  if (error) throw error
  return res.status(204).send()
}))

export default router
