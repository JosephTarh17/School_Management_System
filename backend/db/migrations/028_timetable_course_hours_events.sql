-- SMS database migration 028
-- Semester timetable, course-hour allocations, teacher absence reports,
-- student absence justification deadlines, and administrator-managed school events.
-- Apply after migration 027.

CREATE TABLE IF NOT EXISTS course_hour_allocation (
  allocation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES teacher_course_assignment(assignment_id) ON DELETE RESTRICT,
  course_id uuid NOT NULL REFERENCES course(course_id) ON DELETE RESTRICT,
  teacher_id uuid NOT NULL REFERENCES teacher(teacher_id) ON DELETE RESTRICT,
  academic_year integer NOT NULL CHECK (academic_year BETWEEN 2000 AND 9999),
  semester text NOT NULL CHECK (semester IN ('Semester 1', 'Semester 2')),
  approved_hours numeric(8,2) NOT NULL CHECK (approved_hours >= 0),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived', 'Superseded')),
  created_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  updated_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, academic_year, semester)
);

CREATE TABLE IF NOT EXISTS course_hour_allocation_revision (
  revision_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id uuid NOT NULL REFERENCES course_hour_allocation(allocation_id) ON DELETE CASCADE,
  previous_hours numeric(8,2),
  new_hours numeric(8,2),
  action text NOT NULL CHECK (action IN ('Created', 'Updated', 'Archived', 'Restored', 'Reduced', 'Increased')),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 1000),
  changed_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timetable_entry (
  timetable_entry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id uuid NOT NULL REFERENCES course_hour_allocation(allocation_id) ON DELETE RESTRICT,
  assignment_id uuid NOT NULL REFERENCES teacher_course_assignment(assignment_id) ON DELETE RESTRICT,
  course_id uuid NOT NULL REFERENCES course(course_id) ON DELETE RESTRICT,
  teacher_id uuid NOT NULL REFERENCES teacher(teacher_id) ON DELETE RESTRICT,
  room_id uuid NOT NULL REFERENCES room(room_id) ON DELETE RESTRICT,
  academic_year integer NOT NULL CHECK (academic_year BETWEEN 2000 AND 9999),
  semester text NOT NULL CHECK (semester IN ('Semester 1', 'Semester 2')),
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_local_time time NOT NULL,
  end_local_time time NOT NULL,
  effective_from date NOT NULL,
  effective_to date NOT NULL,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Suspended', 'Cancelled', 'Archived')),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  change_reason text CHECK (change_reason IS NULL OR char_length(change_reason) <= 1000),
  created_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  updated_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_local_time < end_local_time),
  CHECK (effective_from <= effective_to)
);

