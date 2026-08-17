-- Academic-year and semester migration 020.
-- Apply manually in Supabase SQL Editor after migrations 017, 018, and 019.
-- This migration replaces the earlier failed 020_two_semesters_and_teacher_sessions.sql.
-- It transforms legacy term values into academic_year + semester and removes the
-- obsolete free-text term columns only after all records and functions are migrated.

BEGIN;

CREATE OR REPLACE FUNCTION sms_migration_020_year(raw_term text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized text := lower(trim(raw_term));
  extracted_year text;
BEGIN
  IF normalized IS NULL OR normalized = '' THEN
    RETURN NULL;
  END IF;

  IF normalized ~ '^[0-9]{4} (term|semester) [12]$' THEN
    extracted_year := substring(normalized from '^([0-9]{4}) ');
    RETURN extracted_year::integer;
  END IF;

  IF normalized ~ '^[0-9]{4}-[ab]$' THEN
    extracted_year := substring(normalized from '^([0-9]{4})-');
    RETURN extracted_year::integer;
  END IF;

  IF normalized IN ('1', '2', 'semester 1', 'semester 2') THEN
    RETURN 2026;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION sms_migration_020_semester(raw_term text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized text := lower(trim(raw_term));
BEGIN
  IF normalized IS NULL OR normalized = '' THEN
    RETURN NULL;
  END IF;

  IF normalized IN ('1', 'semester 1') OR normalized ~ '^[0-9]{4} (term|semester) 1$' OR normalized ~ '^[0-9]{4}-a$' THEN
    RETURN 'Semester 1';
  END IF;

  IF normalized IN ('2', 'semester 2') OR normalized ~ '^[0-9]{4} (term|semester) 2$' OR normalized ~ '^[0-9]{4}-b$' THEN
    RETURN 'Semester 2';
  END IF;

  RETURN NULL;
END;
$$;

-- Stop before making structural changes if any legacy value cannot be mapped.
DO $$
DECLARE
  invalid_value text;
BEGIN
  SELECT coalesce(term, '<NULL>') INTO invalid_value
  FROM assessment
  WHERE term IS NOT NULL AND (sms_migration_020_year(term) IS NULL OR sms_migration_020_semester(term) IS NULL)
  LIMIT 1;
  IF invalid_value IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 020 stopped: assessment.term value % cannot be mapped. Correct the assessment row first.', invalid_value;
  END IF;

  SELECT coalesce(term, '<NULL>') INTO invalid_value
  FROM course_registration_request
  WHERE term IS NULL OR sms_migration_020_year(term) IS NULL OR sms_migration_020_semester(term) IS NULL
  LIMIT 1;
  IF invalid_value IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 020 stopped: course_registration_request.term value % cannot be mapped. Correct the registration request first.', invalid_value;
  END IF;

  SELECT coalesce(term, '<NULL>') INTO invalid_value
  FROM report_card
  WHERE term IS NULL OR sms_migration_020_year(term) IS NULL OR sms_migration_020_semester(term) IS NULL
  LIMIT 1;
  IF invalid_value IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 020 stopped: report_card.term value % cannot be mapped. Correct the report card first.', invalid_value;
  END IF;
END $$;

ALTER TABLE course ADD COLUMN IF NOT EXISTS academic_year integer;
ALTER TABLE course ADD COLUMN IF NOT EXISTS semester text;
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS academic_year integer;
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS semester text;
ALTER TABLE course_registration_request ADD COLUMN IF NOT EXISTS academic_year integer;
ALTER TABLE course_registration_request ADD COLUMN IF NOT EXISTS semester text;
ALTER TABLE report_card ADD COLUMN IF NOT EXISTS academic_year integer;
ALTER TABLE report_card ADD COLUMN IF NOT EXISTS semester text;
ALTER TABLE class_session ADD COLUMN IF NOT EXISTS academic_year integer;
ALTER TABLE class_session ADD COLUMN IF NOT EXISTS semester text;

-- Preserve the legacy values for auditability before removing the old columns.
CREATE TABLE IF NOT EXISTS academic_period_legacy_term_backup (
  backup_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  legacy_term text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_table, source_id)
);

INSERT INTO academic_period_legacy_term_backup (source_table, source_id, legacy_term)
SELECT 'course', course_id, term FROM course
ON CONFLICT (source_table, source_id) DO NOTHING;

INSERT INTO academic_period_legacy_term_backup (source_table, source_id, legacy_term)
SELECT 'assessment', assessment_id, term FROM assessment
ON CONFLICT (source_table, source_id) DO NOTHING;

INSERT INTO academic_period_legacy_term_backup (source_table, source_id, legacy_term)
SELECT 'course_registration_request', registration_request_id, term FROM course_registration_request
ON CONFLICT (source_table, source_id) DO NOTHING;

INSERT INTO academic_period_legacy_term_backup (source_table, source_id, legacy_term)
SELECT 'report_card', report_card_id, term FROM report_card
ON CONFLICT (source_table, source_id) DO NOTHING;

-- Catalog courses are not tied to one period. Preserve their legacy values only
-- in the backup table; the teacher offering assigns the academic period later.
UPDATE course SET academic_year = NULL, semester = NULL;

UPDATE assessment a
SET academic_year = coalesce(sms_migration_020_year(a.term), sms_migration_020_year(c.term)),
    semester = coalesce(sms_migration_020_semester(a.term), sms_migration_020_semester(c.term))
FROM course c
WHERE c.course_id = a.course_id;

UPDATE course_registration_request
SET academic_year = sms_migration_020_year(term),
    semester = sms_migration_020_semester(term);

UPDATE report_card
SET academic_year = sms_migration_020_year(term),
    semester = sms_migration_020_semester(term);

UPDATE class_session cs
SET academic_year = sms_migration_020_year(c.term),
    semester = sms_migration_020_semester(c.term)
FROM course c
WHERE c.course_id = cs.course_id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM assessment WHERE academic_year IS NULL OR semester IS NULL) THEN
    RAISE EXCEPTION 'Migration 020 stopped: one or more assessments could not receive an academic year and semester.';
  END IF;
  IF EXISTS (SELECT 1 FROM course_registration_request WHERE academic_year IS NULL OR semester IS NULL) THEN
    RAISE EXCEPTION 'Migration 020 stopped: one or more registration requests could not receive an academic year and semester.';
  END IF;
  IF EXISTS (SELECT 1 FROM report_card WHERE academic_year IS NULL OR semester IS NULL) THEN
    RAISE EXCEPTION 'Migration 020 stopped: one or more report cards could not receive an academic year and semester.';
  END IF;
  IF EXISTS (SELECT 1 FROM class_session WHERE academic_year IS NULL OR semester IS NULL) THEN
    RAISE EXCEPTION 'Migration 020 stopped: one or more class sessions could not receive an academic year and semester.';
  END IF;
