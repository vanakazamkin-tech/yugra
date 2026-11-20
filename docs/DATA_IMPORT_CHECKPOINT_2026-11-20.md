# Data import checkpoint — 2026-11-20

## Scope

Stage demographic observations for the 22 Yugra municipalities from the regional section 31 BDPMO exports published in the Tochno catalog (source release 2026-09-28). Source catalogue record: `tochno_bdmo_hmao_20260928`.

The ingestion target is `public.municipality_indicator_import_staging` only. Do not promote these rows to `public.municipality_indicators` or mark them verified without a separate manual review.

## Archive extraction

- Git branch: `ops/extract-hmao-demography-2026-11`
- Extraction workflow: `.github/workflows/extract-hmao-demography.yml`
- Re-use upload workflow: `.github/workflows/upload-existing-hmao-demography.yml`
- Extractor: `scripts/ops/extract_hmao_demography.py`
- Staging uploader: `scripts/ops/upload_hmao_demography_staging.py`
- Successful raw extraction: 570,311 rows across six ZIP archives; all 22 project municipality IDs/OKTMO mappings validated; no duplicate row hashes within indicator code.
- Source extraction workflow: run `44798377769` (success); archive artifact `hmao-demography-extract`, artifact ID `14660425997`, available until 2026-11-27.

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

The full archive contains many migration-by-age, sex and migration-type slices. The requested 8112021–8112023 indicators are overall totals, so the staging uploader applies:
- `migr = Миграция — всего`
- `grup_2 = Всего`
- `vozr = Всего`

Population indicators 8112014–8112016 retain all source age/sex cross-sections.

Expected and actual rows in staging:

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

## Supabase upload — verified

- Project: `dmbikidqikjupkghywbz`, region `eu-north-1`, plan Free.
- Repository Actions secret `SUPABASE_SERVICE_ROLE_KEY` is configured and has been proven valid by successful writes to Supabase. Secret value is not stored in the repository.
- Successful staging workflow: run `44802352292` (success), using archived extraction artifact from run `44798377769`.
- The first 500-row batch attempt (run `44800311889`) partially inserted rows and then hit PostgreSQL `statement_timeout` (HTTP 500 / SQLSTATE 57014). The upload was safely resumed using unique `(source_id, source_record_key)` conflict handling, with batch size reduced to 100 and workers to 3.
- Actual staging count for this source: **225,157 rows**.
- All **225,157** rows have `review_status='pending'`; 0 rows are outside pending review.
- All 225,157 rows deliberately remain unmapped: `mapped_indicator_code`, `normalized_unit`, and `normalized_period` are null.
- Eight rows retain blank numeric source values; they were not replaced with zeroes.
- Source catalogue status remains `partially_imported` to reflect pending mapping and verification.
- `public.municipality_indicators` has **0 rows** for this source. The analytics table and public site were not modified.
- Database size at successful upload: approximately **335 MB**. The Free plan quota is 500 MB; remaining capacity is limited. Do not upload the unfiltered 570,311-row archive or duplicate full source JSON into the database.
- Earlier pending rows from `tochno_mun_demography_2026` remain separate and unchanged.

## Important data limitations

- The source is a processed Rosstat/BDPMO export distributed via the Tochno catalog; retain source attribution and check the exact definitions against official source documentation before acceptance.
- Missing urban/rural municipality rows are coverage gaps or not-applicable categories, not zeros.
- All new observations are still in review staging. They must not be displayed as verified official site indicators or used in calculations until their indicator dictionary mapping, measurement unit, reference period, municipality coverage and source provenance have been checked.

## Next action

1. Review indicator definitions and map codes 8112014–8112016 and 8112021–8112023 to the project's internal indicator dictionary.
2. Set normalized period and unit only after checking source metadata; do not guess.
3. Review blank values and missing urban/rural coverage; preserve them as missing.
4. Only then accept reviewed staging rows into `public.municipality_indicators`.
5. Continue the remaining demographic indicators separately (including births, deaths, natural change, rates and estimated population) after their source files and mappings have been verified.

Do not merge this operational branch to `main` or alter the public site until staging review and model mapping are complete.
