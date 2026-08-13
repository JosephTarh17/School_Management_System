-- SMS database migration 005
-- Apply after migration 004. Enforces inclusive 0–100 bounds for percentage fields.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_weight_percent_range') THEN
    ALTER TABLE assessment ADD CONSTRAINT assessment_weight_percent_range CHECK (weight BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'final_grade_computed_score_percent_range') THEN
    ALTER TABLE final_grade ADD CONSTRAINT final_grade_computed_score_percent_range CHECK (computed_score IS NULL OR computed_score BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_settings_percent_range') THEN
    ALTER TABLE attendance_settings ADD CONSTRAINT attendance_settings_percent_range CHECK (absence_threshold_percent BETWEEN 0 AND 100 AND late_threshold_percent BETWEEN 0 AND 100);
  END IF;
END $$;
