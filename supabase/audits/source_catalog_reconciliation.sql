-- Read-only: compare source catalog statuses with rows imported into public tables.
-- Does not modify the database.
with imported as (
  select source_id, 'indicator'::text as kind, count(*)::bigint as row_count
  from public.municipality_indicators group by source_id
  union all
  select source_id, 'investment_site', count(*)::bigint
  from public.investment_sites group by source_id
  union all
  select source_id, 'facility', count(*)::bigint
  from public.municipal_facilities group by source_id
  union all
  select source_id, 'program', count(*)::bigint
  from public.municipal_program_execution group by source_id
  union all
  select source_id, 'fuel_price', count(*)::bigint
  from public.fuel_price_observations group by source_id
),
counts as (
  select source_id, sum(row_count) as imported_rows,
         sum(row_count) filter (where kind = 'indicator') as indicator_rows,
         sum(row_count) filter (where kind = 'investment_site') as investment_site_rows,
         sum(row_count) filter (where kind = 'facility') as facility_rows,
         sum(row_count) filter (where kind = 'program') as program_rows,
         sum(row_count) filter (where kind = 'fuel_price') as fuel_price_rows
  from imported group by source_id
)
select ds.id, ds.name, ds.category, ds.import_status, ds.last_checked_at,
       coalesce(c.imported_rows, 0) as imported_rows,
       coalesce(c.indicator_rows, 0) as indicator_rows,
       coalesce(c.investment_site_rows, 0) as investment_site_rows,
       coalesce(c.facility_rows, 0) as facility_rows,
       coalesce(c.program_rows, 0) as program_rows,
       coalesce(c.fuel_price_rows, 0) as fuel_price_rows,
       case
         when ds.import_status = 'imported' and coalesce(c.imported_rows, 0) = 0 then 'review: imported status but no rows'
         when ds.import_status in ('identified', 'ready_for_import') and coalesce(c.imported_rows, 0) > 0 then 'review: rows exist but catalog status is early-stage'
         else null
       end as review_note
from public.data_sources ds
left join counts c on c.source_id = ds.id
order by ds.import_status, ds.name;