END $$;

DROP INDEX IF EXISTS uq_pending_course_registration_student_term;
DROP INDEX IF EXISTS idx_assessment_term_course;
DROP INDEX IF EXISTS idx_report_card_student_term;
DROP INDEX IF EXISTS idx_report_card_status;
DROP INDEX IF EXISTS idx_class_session_course_semester;

DO $$
DECLARE
  old_constraint text;
BEGIN
  FOR old_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'report_card'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%term%'
  LOOP
    EXECUTE format('ALTER TABLE report_card DROP CONSTRAINT %I', old_constraint);
  END LOOP;
END $$;

-- Remove old RPC definitions before dropping the term columns they referenced.
DROP FUNCTION IF EXISTS submit_course_registration(uuid, text, uuid[]);
DROP FUNCTION IF EXISTS submit_course_registration(uuid, integer, text, uuid[]);
DROP FUNCTION IF EXISTS approve_course_registration(uuid, uuid, text);

ALTER TABLE course DROP COLUMN IF EXISTS term;
ALTER TABLE assessment DROP COLUMN IF EXISTS term;
ALTER TABLE course_registration_request DROP COLUMN IF EXISTS term;
ALTER TABLE report_card DROP COLUMN IF EXISTS term;

ALTER TABLE course ALTER COLUMN academic_year DROP NOT NULL;
ALTER TABLE course ALTER COLUMN semester DROP NOT NULL;
ALTER TABLE assessment ALTER COLUMN academic_year SET NOT NULL;
ALTER TABLE assessment ALTER COLUMN semester SET NOT NULL;
ALTER TABLE course_registration_request ALTER COLUMN academic_year SET NOT NULL;
ALTER TABLE course_registration_request ALTER COLUMN semester SET NOT NULL;
ALTER TABLE report_card ALTER COLUMN academic_year SET NOT NULL;
ALTER TABLE report_card ALTER COLUMN semester SET NOT NULL;
ALTER TABLE class_session ALTER COLUMN academic_year SET DEFAULT 2026;
ALTER TABLE class_session ALTER COLUMN academic_year SET NOT NULL;
ALTER TABLE class_session ALTER COLUMN semester SET DEFAULT 'Semester 1';
ALTER TABLE class_session ALTER COLUMN semester SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_academic_year_check') THEN
    ALTER TABLE course ADD CONSTRAINT course_academic_year_check CHECK (academic_year IS NULL OR academic_year BETWEEN 2000 AND 9999);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_semester_check') THEN
    ALTER TABLE course ADD CONSTRAINT course_semester_check CHECK (semester IS NULL OR semester IN ('Semester 1', 'Semester 2'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_academic_year_check') THEN
    ALTER TABLE assessment ADD CONSTRAINT assessment_academic_year_check CHECK (academic_year BETWEEN 2000 AND 9999);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_semester_check') THEN
    ALTER TABLE assessment ADD CONSTRAINT assessment_semester_check CHECK (semester IN ('Semester 1', 'Semester 2'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_registration_request_academic_year_check') THEN
    ALTER TABLE course_registration_request ADD CONSTRAINT course_registration_request_academic_year_check CHECK (academic_year BETWEEN 2000 AND 9999);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_registration_request_semester_check') THEN
    ALTER TABLE course_registration_request ADD CONSTRAINT course_registration_request_semester_check CHECK (semester IN ('Semester 1', 'Semester 2'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_card_academic_year_check') THEN
    ALTER TABLE report_card ADD CONSTRAINT report_card_academic_year_check CHECK (academic_year BETWEEN 2000 AND 9999);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_card_semester_check') THEN
    ALTER TABLE report_card ADD CONSTRAINT report_card_semester_check CHECK (semester IN ('Semester 1', 'Semester 2'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_session_academic_year_check') THEN
    ALTER TABLE class_session ADD CONSTRAINT class_session_academic_year_check CHECK (academic_year BETWEEN 2000 AND 9999);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_session_semester_check') THEN
    ALTER TABLE class_session ADD CONSTRAINT class_session_semester_check CHECK (semester IN ('Semester 1', 'Semester 2'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_course_registration_student_period
  ON course_registration_request(student_id, academic_year, semester)
  WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS uq_report_card_student_period
  ON report_card(student_id, academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_assessment_period_course
  ON assessment(course_id, academic_year, semester, assessment_type, assessment_number);
CREATE INDEX IF NOT EXISTS idx_report_card_student_period
  ON report_card(student_id, academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_report_card_status_period
  ON report_card(status, academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_class_session_course_period
  ON class_session(course_id, academic_year, semester, start_time);

CREATE OR REPLACE FUNCTION submit_course_registration(
  p_student_id uuid,
  p_academic_year integer,
  p_semester text,
  p_course_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_class_level text;
  v_max_credits integer;
  v_total_credits integer;
  v_course_count integer;
  v_distinct_course_count integer;
BEGIN
  IF p_student_id IS NULL OR p_academic_year NOT BETWEEN 2000 AND 9999 OR p_semester NOT IN ('Semester 1', 'Semester 2') THEN
    RAISE EXCEPTION 'Student, academic year, and semester are required' USING ERRCODE = 'P0001';
  END IF;
  IF p_course_ids IS NULL OR cardinality(p_course_ids) = 0 THEN
    RAISE EXCEPTION 'Select at least one course' USING ERRCODE = 'P0001';
  END IF;

  SELECT cardinality(p_course_ids), count(DISTINCT course_id)::integer
    INTO v_course_count, v_distinct_course_count
  FROM unnest(p_course_ids) AS course_id;
  IF v_course_count <> v_distinct_course_count THEN
    RAISE EXCEPTION 'A course cannot be selected more than once' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM course_registration_request
    WHERE student_id = p_student_id
      AND academic_year = p_academic_year
      AND semester = trim(p_semester)
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending registration request already exists for this academic period' USING ERRCODE = 'P0001';
  END IF;

  SELECT class_level INTO v_class_level FROM student WHERE student_id = p_student_id;
  IF v_class_level IS NULL THEN
    RAISE EXCEPTION 'The student class level must be configured before registration' USING ERRCODE = 'P0001';
  END IF;

  SELECT max_credits INTO v_max_credits FROM class_fee_setting WHERE class_level = v_class_level;
  IF v_max_credits IS NULL OR v_max_credits <= 0 THEN
    RAISE EXCEPTION 'No positive credit limit is configured for this student class level' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_course_ids) AS selected(course_id)
    LEFT JOIN course c ON c.course_id = selected.course_id
    WHERE c.course_id IS NULL
  ) THEN
    RAISE EXCEPTION 'One or more selected courses are unavailable for this academic period' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_course_ids) AS selected(course_id)
    JOIN enrollment e ON e.course_id = selected.course_id AND e.student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'The student already has an enrollment record for one or more selected courses' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(sum(c.credit_units), 0)::integer INTO v_total_credits
  FROM unnest(p_course_ids) AS selected(course_id)
  JOIN course c ON c.course_id = selected.course_id;
  IF v_total_credits > v_max_credits THEN
    RAISE EXCEPTION 'Selected credits exceed the configured limit of %', v_max_credits USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO course_registration_request (student_id, academic_year, semester, total_credits)
  VALUES (p_student_id, p_academic_year, trim(p_semester), v_total_credits)
  RETURNING registration_request_id INTO v_request_id;

  INSERT INTO course_registration_item (registration_request_id, course_id, credit_units)
  SELECT v_request_id, c.course_id, COALESCE(c.credit_units, 0)
  FROM unnest(p_course_ids) AS selected(course_id)
  JOIN course c ON c.course_id = selected.course_id;

  RETURN jsonb_build_object(
    'registration_request_id', v_request_id,
    'student_id', p_student_id,
    'academic_year', p_academic_year,
    'semester', trim(p_semester),
    'status', 'pending',
    'total_credits', v_total_credits
  );
END;
$$;

CREATE OR REPLACE FUNCTION approve_course_registration(
  p_request_id uuid,
  p_reviewer_id uuid,
  p_review_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request course_registration_request%ROWTYPE;
  v_class_level text;
  v_max_credits integer;
  v_current_credits integer;
  v_course_count integer;
BEGIN
  SELECT * INTO v_request FROM course_registration_request WHERE registration_request_id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Registration request not found' USING ERRCODE = 'P0001'; END IF;
  IF v_request.status <> 'pending' THEN RAISE EXCEPTION 'Only pending registration requests can be approved' USING ERRCODE = 'P0001'; END IF;

  SELECT class_level INTO v_class_level FROM student WHERE student_id = v_request.student_id;
  SELECT max_credits INTO v_max_credits FROM class_fee_setting WHERE class_level = v_class_level;
  SELECT COALESCE(sum(ri.credit_units), 0)::integer, count(*)::integer
    INTO v_current_credits, v_course_count
  FROM course_registration_item ri WHERE ri.registration_request_id = p_request_id;
  IF v_course_count = 0 OR v_current_credits > COALESCE(v_max_credits, 0) THEN
    RAISE EXCEPTION 'The request no longer satisfies the configured credit limit' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM course_registration_item ri
    JOIN enrollment e ON e.course_id = ri.course_id AND e.student_id = v_request.student_id
  ) THEN
    RAISE EXCEPTION 'The student already has an enrollment record for one or more requested courses' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO enrollment (student_id, course_id, status)
  SELECT v_request.student_id, ri.course_id, 'active'
  FROM course_registration_item ri WHERE ri.registration_request_id = p_request_id;

  UPDATE course_registration_request
  SET status = 'approved', reviewed_by = p_reviewer_id, reviewed_at = now(), review_notes = NULLIF(trim(p_review_notes), '')
  WHERE registration_request_id = p_request_id;

  RETURN jsonb_build_object(
    'registration_request_id', p_request_id,
    'student_id', v_request.student_id,
    'academic_year', v_request.academic_year,
    'semester', v_request.semester,
    'status', 'approved',
    'total_credits', v_current_credits
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_course_registration(uuid, integer, text, uuid[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION approve_course_registration(uuid, uuid, text) TO anon, authenticated, service_role;

COMMENT ON COLUMN course.academic_year IS 'Deprecated nullable compatibility field; academic year belongs to teacher_course_assignment and enrollment.';
COMMENT ON COLUMN course.semester IS 'Deprecated nullable compatibility field; semester belongs to teacher_course_assignment and enrollment.';
COMMENT ON COLUMN assessment.academic_year IS 'Academic year inherited from the course period.';
COMMENT ON COLUMN assessment.semester IS 'Academic semester inherited from the course period.';
COMMENT ON COLUMN course_registration_request.academic_year IS 'Academic year selected for the registration request.';
COMMENT ON COLUMN course_registration_request.semester IS 'Academic semester selected for the registration request.';
COMMENT ON COLUMN report_card.academic_year IS 'Academic year represented by the report card.';
COMMENT ON COLUMN report_card.semester IS 'Academic semester represented by the report card.';
COMMENT ON COLUMN class_session.academic_year IS 'Academic year represented by the scheduled class session.';
COMMENT ON COLUMN class_session.semester IS 'Academic semester represented by the scheduled class session.';

DROP FUNCTION sms_migration_020_year(text);
DROP FUNCTION sms_migration_020_semester(text);

COMMIT;
