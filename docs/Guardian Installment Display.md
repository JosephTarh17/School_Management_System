# Guardian Installment Display and Payment Integration

## Current behavior

The Guardian Portal now displays invoice summaries together with guardian-paid installment schedules and payment history for the selected linked child. The response is scoped through the authenticated guardian-to-student relationship.

## Displayed information

For each invoice, the portal can show the installment number, due date, amount due, amount paid, balance, status, linked guardian payer, receipt number, payment method, payment date, and payment amount.

## API changes

The guardian summary endpoint now attaches `installments` and `payments` to each financial record. The financial route also supports:

- `GET /financial-records/:invoiceId/installments` for authorized administrators, students, and linked guardians.
- `POST /financial-records/:invoiceId/installments` for administrators to create a guardian-attributed schedule.
- `POST /financial-records/:invoiceId/installments/:installmentId/payments` for administrators to record a payment against a specific installment.

## Integrity migration

Apply `backend/db/migrations/013_installment_payment_integrity.sql` after migration 011. It creates an atomic database function that validates the payer guardian, prevents installment overpayment, updates the installment balance and status, and synchronizes the invoice totals.

## Security and scope

Guardians can view only invoices and installment records belonging to linked children, and only payments attributed to the authenticated guardian are returned in the guardian summary. Administrators remain the only role allowed to create schedules or record manual installment payments. No external money-transfer gateway is included; this remains a manual payment ledger using XAF.

## Verification

Run the frontend build and static checks:

```powershell
npm --prefix frontend run build
git diff --check
```

Then apply migration 013 in Supabase and verify the Guardian Portal with a linked guardian account. The expected UI contains a `Guardian-paid installment schedule` section below each invoice summary.
