# Finance Reconciliation Integrity

## Authoritative equations

All monetary values are whole-number XAF amounts with no fractional XAF units. New fees, invoice charges, installment amounts, and payment entries must be positive. Calculated paid totals, balances, and aggregate totals may be `0 XAF` when no amount has been paid or nothing remains outstanding. For an invoice:

```text
invoice balance = invoice amount due - invoice amount paid
```

When an installment schedule exists:

```text
invoice amount due = sum(installment amounts due)
installment balance = installment amount due - installment amount paid
installment amount paid = sum(payment records linked to that installment)
```

The invoice payment status is `Paid` when the paid total equals the due total, `Partial` when the paid total is greater than zero but below the due total, and `Pending` when no payment has been recorded.

## Safeguards

Migration 014 adds a deferred schedule-total constraint trigger, payment-derived installment balance synchronization, payment-derived invoice total synchronization, and a replacement atomic installment-payment function. New invoice-level manual payments are rejected when an installment schedule exists; administrators must record them against a specific installment.

Historical invoice-level payments are not silently assigned to installments. The Guardian Portal displays the installment schedule total, allocated installment payments, and any unallocated invoice payment separately so administrators can reconcile historical records deliberately.

## Example

For a `100,000 XAF` invoice divided into two installments:

```text
50,000 + 50,000 = 100,000 XAF
```

A `50,000 XAF` payment allocated to installment 1 produces:

```text
Installment 1: 50,000 due - 50,000 paid = 0 balance (Paid)
Installment 2: 50,000 due - 0 paid = 50,000 balance (Pending)
Invoice: 100,000 due - 50,000 paid = 50,000 balance (Partial)
```

Apply `backend/db/migrations/014_finance_reconciliation_integrity.sql` after migrations 011 and 013, then apply `backend/db/migrations/016_xaf_whole_numbers_and_behavior_points.sql` after any existing migration 015. Migration 016 rejects fractional legacy XAF values instead of silently rounding them, changes monetary columns to scale-zero numeric types, and adds database constraints for whole-number amounts.
