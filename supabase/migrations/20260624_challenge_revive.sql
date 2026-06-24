ALTER TABLE challenge_participations
  ADD COLUMN IF NOT EXISTS revived_at timestamptz NULL;

COMMENT ON COLUMN challenge_participations.revived_at IS
  'When set, participant used their one-shot revive after a failed_at. failed_at is cleared and passes_remaining is refilled at that moment.';