CREATE TABLE IF NOT EXISTS timetable_occurrence (
  occurrence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_entry_id uuid NOT NULL REFERENCES timetable_entry(timetable_entry_id) ON DELETE RESTRICT,
  allocation_id uuid NOT NULL REFERENCES course_hour_allocation(allocation_id) ON DELETE RESTRICT,
  assignment_id uuid NOT NULL REFERENCES teacher_course_assignment(assignment_id) ON DELETE RESTRICT,
  course_id uuid NOT NULL REFERENCES course(course_id) ON DELETE RESTRICT,
  teacher_id uuid NOT NULL REFERENCES teacher(teacher_id) ON DELETE RESTRICT,
  room_id uuid NOT NULL REFERENCES room(room_id) ON DELETE RESTRICT,
  occurrence_date date NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  planned_minutes integer NOT NULL CHECK (planned_minutes > 0),
  status text NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Pending Teacher Absence', 'Completed', 'No Attendance', 'Cancelled', 'Voided', 'Unfunded', 'Requires Review')),
  class_session_id uuid REFERENCES class_session(session_id) ON DELETE SET NULL,
  completion_actor uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  completed_at timestamptz,
  void_reason text CHECK (void_reason IS NULL OR char_length(void_reason) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(timetable_entry_id, occurrence_date),
  CHECK (start_at < end_at)
);

ALTER TABLE class_session ADD COLUMN IF NOT EXISTS timetable_occurrence_id uuid REFERENCES timetable_occurrence(occurrence_id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_class_session_timetable_occurrence
  ON class_session(timetable_occurrence_id)
  WHERE timetable_occurrence_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS teacher_absence_report (
  absence_report_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES timetable_occurrence(occurrence_id) ON DELETE RESTRICT,
  teacher_id uuid NOT NULL REFERENCES teacher(teacher_id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 1000),
  replacement_requested boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  review_notes text CHECK (review_notes IS NULL OR char_length(review_notes) <= 1000),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  UNIQUE(occurrence_id)
);

CREATE TABLE IF NOT EXISTS absence_policy_setting (
  setting_id smallint PRIMARY KEY CHECK (setting_id = 1),
  justification_deadline_days integer NOT NULL DEFAULT 3 CHECK (justification_deadline_days BETWEEN 1 AND 30),
  updated_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO absence_policy_setting (setting_id, justification_deadline_days)
VALUES (1, 3)
ON CONFLICT (setting_id) DO NOTHING;

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS justification_status text NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS justification_text text;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS justification_submitted_at timestamptz;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS justification_deadline_at timestamptz;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS justification_reviewed_at timestamptz;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS justification_reviewed_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS justification_review_note text;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS expired_notified_at timestamptz;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_justification_status_check') THEN
    ALTER TABLE attendance ADD CONSTRAINT attendance_justification_status_check
      CHECK (justification_status IN ('NOT_REQUIRED', 'PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'UNJUSTIFIED'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_attendance_justification_deadline
  ON attendance(justification_status, justification_deadline_at)
  WHERE justification_status IN ('PENDING', 'SUBMITTED');

CREATE TABLE IF NOT EXISTS school_event (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 5000),
  category text NOT NULL CHECK (category IN ('Meeting', 'Deadline', 'Examination', 'Holiday', 'Orientation', 'Registration', 'General')),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  location text,
  online_url text,
  academic_year integer CHECK (academic_year IS NULL OR academic_year BETWEEN 2000 AND 9999),
  semester text CHECK (semester IS NULL OR semester IN ('Semester 1', 'Semester 2')),
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Cancelled', 'Archived')),
  audience text NOT NULL CHECK (audience IN ('Everyone', 'Teachers', 'Students', 'Guardians', 'Course', 'Class Group')),
  audience_id uuid,
  notify_on_publish boolean NOT NULL DEFAULT true,
  notify_on_change boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  updated_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  published_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_at < end_at),
  CHECK ((audience IN ('Course', 'Class Group') AND audience_id IS NOT NULL) OR (audience NOT IN ('Course', 'Class Group')))
);

CREATE INDEX IF NOT EXISTS idx_timetable_occurrence_scope
  ON timetable_occurrence(timetable_entry_id, occurrence_date, status);
CREATE INDEX IF NOT EXISTS idx_timetable_occurrence_teacher_time
  ON timetable_occurrence(teacher_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_timetable_occurrence_room_time
  ON timetable_occurrence(room_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_timetable_entry_period_status
  ON timetable_entry(academic_year, semester, status);
CREATE INDEX IF NOT EXISTS idx_school_event_period_time
  ON school_event(academic_year, semester, start_at, status);

CREATE OR REPLACE FUNCTION set_timetable_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_hour_allocation_updated_at ON course_hour_allocation;
CREATE TRIGGER trg_course_hour_allocation_updated_at BEFORE UPDATE ON course_hour_allocation
FOR EACH ROW EXECUTE FUNCTION set_timetable_updated_at();
DROP TRIGGER IF EXISTS trg_timetable_entry_updated_at ON timetable_entry;
CREATE TRIGGER trg_timetable_entry_updated_at BEFORE UPDATE ON timetable_entry
FOR EACH ROW EXECUTE FUNCTION set_timetable_updated_at();
DROP TRIGGER IF EXISTS trg_timetable_occurrence_updated_at ON timetable_occurrence;
CREATE TRIGGER trg_timetable_occurrence_updated_at BEFORE UPDATE ON timetable_occurrence
FOR EACH ROW EXECUTE FUNCTION set_timetable_updated_at();
DROP TRIGGER IF EXISTS trg_school_event_updated_at ON school_event;
CREATE TRIGGER trg_school_event_updated_at BEFORE UPDATE ON school_event
FOR EACH ROW EXECUTE FUNCTION set_timetable_updated_at();

CREATE TABLE IF NOT EXISTS timetable_hour_request (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id uuid NOT NULL REFERENCES course_hour_allocation(allocation_id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL REFERENCES user_account(user_id) ON DELETE RESTRICT,
  requested_hours numeric(8,2) NOT NULL CHECK (requested_hours > 0),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 1000),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  review_note text,
  reviewed_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_timetable_hour_request_status ON timetable_hour_request(status, requested_at);
