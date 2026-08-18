-- SMS database migration 025
-- Managed class locations and database-enforced room booking conflicts.
-- Apply after migration 024.

CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
DECLARE
  conflict_count integer;
BEGIN
  SELECT count(*)::integer
  INTO conflict_count
  FROM class_session first_session
  JOIN class_session second_session
    ON first_session.session_id < second_session.session_id
   AND first_session.room_id IS NOT NULL
   AND first_session.room_id = second_session.room_id
   AND first_session.start_time < second_session.end_time
   AND second_session.start_time < first_session.end_time;

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Migration 025 stopped: % overlapping class-session room booking(s) already exist. Resolve them before applying this migration.', conflict_count
      USING ERRCODE = 'P0001';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_class_session_room_start_time
  ON class_session(room_id, start_time);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'class_session_room_time_no_overlap'
      AND conrelid = 'class_session'::regclass
  ) THEN
    ALTER TABLE class_session
      ADD CONSTRAINT class_session_room_time_no_overlap
      EXCLUDE USING gist (
        room_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
      );
  END IF;
END $$;
