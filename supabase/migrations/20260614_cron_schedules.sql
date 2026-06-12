-- enable extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- service_role_key is stored in Supabase Vault under name 'service_role_key'
-- (Apply once via Dashboard SQL Editor:
--    SELECT vault.create_secret('<SERVICE_ROLE_JWT>', 'service_role_key');
-- )
-- The cron body reads the secret via vault.decrypted_secrets lookup.

-- daily-pass-check at KST 00:00 = UTC 15:00
SELECT cron.unschedule('mission-daily-pass-check')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mission-daily-pass-check');

SELECT cron.schedule(
  'mission-daily-pass-check',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hirljfwzignkehulchpj.supabase.co/functions/v1/daily-pass-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- issue-completion-badges at KST 01:00 = UTC 16:00 (runs after pass check)
SELECT cron.unschedule('mission-issue-completion-badges')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mission-issue-completion-badges');

SELECT cron.schedule(
  'mission-issue-completion-badges',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hirljfwzignkehulchpj.supabase.co/functions/v1/issue-completion-badges',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
