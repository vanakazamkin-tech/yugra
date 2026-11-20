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

After the subsequent imports, together with the 44 pre-existing 2022 observations, the unemployment/vacancy source set contains **121 observations across 28 sources**. The latest 11 additions described in sections J and K are included; all remain pending. Do not rely on earlier historical subtotals in sections B–I as the current total.

### Distinguish vacancy measures

The six vacancy-related observations must remain semantically separate:
- Oktyabrsky district: employer-reported demand for workers to fill vacant posts, 3,694 at 01.01.2026.
- Surgut: employer-reported need reported to the employment service, 1,864 at 31.12.2024.
- Oktyabrsky district: employer-reported demand of 2,527 at 01.07.2025, including 1,947 jobs in working occupations.
- Kogalym: preliminary employer-reported demand, 1,281 at 01.07.2025.
- Yugorsk: 210 open positions in the city employment centre at the end of 2024.
- Surgut: 4,539 employer-declared vacancies/worker demand at 01.06.2024.

These are not interchangeable with the number of active vacancy advertisements on the federal “Работа России” portal. Preserve each original metric definition and observation date.

## C. Final verification of the expanded unemployment/vacancy staging set

Direct SQL verification after the additional imports confirmed:

- Total rows across the twenty-eight sources above: **121**.
- Distinct source keys: **121**.
- Review status: **121 pending**.
- Validation errors: **0**.
- Unmapped municipalities: **0**.
- Municipalities represented across the combined base and local sources: **22**.
- Sources: **28**.
- Rows with `imported_indicator_id` set: **0**.
- No rows have been promoted into the analytical table.

All 44 rows from Decree No. 422-п remain one observation set for 2022 across all 22 municipalities. New municipality observations begin in the years or point-in-time dates stated in their source documents. Do not treat missing years or municipalities as zero.

The source registry has been updated with twenty-seven additional source records and their URLs, owners, temporal coverage, formats and usage notes. Each is marked `partially_imported`.

## D. Remaining Stage 2 work

1. Continue collecting official municipal 2023–2026 unemployment rate and registered-unemployed count observations for the remaining municipalities, without inferring or filling missing values.
2. Investigate the “Работа России” API and the HMAO labour portal for vacancy snapshots. The official API supports region-level retrieval and offset/limit pagination (up to 100 records per request); a vacancy is assignable to a municipality only where the source address/location identifies it unambiguously. Keep region-level or ambiguous records outside municipality-level indicators.
3. Find an additional official source for 8423002–8423004 or document their absence in the current regional municipal archive.
4. Conduct one integrated review of demographic and employment staging: indicator mapping, units, annual vs point-in-time dates, cumulative periods, OKVED2 activity dimensions and organisation ownership. Promote only explicitly accepted and verified records.
5. Do not merge this operational branch into `main`, change the public website, or deploy production until the user-requested review/promotion step.

## Next action

Continue official municipal-source acquisition for unemployment and demand for workers; in parallel, validate whether the federal vacancy API exposes an unambiguous municipal address for HMAO records. Then complete the controlled review and normalization. All current rows remain isolated in private review staging.


## E. Two further municipal source additions (2026-11-21)

A further six observations were added from two additional official sources:

| Source ID | Municipal area | Rows | Coverage / date |
|---|---|---:|---|
| `khanty_mansyisk_labour_snapshot_2024` | Khanty-Mansiysk | 3 | 2023 annual rate; comparable 01.07.2023 and 01.07.2024 rates |
| `surgut_labour_snapshot_2024_06` | Surgut | 3 | 01.06.2024: rate, registered unemployed count, employer-declared demand |

Khanty-Mansiysk values are from the city administration's forecast approved by order dated 14.11.2024 No. 100-р. Only historical reported values were imported: 0.17% for 2023, 0.18% on 01.07.2023 and 0.11% on 01.07.2024. The 2024 full-year estimate (0.12%) was deliberately excluded from fact observations.

Surgut values are from the official city administration market-labour snapshot published 07.06.2024: registered unemployment rate 0.12%, 209 registered unemployed, and employer-reported demand 4,539 at 01.06.2024. The source also publishes demand by economic activity, but only its total was staged in this pass.

### Data-quality conflict requiring resolution

