-- SMS database migration 016
-- Whole-number XAF amounts and severity-derived behavior points.
-- Apply after migrations 001-015 (including any local deployment migration 015).

-- Do not silently round legacy monetary data. Stop and require review if any
-- existing XAF amount contains a fractional unit.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM financial_record WHERE amount_due <> trunc(amount_due) OR amount_paid <> trunc(amount_paid) OR balance_due <> trunc(balance_due)) THEN
    RAISE EXCEPTION 'Fractional XAF values exist in financial_record; review them before applying migration 016' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM financial_record WHERE amount_due <= 0) THEN
    RAISE EXCEPTION 'Zero-value invoices exist in financial_record; review them before applying migration 016' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM payment_record WHERE amount <> trunc(amount)) THEN
    RAISE EXCEPTION 'Fractional XAF values exist in payment_record; review them before applying migration 016' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM fee_installment WHERE amount_due <> trunc(amount_due) OR amount_paid <> trunc(amount_paid) OR balance_due <> trunc(balance_due)) THEN
    RAISE EXCEPTION 'Fractional XAF values exist in fee_installment; review them before applying migration 016' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM class_fee_setting WHERE fee_xaf <> trunc(fee_xaf)) THEN
    RAISE EXCEPTION 'Fractional XAF values exist in class_fee_setting; review them before applying migration 016' USING ERRCODE = 'P0001';
  END IF;
END $$;

-- PostgreSQL will not alter a column referenced by a trigger definition.
-- Temporarily remove finance triggers that reference the amount columns, then
-- recreate them after the scale-zero conversions complete.
DROP TRIGGER IF EXISTS trg_fee_installment_status ON fee_installment;
DROP TRIGGER IF EXISTS trg_fee_installment_schedule_total ON fee_installment;
DROP TRIGGER IF EXISTS trg_sync_fee_installment_from_payments ON payment_record;
DROP TRIGGER IF EXISTS trg_refresh_invoice_totals_from_payments ON payment_record;

ALTER TABLE financial_record ALTER COLUMN amount_due DROP DEFAULT;
ALTER TABLE financial_record ALTER COLUMN amount_paid DROP DEFAULT;
ALTER TABLE financial_record ALTER COLUMN balance_due DROP DEFAULT;
ALTER TABLE payment_record ALTER COLUMN amount DROP DEFAULT;
ALTER TABLE fee_installment ALTER COLUMN amount_due DROP DEFAULT;
ALTER TABLE fee_installment ALTER COLUMN amount_paid DROP DEFAULT;
ALTER TABLE fee_installment ALTER COLUMN balance_due DROP DEFAULT;
ALTER TABLE class_fee_setting ALTER COLUMN fee_xaf DROP DEFAULT;

ALTER TABLE financial_record ALTER COLUMN amount_due TYPE numeric(12,0) USING amount_due::numeric(12,0);
ALTER TABLE financial_record ALTER COLUMN amount_paid TYPE numeric(12,0) USING amount_paid::numeric(12,0);
ALTER TABLE financial_record ALTER COLUMN balance_due TYPE numeric(12,0) USING balance_due::numeric(12,0);
ALTER TABLE payment_record ALTER COLUMN amount TYPE numeric(12,0) USING amount::numeric(12,0);
ALTER TABLE fee_installment ALTER COLUMN amount_due TYPE numeric(12,0) USING amount_due::numeric(12,0);
ALTER TABLE fee_installment ALTER COLUMN amount_paid TYPE numeric(12,0) USING amount_paid::numeric(12,0);
ALTER TABLE fee_installment ALTER COLUMN balance_due TYPE numeric(12,0) USING balance_due::numeric(12,0);
ALTER TABLE class_fee_setting ALTER COLUMN fee_xaf TYPE numeric(12,0) USING fee_xaf::numeric(12,0);

ALTER TABLE financial_record ALTER COLUMN amount_paid SET DEFAULT 0;
ALTER TABLE financial_record ALTER COLUMN balance_due SET DEFAULT 0;
ALTER TABLE fee_installment ALTER COLUMN amount_paid SET DEFAULT 0;
ALTER TABLE fee_installment ALTER COLUMN balance_due SET DEFAULT 0;
ALTER TABLE class_fee_setting ALTER COLUMN fee_xaf SET DEFAULT 0;

