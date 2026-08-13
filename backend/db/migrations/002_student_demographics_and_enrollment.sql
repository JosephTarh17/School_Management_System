-- SMS database migration 002
-- Apply after 001_harden_integrity_and_indexes.sql.
-- Idempotent additions for Chapter 2: student demographics and enrollment management.

ALTER TABLE student ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE student ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
ALTER TABLE student ADD COLUMN IF NOT EXISTS medical_information text;
ALTER TABLE student ADD COLUMN IF NOT EXISTS disability_accommodations text;
ALTER TABLE student ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE TABLE IF NOT EXISTS enrollment (
  enrollment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollment_student_id ON enrollment(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_course_id ON enrollment(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_status ON enrollment(status);

CREATE OR REPLACE FUNCTION set_enrollment_enrolled_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.enrolled_at IS NULL THEN NEW.enrolled_at = now(); END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enrollment_enrolled_at ON enrollment;
CREATE TRIGGER trg_enrollment_enrolled_at
BEFORE INSERT ON enrollment
FOR EACH ROW EXECUTE FUNCTION set_enrollment_enrolled_at();

CREATE INDEX IF NOT EXISTS idx_student_archived_at ON student(archived_at);
CREATE INDEX IF NOT EXISTS idx_student_guardian_student_id ON student_guardian(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardian_guardian_id ON student_guardian(guardian_id);
