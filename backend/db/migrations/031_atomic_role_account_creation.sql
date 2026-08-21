-- Atomically create non-teaching role accounts and their required profile records.
-- Apply after migration 030.
BEGIN;

CREATE OR REPLACE FUNCTION create_role_account_with_profile(
  p_email text,
  p_password_hash text,
  p_role user_role,
  p_full_name text,
  p_class_level text DEFAULT NULL,
  p_dob date DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_relationship text DEFAULT NULL,
  p_department text DEFAULT NULL
)
RETURNS TABLE (user_id uuid, profile_id uuid, role user_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  new_profile_id uuid;
  normalized_email text := lower(btrim(p_email));
  normalized_name text := btrim(p_full_name);
BEGIN
  IF p_role NOT IN ('student', 'guardian', 'administrator') THEN
    RAISE EXCEPTION 'Only student, guardian, or administrator accounts may be created by this function' USING ERRCODE = '22023';
  END IF;
  IF normalized_email IS NULL OR char_length(normalized_email) = 0 THEN
    RAISE EXCEPTION 'Email is required' USING ERRCODE = '22023';
  END IF;
  IF p_password_hash IS NULL OR char_length(p_password_hash) = 0 THEN
    RAISE EXCEPTION 'Password hash is required' USING ERRCODE = '22023';
  END IF;
  IF normalized_name IS NULL OR char_length(normalized_name) = 0 THEN
    RAISE EXCEPTION 'Full name is required' USING ERRCODE = '22023';
  END IF;
  IF p_role = 'student' AND p_class_level IS NOT NULL AND p_class_level NOT IN ('Freshman', 'Sophomore', 'Junior') THEN
    RAISE EXCEPTION 'class_level must be Freshman, Sophomore, or Junior' USING ERRCODE = '22023';
  END IF;

  INSERT INTO user_account (email, password_hash, password_algorithm, role, must_change_password)
  VALUES (normalized_email, p_password_hash, 'argon2id', p_role, true)
  RETURNING user_account.user_id INTO new_user_id;

  IF p_role = 'student' THEN
    INSERT INTO student (user_id, full_name, class_level, dob, phone, address)
    VALUES (new_user_id, normalized_name, NULLIF(btrim(p_class_level), ''), p_dob, NULLIF(btrim(p_phone), ''), NULLIF(btrim(p_address), ''))
    RETURNING student.student_id INTO new_profile_id;
  ELSIF p_role = 'guardian' THEN
    INSERT INTO guardian (user_id, full_name, email, phone, relationship)
    VALUES (new_user_id, normalized_name, normalized_email, NULLIF(btrim(p_phone), ''), NULLIF(btrim(p_relationship), ''))
    RETURNING guardian.guardian_id INTO new_profile_id;
  ELSE
    INSERT INTO administrator (user_id, full_name, department)
    VALUES (new_user_id, normalized_name, NULLIF(btrim(p_department), ''))
    RETURNING administrator.administrator_id INTO new_profile_id;
  END IF;

  RETURN QUERY SELECT new_user_id, new_profile_id, p_role;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'An account or linked profile with the supplied identity already exists' USING ERRCODE = '23505';
END;
$$;

REVOKE ALL ON FUNCTION create_role_account_with_profile(text, text, user_role, text, text, date, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_role_account_with_profile(text, text, user_role, text, text, date, text, text, text, text) TO service_role;
COMMENT ON FUNCTION create_role_account_with_profile(text, text, user_role, text, text, date, text, text, text, text)
IS 'Atomically creates a Student, Guardian, or Administrator login and its linked profile. Backend service-role only.';

COMMIT;