-- Restore the installment status trigger removed above.
CREATE OR REPLACE FUNCTION refresh_fee_installment_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.balance_due = NEW.amount_due - NEW.amount_paid;
  NEW.status = CASE
    WHEN NEW.amount_paid >= NEW.amount_due THEN 'Paid'
    WHEN NEW.amount_paid > 0 THEN 'Partial'
    WHEN NEW.due_date < CURRENT_DATE THEN 'Overdue'
    ELSE 'Pending'
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fee_installment_status ON fee_installment;
CREATE TRIGGER trg_fee_installment_status
BEFORE INSERT OR UPDATE OF amount_due, amount_paid, due_date ON fee_installment
FOR EACH ROW EXECUTE FUNCTION refresh_fee_installment_status();

-- Restore reconciliation triggers removed above. Their functions were created
-- by migration 014 and are recreated here as triggers only.
DROP TRIGGER IF EXISTS trg_fee_installment_schedule_total ON fee_installment;
CREATE CONSTRAINT TRIGGER trg_fee_installment_schedule_total
AFTER INSERT OR UPDATE OR DELETE ON fee_installment
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION assert_fee_installment_schedule_total();

DROP TRIGGER IF EXISTS trg_sync_fee_installment_from_payments ON payment_record;
CREATE TRIGGER trg_sync_fee_installment_from_payments
AFTER INSERT OR UPDATE OR DELETE ON payment_record
FOR EACH ROW EXECUTE FUNCTION sync_fee_installment_from_payments();

DROP TRIGGER IF EXISTS trg_refresh_invoice_totals_from_payments ON payment_record;
CREATE TRIGGER trg_refresh_invoice_totals_from_payments
AFTER INSERT OR UPDATE OR DELETE ON payment_record
FOR EACH ROW EXECUTE FUNCTION refresh_invoice_totals_from_payments();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financial_amounts_whole_xaf') THEN
    ALTER TABLE financial_record ADD CONSTRAINT financial_amounts_whole_xaf
      CHECK (amount_due > 0 AND amount_paid >= 0 AND amount_paid <= amount_due AND balance_due >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_amount_whole_xaf') THEN
    ALTER TABLE payment_record ADD CONSTRAINT payment_amount_whole_xaf CHECK (amount > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'installment_amounts_whole_xaf') THEN
    ALTER TABLE fee_installment ADD CONSTRAINT installment_amounts_whole_xaf
      CHECK (amount_due > 0 AND amount_paid >= 0 AND balance_due >= 0 AND amount_paid <= amount_due);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_fee_whole_xaf') THEN
    ALTER TABLE class_fee_setting ADD CONSTRAINT class_fee_whole_xaf CHECK (fee_xaf >= 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION behavior_points_for_severity(p_severity text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_severity
    WHEN 'Low' THEN 0.25::numeric
    WHEN 'Medium' THEN 0.50::numeric
    WHEN 'High' THEN 0.75::numeric
    WHEN 'Critical' THEN 1.00::numeric
    ELSE NULL
  END;
$$;

-- Normalize existing records to the authoritative severity mapping.
UPDATE behavior_incident
SET points = behavior_points_for_severity(severity);

CREATE OR REPLACE FUNCTION set_behavior_incident_points_from_severity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.points = behavior_points_for_severity(NEW.severity);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_behavior_incident_points_from_severity ON behavior_incident;
CREATE TRIGGER trg_behavior_incident_points_from_severity
BEFORE INSERT OR UPDATE OF severity ON behavior_incident
FOR EACH ROW EXECUTE FUNCTION set_behavior_incident_points_from_severity();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'behavior_incident_points_match_severity') THEN
    ALTER TABLE behavior_incident ADD CONSTRAINT behavior_incident_points_match_severity
      CHECK (points = behavior_points_for_severity(severity));
  END IF;
END $$;
