# Data import checkpoint — 2026-11-20

## Scope

Stage demographic observations for the 22 Yugra municipalities from the regional section 31 BDPMO exports published in the Tochno catalog (source release 2026-09-28). Source catalogue record: `tochno_bdmo_hmao_20260928`.

The ingestion target is `public.municipality_indicator_import_staging` only. Do not promote these rows to `public.municipality_indicators` or mark them verified without a separate manual review.

## Archive extraction

- Git branch: `ops/extract-hmao-demography-2026-11`
- Workflow: `.github/workflows/extract-hmao-demography.yml`
- Extractor: `scripts/ops/extract_hmao_demography.py`
- Staging uploader: `scripts/ops/upload_hmao_demography_staging.py`
- Successful raw extraction: 570,311 rows across six ZIP archives; all 22 project municipality IDs/OKTMO mappings validated; no duplicate row hashes within indicator code.
- Archive workflow artifact: `hmao-demography-extract` (7-day retention).

Raw extraction counts:

| Indicator | Rows | Municipalities | Year range |
|---|---:|---:|---|
| 8112014 total population by sex and age | 94,352 | 22 | 2011–2024 |
| 8112015 urban population by sex and age | 88,961 | 21 | 2011–2024 |
| 8112016 rural population by sex and age | 40,920 | 10 | 2011–2024 |
| 8112021 arrivals | 116,083 | 22 | 2010–2023 |
| 8112022 departures | 110,632 | 22 | 2010–2023 |
| 8112023 migration balance | 119,363 | 22 | 2010–2023 |

Coverage notes:
- 8112015 has no rows for Khanty-Mansiysky District (OKTMO 71829000).
- 8112016 has rows for only 10 municipalities; 12 urban municipalities have no rural population rows in this source.
- These gaps must remain missing observations, never synthetic zeroes.
- Eight source rows have blank numeric values (four each in 8112014 and 8112015); preserve them as blank with a validation flag.
- Values are not fabricated, interpolated or promoted.

## Review-stage selection

The full archive contains many migration-by-age, sex and migration-type slices. The user's requested 8112021–8112023 indicators are overall totals, so the staging uploader applies:
- `migr = Миграция — всего`
- `grup_2 = Всего`
- `vozr = Всего`

Population indicators 8112014–8112016 retain all source age/sex cross-sections.

Expected rows for staging after this selection:

| Indicator | Rows |
|---|---:|
| 8112014 | 94,352 |
| 8112015 | 88,961 |
| 8112016 | 40,920 |
| 8112021 | 308 |
| 8112022 | 308 |
| 8112023 | 308 |
| **Total** | **225,157** |

To reduce database storage, staging `raw_record` retains the disaggregation and geography fields needed to interpret each row; `source_record_key` contains indicator code + SHA-256 of the full original source row, and `source_url_snapshot` links to the exact regional ZIP. The complete source rows are reproducible from those archives. The uploader leaves `mapped_indicator_code`, `normalized_unit` and `normalized_period` null for manual mapping.

## Supabase status at checkpoint

- Project: `dmbikidqikjupkghywbz`, organization plan Free.
- Current database size during preflight: about 20 MB.
- Free plan database quota: 500 MB; avoid loading the full 570,311-row set with duplicated full-row JSON.
- Source catalogue record `tochno_bdmo_hmao_20260928` was created with status `identified`.
- New source currently has **0 staging rows**. The first run intentionally did not write because GitHub Actions secret `SUPABASE_SERVICE_ROLE_KEY` is not configured.
- Existing 2,310 rows from `tochno_mun_demography_2026` remain in their original pending review state.
- `municipality_indicators` has not been modified by this workflow.

## Next action

Add repository Actions secret `SUPABASE_SERVICE_ROLE_KEY` for the Supabase project, then manually run **Actions → Extract HMAO demographic indicators → Run workflow** on `ops/extract-hmao-demography-2026-11`. After a successful upload, verify `public.municipality_indicator_import_staging` row counts by indicator, review status, municipality and year; check database size; then reconcile indicator definitions and period/unit mappings before any manual acceptance.

Do not merge this operational branch to `main` or alter the public site until the staging data has been checked.
