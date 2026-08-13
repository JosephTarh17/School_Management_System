-- SMS database migration 006
-- Manual/offline payment ledger for development and controlled administration.
-- No payment provider or live-money transaction is connected by this migration.

ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'Partial';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'Waived';

CREATE TABLE IF NOT EXISTS payment_record (
  payment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES financial_record(invoice_id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('Cash', 'Bank transfer', 'Mobile money - manual', 'Other')),
  receipt_number text NOT NULL UNIQUE,
  payment_reference text,
  notes text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid NOT NULL REFERENCES user_account(user_id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_record_invoice_id ON payment_record(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_record_recorded_by ON payment_record(recorded_by);

ALTER TABLE financial_record ADD COLUMN IF NOT EXISTS balance_due numeric(12,2);
ALTER TABLE financial_record ADD COLUMN IF NOT EXISTS last_payment_at timestamptz;

UPDATE financial_record
SET balance_due = GREATEST(amount_due - amount_paid, 0)
WHERE balance_due IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financial_balance_due_nonnegative') THEN
    ALTER TABLE financial_record ADD CONSTRAINT financial_balance_due_nonnegative CHECK (balance_due IS NULL OR balance_due >= 0);
  END IF;
END $$;
