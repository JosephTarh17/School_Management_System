-- Atomic creation of a new teaching staff account, teacher profile, and staff record.
-- Apply after migration 026.

BEGIN;

CREATE OR REPLACE FUNCTION create_teacher_staff_account(
  p_email text,
  p_password_hash text,
  p_full_name text,
  p_phone text DEFAULT NULL,
  p_department text DEFAULT NULL,
  p_job_title text DEFAULT 'Teacher',
  p_employee_number text DEFAULT NULL,
  p_date_joined date DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS TABLE (user_id uuid, teacher_id uuid, staff_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  new_teacher_id uuid;
  new_staff_id uuid;
BEGIN
  IF p_email IS NULL OR char_length(btrim(p_email)) = 0 THEN
    RAISE EXCEPTION 'Email is required' USING ERRCODE = '22023';
  END IF;
  IF p_password_hash IS NULL OR char_length(p_password_hash) = 0 THEN
    RAISE EXCEPTION 'Password hash is required' USING ERRCODE = '22023';
  END IF;
  IF p_full_name IS NULL OR char_length(btrim(p_full_name)) = 0 THEN
    RAISE EXCEPTION 'Full name is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO user_account (email, password_hash, password_algorithm, role)
  VALUES (lower(btrim(p_email)), p_password_hash, 'argon2id', 'teacher')
  RETURNING user_account.user_id INTO new_user_id;

  INSERT INTO teacher (user_id, full_name, email, department)
  VALUES (new_user_id, btrim(p_full_name), lower(btrim(p_email)), NULLIF(btrim(p_department), ''))
  RETURNING teacher.teacher_id INTO new_teacher_id;

  INSERT INTO staff_member (
    user_id, teacher_id, staff_type, employee_number, full_name, email, phone,
    department, job_title, employment_status, date_joined, created_by
  )
  VALUES (
    new_user_id, new_teacher_id, 'teaching', NULLIF(btrim(p_employee_number), ''),
    btrim(p_full_name), lower(btrim(p_email)), NULLIF(btrim(p_phone), ''),
    NULLIF(btrim(p_department), ''), COALESCE(NULLIF(btrim(p_job_title), ''), 'Teacher'),
    'active', p_date_joined, p_created_by
  )
  RETURNING staff_member.staff_id INTO new_staff_id;

  RETURN QUERY SELECT new_user_id, new_teacher_id, new_staff_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'A user email, employee number, teacher profile, or staff record already exists' USING ERRCODE = '23505';
END;
$$;

REVOKE ALL ON FUNCTION create_teacher_staff_account(text, text, text, text, text, text, text, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_teacher_staff_account(text, text, text, text, text, text, text, date, uuid) TO service_role;

COMMENT ON FUNCTION create_teacher_staff_account(text, text, text, text, text, text, text, date, uuid)
IS 'Atomically creates a new teacher login, teacher profile, and linked teaching staff record. Backend service-role only.';

COMMIT;
