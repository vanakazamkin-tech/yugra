-- Correct the publication date metadata for the adopted final 2025 Yugorsk budget execution figures.
-- The underlying budget decision is dated 2026-04-28 (Duma decision No. 36).
update public.municipality_indicators
set source_published_at = date '2026-04-28'
where municipality_id = 'ugorsk'
  and reference_year = 2025
  and source_id = 'ugorsk_budget_execution_2025';

update public.data_sources
set notes = case
  when coalesce(notes, '') like '%Дата решения-источника: 28.04.2026, № 36.%' then notes
  else concat_ws(' ', nullif(notes, ''), 'Дата решения-источника: 28.04.2026, № 36.')
end
where id = 'ugorsk_budget_execution_2025';
