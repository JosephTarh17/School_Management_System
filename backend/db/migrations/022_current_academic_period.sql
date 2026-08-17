-- Current academic period controlled by administrators.
-- Apply after migrations 020 and 021.

BEGIN;

CREATE TABLE IF NOT EXISTS academic_period_settings (
  setting_id smallint PRIMARY KEY CHECK (setting_id = 1),
  academic_year integer NOT NULL CHECK (academic_year BETWEEN 2000 AND 9999),
  semester text NOT NULL CHECK (semester IN ('Semester 1', 'Semester 2')),
  updated_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO academic_period_settings (setting_id, academic_year, semester)
VALUES (1, 2026, 'Semester 1')
ON CONFLICT (setting_id) DO NOTHING;

ALTER TABLE academic_period_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE academic_period_settings IS 'Singleton administrator-controlled current academic year and semester used as the default for active workflows.';
COMMENT ON COLUMN academic_period_settings.academic_year IS 'Current academic year, for example 2026.';
COMMENT ON COLUMN academic_period_settings.semester IS 'Current semester: Semester 1 or Semester 2.';

COMMIT;
