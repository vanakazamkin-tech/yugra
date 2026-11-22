create table if not exists public.municipal_land_parcels (
  id uuid primary key default gen_random_uuid(),
  municipality_id text not null references public.municipalities(id),
  source_id text not null references public.data_sources(id),
  cadastral_number text,
  address text,
  location_text text,
  area_sqm numeric check (area_sqm is null or area_sqm >= 0),
  land_category text,
  permitted_use text,
  legal_status text,
  available_to_investors boolean,
  latitude numeric check (latitude is null or latitude between -90 and 90),
  longitude numeric check (longitude is null or longitude between -180 and 180),
  source_url text not null,
  source_published_at date,
  source_updated_at date,
  source_payload jsonb not null default '{}'::jsonb,
  verification_status text not null default 'needs_review'
    check (verification_status in ('verified','needs_review')),
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists municipal_land_parcels_cadastral_number_uidx
  on public.municipal_land_parcels (cadastral_number) where cadastral_number is not null;
create index if not exists municipal_land_parcels_municipality_idx
  on public.municipal_land_parcels (municipality_id);
create index if not exists municipal_land_parcels_status_idx
  on public.municipal_land_parcels (verification_status);

alter table public.municipal_land_parcels enable row level security;
drop policy if exists "Public can read verified municipal land parcels" on public.municipal_land_parcels;
create policy "Public can read verified municipal land parcels"
  on public.municipal_land_parcels for select to anon, authenticated
  using (verification_status = 'verified');
grant select on public.municipal_land_parcels to anon, authenticated;
revoke insert, update, delete on public.municipal_land_parcels from anon, authenticated;
