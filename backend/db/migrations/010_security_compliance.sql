-- Chapter 8: Security and Compliance
-- Apply after migrations 001-009.

ALTER TABLE user_account ADD COLUMN IF NOT EXISTS password_algorithm text NOT NULL DEFAULT 'bcryptjs';
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS mfa_secret_enc text;
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS mfa_pending_secret_enc text;
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS mfa_enrolled_at timestamptz;
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS security_version integer NOT NULL DEFAULT 0 CHECK (security_version >= 0);
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

CREATE TABLE IF NOT EXISTS auth_session (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_account(user_id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  ip_address inet,
  user_agent text,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_auth_session_user_active ON auth_session(user_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_session_token_hash ON auth_session(token_hash);

CREATE TABLE IF NOT EXISTS security_audit_log (
  audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES user_account(user_id) ON DELETE SET NULL,
  action text NOT NULL CHECK (char_length(action) BETWEEN 1 AND 120),
  resource_type text CHECK (resource_type IS NULL OR char_length(resource_type) <= 120),
  resource_id text CHECK (resource_id IS NULL OR char_length(resource_id) <= 160),
  http_method text CHECK (http_method IS NULL OR http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS')),
  request_path text CHECK (request_path IS NULL OR char_length(request_path) <= 500),
  status_code integer CHECK (status_code IS NULL OR status_code BETWEEN 100 AND 599),
  ip_address inet,
  user_agent text CHECK (user_agent IS NULL OR char_length(user_agent) <= 1000),
  correlation_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_security_audit_actor_created ON security_audit_log(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_action_created ON security_audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_resource ON security_audit_log(resource_type, resource_id, created_at DESC);

ALTER TABLE auth_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION deny_security_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'security_audit_log is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_security_audit_no_update ON security_audit_log;
CREATE TRIGGER trg_security_audit_no_update
BEFORE UPDATE OR DELETE ON security_audit_log
FOR EACH ROW EXECUTE FUNCTION deny_security_audit_mutation();
