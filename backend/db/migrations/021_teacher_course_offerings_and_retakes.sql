-- Teacher course offerings and retake-safe enrollment migration 021.
-- Apply after migration 020_academic_year_and_semesters.sql.
-- A course is catalog data. A teacher_course_assignment is the offering of that
-- course by one teacher for one academic year and semester.

BEGIN;

CREATE OR REPLACE FUNCTION sms_migration_021_year(raw_term text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized text := lower(trim(raw_term));
BEGIN
  IF normalized ~ '^[0-9]{4} (term|semester) [12]$' THEN
    RETURN substring(normalized from '^([0-9]{4}) ')::integer;
  END IF;
  IF normalized ~ '^[0-9]{4}-[ab]$' THEN
    RETURN substring(normalized from '^([0-9]{4})-')::integer;
  END IF;
  IF normalized IN ('1', '2', 'semester 1', 'semester 2') THEN
    RETURN 2026;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION sms_migration_021_semester(raw_term text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized text := lower(trim(raw_term));
BEGIN
  IF normalized IN ('1', 'semester 1') OR normalized ~ '^[0-9]{4} (term|semester) 1$' OR normalized ~ '^[0-9]{4}-a$' THEN
    RETURN 'Semester 1';
  END IF;
  IF normalized IN ('2', 'semester 2') OR normalized ~ '^[0-9]{4} (term|semester) 2$' OR normalized ~ '^[0-9]{4}-b$' THEN
    RETURN 'Semester 2';
  END IF;
  RETURN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS teacher_course_assignment (
  assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teacher(teacher_id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
  academic_year integer NOT NULL CHECK (academic_year BETWEEN 2000 AND 9999),
  semester text NOT NULL CHECK (semester IN ('Semester 1', 'Semester 2')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL
);

-- Do not silently choose an owner if old class sessions already show two teachers
-- teaching the same course in the same academic period.
DO $$
BEGIN
  IF EXISTS (
    SELECT course_id, academic_year, semester
    FROM class_session
    WHERE teacher_id IS NOT NULL
    GROUP BY course_id, academic_year, semester
    HAVING count(DISTINCT teacher_id) > 1
  ) THEN
    RAISE EXCEPTION 'Migration 021 stopped: more than one teacher already owns the same course in the same academic period. Resolve those class sessions first.';
  END IF;
END $$;

ALTER TABLE class_session ADD COLUMN IF NOT EXISTS assignment_id uuid;
ALTER TABLE enrollment ADD COLUMN IF NOT EXISTS academic_year integer;
ALTER TABLE enrollment ADD COLUMN IF NOT EXISTS semester text;
ALTER TABLE final_grade ADD COLUMN IF NOT EXISTS academic_year integer;
ALTER TABLE final_grade ADD COLUMN IF NOT EXISTS semester text;

UPDATE enrollment e
SET academic_year = coalesce(c.academic_year, sms_migration_021_year(b.legacy_term)),
    semester = coalesce(c.semester, sms_migration_021_semester(b.legacy_term))
FROM course c
LEFT JOIN academic_period_legacy_term_backup b
  ON b.source_table = 'course' AND b.source_id = c.course_id
WHERE c.course_id = e.course_id
  AND (e.academic_year IS NULL OR e.semester IS NULL);

UPDATE final_grade fg
SET academic_year = coalesce(c.academic_year, sms_migration_021_year(b.legacy_term)),
    semester = coalesce(c.semester, sms_migration_021_semester(b.legacy_term))
FROM course c
LEFT JOIN academic_period_legacy_term_backup b
  ON b.source_table = 'course' AND b.source_id = c.course_id
WHERE c.course_id = fg.course_id
  AND (fg.academic_year IS NULL OR fg.semester IS NULL);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM enrollment WHERE academic_year IS NULL OR semester IS NULL) THEN
    RAISE EXCEPTION 'Migration 021 stopped: an enrollment row could not be assigned an academic period.';
  END IF;
  IF EXISTS (SELECT 1 FROM final_grade WHERE academic_year IS NULL OR semester IS NULL) THEN
    RAISE EXCEPTION 'Migration 021 stopped: a final-grade row could not be assigned an academic period.';
  END IF;
END $$;

ALTER TABLE enrollment ALTER COLUMN academic_year SET NOT NULL;
ALTER TABLE enrollment ALTER COLUMN semester SET NOT NULL;
ALTER TABLE final_grade ALTER COLUMN academic_year SET NOT NULL;
ALTER TABLE final_grade ALTER COLUMN semester SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enrollment_academic_year_check') THEN
    ALTER TABLE enrollment ADD CONSTRAINT enrollment_academic_year_check CHECK (academic_year BETWEEN 2000 AND 9999);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enrollment_semester_check') THEN
    ALTER TABLE enrollment ADD CONSTRAINT enrollment_semester_check CHECK (semester IN ('Semester 1', 'Semester 2'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'final_grade_academic_year_check') THEN
    ALTER TABLE final_grade ADD CONSTRAINT final_grade_academic_year_check CHECK (academic_year BETWEEN 2000 AND 9999);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'final_grade_semester_check') THEN
    ALTER TABLE final_grade ADD CONSTRAINT final_grade_semester_check CHECK (semester IN ('Semester 1', 'Semester 2'));
  END IF;
END $$;

-- Backfill offerings from existing teacher-owned sessions.
INSERT INTO teacher_course_assignment (teacher_id, course_id, academic_year, semester, assigned_by)
SELECT DISTINCT ON (cs.course_id, cs.academic_year, cs.semester)
  cs.teacher_id, cs.course_id, cs.academic_year, cs.semester, NULL
FROM class_session cs
WHERE cs.teacher_id IS NOT NULL
ORDER BY cs.course_id, cs.academic_year, cs.semester, cs.start_time, cs.session_id
ON CONFLICT DO NOTHING;

UPDATE class_session cs
SET assignment_id = a.assignment_id
FROM teacher_course_assignment a
WHERE cs.teacher_id = a.teacher_id
  AND cs.course_id = a.course_id
  AND cs.academic_year = a.academic_year
  AND cs.semester = a.semester
  AND cs.assignment_id IS NULL;

ALTER TABLE class_session
  DROP CONSTRAINT IF EXISTS class_session_assignment_id_fkey;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_session_assignment_id_fkey') THEN
    ALTER TABLE class_session
      ADD CONSTRAINT class_session_assignment_id_fkey
      FOREIGN KEY (assignment_id) REFERENCES teacher_course_assignment(assignment_id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE enrollment DROP CONSTRAINT IF EXISTS enrollment_student_id_course_id_key;
ALTER TABLE final_grade DROP CONSTRAINT IF EXISTS final_grade_student_id_course_id_key;

ALTER TABLE teacher_course_assignment ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_course_assignment_period
  ON teacher_course_assignment(course_id, academic_year, semester)
  WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_course_assignment_teacher_period
  ON teacher_course_assignment(teacher_id, course_id, academic_year, semester);
CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollment_student_course_period
  ON enrollment(student_id, course_id, academic_year, semester);
CREATE UNIQUE INDEX IF NOT EXISTS uq_final_grade_student_course_period
  ON final_grade(student_id, course_id, academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_teacher_course_assignment_teacher_period
  ON teacher_course_assignment(teacher_id, academic_year, semester, status);
CREATE INDEX IF NOT EXISTS idx_teacher_course_assignment_course_period
  ON teacher_course_assignment(course_id, academic_year, semester, status);
CREATE INDEX IF NOT EXISTS idx_enrollment_course_period
  ON enrollment(course_id, academic_year, semester, status);
CREATE INDEX IF NOT EXISTS idx_class_session_assignment
  ON class_session(assignment_id);

CREATE OR REPLACE FUNCTION enforce_class_session_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  offering teacher_course_assignment%ROWTYPE;
BEGIN
  IF NEW.assignment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO offering
  FROM teacher_course_assignment
  WHERE assignment_id = NEW.assignment_id
    AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected teacher course offering is not active' USING ERRCODE = '23514';
  END IF;

  IF NEW.teacher_id IS DISTINCT FROM offering.teacher_id
     OR NEW.course_id IS DISTINCT FROM offering.course_id
     OR NEW.academic_year IS DISTINCT FROM offering.academic_year
     OR NEW.semester IS DISTINCT FROM offering.semester THEN
    RAISE EXCEPTION 'Class session does not match its teacher course offering' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_class_session_assignment ON class_session;
CREATE TRIGGER trg_class_session_assignment
BEFORE INSERT OR UPDATE OF assignment_id, teacher_id, course_id, academic_year, semester
ON class_session
FOR EACH ROW EXECUTE FUNCTION enforce_class_session_assignment();

DROP FUNCTION IF EXISTS submit_course_registration(uuid, integer, text, uuid[]);
DROP FUNCTION IF EXISTS approve_course_registration(uuid, uuid, text);

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
      AND semester = p_semester
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending registration request already exists for this academic period' USING ERRCODE = 'P0001';
  END IF;

  SELECT class_level INTO v_class_level FROM student WHERE student_id = p_student_id;
  IF v_class_level IS NULL THEN
    RAISE EXCEPTION 'The student class level must be configured before registration' USING ERRCODE = 'P0001';
  END IF;

  SELECT max_credits INTO v_max_credits
  FROM class_fee_setting
  WHERE class_level = v_class_level;
  IF v_max_credits IS NULL OR v_max_credits <= 0 THEN
    RAISE EXCEPTION 'No positive credit limit is configured for this student class level' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_course_ids) AS selected(course_id)
    LEFT JOIN course c ON c.course_id = selected.course_id
    WHERE c.course_id IS NULL
  ) THEN
    RAISE EXCEPTION 'One or more selected courses are unavailable' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_course_ids) AS selected(course_id)
    LEFT JOIN teacher_course_assignment a
      ON a.course_id = selected.course_id
      AND a.academic_year = p_academic_year
      AND a.semester = p_semester
      AND a.status = 'active'
    WHERE a.assignment_id IS NULL
  ) THEN
    RAISE EXCEPTION 'One or more selected courses are not currently offered by a teacher for this academic period' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_course_ids) AS selected(course_id)
    JOIN enrollment e ON e.course_id = selected.course_id
      AND e.student_id = p_student_id
      AND e.academic_year = p_academic_year
      AND e.semester = p_semester
  ) THEN
    RAISE EXCEPTION 'The student already has an enrollment record for one or more selected courses in this academic period' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(sum(c.credit_units), 0)::integer INTO v_total_credits
  FROM unnest(p_course_ids) AS selected(course_id)
  JOIN course c ON c.course_id = selected.course_id;
  IF v_total_credits > v_max_credits THEN
    RAISE EXCEPTION 'Selected credits exceed the configured limit of %', v_max_credits USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO course_registration_request (student_id, academic_year, semester, total_credits)
  VALUES (p_student_id, p_academic_year, p_semester, v_total_credits)
  RETURNING registration_request_id INTO v_request_id;

  INSERT INTO course_registration_item (registration_request_id, course_id, credit_units)
  SELECT v_request_id, c.course_id, COALESCE(c.credit_units, 0)
  FROM unnest(p_course_ids) AS selected(course_id)
  JOIN course c ON c.course_id = selected.course_id;

  RETURN jsonb_build_object(
    'registration_request_id', v_request_id,
    'student_id', p_student_id,
    'academic_year', p_academic_year,
    'semester', p_semester,
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
  SELECT * INTO v_request
  FROM course_registration_request
  WHERE registration_request_id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration request not found' USING ERRCODE = 'P0001';
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending registration requests can be approved' USING ERRCODE = 'P0001';
  END IF;

  SELECT class_level INTO v_class_level FROM student WHERE student_id = v_request.student_id;
  SELECT max_credits INTO v_max_credits FROM class_fee_setting WHERE class_level = v_class_level;
  SELECT COALESCE(sum(ri.credit_units), 0)::integer, count(*)::integer
    INTO v_current_credits, v_course_count
  FROM course_registration_item ri
  WHERE ri.registration_request_id = p_request_id;
  IF v_course_count = 0 OR v_current_credits > COALESCE(v_max_credits, 0) THEN
    RAISE EXCEPTION 'The request no longer satisfies the configured credit limit' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM course_registration_item ri
    LEFT JOIN teacher_course_assignment a
      ON a.course_id = ri.course_id
      AND a.academic_year = v_request.academic_year
      AND a.semester = v_request.semester
      AND a.status = 'active'
    WHERE ri.registration_request_id = p_request_id
      AND a.assignment_id IS NULL
  ) THEN
    RAISE EXCEPTION 'One or more requested courses are no longer offered by a teacher for this academic period' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM course_registration_item ri
    JOIN enrollment e ON e.course_id = ri.course_id
      AND e.student_id = v_request.student_id
      AND e.academic_year = v_request.academic_year
      AND e.semester = v_request.semester
  ) THEN
    RAISE EXCEPTION 'The student already has an enrollment record for one or more requested courses in this academic period' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO enrollment (student_id, course_id, academic_year, semester, status)
  SELECT v_request.student_id, ri.course_id, v_request.academic_year, v_request.semester, 'active'
  FROM course_registration_item ri
  WHERE ri.registration_request_id = p_request_id;

  UPDATE course_registration_request
  SET status = 'approved', reviewed_by = p_reviewer_id,
      reviewed_at = now(), review_notes = NULLIF(trim(p_review_notes), '')
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

COMMENT ON TABLE teacher_course_assignment IS 'One teacher offering of a catalog course for one academic year and semester. An active course-period may have only one teacher.';
COMMENT ON COLUMN enrollment.academic_year IS 'Academic year of this student course attempt.';
COMMENT ON COLUMN enrollment.semester IS 'Semester of this student course attempt; permits retakes in later periods.';
COMMENT ON COLUMN final_grade.academic_year IS 'Academic year represented by this final grade.';
COMMENT ON COLUMN final_grade.semester IS 'Semester represented by this final grade.';

DROP FUNCTION sms_migration_021_year(text);
DROP FUNCTION sms_migration_021_semester(text);

COMMIT;
