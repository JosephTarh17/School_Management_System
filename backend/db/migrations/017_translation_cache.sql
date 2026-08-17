-- SMS database migration 017
-- Persistent translation cache for provider-backed English/French UI translation.
-- Apply after migrations 001-016.

CREATE TABLE IF NOT EXISTS translation_cache (
  cache_key text PRIMARY KEY,
  source_text text NOT NULL,
  target_language varchar(5) NOT NULL CHECK (target_language IN ('en', 'fr')),
  translated_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (char_length(cache_key) = 64),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_translation_cache_expiry
  ON translation_cache(expires_at);

ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;

-- No public policies are created intentionally. The backend uses the Supabase
-- service-role key for this operational table, while direct client access stays
-- blocked by RLS.
