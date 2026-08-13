-- Supabase/PostgreSQL schema generated from the SMS Mermaid ERD
-- Paste this into Supabase SQL Editor to create the tables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('student', 'teacher', 'guardian', 'administrator');
CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Late', 'Excused');
CREATE TYPE assessment_type AS ENUM ('Quiz', 'Assignment', 'Midterm', 'Final');
CREATE TYPE participation_rating AS ENUM ('Active', 'Moderate', 'Passive', 'Disruptive');
CREATE TYPE payment_status AS ENUM ('Pending', 'Partial', 'Paid', 'Overdue', 'Waived', 'Cancelled');

CREATE TABLE user_account (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text,
  role user_role NOT NULL,
  mfa_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login timestamptz
);

CREATE TABLE student (
  student_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES user_account(user_id) ON DELETE CASCADE,
  full_name text NOT NULL,
  class_level text CHECK (class_level IS NULL OR class_level IN ('Freshman', 'Sophomore', 'Junior')),
  dob date,
  phone text,
  address text
);

CREATE TABLE class_fee_setting (
  class_fee_setting_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_level text NOT NULL UNIQUE CHECK (class_level IN ('Freshman', 'Sophomore', 'Junior')),
  fee_xaf numeric(12,2) NOT NULL DEFAULT 0 CHECK (fee_xaf >= 0),
  max_credits integer NOT NULL DEFAULT 0 CHECK (max_credits >= 0),
  updated_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO class_fee_setting (class_level, fee_xaf, max_credits)
VALUES ('Freshman', 0, 0), ('Sophomore', 0, 0), ('Junior', 0, 0)
ON CONFLICT (class_level) DO NOTHING;

CREATE TABLE guardian (
  guardian_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES user_account(user_id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  relationship text
);

CREATE TABLE administrator (
  administrator_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES user_account(user_id) ON DELETE CASCADE,
  full_name text NOT NULL,
  department text
);

CREATE TABLE teacher (
  teacher_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES user_account(user_id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  department text
);

CREATE TABLE student_guardian (
  student_guardian_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL REFERENCES guardian(guardian_id) ON DELETE CASCADE,
  primary_contact boolean NOT NULL DEFAULT false,
  UNIQUE(student_id, guardian_id)
);

CREATE TABLE course (
  course_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name text NOT NULL,
  course_code text NOT NULL UNIQUE,
  term text,
  credit_units integer CHECK (credit_units IS NULL OR credit_units >= 0)
);

CREATE TABLE room (
  room_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name text NOT NULL UNIQUE,
  location text,
  capacity integer CHECK (capacity IS NULL OR capacity >= 0)
);

CREATE TABLE class_session (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teacher(teacher_id) ON DELETE SET NULL,
  room_id uuid NOT NULL REFERENCES room(room_id) ON DELETE SET NULL,
  substitute_teacher_id uuid REFERENCES teacher(teacher_id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  recurrence_pattern text,
  CHECK (start_time < end_time)
);

CREATE TABLE assessment (
  assessment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
  title text NOT NULL,
  assessment_type assessment_type NOT NULL,
  max_score numeric(6,2) NOT NULL DEFAULT 100.00 CHECK (max_score >= 0),
  weight numeric(5,2) NOT NULL CHECK (weight BETWEEN 0 AND 100),
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE academic_record (
  record_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE,
  score numeric(6,2) CHECK (score IS NULL OR score >= 0),
  grade text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, assessment_id)
);

CREATE TABLE final_grade (
  final_grade_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
  computed_score numeric(6,2) CHECK (computed_score IS NULL OR computed_score BETWEEN 0 AND 100),
  letter_grade text,
  gpa numeric(3,2) CHECK (gpa IS NULL OR gpa BETWEEN 0 AND 4.00),
  UNIQUE(student_id, course_id)
);

CREATE TABLE participation_log (
  participation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES class_session(session_id) ON DELETE CASCADE,
  rating participation_rating NOT NULL,
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE behavior_incident (
  incident_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES user_account(user_id) ON DELETE RESTRICT,
  incident_type text NOT NULL CHECK (incident_type IN ('Academic', 'Attendance', 'Conduct', 'Safety', 'Other')),
  severity text NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  incident_date date NOT NULL,
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 1000),
  action_taken text CHECK (action_taken IS NULL OR char_length(action_taken) <= 1000),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Under review', 'Resolved', 'Dismissed')),
  resolution_notes text CHECK (resolution_notes IS NULL OR char_length(resolution_notes) <= 1000),
  points numeric(6,2) NOT NULL DEFAULT 0 CHECK (points BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status NOT IN ('Resolved', 'Dismissed') OR COALESCE(NULLIF(btrim(resolution_notes), ''), NULLIF(btrim(action_taken), '')) IS NOT NULL)
);

CREATE TABLE attendance (
  attendance_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES class_session(session_id) ON DELETE CASCADE,
  session_date date NOT NULL,
  status attendance_status NOT NULL,
  UNIQUE(student_id, session_id, session_date)
);

CREATE TABLE financial_record (
  invoice_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
  amount_due numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (amount_due >= 0),
  amount_paid numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0 AND amount_paid <= amount_due),
  balance_due numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (balance_due >= 0),
  payment_status payment_status NOT NULL DEFAULT 'Pending',
  due_date date,
  last_payment_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payment_record (
  payment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES financial_record(invoice_id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('Cash', 'Bank transfer', 'Mobile money - manual', 'Other')),
  receipt_number text NOT NULL UNIQUE,
  payment_reference text,
  notes text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid NOT NULL REFERENCES user_account(user_id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Optional indexes for common join queries
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_session_id ON attendance(session_id);
CREATE INDEX idx_academic_record_student_id ON academic_record(student_id);
CREATE INDEX idx_participation_log_student_id ON participation_log(student_id);
CREATE INDEX idx_participation_log_session_id ON participation_log(session_id);
CREATE INDEX idx_class_session_course_id ON class_session(course_id);
CREATE INDEX idx_class_session_teacher_id ON class_session(teacher_id);
