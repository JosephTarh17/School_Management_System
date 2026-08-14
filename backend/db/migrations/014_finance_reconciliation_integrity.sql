-- SMS database migration 014
-- Reconcile invoice, installment, and payment totals without negative values.
-- Apply after migrations 011 and 013.

CREATE OR REPLACE FUNCTION assert_fee_installment_schedule_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
  v_amount_due numeric;
  v_schedule_total numeric;
BEGIN
  SELECT amount_due INTO v_amount_due FROM financial_record WHERE invoice_id = v_invoice_id;
  SELECT COALESCE(sum(amount_due), 0) INTO v_schedule_total
  FROM fee_installment WHERE invoice_id = v_invoice_id;
  IF v_schedule_total > 0 AND v_schedule_total <> v_amount_due THEN
    RAISE EXCEPTION 'Installment schedule total (%) must equal invoice amount due (%)', v_schedule_total, v_amount_due USING ERRCODE = 'P0001';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_fee_installment_schedule_total ON fee_installment;
CREATE CONSTRAINT TRIGGER trg_fee_installment_schedule_total
AFTER INSERT OR UPDATE OR DELETE ON fee_installment
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION assert_fee_installment_schedule_total();

CREATE OR REPLACE FUNCTION sync_fee_installment_from_payments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_installment_id uuid := COALESCE(NEW.installment_id, OLD.installment_id);
BEGIN
  IF v_installment_id IS NOT NULL THEN
    UPDATE fee_installment
    SET amount_paid = COALESCE((SELECT sum(amount) FROM payment_record WHERE installment_id = v_installment_id), 0)
    WHERE installment_id = v_installment_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_fee_installment_from_payments ON payment_record;
CREATE TRIGGER trg_sync_fee_installment_from_payments
AFTER INSERT OR UPDATE OR DELETE ON payment_record
FOR EACH ROW EXECUTE FUNCTION sync_fee_installment_from_payments();

CREATE OR REPLACE FUNCTION refresh_invoice_totals_from_payments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
  v_amount_due numeric;
  v_amount_paid numeric;
BEGIN
  SELECT amount_due INTO v_amount_due FROM financial_record WHERE invoice_id = v_invoice_id FOR UPDATE;
  IF v_amount_due IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(sum(amount), 0) INTO v_amount_paid FROM payment_record WHERE invoice_id = v_invoice_id;
  IF v_amount_paid > v_amount_due THEN
    RAISE EXCEPTION 'Invoice payments cannot exceed invoice amount due' USING ERRCODE = 'P0001';
  END IF;
  UPDATE financial_record
  SET amount_paid = v_amount_paid,
      balance_due = v_amount_due - v_amount_paid,
      payment_status = CASE
        WHEN v_amount_paid >= v_amount_due AND v_amount_due > 0 THEN 'Paid'
        WHEN v_amount_paid > 0 THEN 'Partial'
        ELSE 'Pending'
      END,
      last_payment_at = CASE WHEN v_amount_paid > 0 THEN COALESCE((SELECT max(paid_at) FROM payment_record WHERE invoice_id = v_invoice_id), last_payment_at) ELSE NULL END
  WHERE invoice_id = v_invoice_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_invoice_totals_from_payments ON payment_record;
CREATE TRIGGER trg_refresh_invoice_totals_from_payments
AFTER INSERT OR UPDATE OR DELETE ON payment_record
FOR EACH ROW EXECUTE FUNCTION refresh_invoice_totals_from_payments();

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
  v_invoice_paid numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v_installment FROM fee_installment WHERE installment_id = p_installment_id AND invoice_id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Installment not found for this invoice' USING ERRCODE = 'P0001'; END IF;
  IF p_payer_guardian_id IS NULL OR p_payer_guardian_id <> v_installment.guardian_id THEN RAISE EXCEPTION 'The payer guardian must match the installment guardian' USING ERRCODE = 'P0001'; END IF;
  IF p_amount > v_installment.balance_due THEN RAISE EXCEPTION 'Payment cannot exceed the installment balance' USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO v_invoice FROM financial_record WHERE invoice_id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Financial record not found' USING ERRCODE = 'P0001'; END IF;

  INSERT INTO payment_record (invoice_id, installment_id, payer_guardian_id, amount, payment_method, receipt_number, payment_reference, notes, paid_at, recorded_by)
  VALUES (p_invoice_id, p_installment_id, p_payer_guardian_id, p_amount, p_payment_method, p_receipt_number, NULLIF(trim(p_payment_reference), ''), NULLIF(trim(p_notes), ''), COALESCE(p_paid_at, now()), p_recorded_by)
  RETURNING * INTO v_payment;

  SELECT COALESCE(sum(amount), 0) INTO v_invoice_paid FROM payment_record WHERE invoice_id = p_invoice_id;
  IF v_invoice_paid > v_invoice.amount_due THEN
    RAISE EXCEPTION 'Invoice payments cannot exceed invoice amount due' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object('payment_id', v_payment.payment_id, 'installment_id', p_installment_id, 'invoice_id', p_invoice_id, 'amount', p_amount, 'payer_guardian_id', p_payer_guardian_id, 'invoice_amount_paid', v_invoice_paid);
END;
$$;
