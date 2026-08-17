export const PASS_PERCENT = 60
export const PASS_GPA = 2.4
export const TEST_WEIGHT = 20
export const FINAL_WEIGHT = 40

export function round2(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100 }
export function letterGrade(score) {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}
export function gpaForScore(score) {
  if (score >= 90) return 4
  if (score >= 80) return 3
  if (score >= 70) return 2
  if (score >= 60) return 1
  return 0
}
export function assessmentWeight(assessment) {
  if (assessment.assessment_type === 'Test') return TEST_WEIGHT
  if (assessment.assessment_type === 'Final') return FINAL_WEIGHT
  return Number(assessment.weight || 0)
}
export function statusForRecord(record) { return record?.record_status || (record?.score == null ? 'ABSENT_JUSTIFIED' : 'GRADED') }

export function calculateCourseResult({ course, assessments, records }) {
  const recordByAssessment = new Map((records || []).map((record) => [record.assessment_id, record]))
  let weightedTotal = 0
  let includedWeight = 0
  const testCount = assessments.filter((assessment) => assessment.assessment_type === 'Test').length
  const finalCount = assessments.filter((assessment) => assessment.assessment_type === 'Final').length
  let complete = testCount === 3 && finalCount === 1
  const assessmentResults = assessments.map((assessment) => {
    const record = recordByAssessment.get(assessment.assessment_id)
    const recordStatus = statusForRecord(record)
    const weight = assessmentWeight(assessment)
    const score = recordStatus === 'ABSENT_UNJUSTIFIED' ? 0 : recordStatus === 'ABSENT_JUSTIFIED' ? null : record?.score == null ? null : Number(record.score)
    const percentage = score == null ? null : round2((score / Number(assessment.max_score)) * 100)
    if (!record) complete = false
    if (score == null && recordStatus !== 'ABSENT_JUSTIFIED') complete = false
    if (percentage != null) {
      weightedTotal += percentage * weight
      includedWeight += weight
    }
    return { assessment, record, record_status: recordStatus, score, percentage, weight, published: record?.published === true }
  })
  const average = includedWeight ? round2(weightedTotal / includedWeight) : null
  const gpa = average == null ? null : gpaForScore(average)
  return {
    course_id: course.course_id,
    course_code: course.course_code,
    course_name: course.course_name,
    academic_year: course.academic_year,
    semester: course.semester,
    credit_units: Number(course.credit_units || 0),
    average,
    letter_grade: average == null ? null : letterGrade(average),
    gpa,
    passed: complete && average >= PASS_PERCENT,
    complete,
    required_pass_average: PASS_PERCENT,
    required_pass_gpa: PASS_GPA,
    assessments: assessmentResults,
  }
}
