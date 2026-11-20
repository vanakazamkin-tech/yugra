# Yugra data-import checkpoint — 2026-11-21

## Project and safety rules

- Repository: `vanakazamkin-tech/yugra`
- Working branch: `ops/extract-hmao-demography-2026-11`
- Supabase project: `dmbikidqikjupkghywbz` (`eu-north-1`)
- Review staging table: `public.municipality_indicator_import_staging`
- Analytical table: `public.municipality_indicators`

**No records from these new source imports have been promoted into the analytical table.** Every imported row remains `review_status='pending'`. Indicator mapping, normalized period and normalized unit remain null until manual review. Missing observations are not zeroes; no synthetic values are generated.

## Source A — current BDPMO release, 2026-09-28

- Source ID: `tochno_bdmo_hmao_20260928`
- Catalogue page: https://tochno.st/datasets/bdmo
- Inner archive: https://storage.yandexcloud.net/tochno-st-catalog/Rosstat/data_bdmo_118_v20260928/by_indicator/data_section31_112_v20260928.zip
- Source license: CC BY 4.0; attribute the catalogue/source when reusing.
- Source type: processed Rosstat / BД ПМО regional export distributed through the Tochno catalogue.

### Critical archive-path correction

The six additional indicators 8112001, 8112003, 8112004, 8112007, 8112008 and 8112009 **are present in the current 2026 release**. They are stored as CSV members inside the combined 7,066,706,524-byte section-31 ZIP under `by_indicator`; they do not have separate region-71 ZIP files under `regions/`. Individual `regions/data_Y4..._region71...` URLs return 404, but that does not mean the indicators are absent.

To avoid downloading the 7 GB ZIP, the extractor reads the central directory and retrieves only six compressed CSV members by HTTP Range:
- compressed bytes fetched for six indicators: 11,538,349;
- uncompressed CSV size: about 677 MB;
- 16 HTTP range requests in the successful extraction;
- ZIP CRC32 checked for all six extracted members;
- only region 71 and the 22 configured OKTMO codes retained.

Successful extraction:
- Workflow run: https://github.com/vanakazamkin-tech/yugra/actions/runs/44810471027
- Extraction artifact: `hmao-core-demography-2026-extract`, artifact ID `14666256244`
- Extractor: `scripts/ops/extract_hmao_municipality_core_demography.py`
- Workflow: `.github/workflows/extract-hmao-core-demography.yml`

### All 13 requested demographic indicator groups now present in Source A

| Code | Indicator | Rows | Municipalities | Years | Source unit |
|---|---|---:|---:|---|---|
| 8112001 | Deaths | 308 | 22 | 2010–2023 | Человек |
| 8112003 | Births (excluding stillbirths) | 308 | 22 | 2010–2023 | Человек |
| 8112004 | Natural increase/decrease | 264 | 22 | 2012–2023 | Человек |
| 8112007 | Crude birth rate | 308 | 22 | 2010–2023 | Промилле |
| 8112008 | Crude death rate | 308 | 22 | 2010–2023 | Промилле |
| 8112009 | Natural increase/decrease rate | 263 | 22 | 2012–2023 | Промилле |
| 8112014 | Total population by age and sex | 94,352 | 22 | 2011–2024 | Multiple source dimensions |
| 8112015 | Urban population by age and sex | 88,961 | 21 | 2011–2024 | Multiple source dimensions |
| 8112016 | Rural population by age and sex | 40,920 | 10 | 2011–2024 | Multiple source dimensions |
| 8112021 | Arrivals (overall total) | 308 | 22 | 2010–2023 | Человек |
| 8112022 | Departures (overall total) | 308 | 22 | 2010–2023 | Человек |
| 8112023 | Migration balance (overall total) | 308 | 22 | 2010–2023 | Человек |
| 8112027 | Estimated population on 1 January | 901 | 22 | 2009–2025 | Человек |
| **Total Source A** | | **227,817** | | | |

Notes:
- 8112004 is a directly extracted current-source series, not the old `8112004_DERIVED` formula series.
- 8112009 is a directly extracted current-source series, not the old `8112009_DERIVED` formula series.
- 8112004 begins in 2012; the absence of 2010–2011 observations is not filled.
- 8112009 begins in 2012 and has one missing observation: Megion, 2021. This remains a missing value.
- 8112015 lacks Khanty-Mansiysky District; 8112016 contains rural rows only for 10 municipalities (12 urban municipalities do not have rural rows).
- 8112021–8112023 were reduced to the requested overall total cross-section using the source dimensions; they are not all migration/age/sex slices.
- All 1,759 rows from the six newly extracted core series were checked: no blank or non-numeric values, no duplicated municipality-year keys within any code, and all 22 project municipalities appear somewhere in every code.
- Period for all six newly extracted codes is `Значение показателя за год`.
- Source units: 8112001/8112003/8112004 = people; 8112007/8112008/8112009 = per mille.
- Source metadata and original dimensions are retained in `raw_record`, with exact source archive/member and SHA-256 source-row key.

### Staging uploads

First stage:
- Upload run: https://github.com/vanakazamkin-tech/yugra/actions/runs/44802352292
- Uploaded 225,157 records: 8112014–8112016, 8112021–8112023.

Population-estimate addition:
- Extraction run: https://github.com/vanakazamkin-tech/yugra/actions/runs/44804573058
- Upload run: https://github.com/vanakazamkin-tech/yugra/actions/runs/44804831258
- Uploaded 901 records for 8112027.

