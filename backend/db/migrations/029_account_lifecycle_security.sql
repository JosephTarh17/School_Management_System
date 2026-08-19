-- Account lifecycle, activation, and security-monitoring fields.
-- Apply after migration 028.

ALTER TABLE user_account ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS first_login_at timestamptz;
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS mfa_reset_required boolean NOT NULL DEFAULT false;
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS suspension_until timestamptz;
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS account_expires_at timestamptz;
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS account_status_reason text;
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS failed_login_count integer NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0);
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS last_failed_login timestamptz;
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS last_login_ip inet;
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS last_login_user_agent text;

CREATE INDEX IF NOT EXISTS idx_user_account_lifecycle
  ON user_account(disabled_at, suspension_until, account_expires_at);
CREATE INDEX IF NOT EXISTS idx_user_account_security_monitoring
  ON user_account(last_failed_login DESC, last_login DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_account_lifecycle_dates_valid'
      AND conrelid = 'user_account'::regclass
  ) THEN
    ALTER TABLE user_account
      ADD CONSTRAINT user_account_lifecycle_dates_valid
      CHECK (
        (suspension_until IS NULL OR disabled_at IS NOT NULL)
        AND (account_expires_at IS NULL OR account_expires_at > created_at)
      );
  END IF;
END $$;
