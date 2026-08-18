-- SMS database migration 018
-- CinetPay Seamless payment attempts and idempotent settlement.
-- Apply manually in Supabase SQL Editor after migration 016/017.

-- Extend the existing payment-method check without relying on the generated
-- constraint name from migration 006.
DO $$
DECLARE
  v_constraint text;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'payment_record'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%Mobile money - manual%'
  LOOP
    EXECUTE format('ALTER TABLE payment_record DROP CONSTRAINT %I', v_constraint);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_record_payment_method_check') THEN
    ALTER TABLE payment_record
      ADD CONSTRAINT payment_record_payment_method_check
      CHECK (payment_method IN ('Cash', 'Bank transfer', 'Mobile money - manual', 'Mobile money - CinetPay', 'Other'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS cinetpay_payment_attempt (
  payment_attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_transaction_id text NOT NULL UNIQUE,
  cinetpay_transaction_id text UNIQUE,
  invoice_id uuid NOT NULL REFERENCES financial_record(invoice_id) ON DELETE RESTRICT,
  installment_id uuid REFERENCES fee_installment(installment_id) ON DELETE RESTRICT,
  payer_guardian_id uuid NOT NULL REFERENCES guardian(guardian_id) ON DELETE RESTRICT,
  amount numeric(12,0) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'XAF' CHECK (currency = 'XAF'),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'INITIATED', 'ACCEPTED', 'REFUSED', 'EXPIRED', 'CANCELLED', 'ERROR')),
  payment_url text,
  provider_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_reason text,
  payment_id uuid REFERENCES payment_record(payment_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  CHECK (length(trim(merchant_transaction_id)) BETWEEN 1 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_cinetpay_attempt_invoice ON cinetpay_payment_attempt(invoice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cinetpay_attempt_guardian ON cinetpay_payment_attempt(payer_guardian_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cinetpay_attempt_status ON cinetpay_payment_attempt(status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cinetpay_open_installment_attempt
  ON cinetpay_payment_attempt(installment_id)
  WHERE installment_id IS NOT NULL AND status IN ('PENDING', 'INITIATED');

ALTER TABLE cinetpay_payment_attempt ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION set_cinetpay_payment_attempt_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cinetpay_payment_attempt_updated_at ON cinetpay_payment_attempt;
CREATE TRIGGER trg_cinetpay_payment_attempt_updated_at
BEFORE UPDATE ON cinetpay_payment_attempt
FOR EACH ROW EXECUTE FUNCTION set_cinetpay_payment_attempt_updated_at();

CREATE OR REPLACE FUNCTION settle_cinetpay_payment_attempt(
  p_payment_attempt_id uuid,
  p_status text,
  p_cinetpay_transaction_id text,
  p_provider_response jsonb,
  p_payment_method text,
  p_paid_at timestamptz,
  p_failure_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt cinetpay_payment_attempt%ROWTYPE;
  v_invoice financial_record%ROWTYPE;
  v_installment fee_installment%ROWTYPE;
  v_payment payment_record%ROWTYPE;
  v_guardian_user_id uuid;
  v_receipt_number text;
  v_balance numeric;
BEGIN
  IF p_status NOT IN ('PENDING', 'INITIATED', 'ACCEPTED', 'REFUSED', 'EXPIRED', 'CANCELLED', 'ERROR') THEN
    RAISE EXCEPTION 'Invalid CinetPay payment status' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_attempt
  FROM cinetpay_payment_attempt
  WHERE payment_attempt_id = p_payment_attempt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CinetPay payment attempt not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_attempt.status = 'ACCEPTED' THEN
    RETURN jsonb_build_object(
      'payment_attempt_id', v_attempt.payment_attempt_id,
      'merchant_transaction_id', v_attempt.merchant_transaction_id,
      'status', v_attempt.status,
      'payment_id', v_attempt.payment_id,
      'amount', v_attempt.amount
    );
  END IF;

  IF p_status = 'ACCEPTED' THEN
    SELECT * INTO v_invoice
    FROM financial_record
    WHERE invoice_id = v_attempt.invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Financial record not found for CinetPay payment attempt' USING ERRCODE = 'P0001';
    END IF;

    IF v_attempt.installment_id IS NOT NULL THEN
      SELECT * INTO v_installment
      FROM fee_installment
      WHERE installment_id = v_attempt.installment_id
        AND invoice_id = v_attempt.invoice_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Installment not found for CinetPay payment attempt' USING ERRCODE = 'P0001';
      END IF;
      IF v_attempt.amount > v_installment.balance_due THEN
        RAISE EXCEPTION 'CinetPay payment exceeds the installment balance' USING ERRCODE = 'P0001';
      END IF;
    ELSE
      v_balance := v_invoice.amount_due - v_invoice.amount_paid;
      IF v_attempt.amount > v_balance THEN
        RAISE EXCEPTION 'CinetPay payment exceeds the invoice balance' USING ERRCODE = 'P0001';
      END IF;
    END IF;

    SELECT user_id INTO v_guardian_user_id
    FROM guardian
    WHERE guardian_id = v_attempt.payer_guardian_id;

    IF v_guardian_user_id IS NULL THEN
      RAISE EXCEPTION 'Guardian account not found for CinetPay payment attempt' USING ERRCODE = 'P0001';
    END IF;

    v_receipt_number := 'CINETPAY-' || v_attempt.merchant_transaction_id;

    INSERT INTO payment_record (
      invoice_id,
      installment_id,
      payer_guardian_id,
      amount,
      payment_method,
      receipt_number,
      payment_reference,
      notes,
      paid_at,
      recorded_by
    )
    VALUES (
      v_attempt.invoice_id,
      v_attempt.installment_id,
      v_attempt.payer_guardian_id,
      v_attempt.amount,
      COALESCE(NULLIF(trim(p_payment_method), ''), 'Mobile money - CinetPay'),
      v_receipt_number,
      v_attempt.merchant_transaction_id,
      'Settled by CinetPay server-side verification.',
      COALESCE(p_paid_at, now()),
      v_guardian_user_id
    )
    ON CONFLICT (receipt_number) DO NOTHING
    RETURNING * INTO v_payment;

    IF v_payment.payment_id IS NULL THEN
      SELECT * INTO v_payment
      FROM payment_record
      WHERE receipt_number = v_receipt_number;
      IF NOT FOUND OR v_payment.invoice_id <> v_attempt.invoice_id OR v_payment.amount <> v_attempt.amount THEN
        RAISE EXCEPTION 'CinetPay receipt number is already used by another payment' USING ERRCODE = '23505';
      END IF;
    END IF;

    UPDATE cinetpay_payment_attempt
    SET status = 'ACCEPTED',
        cinetpay_transaction_id = COALESCE(p_cinetpay_transaction_id, cinetpay_transaction_id),
        provider_response = COALESCE(p_provider_response, '{}'::jsonb),
        failure_reason = NULL,
        payment_id = v_payment.payment_id,
        settled_at = COALESCE(p_paid_at, now())
    WHERE payment_attempt_id = v_attempt.payment_attempt_id
    RETURNING * INTO v_attempt;
  ELSE
    UPDATE cinetpay_payment_attempt
    SET status = p_status,
        cinetpay_transaction_id = COALESCE(p_cinetpay_transaction_id, cinetpay_transaction_id),
        provider_response = COALESCE(p_provider_response, '{}'::jsonb),
        failure_reason = NULLIF(trim(p_failure_reason), '')
    WHERE payment_attempt_id = v_attempt.payment_attempt_id
    RETURNING * INTO v_attempt;
  END IF;

  RETURN jsonb_build_object(
    'payment_attempt_id', v_attempt.payment_attempt_id,
    'merchant_transaction_id', v_attempt.merchant_transaction_id,
    'cinetpay_transaction_id', v_attempt.cinetpay_transaction_id,
    'status', v_attempt.status,
    'payment_id', v_attempt.payment_id,
    'amount', v_attempt.amount,
    'invoice_id', v_attempt.invoice_id,
    'installment_id', v_attempt.installment_id
  );
END;
$$;

REVOKE ALL ON FUNCTION settle_cinetpay_payment_attempt(uuid, text, text, jsonb, text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION settle_cinetpay_payment_attempt(uuid, text, text, jsonb, text, timestamptz, text) TO service_role;
