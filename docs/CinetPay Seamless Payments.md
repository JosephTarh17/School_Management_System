# CinetPay Seamless Payments

## Purpose

The school management system uses CinetPay Seamless to let authenticated guardians pay a child’s outstanding XAF invoice balance or a specific scheduled installment. The browser receives only a short-lived CinetPay payment token and the exact payment URL returned by the backend. CinetPay credentials remain server-side.

## Database migration

Apply `backend/db/migrations/018_cinetpay_payments.sql` manually in Supabase SQL Editor after the existing finance migrations. This migration creates `cinetpay_payment_attempt`, adds the `Mobile money - CinetPay` payment method, and creates the atomic settlement function used by notifications and status checks.

The migration is not applied automatically by the application and must not be copied into a client-side bundle.

## Backend environment variables

Configure these values in the backend’s local `.env` file and in Render’s backend environment settings. Do not commit the values.

```text
CINETPAY_API_KEY=<sandbox API key>
CINETPAY_API_PASSWORD=<sandbox API password, if the account provides one>
CINETPAY_SITE_ID=<sandbox Site ID, if the account provides one>
CINETPAY_ENVIRONMENT=sandbox
BACKEND_PUBLIC_URL=https://your-backend.onrender.com
FRONTEND_URL=https://your-frontend.onrender.com
```

The adapter supports either the modern API-password flow or the legacy Site-ID flow. If both `CINETPAY_API_PASSWORD` and `CINETPAY_SITE_ID` are supplied, the modern token-based flow is selected. The browser never receives any of these values.

Optional URL overrides are available when the deployed URL structure differs from the defaults:

```text
CINETPAY_API_BASE_URL=<provider API base URL>
CINETPAY_LEGACY_API_BASE_URL=<legacy checkout API base URL>
CINETPAY_NOTIFY_URL=https://your-backend.onrender.com/cinetpay/notify
CINETPAY_RETURN_URL=https://your-frontend.onrender.com/guardian-portal?payment=return
CINETPAY_FAILED_URL=https://your-frontend.onrender.com/guardian-portal?payment=failed
CINETPAY_REQUEST_TIMEOUT_MS=15000
```

For initial sandbox setup, CinetPay’s authorized-IP field is optional. Render’s free service exposes shared outbound CIDR ranges rather than a dedicated static IP, so do not enter a guessed individual IP. If a production CinetPay account later requires a fixed IP allowlist, use dedicated outbound egress or a static-IP proxy rather than weakening transaction verification.

## Payment flow

1. The guardian selects an invoice or installment in the Guardian Portal.
2. The backend checks the guardian-to-student relationship, confirms the amount is a positive whole-number XAF value, and ensures it does not exceed the current balance.
3. The backend creates a pending `cinetpay_payment_attempt` with a unique merchant transaction ID.
4. The backend initializes CinetPay and returns only `paymentToken`, `paymentUrl`, and the local merchant transaction ID.
5. Vue opens the Seamless popup.
6. CinetPay sends a notification to `/cinetpay/notify`, and the frontend can request `/cinetpay/status/:merchantTransactionId`.
7. The backend verifies the status directly with CinetPay, confirms the merchant transaction ID, currency, and amount, and calls `settle_cinetpay_payment_attempt`.
8. The settlement function inserts one payment ledger row using the existing finance triggers. Repeated callbacks are idempotent because the receipt is derived from the unique merchant transaction ID.

The browser callback and return URL are not treated as proof of payment. Only the server-side CinetPay verification can settle the local invoice.

## Test checklist

Use sandbox credentials first. Confirm that a guardian can open the popup, that a pending attempt appears in `cinetpay_payment_attempt`, that an accepted sandbox transaction produces one `payment_record`, and that invoice/installment balances are recalculated by the existing database triggers. Repeat the status request and callback to confirm that no duplicate payment row is created.

Do not use production credentials until sandbox verification, Render deployment, callback reachability, and duplicate-notification behavior have all been confirmed.

## References

[1] [CinetPay Seamless SDK repository](https://github.com/cinetpay/cinetpay-seamless)

[2] [CinetPay API documentation index](https://context7.com/websites/cinetpay_api_1_0-en)

[3] [Render outbound IP addresses](https://render.com/docs/outbound-ip-addresses)
