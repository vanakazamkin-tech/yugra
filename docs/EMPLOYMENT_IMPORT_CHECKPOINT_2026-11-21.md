# Yugra Stage 2 — Employment data import checkpoint

Date: 2026-11-21

## Scope and operational safety

- Repository: `vanakazamkin-tech/yugra`
- Working branch: `ops/extract-hmao-demography-2026-11`
- Supabase project: `dmbikidqikjupkghywbz` (`eu-north-1`)
- Staging table: `public.municipality_indicator_import_staging`
- Analytical table: `public.municipality_indicators`
- Rosstat / BDPMO processed source: `tochno_bdmo_hmao_20260928`
- Catalogue: https://tochno.st/datasets/bdmo
- Archive: `data_bdmo_118_v20260928/by_indicator/data_section32_112_v20260928.zip`
- Licence: CC BY 4.0; attribution required.

No new employment row has been promoted into `municipality_indicators`; the site and `main` branch were not changed. All newly uploaded records remain `review_status='pending'`. Indicator mapping, normalized units and normalized periods remain unset until review.

## Extraction and upload run

- GitHub Actions run: https://github.com/vanakazamkin-tech/yugra/actions/runs/44822162445
- Extraction job: success.
- Supabase staging upload job: success.
- The 7 GB nationwide ZIP was not downloaded in full. The extractor read only the needed section-32 CSV members using 24 HTTP Range requests.
- Compressed bytes fetched: 8,146,967.
- Extracted and submitted to staging: 48,396 source rows.
- Upload used batches of 100 with 3 workers and conflict key `(source_id, source_record_key)`.

## Indicator coverage

| BDPMO code | Indicator | Rows | Municipalities | Years |
|---|---|---:|---:|---|
| 8423001 | Overdue wage arrears, total | 21 | 7 | 2017–2020 |
| 8423002 | Arrears due to late federal-budget funding | 0 | 0 | No HMAO municipal rows in this archive |
| 8423003 | Arrears due to late regional-budget funding | 0 | 0 | No HMAO municipal rows in this archive |
| 8423004 | Arrears due to late local-budget funding | 0 | 0 | No HMAO municipal rows in this archive |
| 8423005 | Mean list employees, organisations excluding small enterprises | 14,031 | 22 | 2017–2026 |
| 8423006 | Payroll fund, organisations excluding small enterprises | 14,127 | 22 | 2017–2026 |
| 8423007 | Average monthly wage, organisations excluding small enterprises | 15,370 | 22 | 2017–2026 |
| 8423015 | Mean list employees, municipal-owned organisations | 1,272 | 22 | 2017–2025 |
| 8423016 | Payroll fund, municipal-owned organisations | 1,302 | 22 | 2017–2025 |
| 8423017 | Average monthly wage, municipal-owned organisations | 2,273 | 22 | 2017–2025 |
| **Total** | | **48,396** | | |

The arrears series 8423001 has 21 records: 9 in 2017, 10 in 2019 and 2 in 2020. Its current archive coverage contains only 7 municipalities; do not interpret the missing observations as zero.

Indicators 8423005–8423007 preserve the activity dimension (`okved2`); this is the source for the requested employment-by-major-sector view. These are organisation employment statistics excluding small enterprises, not a count of every employed resident.

Indicators 8423015–8423017 are the separate annual January–December series for municipal-owned organisations. They are not duplicate copies of 8423005–8423007.

The current municipal archive returned no HMAO municipality rows for indicators 8423002–8423004. Keep those series marked as unavailable in this source rather than filling zeroes.

## Supabase post-upload verification

Direct SQL checks against `municipality_indicator_import_staging` confirmed:

- Exact total for employment codes 8423xxx: 48,396 rows.
- 48,396 distinct source record keys; 0 duplicate-key groups.
- No blank `raw_value` and no unparseable `normalized_value` in the uploaded seven series.
- All 48,396 rows map to one of the 22 current project municipality IDs; no unknown municipality IDs.
- All 48,396 rows have `review_status='pending'`.
- `mapped_indicator_code`: 0 rows set.
- `normalized_unit`: 0 rows set.
- `normalized_period`: 0 rows set.
- `imported_indicator_id`: 0 rows set.
- New analytical rows from this employment import: 0.

Original source dimensions, including activity codes, reference period, measurement unit and source-member provenance, are retained in `raw_record`.

## Remaining Stage 2 indicators and follow-up

The following user-requested indicators are not yet imported as municipal-level time series:

- Registered unemployment rate.
- Number of registered unemployed.
- Current vacancies and employer demand for workers.

The Rosstat municipal employment-and-wages list used for this import contains the 8423xxx series above; it does not provide these three municipal unemployment/vacancy series in the same section-32 export.

Potential additional sources to investigate:
- HMAO Department of Labour and Employment interactive portal: https://job.admhmao.ru/
- Rostруд / “Работа России” open vacancy API: https://opendata.trudvsem.ru/api
- Official municipal annual reports and municipal employment-centre publications.

Do not substitute HMAO-wide unemployment/vacancy totals for municipal observations. If regional aggregates are collected for context, store them explicitly as regional-level records, not mapped to any municipality. Distinguish vacancies currently published in a job bank from the statutory/official stated demand for workers in a reporting period.

## Next actions

1. Research and identify a reproducible municipal-level source for registered unemployment rate and registered unemployed count across the 22 project municipalities.
2. Investigate whether the HMAO interactive portal or the “Работа России” API exposes municipality addresses / OKATO / OKTMO and a reliable timestamp for vacancy snapshots; aggregate only after validating municipal identification and pagination.
3. Keep existing employment rows in staging. Later perform a single integrated review of demographic and employment imports, map indicator definitions, units and periods, and promote only accepted rows to the analytical table.
4. Update this checkpoint after each completed source ingestion. Do not merge the operational branch into `main` or change the public site until the user-requested review/promotion stage.