A later Surgut city strategy monitoring page (published 26.02.2026 for 2024–2025) reports end-of-year registered unemployment falling from 0.15% to 0.12%. This potentially conflicts with the 2024 socioeconomic report already staged for Surgut, which gives 0.09% at 31.12.2024. Do not overwrite either value or load the contested 0.12% as a 2025 observation until the period definitions and source table have been reconciled. The 0.12% for 01.06.2024 above is a separate mid-year snapshot and is not that disputed annual figure.

## Updated expanded-staging verification

The final 2026-11-21 check across the twenty-eight unemployment/vacancy sources found:
- **121 total staging rows; 121 distinct source keys.**
- **121 pending; 0 validation errors; 0 unmapped municipality IDs.**
- All **22** project municipalities appear in the combined source set (the full 2022 table covers all 22).
- **28 source IDs** represented in staging.
- **0** rows with `imported_indicator_id`; no promotion or production/site change.
- 96 registered-unemployment observations and 6 vacancy / employer-demand / employment-centre-openings observations.

The Supabase project work-log record `P2-LABOUR-20261121` has been updated. The operational branch checkpoint is the current handover record.


## F. Monthly Hанты-Мансийский район employment-centre bulletin

A further six unemployment observations were imported from the district administration's official 10.10.2024 bulletin, [labour-market indicators as of 01.10.2024](https://hmrn.ru/about/info/messages/95709/):

| Reference date | Registered unemployed | Registered unemployment rate |
|---|---:|---:|
| 01.10.2023 | 61 | 0.23% |
| 01.09.2024 | 90 | 0.34% |
| 01.10.2024 | 89 | 0.34% |

The same post lists an archive of monthly employment-centre bulletins through 01.09.2025, but the linked 2025 DOCX file was not retrievable through the current browser/file path. No uninspected DOCX values were imported.

Data-quality exclusions from the 01.10.2024 bulletin:
- Its “beginning of year” column shows 70 registered unemployed / 0.26%, conflicting with the district administration's separate annual page, which reports 68 / 0.25% on 01.01.2024. Those contested columns were not imported.
- The summary mentions 55 units of employer need, while its dynamic table lists 96 free workplaces at the beginning of the month. No vacancy value from this document was imported pending reconciliation.


## G. Further official half-year source for Oktyabrsky district

Five further observations were imported from the district administration's official report for the first half of 2025, [social-economic development results for Q2 2025](https://oktregion.ru/upload/docs/ekonomika-i-finansy/sotsialno-ekonomicheskoe-azvitie/itogi/sotsialno-ekonomicheskoe-razvitieitogiItogi_sots_econ_razvitiya_za_2_kv_2025.pdf):

| Reference date | Registered unemployed | Registered unemployment rate | Employer-reported worker demand |
|---|---:|---:|---:|
| 01.07.2024 | 258 | 1.4% | — |
| 01.07.2025 | 249 | 1.3% | 2,527 vacancies |

Of the 2,527 employer-reported vacancies at 01.07.2025, 1,947 are for working occupations. This measure remains distinct from the portal's currently advertised listings and from other municipal vacancy snapshots.

The final expanded unemployment/vacancy source set now contains **95 observations from 13 source IDs**: 89 unemployment rate/count observations and 6 distinct worker-demand / open-position observations. All are verified in Supabase staging as pending, with unique source keys and no municipality mapping or validation errors; no analytical promotion has taken place.

## H. “Работа России” API — integration boundary

The public API documentation confirms a region endpoint `/api/v1/vacancies/region/%region_code%`, JSON GET responses, a 100-record page limit with `limit` / `offset`, and `modifiedFrom` / `modifiedTo` filtering by ISO-8601 timestamps. However, the live HMAO regional JSON endpoint and the linked WADL schema could not be fetched through the current execution environment. Therefore no current listing count, municipality address field, or municipal coverage has been verified, and no API vacancy rows have been imported. Before ingestion, retrieve and inspect live JSON, validate the address/location field against the 22 municipality reference list, deduplicate vacancy IDs, and snapshot retrieval time. Keep unmatched listings at regional level rather than forcing them onto a municipality.


## I. Latest municipal-source extension — 21 November 2026

A further seven fact observations were added from six additional municipal documents:

