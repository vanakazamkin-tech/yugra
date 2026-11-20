# Yugra data-import checkpoint — 2026-11-21

## Current target and safety rules

- Repository: `vanakazamkin-tech/yugra`
- Working branch: `ops/extract-hmao-demography-2026-11`
- Supabase project: `dmbikidqikjupkghywbz` (`eu-north-1`)
- Staging target: `public.municipality_indicator_import_staging`
- Production/analytic target: `public.municipality_indicators`

**Never promote or display these records as verified statistics until indicator mapping, population category, units, observation period, geography and source provenance have been manually reviewed.** All newly uploaded records remain `review_status='pending'`. Missing rows are not zeroes. No synthetic values are generated.

## Source A — latest BDPMO regional exports, 2026-09-28

Catalogue/source ID: `tochno_bdmo_hmao_20260928`  
Source page: https://tochno.st/datasets/bdmo  
License: CC BY 4.0 with attribution.

### Successful staging import

- Upload workflow run: https://github.com/vanakazamkin-tech/yugra/actions/runs/44802352292
- Upload report artifact ID: `14661792733` (`hmao-demography-staging-report`)
- Population-estimate extraction workflow run: https://github.com/vanakazamkin-tech/yugra/actions/runs/44804573058
- Population-estimate upload workflow run: https://github.com/vanakazamkin-tech/yugra/actions/runs/44804831258
- Population-estimate audit artifact ID: `14662053473` (`hmao-demography-additional-extract`)
- Branch commits include the additional extractor, review-only uploader and their workflows.
- Supabase source contains **226,058 rows**, all `pending`.

| Indicator | Description | Rows | Municipalities | Year range |
|---|---|---:|---:|---|
| 8112014 | Total population by age and sex | 94,352 | 22 | 2011–2024 |
| 8112015 | Urban population by age and sex | 88,961 | 21 | 2011–2024 |
| 8112016 | Rural population by age and sex | 40,920 | 10 | 2011–2024 |
| 8112021 | Arrivals | 308 | 22 | 2010–2023 |
| 8112022 | Departures | 308 | 22 | 2010–2023 |
| 8112023 | Migration balance | 308 | 22 | 2010–2023 |
| 8112027 | Estimated population on 1 January | 901 | 22 | 2009–2025 |
| **Total** | | **226,058** | | |

### 8112027 population estimate detail

All 901 rows were checked after upload:

| Population category (`mest`) | Rows | Municipalities | Years |
|---|---:|---:|---|
| Все население | 374 | 22 | 2009–2025 |
| Городское население | 357 | 21 | 2009–2025 |
| Сельское население | 170 | 10 | 2009–2025 |

- No blank numeric values in the 901-row file.
- The source unit is `Человек`; source period is `На 1 января`.
- `mest` remains preserved in `raw_record`, so total/urban/rural observations remain distinguishable.
- Indicator mapping, normalized unit and normalized period are intentionally still null pending review.

### Coverage gaps and missing archives

- 8112015: no rows for Khanty-Mansiysky District.
- 8112016: the source has rural-population rows for 10 municipalities; no rural rows for 12 urban municipalities.
- For 8112001, 8112003, 8112004, 8112007, 8112008 and 8112009, the expected region-71 archive URLs returned HTTP 404 in the 2026-09-28 archive path. These six codes were **not** uploaded from this release. Do not infer zeroes or fabricate a replacement from this source.
- The source record remains `partially_imported` while mappings and reviews are incomplete.

### Implementation files

- `.github/workflows/extract-hmao-demography.yml`
- `scripts/ops/extract_hmao_demography.py`
- `.github/workflows/upload-existing-hmao-demography.yml`
- `scripts/ops/upload_hmao_demography_staging.py`
- `.github/workflows/extract-hmao-additional-demography.yml`
- `scripts/ops/extract_hmao_additional_demography.py`
- `.github/workflows/upload-hmao-population-estimate.yml`
- `scripts/ops/upload_hmao_population_estimate_staging.py`

The original 500-row staging batch exceeded the Supabase statement timeout. Upload resumed safely through the unique key `(source_id, source_record_key)` with a batch size of 100 and 3 workers. The final upload workflow succeeded.

## Source B — older processed municipal-demography series

Catalogue/source ID: `tochno_mun_demography_2026`  
Source page: https://tochno.st/datasets/mun_demography  
Underlying archive: `data_mun_demography_123_v20240612_csv.zip`  
License: CC BY 4.0 with attribution.

There are **2,310 existing review-staging rows**, all pending:

