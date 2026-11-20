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

No newly imported employment row has been promoted into `municipality_indicators`; the public site and `main` branch have not been changed. All new rows are in private review staging with `review_status='pending'`. Indicator mapping and normalized units/periods remain unset until review.

## A. Rosstat / BDPMO employment and wages

### Extraction and upload

- GitHub Actions run: https://github.com/vanakazamkin-tech/yugra/actions/runs/44822162445
- Extraction job: success.
- Supabase staging upload job: success.
- The nationwide archive (approximately 7 GB) was not downloaded in full. The extractor read the required section-32 CSV members using 24 HTTP Range requests.
- Compressed bytes fetched: 8,146,967.
- Extracted and submitted: 48,396 source rows.
- Upload used batches of 100 with 3 workers and conflict key `(source_id, source_record_key)`.

### Indicator coverage

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

The arrears series 8423001 has 21 records: 9 in 2017, 10 in 2019 and 2 in 2020. Its current archive coverage contains only 7 municipalities; missing observations are not zero.

Indicators 8423005–8423007 preserve the `okved2` activity dimension. This source dimension supports the requested employment-by-major-sector view (item 28); it must not be re-imported as duplicate standalone values. These are employment statistics for organisations excluding small enterprises, not a count of every employed resident.

Important period note: the raw records also preserve periods such as January–March, January–June and January–September. These may be cumulative period values. Do not sum cumulative period snapshots across a year; normalize and validate their time semantics before analytics.

Indicators 8423015–8423017 are separate series for organisations of municipal ownership. They are not duplicate copies of 8423005–8423007, despite sharing the underlying Rosstat form codes.

The current municipal archive returned no HMAO municipality rows for indicators 8423002–8423004. Keep them marked as unavailable in this source rather than filling zeroes.

### Supabase verification

- Exact employment-code staging total: 48,396 rows.
- 48,396 distinct source record keys; 0 duplicate-key groups.
- No blank source values and no non-numeric source values in the uploaded series.
- All rows map to the 22 current project municipality IDs.
- All rows have `review_status='pending'`.
- `mapped_indicator_code`, `normalized_unit`, `normalized_period`, and `imported_indicator_id` remain unset.
- No rows from this import have been promoted to `municipality_indicators`.

Original dimensions, including activity codes, reference period, measurement unit, OKTMO, source member and provenance hash, are retained in `raw_record`.

## B. Registered unemployment and vacancies — additional official municipal sources

The previously imported HMAO Government Decree No. 422-п source contains 44 rows for all 22 project municipalities for 2022: 22 registered-unemployment rates and 22 registered-unemployed counts. These records were already in staging and were not duplicated.

On 2026-11-21, an additional 34 rows were added from eight municipal official sources:

| Source ID | Municipal area | Rows | Coverage / date |
|---|---|---:|---|
| `hmrn_municipal_labour_2024` | Khanty-Mansiysky district | 4 | 2023–2024; 01.01.2024 and 01.01.2025 |
| `oktregion_municipal_labour_2025` | Oktyabrsky district | 5 | 2024–2025; 01.01.2025 and 01.01.2026 |
| `ugorsk_municipal_labour_2024` | Yugorsk | 5 | End of 2023 and 2024 |
| `beloyarsky_municipal_labour_2024` | Beloyarsky district | 4 | 2023–2024 |
| `surgut_municipal_labour_2024` | Surgut | 5 | 31.12.2023 and 31.12.2024 |
| `admkogalym_municipal_labour_2025_h1` | Kogalym | 3 | Preliminary snapshot 01.07.2025 |
| `nefteyugansk_municipal_labour_2024` | Nefteyugansk | 4 | 01.01.2024 and 01.01.2025 |
| `megion_municipal_labour_2024` | Megion | 4 | 01.01.2024 and 01.01.2025 |
| **Additional total** | | **34** | **8 municipal areas** |

Together with the 44 pre-existing 2022 observations, the unemployment/vacancy source set now contains 78 observations across 9 sources. Of these, 74 are registered-unemployment rate/count observations and 4 represent separate local vacancy/worker-demand definitions.

### Distinguish vacancy measures

The four vacancy-related observations must remain semantically separate:
- Oktyabrsky district: employer-reported demand for workers to fill vacant posts, 3,694 at 01.01.2026.
- Surgut: employer-reported need reported to the employment service, 1,864 at 31.12.2024.
- Kogalym: preliminary employer-reported demand, 1,281 at 01.07.2025.
- Yugorsk: 210 open positions in the city employment centre at the end of 2024.

These are not interchangeable with the number of active vacancy advertisements on the federal “Работа России” portal. Preserve each original metric definition and observation date.

## C. Final verification of the expanded unemployment/vacancy staging set

Direct SQL verification after the additional imports confirmed:

- Total rows across the nine sources above: **78**.
- Distinct source keys: **78**.
- Review status: **78 pending**.
- Validation errors: **0**.
- Unmapped municipalities: **0**.
- Municipalities represented across the combined base and local sources: **22**.
- Sources: **9**.
- Rows with `imported_indicator_id` set: **0**.
- No rows have been promoted into the analytical table.

All 44 rows from Decree No. 422-п remain one observation set for 2022 across all 22 municipalities. New municipality observations begin in the years or point-in-time dates stated in their source documents. Do not treat missing years or municipalities as zero.

The source registry has been updated with the eight additional source records and their URLs, owners, temporal coverage, formats and usage notes. Each is marked `partially_imported`.

## D. Remaining Stage 2 work

1. Continue collecting official municipal 2023–2026 unemployment rate and registered-unemployed count observations for the remaining municipalities, without inferring or filling missing values.
2. Investigate the “Работа России” API and the HMAO labour portal for vacancy snapshots. The official API supports region-level retrieval and offset/limit pagination (up to 100 records per request); a vacancy is assignable to a municipality only where the source address/location identifies it unambiguously. Keep region-level or ambiguous records outside municipality-level indicators.
3. Find an additional official source for 8423002–8423004 or document their absence in the current regional municipal archive.
4. Conduct one integrated review of demographic and employment staging: indicator mapping, units, annual vs point-in-time dates, cumulative periods, OKVED2 activity dimensions and organisation ownership. Promote only explicitly accepted and verified records.
5. Do not merge this operational branch into `main`, change the public website, or deploy production until the user-requested review/promotion step.

## Next action

Continue official municipal-source acquisition for unemployment and demand for workers; in parallel, validate whether the federal vacancy API exposes an unambiguous municipal address for HMAO records. Then complete the controlled review and normalization. All current rows remain isolated in private review staging.
