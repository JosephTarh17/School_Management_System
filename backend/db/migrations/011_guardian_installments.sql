-- SMS database migration 011
-- Administrator-defined guardian-paid installment schedules for student invoices.

CREATE TABLE IF NOT EXISTS fee_installment (
  installment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES financial_record(invoice_id) ON DELETE CASCADE,
  installment_number integer NOT NULL CHECK (installment_number > 0),
  guardian_id uuid NOT NULL REFERENCES guardian(guardian_id) ON DELETE RESTRICT,
  amount_due numeric(12,2) NOT NULL CHECK (amount_due > 0),
  amount_paid numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  balance_due numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance_due >= 0),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partial', 'Paid', 'Overdue')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invoice_id, installment_number),
  CHECK (amount_paid <= amount_due),
  CHECK (balance_due = amount_due - amount_paid)
);

CREATE INDEX IF NOT EXISTS idx_fee_installment_invoice ON fee_installment(invoice_id, installment_number);
CREATE INDEX IF NOT EXISTS idx_fee_installment_guardian ON fee_installment(guardian_id, due_date);
CREATE INDEX IF NOT EXISTS idx_fee_installment_due_status ON fee_installment(due_date, status);

ALTER TABLE payment_record ADD COLUMN IF NOT EXISTS installment_id uuid REFERENCES fee_installment(installment_id) ON DELETE RESTRICT;
ALTER TABLE payment_record ADD COLUMN IF NOT EXISTS payer_guardian_id uuid REFERENCES guardian(guardian_id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_payment_record_installment ON payment_record(installment_id);
CREATE INDEX IF NOT EXISTS idx_payment_record_payer_guardian ON payment_record(payer_guardian_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_record_guardian_payer_required') THEN
    ALTER TABLE payment_record ADD CONSTRAINT payment_record_guardian_payer_required
      CHECK (installment_id IS NULL OR payer_guardian_id IS NOT NULL);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_fee_installment_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fee_installment_updated_at ON fee_installment;
CREATE TRIGGER trg_fee_installment_updated_at
BEFORE UPDATE ON fee_installment
FOR EACH ROW EXECUTE FUNCTION set_fee_installment_updated_at();

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

ALTER TABLE fee_installment ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fee_installment_guardian_matches_invoice_student') THEN
    ALTER TABLE fee_installment ADD CONSTRAINT fee_installment_guardian_matches_invoice_student
      CHECK (guardian_id IS NOT NULL);
  END IF;
END $$;
