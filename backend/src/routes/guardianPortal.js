import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asUuid, asyncRoute, sendData } from '../lib/api.js'

const router = express.Router()
router.use(requireAuth, requireRole('guardian'))

async function guardianIdForUser(userId) {
  const { data, error } = await supabase.from('guardian').select('guardian_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Guardian profile not found')
  return data.guardian_id
}

async function assertLinkedStudent(studentId, userId) {
  const guardianId = await guardianIdForUser(userId)
  const { data, error } = await supabase.from('student_guardian').select('student_id').eq('guardian_id', guardianId).eq('student_id', studentId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(403, 'You do not have permission to view this child')
  return guardianId
}

router.get('/children', asyncRoute(async (req, res) => {
  const guardianId = await guardianIdForUser(req.user.user_id)
  const { data, error } = await supabase.from('student_guardian').select('student_id,primary_contact,student(student_id,user_id,full_name,dob,phone,address)').eq('guardian_id', guardianId)
  if (error) throw error
  return sendData(res, data || [])
}))

router.get('/children/:studentId', asyncRoute(async (req, res) => {
  const studentId = asUuid(req.params.studentId, 'studentId')
  await assertLinkedStudent(studentId, req.user.user_id)
  const [studentResult, enrollmentResult, attendanceResult, recordsResult, gradesResult, financeResult] = await Promise.all([
    supabase.from('student').select('student_id,full_name,dob,phone,address').eq('student_id', studentId).single(),
    supabase.from('enrollment').select('enrollment_id,status,enrolled_at,course(course_id,course_code,course_name,term,credit_units)').eq('student_id', studentId).order('enrolled_at', { ascending: false }),
    supabase.from('attendance').select('attendance_id,session_date,status,session:class_session(session_id,start_time,course(course_code,course_name))').eq('student_id', studentId).order('session_date', { ascending: false }).limit(100),
    supabase.from('academic_record').select('record_id,score,grade,evaluation_date,published,assessment(assessment_id,title,assessment_type,max_score,weight,course(course_code,course_name))').eq('student_id', studentId).eq('published', true).order('updated_at', { ascending: false }),
    supabase.from('final_grade').select('final_grade_id,course_id,computed_score,letter_grade,gpa,course(course_code,course_name)').eq('student_id', studentId),
    supabase.from('financial_record').select('invoice_id,amount_due,amount_paid,payment_status,due_date,created_at').eq('student_id', studentId).order('created_at', { ascending: false }),
  ])
  const failed = [studentResult, enrollmentResult, attendanceResult, recordsResult, gradesResult, financeResult].find((item) => item.error)
  if (failed) throw failed.error
  return sendData(res, { student: studentResult.data, enrollments: enrollmentResult.data || [], attendance: attendanceResult.data || [], academic_records: recordsResult.data || [], final_grades: gradesResult.data || [], financial_records: financeResult.data || [] })
}))

export default router
