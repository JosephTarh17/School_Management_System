-- Chapter 6 numeric audit: reject negative numeric values across the existing schema.
-- Safe to run after migrations 001-007.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_credit_units_nonnegative') THEN
    ALTER TABLE course ADD CONSTRAINT course_credit_units_nonnegative CHECK (credit_units IS NULL OR credit_units >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_capacity_nonnegative') THEN
    ALTER TABLE room ADD CONSTRAINT room_capacity_nonnegative CHECK (capacity IS NULL OR capacity >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessment_max_score_nonnegative') THEN
    ALTER TABLE assessment ADD CONSTRAINT assessment_max_score_nonnegative CHECK (max_score >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_record_score_nonnegative') THEN
    ALTER TABLE academic_record ADD CONSTRAINT academic_record_score_nonnegative CHECK (score IS NULL OR score >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'final_grade_gpa_range') THEN
    ALTER TABLE final_grade ADD CONSTRAINT final_grade_gpa_range CHECK (gpa IS NULL OR gpa BETWEEN 0 AND 4.00);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financial_amount_due_nonnegative') THEN
    ALTER TABLE financial_record ADD CONSTRAINT financial_amount_due_nonnegative CHECK (amount_due >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financial_amount_paid_nonnegative') THEN
    ALTER TABLE financial_record ADD CONSTRAINT financial_amount_paid_nonnegative CHECK (amount_paid >= 0 AND amount_paid <= amount_due);
  END IF;
END $$;

-- Payment amounts are strictly positive: zero and negative ledger entries are invalid.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_record_amount_positive') THEN
    ALTER TABLE payment_record ADD CONSTRAINT payment_record_amount_positive CHECK (amount > 0);
  END IF;
END $$;
