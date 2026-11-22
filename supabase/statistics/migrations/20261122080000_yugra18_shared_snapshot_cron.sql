-- Shared Vercel Blob snapshot refresh schedule for Yugra18.
-- This migration affects only extension setup and a scheduled HTTP job.
-- It does not alter application tables, rows, verification statuses, or RLS policies.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $schedule$
begin
  if not exists (
    select 1
    from cron.job
    where jobname = 'yugra18_shared_snapshot_refresh'
      and active
  ) then
    perform cron.schedule(
      'yugra18_shared_snapshot_refresh',
      '*/5 * * * *',
      $http$
      select net.http_post(
        url := 'https://yugra18.vercel.app/api/snapshot-refresh',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'yugra18_snapshot_refresh_token'
            limit 1
          )
        ),
        body := jsonb_build_object(
          'trigger', 'supabase-cron',
          'scheduled_at', now()::text
        ),
        timeout_milliseconds := 300000
      );
      $http$
    );
  end if;
end;
$schedule$;
