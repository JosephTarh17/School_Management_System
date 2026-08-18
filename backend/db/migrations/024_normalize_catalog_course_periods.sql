-- Apply after migration 023_announcements_and_notifications.sql.
-- Catalog courses are period-neutral. Academic year and semester belong to
-- teacher_course_assignment, enrollment, assessment, and final-grade records.
-- This migration preserves any legacy course period values before clearing them.

BEGIN;

ALTER TABLE course ADD COLUMN IF NOT EXISTS academic_year integer;
ALTER TABLE course ADD COLUMN IF NOT EXISTS semester text;

CREATE TABLE IF NOT EXISTS course_period_legacy_backup (
  backup_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
  academic_year integer,
  semester text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id)
);

INSERT INTO course_period_legacy_backup (course_id, academic_year, semester)
SELECT course_id, academic_year, semester
FROM course
WHERE academic_year IS NOT NULL OR semester IS NOT NULL
ON CONFLICT (course_id) DO NOTHING;

ALTER TABLE course ALTER COLUMN academic_year DROP NOT NULL;
ALTER TABLE course ALTER COLUMN semester DROP NOT NULL;

UPDATE course
SET academic_year = NULL,
    semester = NULL
WHERE academic_year IS NOT NULL OR semester IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM course
    WHERE academic_year IS NOT NULL OR semester IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Migration 024 stopped: catalog course periods were not normalized.';
  END IF;
END $$;

COMMENT ON TABLE course_period_legacy_backup IS 'Preserved legacy period values removed from period-neutral catalog courses by migration 024.';
COMMENT ON COLUMN course.academic_year IS 'Deprecated nullable compatibility field; period belongs to teacher_course_assignment.';
COMMENT ON COLUMN course.semester IS 'Deprecated nullable compatibility field; period belongs to teacher_course_assignment.';

COMMIT;
