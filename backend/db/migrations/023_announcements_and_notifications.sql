-- Announcements and role-scoped in-app notifications.
-- Apply after migrations 017-022. CinetPay migration 018 remains optional until activation.

BEGIN;

CREATE TABLE IF NOT EXISTS announcement (
  announcement_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000),
  audience text NOT NULL CHECK (audience IN ('all', 'students', 'teachers', 'guardians', 'administrators')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  expires_at date,
  published_at timestamptz,
  created_by uuid NOT NULL REFERENCES user_account(user_id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'published' OR published_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS announcement_status_published_idx
  ON announcement(status, published_at DESC);
CREATE INDEX IF NOT EXISTS announcement_expiry_idx
  ON announcement(expires_at);

CREATE TABLE IF NOT EXISTS user_notification (
  notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_account(user_id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (char_length(btrim(notification_type)) BETWEEN 1 AND 80),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  link_path text CHECK (link_path IS NULL OR char_length(link_path) <= 500),
  announcement_id uuid REFERENCES announcement(announcement_id) ON DELETE SET NULL,
  event_key text CHECK (event_key IS NULL OR char_length(btrim(event_key)) BETWEEN 1 AND 255),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_key)
);

CREATE INDEX IF NOT EXISTS user_notification_inbox_idx
  ON user_notification(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS user_notification_announcement_idx
  ON user_notification(announcement_id);

ALTER TABLE announcement ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE announcement IS 'Administrator-authored school notices with role audience, publication state, priority, and optional expiry.';
COMMENT ON COLUMN announcement.audience IS 'Audience role: all, students, teachers, guardians, or administrators.';
COMMENT ON TABLE user_notification IS 'In-app notification inbox scoped to one authenticated user.';
COMMENT ON COLUMN user_notification.event_key IS 'Optional idempotency key preventing duplicate notifications for the same user and event.';

COMMIT;
