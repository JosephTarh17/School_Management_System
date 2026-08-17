import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asAcademicYear, asSemester, asyncRoute, sendData } from '../lib/api.js'
import { currentAcademicPeriod } from '../lib/academicPeriod.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', asyncRoute(async (req, res) => sendData(res, await currentAcademicPeriod())))

router.patch('/', requireRole('administrator'), asyncRoute(async (req, res) => {
  const academic_year = asAcademicYear(req.body?.academic_year ?? req.body?.year, 'academic_year')
  const semester = asSemester(req.body?.semester, 'semester')
  const { data, error } = await supabase.from('academic_period_settings')
    .update({ academic_year, semester, updated_by: req.user.user_id, updated_at: new Date().toISOString() })
    .eq('setting_id', 1)
    .select('setting_id,academic_year,semester,updated_by,updated_at')
    .single()
  if (error) throw error
  return sendData(res, data)
}))

export default router
