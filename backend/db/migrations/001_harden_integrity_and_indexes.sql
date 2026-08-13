-- SMS database migration 001
-- Apply after backend/db/supabase_schema.sql.
-- This migration is idempotent and safe to re-run in a development database.

-- class_session uses SET NULL on teacher/room deletion, so those columns must be nullable.
ALTER TABLE class_session ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE class_session ALTER COLUMN room_id DROP NOT NULL;

-- Normalize email uniqueness without changing existing email values.
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_account_email_lower ON user_account (lower(email));

-- Add integrity checks that match backend validation and prevent invalid direct SQL writes.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_credit_units_nonnegative') THEN
    ALTER TABLE course ADD CONSTRAINT course_credit_units_nonnegative CHECK (credit_units IS NULL OR credit_units >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_capacity_positive') THEN
    ALTER TABLE room ADD CONSTRAINT room_capacity_positive CHECK (capacity IS NULL OR capacity > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_max_score_positive') THEN
    ALTER TABLE assessment ADD CONSTRAINT assessment_max_score_positive CHECK (max_score > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_weight_range') THEN
    ALTER TABLE assessment ADD CONSTRAINT assessment_weight_range CHECK (weight >= 0 AND weight <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_record_score_nonnegative') THEN
    ALTER TABLE academic_record ADD CONSTRAINT academic_record_score_nonnegative CHECK (score IS NULL OR score >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'final_grade_score_range') THEN
    ALTER TABLE final_grade ADD CONSTRAINT final_grade_score_range CHECK (computed_score IS NULL OR (computed_score >= 0 AND computed_score <= 100));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'final_grade_gpa_range') THEN
    ALTER TABLE final_grade ADD CONSTRAINT final_grade_gpa_range CHECK (gpa IS NULL OR (gpa >= 0 AND gpa <= 4.0));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financial_amounts_nonnegative') THEN
    ALTER TABLE financial_record ADD CONSTRAINT financial_amounts_nonnegative CHECK (amount_due >= 0 AND amount_paid >= 0 AND amount_paid <= amount_due);
  END IF;
END $$;

-- Deny direct anon/authenticated table access by default. The backend uses the
-- service-role key and remains able to perform server-side operations. Add
-- explicit policies later if the frontend is ever allowed to query Supabase directly.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['user_account', 'student', 'guardian', 'administrator', 'teacher', 'student_guardian', 'course', 'room', 'class_session', 'assessment', 'academic_record', 'final_grade', 'participation_log', 'attendance', 'financial_record']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

-- Foreign-key lookup indexes for the joins used by the API.
CREATE INDEX IF NOT EXISTS idx_student_user_id ON student(user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_user_id ON guardian(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_user_id ON teacher(user_id);
CREATE INDEX IF NOT EXISTS idx_administrator_user_id ON administrator(user_id);
CREATE INDEX IF NOT EXISTS idx_student_guardian_guardian_id ON student_guardian(guardian_id);
CREATE INDEX IF NOT EXISTS idx_assessment_course_id ON assessment(course_id);
CREATE INDEX IF NOT EXISTS idx_academic_record_assessment_id ON academic_record(assessment_id);
CREATE INDEX IF NOT EXISTS idx_final_grade_student_id ON final_grade(student_id);
CREATE INDEX IF NOT EXISTS idx_final_grade_course_id ON final_grade(course_id);
CREATE INDEX IF NOT EXISTS idx_financial_record_student_id ON financial_record(student_id);
CREATE INDEX IF NOT EXISTS idx_user_account_role ON user_account(role);
CREATE INDEX IF NOT EXISTS idx_class_session_start_time ON class_session(start_time);

-- Keep academic record timestamps current when scores or grades change.
CREATE OR REPLACE FUNCTION set_academic_record_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academic_record_updated_at ON academic_record;
CREATE TRIGGER trg_academic_record_updated_at
BEFORE UPDATE ON academic_record
FOR EACH ROW EXECUTE FUNCTION set_academic_record_updated_at();

-- Prevent profile rows from being linked to an account with the wrong role.
CREATE OR REPLACE FUNCTION enforce_profile_user_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_role user_role;
  actual_role user_role;
BEGIN
  expected_role := CASE TG_TABLE_NAME
    WHEN 'student' THEN 'student'::user_role
    WHEN 'teacher' THEN 'teacher'::user_role
    WHEN 'guardian' THEN 'guardian'::user_role
    WHEN 'administrator' THEN 'administrator'::user_role
  END;
  SELECT role INTO actual_role FROM user_account WHERE user_id = NEW.user_id;
  IF actual_role IS NULL OR actual_role <> expected_role THEN
    RAISE EXCEPTION 'user_id % must reference a % account', NEW.user_id, expected_role USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_user_role ON student;
CREATE TRIGGER trg_student_user_role BEFORE INSERT OR UPDATE OF user_id ON student FOR EACH ROW EXECUTE FUNCTION enforce_profile_user_role();
DROP TRIGGER IF EXISTS trg_teacher_user_role ON teacher;
CREATE TRIGGER trg_teacher_user_role BEFORE INSERT OR UPDATE OF user_id ON teacher FOR EACH ROW EXECUTE FUNCTION enforce_profile_user_role();
DROP TRIGGER IF EXISTS trg_guardian_user_role ON guardian;
CREATE TRIGGER trg_guardian_user_role BEFORE INSERT OR UPDATE OF user_id ON guardian FOR EACH ROW EXECUTE FUNCTION enforce_profile_user_role();
DROP TRIGGER IF EXISTS trg_administrator_user_role ON administrator;
CREATE TRIGGER trg_administrator_user_role BEFORE INSERT OR UPDATE OF user_id ON administrator FOR EACH ROW EXECUTE FUNCTION enforce_profile_user_role();
