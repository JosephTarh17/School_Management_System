-- SMS database migration 019
-- Term-aware grading workflow and report-card publication.
-- Apply manually after the existing schema migrations.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'assessment_type'::regtype AND enumlabel = 'Test') THEN
    ALTER TYPE assessment_type ADD VALUE 'Test';
  END IF;
END $$;

ALTER TABLE assessment ADD COLUMN IF NOT EXISTS term text;
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS assessment_number integer;
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS teacher_confirmed boolean NOT NULL DEFAULT false;
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL;
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL;
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS published_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_number_range') THEN
    ALTER TABLE assessment ADD CONSTRAINT assessment_number_range CHECK (assessment_number IS NULL OR assessment_number BETWEEN 1 AND 3);
  END IF;
END $$;

ALTER TABLE academic_record ADD COLUMN IF NOT EXISTS record_status text NOT NULL DEFAULT 'GRADED';
ALTER TABLE academic_record ADD COLUMN IF NOT EXISTS absence_reason text;
UPDATE academic_record SET record_status = 'PENDING' WHERE score IS NULL AND record_status = 'GRADED';
ALTER TABLE academic_record ADD COLUMN IF NOT EXISTS teacher_confirmed boolean NOT NULL DEFAULT false;
ALTER TABLE academic_record ADD COLUMN IF NOT EXISTS teacher_confirmed_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL;
ALTER TABLE academic_record ADD COLUMN IF NOT EXISTS teacher_confirmed_at timestamptz;
ALTER TABLE academic_record ADD COLUMN IF NOT EXISTS admin_reviewed boolean NOT NULL DEFAULT false;
ALTER TABLE academic_record ADD COLUMN IF NOT EXISTS admin_reviewed_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL;
ALTER TABLE academic_record ADD COLUMN IF NOT EXISTS admin_reviewed_at timestamptz;
ALTER TABLE academic_record ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL;
ALTER TABLE academic_record ADD COLUMN IF NOT EXISTS published_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_record_status_check') THEN
    ALTER TABLE academic_record ADD CONSTRAINT academic_record_status_check CHECK (record_status IN ('PENDING', 'GRADED', 'ABSENT_UNJUSTIFIED', 'ABSENT_JUSTIFIED'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_record_absence_reason_check') THEN
    ALTER TABLE academic_record ADD CONSTRAINT academic_record_absence_reason_check CHECK (record_status <> 'ABSENT_JUSTIFIED' OR char_length(trim(coalesce(absence_reason, ''))) BETWEEN 1 AND 1000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_record_status_score_check') THEN
    ALTER TABLE academic_record ADD CONSTRAINT academic_record_status_score_check CHECK ((record_status = 'PENDING' AND score IS NULL) OR (record_status = 'GRADED' AND score IS NOT NULL) OR (record_status = 'ABSENT_UNJUSTIFIED' AND score = 0) OR (record_status = 'ABSENT_JUSTIFIED' AND score IS NULL));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS report_card (
  report_card_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
  term text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'TEACHER_CONFIRMED', 'ADMIN_REVIEW', 'PUBLISHED')),
  overall_average numeric(5,2) CHECK (overall_average IS NULL OR overall_average BETWEEN 0 AND 100),
  gpa numeric(3,2) CHECK (gpa IS NULL OR gpa BETWEEN 0 AND 4),
  total_credits integer NOT NULL DEFAULT 0 CHECK (total_credits >= 0),
  earned_credits integer NOT NULL DEFAULT 0 CHECK (earned_credits >= 0),
  passed_courses integer NOT NULL DEFAULT 0 CHECK (passed_courses >= 0),
  failed_courses integer NOT NULL DEFAULT 0 CHECK (failed_courses >= 0),
  promotion_status text NOT NULL DEFAULT 'Incomplete' CHECK (promotion_status IN ('Pass', 'Fail', 'Incomplete')),
  teacher_comments text,
  administrator_comments text,
  teacher_confirmed_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  teacher_confirmed_at timestamptz,
  reviewed_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  published_by uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, term)
);

CREATE INDEX IF NOT EXISTS idx_assessment_term_course ON assessment(course_id, term, assessment_type, assessment_number);
CREATE INDEX IF NOT EXISTS idx_academic_record_workflow ON academic_record(assessment_id, teacher_confirmed, admin_reviewed, published);
CREATE INDEX IF NOT EXISTS idx_report_card_student_term ON report_card(student_id, term);
CREATE INDEX IF NOT EXISTS idx_report_card_status ON report_card(status, term);

ALTER TABLE report_card ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION set_report_card_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_report_card_updated_at ON report_card;
CREATE TRIGGER trg_report_card_updated_at
BEFORE UPDATE ON report_card
FOR EACH ROW EXECUTE FUNCTION set_report_card_updated_at();
