-- SMS database migration 003
-- Apply after migration 002. Adds the teacher gradebook publishing model.

ALTER TABLE academic_record ADD COLUMN IF NOT EXISTS evaluation_date date;
ALTER TABLE academic_record ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_record_score_range') THEN
    ALTER TABLE academic_record ADD CONSTRAINT academic_record_score_range CHECK (score IS NULL OR score >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_academic_record_assessment_id ON academic_record(assessment_id);
CREATE INDEX IF NOT EXISTS idx_academic_record_published ON academic_record(published);
CREATE INDEX IF NOT EXISTS idx_final_grade_student_id ON final_grade(student_id);
CREATE INDEX IF NOT EXISTS idx_final_grade_course_id ON final_grade(course_id);
