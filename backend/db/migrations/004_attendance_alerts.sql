-- SMS database migration 004
-- Apply after migration 003. Adds configurable attendance thresholds and alert records.

CREATE TABLE IF NOT EXISTS attendance_settings (
  setting_id integer PRIMARY KEY DEFAULT 1 CHECK (setting_id = 1),
  absence_threshold_percent numeric(5,2) NOT NULL DEFAULT 20.00 CHECK (absence_threshold_percent BETWEEN 0 AND 100),
  late_threshold_percent numeric(5,2) NOT NULL DEFAULT 20.00 CHECK (late_threshold_percent BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO attendance_settings (setting_id) VALUES (1)
ON CONFLICT (setting_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS attendance_alert (
  alert_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('absence_threshold', 'late_threshold')),
  attendance_percent numeric(5,2) NOT NULL CHECK (attendance_percent BETWEEN 0 AND 100),
  message text NOT NULL,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_alert_student_id ON attendance_alert(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_alert_acknowledged ON attendance_alert(acknowledged_at);
