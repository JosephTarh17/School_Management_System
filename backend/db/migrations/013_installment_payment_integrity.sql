-- SMS database migration 013
-- Atomic guardian-attributed installment payment recording and invoice synchronization.
-- Apply after 011_guardian_installments.sql.

CREATE OR REPLACE FUNCTION record_installment_payment(
  p_invoice_id uuid,
  p_installment_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_receipt_number text,
  p_payment_reference text,
  p_notes text,
  p_paid_at timestamptz,
  p_recorded_by uuid,
  p_payer_guardian_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_installment fee_installment%ROWTYPE;
  v_invoice financial_record%ROWTYPE;
  v_payment payment_record%ROWTYPE;
  v_total_paid numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_installment
  FROM fee_installment
  WHERE installment_id = p_installment_id AND invoice_id = p_invoice_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Installment not found for this invoice' USING ERRCODE = 'P0001';
  END IF;
  IF p_payer_guardian_id IS NULL OR p_payer_guardian_id <> v_installment.guardian_id THEN
    RAISE EXCEPTION 'The payer guardian must match the installment guardian' USING ERRCODE = 'P0001';
  END IF;
  IF p_amount > v_installment.balance_due THEN
    RAISE EXCEPTION 'Payment cannot exceed the installment balance' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_invoice FROM financial_record WHERE invoice_id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial record not found' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO payment_record (
    invoice_id, installment_id, payer_guardian_id, amount, payment_method,
    receipt_number, payment_reference, notes, paid_at, recorded_by
  ) VALUES (
    p_invoice_id, p_installment_id, p_payer_guardian_id, p_amount, p_payment_method,
    p_receipt_number, NULLIF(trim(p_payment_reference), ''), NULLIF(trim(p_notes), ''),
    COALESCE(p_paid_at, now()), p_recorded_by
  ) RETURNING * INTO v_payment;

  UPDATE fee_installment
  SET amount_paid = amount_paid + p_amount
  WHERE installment_id = p_installment_id;

  SELECT COALESCE(sum(amount_paid), 0) INTO v_total_paid
  FROM fee_installment WHERE invoice_id = p_invoice_id;

  UPDATE financial_record
  SET amount_paid = LEAST(v_total_paid, amount_due),
      balance_due = GREATEST(amount_due - LEAST(v_total_paid, amount_due), 0),
      payment_status = CASE
        WHEN LEAST(v_total_paid, amount_due) >= amount_due AND amount_due > 0 THEN 'Paid'
        WHEN LEAST(v_total_paid, amount_due) > 0 THEN 'Partial'
        ELSE 'Pending'
      END,
      last_payment_at = COALESCE(p_paid_at, now())
  WHERE invoice_id = p_invoice_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment.payment_id,
    'installment_id', p_installment_id,
    'invoice_id', p_invoice_id,
    'amount', p_amount,
    'payer_guardian_id', p_payer_guardian_id,
    'invoice_amount_paid', v_total_paid
  );
END;
$$;
