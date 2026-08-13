-- SMS database migration 007
-- Administrator-configured university class fees and credit limits.
-- Course-registration and per-course billing remain intentionally deferred.

CREATE TABLE IF NOT EXISTS class_fee_setting (
  class_fee_setting_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_level text NOT NULL UNIQUE CHECK (class_level IN ('Freshman', 'Sophomore', 'Junior')),
  fee_xaf numeric(12,2) NOT NULL DEFAULT 0 CHECK (fee_xaf >= 0),
  max_credits integer NOT NULL DEFAULT 0 CHECK (max_credits >= 0),
  updated_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO class_fee_setting (class_level, fee_xaf, max_credits)
VALUES
  ('Freshman', 0, 0),
  ('Sophomore', 0, 0),
  ('Junior', 0, 0)
ON CONFLICT (class_level) DO NOTHING;

ALTER TABLE student ADD COLUMN IF NOT EXISTS class_level text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_class_level_valid') THEN
    ALTER TABLE student ADD CONSTRAINT student_class_level_valid CHECK (class_level IS NULL OR class_level IN ('Freshman', 'Sophomore', 'Junior'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_class_level ON student(class_level);
