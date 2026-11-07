-- New external rating rows must remain hidden until explicitly reviewed.
-- This changes only the column default; existing verified rows are preserved.
alter table public.external_rating_results
  alter column verification_status set default 'needs_review';

comment on column public.external_rating_results.verification_status is
  'New rows default to needs_review and remain hidden from public SELECT until explicitly verified.';