Six core indicators addition:
- Extraction run: https://github.com/vanakazamkin-tech/yugra/actions/runs/44810471027
- Upload run: https://github.com/vanakazamkin-tech/yugra/actions/runs/44810737504
- Upload report artifact: `hmao-core-demography-staging-report`, artifact ID `14666580123`
- Uploaded 1,759 records: 8112001, 8112003, 8112004, 8112007, 8112008, 8112009.

Final verified state for Source A:
- **227,817 rows** in `public.municipality_indicator_import_staging`.
- All 227,817 rows have `review_status='pending'`.
- All Source A rows are intentionally unmapped and have no normalized period/unit yet.
- The 1,759 latest rows have 1,759 unique source record keys, 0 blank numeric values and 0 duplicate municipality-year keys per indicator.
- Source A analytical-table rows: **0**.
- Supabase database size after upload: approximately **340 MB**. Earlier observed Free-plan quota was 500 MB; continue keeping future imports compact.

### Implementation files

- `.github/workflows/extract-hmao-demography.yml`
- `scripts/ops/extract_hmao_demography.py`
- `.github/workflows/upload-existing-hmao-demography.yml`
- `scripts/ops/upload_hmao_demography_staging.py`
- `.github/workflows/extract-hmao-additional-demography.yml`
- `scripts/ops/extract_hmao_additional_demography.py`
- `.github/workflows/upload-hmao-population-estimate.yml`
- `scripts/ops/upload_hmao_population_estimate_staging.py`
- `.github/workflows/extract-hmao-core-demography.yml`
- `scripts/ops/extract_hmao_municipality_core_demography.py`
- `.github/workflows/upload-hmao-core-demography.yml`
- `scripts/ops/upload_hmao_core_demography_staging.py`

The original 500-row batch for the first stage exceeded the Supabase statement timeout. It was safely resumed with a batch size of 100 and three workers using unique conflict key `(source_id, source_record_key)`. Subsequent uploads use the smaller batch setting.

## Source B — older processed municipal-demography dataset

- Source ID: `tochno_mun_demography_2026`
- Page: https://tochno.st/datasets/mun_demography
- Underlying archive: `data_mun_demography_123_v20240612_csv.zip`
- License: CC BY 4.0; attribute the source.

There are **2,310 existing review-staging rows**, all pending:

| Source indicator code | Meaning | Rows | Municipalities | Years | Type |
|---|---|---:|---:|---|---|
| 8112001 | Deaths | 286 | 22 | 2010–2022 | Processed source field |
| 8112003 | Births | 286 | 22 | 2010–2022 | Processed source field |
| 8112004_DERIVED | Natural increase/decrease | 286 | 22 | 2010–2022 | Derived: births minus deaths |
| 8112007 | Crude birth rate | 286 | 22 | 2010–2022 | Processed source field |
| 8112008 | Crude death rate | 286 | 22 | 2010–2022 | Processed source field |
| 8112009_DERIVED | Natural increase/decrease rate | 286 | 22 | 2010–2022 | Derived from births, deaths and average population |
| 8112023 | Migration balance | 286 | 22 | 2010–2022 | Processed source field |
| 8112027 | Estimated population on 1 January | 308 | 22 | 2010–2023 | Processed source field |

Important interpretation:
- The older processed dataset is secondary and is not a substitute for the current 2026 Source A release.
- 8112004_DERIVED and 8112009_DERIVED are explicitly derived values in this source. Do not relabel them as original code 8112004/8112009.
- Population in this older dataset is reconstructed from the 2010 census using a demographic-balance equation.
- These older rows remain separate under Source B and should be retained for comparison/history, not automatically merged into Source A.

## Source C — official regional demographic yearbook candidate

- Source ID: `rosstat_hmao_demographic_yearbook_2021_2025`
- Candidate PDF: https://72.rosstat.gov.ru/storage/mediabank/18129.pdf
- The catalogue description says this official regional yearbook covers HMAO municipal districts and urban okrugs and contains births, deaths, migration, population composition and demographic coefficients.
- The catalogue card listed a price of 2,659 RUB.
- A source catalogue record was added with status `identified`.
- No PDF tables were extracted and no values from this yearbook were uploaded. Keep this source at identified until the complete publication has been obtained and checked.

## Database totals and integrity

- Source A: 227,817 rows.
- Source B: 2,310 rows.
- Source C: 0 rows.
- **Total review-staging observations: 230,127.**
- All new imported records remain pending review.
- Analytical rows promoted from these three sources: **0**.
- Current approximate database size: **340 MB**.
- Keep future imports compact and do not store the full 7 GB outer archive or unnecessary nationwide data in Supabase.

## Next stage — manual validation and mapping

1. Match all 13 Source A indicator groups to the Yugra project's internal indicator dictionary.
2. Confirm measurement definitions and source units, especially the per-mille rates; preserve the source unit and record any normalization decision explicitly.
3. Decide how to handle the 8112009 Megion 2021 gap, without filling it with zero or interpolation.
4. Review coverage differences in total/urban/rural population and the 8112004/8112009 2012 starting year.
5. Compare current Source A against the older Source B values; do not silently merge or overwrite historical rows.
6. Only after those checks, manually accept the selected rows into `public.municipality_indicators`.

Do not merge this operational branch to `main` or alter the public site as part of this data-staging task.
