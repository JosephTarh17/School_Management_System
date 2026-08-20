-- Guardian Implementation 3 engagement workflows.
-- Apply after migration 029_account_lifecycle_security.sql.

BEGIN;

ALTER TABLE guardian
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE behavior_incident
  ADD COLUMN IF NOT EXISTS guardian_visible boolean NOT NULL DEFAULT false;

ALTER TABLE behavior_incident
  ADD COLUMN IF NOT EXISTS guardian_acknowledgement_required boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS guardian_communication_request (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES guardian(guardian_id) ON DELETE RESTRICT,
  student_id uuid REFERENCES student(student_id) ON DELETE RESTRICT,
  category text NOT NULL CHECK (category IN ('Academic', 'Attendance', 'Behavior', 'Finance', 'Appointment', 'General')),
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 1 AND 200),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'In Review', 'Responded', 'Closed', 'Rejected', 'Cancelled', 'Archived')),
  administrator_response text CHECK (administrator_response IS NULL OR char_length(administrator_response) <= 4000),
  response_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  response_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guardian_communication_owner_idx
  ON guardian_communication_request(guardian_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS guardian_communication_student_idx
  ON guardian_communication_request(student_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS guardian_appointment_request (
  appointment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES guardian(guardian_id) ON DELETE RESTRICT,
  student_id uuid REFERENCES student(student_id) ON DELETE RESTRICT,
  purpose text NOT NULL CHECK (char_length(btrim(purpose)) BETWEEN 1 AND 2000),
  preferred_start_at timestamptz NOT NULL,
  preferred_end_at timestamptz NOT NULL,
  proposed_start_at timestamptz,
  proposed_end_at timestamptz,
  status text NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested', 'Proposed', 'Confirmed', 'Completed', 'Declined', 'Cancelled', 'Reschedule Requested', 'No Show')),
  administrator_note text CHECK (administrator_note IS NULL OR char_length(administrator_note) <= 2000),
  decision_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  decision_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (preferred_end_at > preferred_start_at),
  CHECK (proposed_end_at IS NULL OR proposed_start_at IS NOT NULL),
  CHECK (proposed_start_at IS NULL OR proposed_end_at > proposed_start_at)
);

CREATE INDEX IF NOT EXISTS guardian_appointment_owner_idx
  ON guardian_appointment_request(guardian_id, status, preferred_start_at);
CREATE INDEX IF NOT EXISTS guardian_appointment_student_idx
  ON guardian_appointment_request(student_id, status, preferred_start_at);

CREATE TABLE IF NOT EXISTS guardian_document (
  document_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description text CHECK (description IS NULL OR char_length(description) <= 4000),
  document_url text NOT NULL CHECK (char_length(btrim(document_url)) BETWEEN 1 AND 1000),
  student_id uuid REFERENCES student(student_id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  consent_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Archived')),
  effective_from date,
  effective_to date,
  created_by uuid NOT NULL REFERENCES user_account(user_id) ON DELETE RESTRICT,
  published_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),
  CHECK (status <> 'Published' OR published_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS guardian_document_visibility_idx
  ON guardian_document(status, student_id, effective_from, effective_to);

CREATE TABLE IF NOT EXISTS guardian_document_response (
  response_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES guardian_document(document_id) ON DELETE RESTRICT,
  guardian_id uuid NOT NULL REFERENCES guardian(guardian_id) ON DELETE RESTRICT,
  student_id uuid REFERENCES student(student_id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('Accepted', 'Declined', 'Needs Clarification')),
  response_note text CHECK (response_note IS NULL OR char_length(response_note) <= 2000),
  responded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS guardian_document_response_scope_idx
  ON guardian_document_response(document_id, guardian_id, (COALESCE(student_id, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE INDEX IF NOT EXISTS guardian_document_response_review_idx
  ON guardian_document_response(document_id, decision, responded_at DESC);

CREATE TABLE IF NOT EXISTS guardian_disciplinary_acknowledgement (
  acknowledgement_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES behavior_incident(incident_id) ON DELETE RESTRICT,
  guardian_id uuid NOT NULL REFERENCES guardian(guardian_id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES student(student_id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Acknowledged')),
  response_note text CHECK (response_note IS NULL OR char_length(response_note) <= 2000),
  acknowledged_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(incident_id, guardian_id)
);

CREATE INDEX IF NOT EXISTS guardian_discipline_ack_review_idx
  ON guardian_disciplinary_acknowledgement(incident_id, status);
CREATE INDEX IF NOT EXISTS guardian_discipline_ack_guardian_idx
  ON guardian_disciplinary_acknowledgement(guardian_id, status);

CREATE TABLE IF NOT EXISTS guardian_profile_change_request (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES guardian(guardian_id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL REFERENCES user_account(user_id) ON DELETE RESTRICT,
  proposed_full_name text CHECK (proposed_full_name IS NULL OR char_length(btrim(proposed_full_name)) BETWEEN 1 AND 160),
  proposed_email text CHECK (proposed_email IS NULL OR char_length(btrim(proposed_email)) BETWEEN 3 AND 320),
  proposed_phone text CHECK (proposed_phone IS NULL OR char_length(btrim(proposed_phone)) <= 40),
  proposed_address text CHECK (proposed_address IS NULL OR char_length(btrim(proposed_address)) <= 300),
  proposed_relationship text CHECK (proposed_relationship IS NULL OR char_length(btrim(proposed_relationship)) <= 80),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 1000),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Withdrawn')),
  decision_note text CHECK (decision_note IS NULL OR char_length(decision_note) <= 1000),
  decision_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  decision_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (proposed_full_name IS NOT NULL OR proposed_email IS NOT NULL OR proposed_phone IS NOT NULL OR proposed_address IS NOT NULL OR proposed_relationship IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS guardian_profile_change_owner_idx
  ON guardian_profile_change_request(guardian_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS guardian_profile_change_review_idx
  ON guardian_profile_change_request(status, created_at DESC);

COMMIT;
