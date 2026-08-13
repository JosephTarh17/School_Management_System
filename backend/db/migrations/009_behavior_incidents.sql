-- Chapter 7: Behavior and Discipline
-- Apply after migrations 001-008.

CREATE TABLE IF NOT EXISTS behavior_incident (
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

CREATE INDEX IF NOT EXISTS idx_behavior_incident_student_date ON behavior_incident(student_id, incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_incident_reporter ON behavior_incident(reported_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_incident_status ON behavior_incident(status);

ALTER TABLE behavior_incident ENABLE ROW LEVEL SECURITY;

-- This function is intentionally self-contained. It does not depend on any
-- helper function from earlier migrations.
CREATE OR REPLACE FUNCTION set_behavior_incident_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_behavior_incident_updated_at ON behavior_incident;
CREATE TRIGGER set_behavior_incident_updated_at
BEFORE UPDATE ON behavior_incident
FOR EACH ROW EXECUTE FUNCTION set_behavior_incident_updated_at();