| Source indicator code | Meaning | Rows | Municipality count | Years | Type |
|---|---|---:|---:|---|---|
| 8112001 | Deaths | 286 | 22 | 2010–2022 | Processed source field |
| 8112003 | Births, excluding stillbirths | 286 | 22 | 2010–2022 | Processed source field |
| 8112004_DERIVED | Natural increase/decrease | 286 | 22 | 2010–2022 | Derived as births minus deaths |
| 8112007 | Crude birth rate | 286 | 22 | 2010–2022 | Processed source field |
| 8112008 | Crude death rate | 286 | 22 | 2010–2022 | Processed source field |
| 8112009_DERIVED | Natural increase/decrease rate | 286 | 22 | 2010–2022 | Derived from births, deaths and average population |
| 8112023 | Migration balance | 286 | 22 | 2010–2022 | Processed source field |
| 8112027 | Estimated population on 1 January | 308 | 22 | 2010–2023 | Processed source field |

Important interpretation:
- This older processed dataset is the current available source for 8112001, 8112003, 8112007 and 8112008 in the staging layer, but it only covers 2010–2022 and is not the 2026 regional BDPMO extract.
- 8112004 and 8112009 are explicitly `_DERIVED` records in this source. Do not relabel them as raw Rosstat 8112004 or 8112009 observations.
- Population in this older dataset is reconstructed from the 2010 census via the demographic-balance equation. It is secondary processed data, not a direct unmodified Rosstat population series.
- The older source requires manual review and independent comparison before acceptance.

## Database footprint and integrity

- Supabase database size after these uploads: approximately **337 MB**.
- The previous Free-plan quota check was 500 MB. Keep subsequent imports compact; do not store full original source rows repeatedly when they can be reproduced from the cited archives.
- Total rows from Source A: 226,058.
- Total rows from Source B: 2,310.
- All 228,368 observations remain in review staging.
- `public.municipality_indicators` has **0** rows from Source A and Source B; no analytic data was promoted.
- Database/source catalogue import statuses remain `partially_imported` until all source mappings and manual reviews are complete.

## Current status of the 13 requested first-stage indicators

- Available in staging from Source A (2026 BDPMO): 8112014, 8112015, 8112016, 8112021, 8112022, 8112023, 8112027.
- Available in staging from older Source B: 8112001, 8112003, 8112007, 8112008, 8112023, 8112027; 8112004 and 8112009 are only present as derived codes.
- No verified/raw 2026 Source-A rows for 8112001, 8112003, 8112004, 8112007, 8112008 or 8112009 were obtained from the regional archive path.
- Thus all 13 conceptual indicator families are represented somewhere in staging, but **not all are current or raw**. The two derived series and the older 2010–2022 values must be clearly distinguished.

## Next steps

1. Continue searching official Rosstat/BDPMO or another attributable current source for 8112001, 8112003, 8112004, 8112007, 8112008 and 8112009, including annual updates beyond 2022.
2. Do not promote `8112004_DERIVED` or `8112009_DERIVED` into source-code fields 8112004/8112009 without an explicit model decision and retained derivation metadata.
3. Review 8112027 category semantics and overlap against 8112014–8112016 before building any combined population series.
4. Validate the source definitions, units and periods against the Rosstat indicator metadata and project dictionary.
5. Only after review, accept selected staging rows into `public.municipality_indicators`.

Do not merge the operational branch into `main` or alter the public site as part of this staging task.


## Additional official regional source identified — Demographic yearbook 2021–2025

- Source ID: `rosstat_hmao_demographic_yearbook_2021_2025`
- Source PDF: https://72.rosstat.gov.ru/storage/mediabank/18129.pdf
- Official regional statistical office catalogue description says the edition covers HMAO urban okrugs and municipal districts and includes births, deaths, migration flows, population composition and demographic coefficients.
- The catalogue card lists a price of **2,659 RUB** for the issue.
- A Supabase `data_sources` catalogue record has been added with status `identified`.
- **No PDF tables have been extracted and no rows from this source have been uploaded.** The source description alone is not evidence of observed values.
- The PDF could not be retrieved/rendered through the available automated download path during this run; no unsafe TLS bypass was used.
- This is the priority source candidate for refreshing municipal-level 8112001/8112003/8112004/8112007/8112008/8112009 and potentially updating 8112021/8112022/8112023 for 2021–2025, after obtaining the full edition and inspecting its tables.

Official metadata references located during research:
- Tochno current BDMO catalogue page describes 603 indicators in 33 sections, including Population section 31, with per-indicator downloads; sections 31 and 32 are available only by indicator because of their size.
- Rosstat indicator definitions identify 8112001/8112003/8112004/8112007/8112008/8112009 as annual demographic indicators, with births/deaths and rates calculated from EGR ZAGS data; migration codes 8112021/8112022/8112023 are derived from annual migration tables/forms.
