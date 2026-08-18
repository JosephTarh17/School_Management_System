-- Staff tracking: teaching and non-teaching staff, attendance, and leave.
-- Apply after migration 025.

BEGIN;

CREATE TABLE IF NOT EXISTS staff_member (
  staff_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES user_account(user_id) ON DELETE SET NULL,
  teacher_id uuid UNIQUE REFERENCES teacher(teacher_id) ON DELETE RESTRICT,
  staff_type text NOT NULL CHECK (staff_type IN ('teaching', 'non_teaching')),
  employee_number text,
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 1 AND 160),
  email text,
  phone text,
  department text,
  job_title text NOT NULL CHECK (char_length(btrim(job_title)) BETWEEN 1 AND 120),
  employment_status text NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active', 'on_leave', 'inactive', 'terminated')),
  date_joined date,
  date_left date,
  created_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (date_left IS NULL OR date_joined IS NULL OR date_left >= date_joined),
  CHECK ((staff_type = 'teaching' AND teacher_id IS NOT NULL) OR (staff_type = 'non_teaching' AND teacher_id IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_member_employee_number_lower
  ON staff_member (lower(employee_number))
  WHERE employee_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_member_type_status
  ON staff_member (staff_type, employment_status);
CREATE INDEX IF NOT EXISTS idx_staff_member_department
  ON staff_member (department);
CREATE INDEX IF NOT EXISTS idx_staff_member_teacher_id
  ON staff_member (teacher_id);

CREATE TABLE IF NOT EXISTS staff_attendance (
  staff_attendance_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff_member(staff_id) ON DELETE RESTRICT,
  attendance_date date NOT NULL,
  attendance_status text NOT NULL CHECK (attendance_status IN ('Present', 'Absent', 'Late', 'Excused', 'On Leave')),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  recorded_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_date
  ON staff_attendance (attendance_date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date
  ON staff_attendance (staff_id, attendance_date);

CREATE TABLE IF NOT EXISTS staff_leave_request (
  leave_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff_member(staff_id) ON DELETE RESTRICT,
  leave_type text NOT NULL CHECK (leave_type IN ('Annual', 'Sick', 'Maternity', 'Study', 'Emergency', 'Other')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 1000),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  reviewed_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text CHECK (review_notes IS NULL OR char_length(review_notes) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS idx_staff_leave_staff_dates
  ON staff_leave_request (staff_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_staff_leave_status
  ON staff_leave_request (status, start_date);

CREATE OR REPLACE FUNCTION set_staff_tracking_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_member_updated_at ON staff_member;
CREATE TRIGGER trg_staff_member_updated_at
BEFORE UPDATE ON staff_member
FOR EACH ROW EXECUTE FUNCTION set_staff_tracking_updated_at();

DROP TRIGGER IF EXISTS trg_staff_attendance_updated_at ON staff_attendance;
CREATE TRIGGER trg_staff_attendance_updated_at
BEFORE UPDATE ON staff_attendance
FOR EACH ROW EXECUTE FUNCTION set_staff_tracking_updated_at();

DROP TRIGGER IF EXISTS trg_staff_leave_updated_at ON staff_leave_request;
CREATE TRIGGER trg_staff_leave_updated_at
BEFORE UPDATE ON staff_leave_request
FOR EACH ROW EXECUTE FUNCTION set_staff_tracking_updated_at();

-- Existing teachers become teaching staff records without creating duplicate user accounts.
INSERT INTO staff_member (
  user_id, teacher_id, staff_type, full_name, email, department, job_title, employment_status
)
SELECT t.user_id, t.teacher_id, 'teaching', t.full_name, t.email, t.department, 'Teacher', 'active'
FROM teacher t
ON CONFLICT (teacher_id) DO NOTHING;

-- Keep the tables protected from direct browser access. The Express backend uses service-role access.
ALTER TABLE staff_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_leave_request ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE staff_member IS 'Administrator-managed directory for teaching and non-teaching staff. Existing teachers are linked through teacher_id.';
COMMENT ON TABLE staff_attendance IS 'One attendance record per staff member and date.';
COMMENT ON TABLE staff_leave_request IS 'Staff leave requests and administrator review state.';
COMMENT ON COLUMN staff_member.teacher_id IS 'Non-null only for teaching staff; links to the existing teacher profile without duplicating the account.';

COMMIT;
