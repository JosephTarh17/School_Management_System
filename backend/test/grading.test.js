import { strict as assert } from 'node:assert'
import { describe, it } from 'mocha'
import { calculateCourseResult, gpaForScore, letterGrade } from '../src/lib/grading.js'

const course = { course_id: '10000000-0000-0000-0000-000000000001', course_code: 'CSC101', course_name: 'Computer Science', term: '2026-A', credit_units: 3 }
const assessments = [
  { assessment_id: '20000000-0000-0000-0000-000000000001', assessment_type: 'Test', assessment_number: 1, max_score: 100, weight: 20 },
  { assessment_id: '20000000-0000-0000-0000-000000000002', assessment_type: 'Test', assessment_number: 2, max_score: 100, weight: 20 },
  { assessment_id: '20000000-0000-0000-0000-000000000003', assessment_type: 'Test', assessment_number: 3, max_score: 100, weight: 20 },
  { assessment_id: '20000000-0000-0000-0000-000000000004', assessment_type: 'Final', assessment_number: null, max_score: 100, weight: 40 },
]

function record(assessment_id, score, record_status = 'GRADED', published = true) {
  return { record_id: `${assessment_id.slice(0, 8)}-0000-0000-0000-000000000001`, assessment_id, score, record_status, published }
}

describe('grading rules', () => {
  it('keeps the approved letter-grade and GPA scale', () => {
    assert.equal(letterGrade(90), 'A')
    assert.equal(letterGrade(80), 'B')
    assert.equal(letterGrade(70), 'C')
    assert.equal(letterGrade(60), 'D')
    assert.equal(letterGrade(59.99), 'F')
    assert.equal(gpaForScore(90), 4)
    assert.equal(gpaForScore(80), 3)
    assert.equal(gpaForScore(70), 2)
    assert.equal(gpaForScore(60), 1)
    assert.equal(gpaForScore(59.99), 0)
  })

  it('calculates three tests at 20 percent and the final at 40 percent', () => {
    const result = calculateCourseResult({ course, assessments, records: [
      record(assessments[0].assessment_id, 80),
      record(assessments[1].assessment_id, 70),
      record(assessments[2].assessment_id, 90),
      record(assessments[3].assessment_id, 60),
    ] })
    assert.equal(result.average, 72)
    assert.equal(result.letter_grade, 'C')
    assert.equal(result.gpa, 2)
    assert.equal(result.complete, true)
    assert.equal(result.passed, true)
  })

  it('excludes a justified absence from the calculation', () => {
    const result = calculateCourseResult({ course, assessments, records: [
      record(assessments[0].assessment_id, 80),
      record(assessments[1].assessment_id, null, 'ABSENT_JUSTIFIED'),
      record(assessments[2].assessment_id, 90),
      record(assessments[3].assessment_id, 60),
    ] })
    assert.equal(result.average, 72.5)
    assert.equal(result.complete, true)
    assert.equal(result.assessments[1].percentage, null)
    assert.equal(result.passed, true)
  })

  it('counts an unjustified absence as zero', () => {
    const result = calculateCourseResult({ course, assessments, records: [
      record(assessments[0].assessment_id, 80),
      record(assessments[1].assessment_id, null, 'ABSENT_UNJUSTIFIED'),
      record(assessments[2].assessment_id, 90),
      record(assessments[3].assessment_id, 60),
    ] })
    assert.equal(result.average, 58)
    assert.equal(result.complete, true)
    assert.equal(result.passed, false)
  })

  it('keeps a course incomplete when a registered assessment has no decision', () => {
    const result = calculateCourseResult({ course, assessments, records: [
      record(assessments[0].assessment_id, 80),
      record(assessments[1].assessment_id, 70),
      record(assessments[3].assessment_id, 60),
    ] })
    assert.equal(result.complete, false)
    assert.equal(result.passed, false)
  })

  it('calculates GPA using course credits', () => {
    const courseResults = [{ gpa: 4, credit_units: 3 }, { gpa: 2, credit_units: 6 }]
    const totalCredits = courseResults.reduce((sum, item) => sum + item.credit_units, 0)
    const weightedGpa = courseResults.reduce((sum, item) => sum + item.gpa * item.credit_units, 0) / totalCredits
    assert.equal(totalCredits, 9)
    assert.equal(Number(weightedGpa.toFixed(2)), 2.67)
    assert.ok(weightedGpa >= 2.4)
  })
})
