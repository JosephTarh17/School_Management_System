-- SMS database migration 012
-- Student course-registration requests with administrator approval.
-- Apply after migration 011_guardian_installments.sql.

CREATE TABLE IF NOT EXISTS course_registration_request (
  registration_request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
  term text NOT NULL CHECK (length(trim(term)) > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  total_credits integer NOT NULL DEFAULT 0 CHECK (total_credits >= 0),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  CHECK ((status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR status <> 'pending')
);

CREATE TABLE IF NOT EXISTS course_registration_item (
  registration_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_request_id uuid NOT NULL
    REFERENCES course_registration_request(registration_request_id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
  credit_units integer NOT NULL DEFAULT 0 CHECK (credit_units >= 0),
  UNIQUE(registration_request_id, course_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_course_registration_student_term
  ON course_registration_request(student_id, term)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_course_registration_request_student
  ON course_registration_request(student_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_registration_request_status
  ON course_registration_request(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_registration_item_request
  ON course_registration_item(registration_request_id);
CREATE INDEX IF NOT EXISTS idx_course_registration_item_course
  ON course_registration_item(course_id);

CREATE OR REPLACE FUNCTION submit_course_registration(
  p_student_id uuid,
  p_term text,
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
  IF p_student_id IS NULL OR p_term IS NULL OR length(trim(p_term)) = 0 THEN
    RAISE EXCEPTION 'Student and term are required' USING ERRCODE = 'P0001';
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
    WHERE student_id = p_student_id AND term = trim(p_term) AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending registration request already exists for this term' USING ERRCODE = 'P0001';
  END IF;

  SELECT class_level INTO v_class_level FROM student WHERE student_id = p_student_id;
  IF v_class_level IS NULL THEN
    RAISE EXCEPTION 'The student class level must be configured before registration' USING ERRCODE = 'P0001';
  END IF;

  SELECT max_credits INTO v_max_credits
  FROM class_fee_setting WHERE class_level = v_class_level;
  IF v_max_credits IS NULL OR v_max_credits <= 0 THEN
    RAISE EXCEPTION 'No positive credit limit is configured for this student class level' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_course_ids) AS selected(course_id)
    LEFT JOIN course c ON c.course_id = selected.course_id
    WHERE c.course_id IS NULL OR (c.term IS NOT NULL AND c.term <> trim(p_term))
  ) THEN
    RAISE EXCEPTION 'One or more selected courses are unavailable for this term' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_course_ids) AS selected(course_id)
    JOIN enrollment e ON e.course_id = selected.course_id
      AND e.student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'The student already has an enrollment record for one or more selected courses' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(sum(c.credit_units), 0)::integer INTO v_total_credits
  FROM unnest(p_course_ids) AS selected(course_id)
  JOIN course c ON c.course_id = selected.course_id;

  IF v_total_credits > v_max_credits THEN
    RAISE EXCEPTION 'Selected credits exceed the configured limit of %', v_max_credits USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO course_registration_request (student_id, term, total_credits)
  VALUES (p_student_id, trim(p_term), v_total_credits)
  RETURNING registration_request_id INTO v_request_id;

  INSERT INTO course_registration_item (registration_request_id, course_id, credit_units)
  SELECT v_request_id, c.course_id, COALESCE(c.credit_units, 0)
  FROM unnest(p_course_ids) AS selected(course_id)
  JOIN course c ON c.course_id = selected.course_id;

  RETURN jsonb_build_object(
    'registration_request_id', v_request_id,
    'student_id', p_student_id,
    'term', trim(p_term),
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
  FROM course_registration_item ri WHERE ri.registration_request_id = p_request_id;
  IF v_course_count = 0 OR v_current_credits > COALESCE(v_max_credits, 0) THEN
    RAISE EXCEPTION 'The request no longer satisfies the configured credit limit' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM course_registration_item ri
    JOIN course c ON c.course_id = ri.course_id
    WHERE ri.registration_request_id = p_request_id
      AND c.term IS NOT NULL AND c.term <> v_request.term
  ) THEN
    RAISE EXCEPTION 'One or more requested courses are no longer available for this term' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM course_registration_item ri
    JOIN enrollment e ON e.course_id = ri.course_id
      AND e.student_id = v_request.student_id
  ) THEN
    RAISE EXCEPTION 'The student already has an enrollment record for one or more requested courses' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO enrollment (student_id, course_id, status)
  SELECT v_request.student_id, ri.course_id, 'active'
  FROM course_registration_item ri
  WHERE ri.registration_request_id = p_request_id;

  UPDATE course_registration_request
  SET status = 'approved', reviewed_by = p_reviewer_id,
      reviewed_at = now(), review_notes = NULLIF(trim(p_review_notes), '')
  WHERE registration_request_id = p_request_id;

  RETURN jsonb_build_object(
    'registration_request_id', p_request_id,
    'student_id', v_request.student_id,
    'term', v_request.term,
    'status', 'approved',
    'total_credits', v_current_credits
  );
END;
$$;
