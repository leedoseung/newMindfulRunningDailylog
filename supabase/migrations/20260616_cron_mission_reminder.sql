-- mission reminder at KST 20:00 = UTC 11:00
SELECT cron.unschedule('mission-reminder')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mission-reminder');

SELECT cron.schedule(
  'mission-reminder',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hirljfwzignkehulchpj.supabase.co/functions/v1/mission-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