| Source ID | Municipal area | Rows | Observation |
|---|---|---:|---|
| `raduzhny_labour_2024` | Raduzhny | 1 | Registered unemployment rate 0.46% at 31.12.2024 |
| `nyagan_labour_2024` | Nyagan | 1 | Registered unemployment rate 0.39% at 01.01.2025 |
| `nefteyugansky_labour_2024_11` | Nefteyugansky district | 1 | Registered unemployment rate 0.02% at 25.11.2024 |
| `surgutsky_labour_2024_10` | Surgutsky district | 1 | Historical registered unemployment rate 0.11% at 01.01.2024 |
| `surgutsky_labour_2025_10` | Surgutsky district | 1 | Registered unemployment rate 0.06% for the completed 2025 period |
| `nizhnevartovsk_labour_2025` | Nizhnevartovsk | 2 | 194 registered unemployed and 0.12% registered unemployment for 2025 |

Source documents:
- Raduzhny: official administration act, adopted 30.06.2025 No.598, [publication in GARANT](https://base.garant.ru/412345626/53f89421bbdaf741eb2d1ecc4ddb4c33/).
- Nyagan: administration resolution 07.04.2026 No.910, [publication in GARANT](https://base.garant.ru/414881362/da0ca740e319b67eff630b4065586e13/). The reported 0.39% is explicitly as at 01.01.2025; the previous-year value was not back-calculated from the stated 0.22 percentage-point decrease.
- Nefteyugansky district: head of district's report to the Duma of KhMAO-Yugra, December 2024, [official PDF on the Duma website](https://www.dumahmao.ru/povest/0741_4/19/04.pdf). The report states the unemployment rate at 25.11.2024 was 0.02%.
- Surgutsky district: administration resolution 22.10.2024 No.2381, [publication in GARANT](https://base.garant.ru/410589626/510567bc799b499f450a4638e59966a6/), provides a historical fact of 0.11% on 01.01.2024. The forecast value 0.08% for end-2024 was excluded. A later strategy amendment adopted by the district Duma 25.09.2026 No.1231, [publication in GARANT](https://base.garant.ru/414967804/53f89421bbdaf741eb2d1ecc4ddb4c33/), explicitly states the achieved 2025 year-end rate of 0.06%.
- Nizhnevartovsk: administration order 29.10.2026 No.582-р, [publication in GARANT](https://base.garant.ru/415213799/53f89421bbdaf741eb2d1ecc4ddb4c33/), reports actual 2025 results: 194 people with official unemployed status and a registered unemployment rate of 0.12%. The separate 2026 expected values (255 people / 0.16%) are estimates and were excluded from fact observations.

### Latest Supabase verification after this extension

Direct SQL check over the 19 unemployment/vacancy source IDs confirms:
- **121 rows total and 121 distinct source keys**.
- **102 pending**, 0 validation errors, 0 unmapped municipality IDs.
- All 22 project municipalities are represented by the combined series, including the all-municipality 2022 base table.
- **19 source IDs** represented in staging.
- **0** rows with `imported_indicator_id`; no promotion to `municipality_indicators`.

The 120 rows include both registered-unemployment rate/count observations and locally reported vacancy/worker-demand figures with separate definitions; exact current measure counts must be taken from the raw indicator names/codes rather than the historical 102-row subtotal.

The following municipalities still have only the all-municipality 2022 baseline for registered unemployment in the currently staged sources: **Beryozovsky district, Kondinsky district and Nizhnevartovsk district** still have only the full 2022 baseline. Langepas has later secondary-source observations and an official 2024 point; Pyt-Yakh has a 2025 secondary-source observation only, requiring primary-source confirmation; Pokachi has an official 2023 report; Urai has a 2024 rate observation; Sovetsky district has a 2023 baseline and a separate 2024 estimate. Continue acquisition for these areas first. Do not extrapolate missing years or replace municipal values with the HMAO regional aggregate.


## J. Latest source additions — Langepas and Pyt-Yakh (21 November 2026)

Ten additional observations were imported into review staging from four source IDs:

| Source ID | Area | Rows | Coverage |
|---|---|---:|---|
| `langepas_labour_2024_official` | Langepas | 1 | Official annual unemployment rate 0.08% for 2024 |
| `langepas_labour_2025_07_secondary` | Langepas | 3 | 0.08% at beginning of 2025; 0.07% and 18 registered unemployed by end-July 2025 |
| `langepas_labour_2026_03_secondary` | Langepas | 3 | 0.10%, 24 registered unemployed, and 234 reported vacancies at beginning of spring 2026 |
| `pytyakh_labour_2025_h1_secondary` | Pyt-Yakh | 3 | At 01.07.2025: 36 registered unemployed, rate 0.13%, employer-reported need 668 vacancies |

### Source quality notes

- Langepas 2024: municipal administration document, Section 3.3.3; the 0.08% annual rate is a directly stated official municipal value.
- Langepas July 2025 and early-spring 2026: local city newspaper `Звезда Лангепаса`, citing the HMAO Department of Labour and Employment. These are secondary reproductions, not the primary administrative table. Exact reference date for the early-spring 2026 snapshot is not disclosed, so the raw period preserves the wording “к началу весны 2026 года”; the figure 234 vacancies is a separate, currently insufficiently defined measure and must not be equated with employer-declared need or federal portal listings. The July 2025 article says “более 450” vacancies; this inexact quantity was not imported.
- Pyt-Yakh: the three 01.07.2025 values come from an independent appraisal report by LLC “Integral-Partner”, report No.24-2025 dated 22.09.2025, section 7.1. This is not the municipality's primary statistical report. All observations are explicitly pending and require corroboration against the city's first-half 2025 report / employment-centre statement. The official city site page with annual reports linked a 2024 DOCX, but the file retrieval failed in the current session; no uninspected DOCX values were used.

## Updated final Supabase control (after section J)

Direct SQL verification across the 27 source IDs confirms:
- **120 staging rows and 120 distinct `source_record_key` values within their source IDs.**
- **120 pending**, 0 validation errors, 0 unmapped municipality IDs.
- **27 source IDs** represented.
- All **22** municipalities are represented by the combined source set; the 2022 Decree No.422-п baseline covers every municipality.
- **0** rows with `imported_indicator_id`; no analytical promotion or production change.

The two remaining areas with no post-2022 registered-unemployment observations in the current source set are Kondinsky district and Nizhnevartovsk district. Beryozovsky district now has a 2025 rate observation from the municipality-founded news outlet reporting the annual head-of-district report. Pyt-Yakh's 2025 observation is secondary and needs primary confirmation; Langepas's 2025–2026 media figures also need primary source confirmation before promotion. Keep these quality distinctions visible in all further summaries.


## K. Further official municipal report — Beryozovsky district (21 November 2026)

One additional fact observation was added from the annual report of the head of Beryozovsky district for 2025, heard at the 31st meeting of the district Duma on 17.02.2026:

| Source ID | Area | Rows | Observation |
|---|---|---:|---|
| `berezovsky_labour_2025` | Beryozovsky district | 1 | Registered unemployment rate 0.54% for the completed 2025 period |

The report is covered by a municipal news publication, “Березово.Инфо”, whose founder is the Administration of Beryozovsky district: [article dated 17.02.2026](https://berezovoinfo.ru/2026/02/17/prioritet-komfort-i-blagopoluchie-zhitelej/). It states the 2025 annual report and the reduction in registered unemployment from 0.89% to 0.54%. Only the 0.54% current 2025 outcome was imported. The comparison figure 0.89% was not inserted as a separate observation because the article does not specify its exact reference date.

## Latest final Supabase control (after section K)

Direct SQL verification across the 28 source IDs confirms:
- **121 staging rows and 121 distinct source keys.**
- **121 pending**, 0 validation errors, 0 unmapped municipality IDs.
- **28 source IDs** represented.
- All **22** municipalities are present in the combined set via the full 2022 baseline table.
- **0** rows with `imported_indicator_id`; no analytical promotion or production/site change.

Post-2022 municipal coverage has now expanded for Beryozovsky district through 2025, Langepas through the secondary 2026 snapshot, and Pyt-Yakh through the secondary 2025 report. The two remaining areas without later-than-2022 observations in the current staging set are **Kondinsky district and Nizhnevartovsk district**. The Pyt-Yakh and recent Langepas observations remain secondary and require primary-source corroboration before promotion.
