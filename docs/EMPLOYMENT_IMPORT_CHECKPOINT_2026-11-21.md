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


## L. Kondinsky district — primary 2025 report located, but file extraction failed

The district's official website confirms the head-of-district annual report for 2025 was adopted by the district Duma on 25.02.2026, decision No.1339: [official document page](https://admkonda.ru/documents/25511.html). The page links an attached DOCX file `rdkr-2026-02-1339.docx`, but retrieval attempts through both the web document link and direct download failed. No numerical values from the DOCX were extracted or imported. The source registry contains `kondinsky_labour_2025_head_report` with status `identified`.

A separate Audit Chamber conclusion No.94 dated 09.12.2025 on the 2026–2028 budget forecast (PDF) contains an estimate of 0.260 thousand registered unemployed for 2025 and 0.350 thousand for 2024, while the accompanying sentence says the 2025 value is 8 people higher than 2024. That statement conflicts with the numbers shown (260 vs 350), and both are forecast/report estimates rather than a fully reconciled annual series. These values were deliberately not entered into staging. Do not use them as actual observations.

This research did not change the current staging total: **121 rows across 28 source IDs**, all pending, unique, error-free and mapped; the extra Kondinsky source is catalogue-only until the official DOCX can be read.


## M. Langepas November 2026 and Kondinsky 2023 additions (21 November 2026)

### Langepas — November 2026 secondary snapshot

Three observations were added from the local publication “Звезда Лангепаса”, published 19.11.2026. The article attributes the figures to the HMAO Department of Labour and Employment and reports:
- registered unemployment rate: **0.13%**;
- officially registered unemployed residents: **32 people**;
- labour-market offers: **231** (the article says the reported number fell from 343 to 231).

Source: [article dated 19.11.2026](https://zvezda-langepasa.ru/2026/11/19/уровень-безработицы-в-лангепасе-за-год-подрос-но-остается-одним-из-самых-низких-в-городах-хмао/).

The article does not disclose the exact reference date of the figures. In staging the period is therefore written as “at the time of publication 19.11.2026; exact snapshot date not specified”; 19 November is recorded as the publication date, not asserted as the observation date. The 231 measure is labelled separately as secondary “labour-market offers”; it is not equated with employer-declared demand, employment-centre vacancies, or active listings on the federal “Работа России” portal. The prior comparison value 343 was not imported because its reference date and full definition are not sufficiently clear.

Source ID: `langepas_labour_2026_11_secondary`; **3 staging rows**, all `pending`.

### Kondinsky district — 2023 reported number of registered unemployed

One historical observation was added from the official Audit Chamber conclusion No.167 dated 07.12.2024 on the draft 2025–2027 district budget: [PDF](https://admkonda.ru/tinybrowser/files/budzhet/Proekty/2024/zaklyuchenie-kontrolno-schetnoy-palaty-ot-07.12.2024-167-na-proekt-b-ta-rayona-2025-2027gg.pdf).

The text states that the 2024 estimate was 0.350 thousand people, equal to the **reported 2023 data of 0.350 thousand people**. Only the reported 2023 observation was staged. The original text calls this a “level” of registered unemployment while giving the unit “thousand people”; therefore the row preserves the exact source value **0.350** and unit **тыс. чел.**, and uses a cautious raw indicator code for the registered-unemployed count. No conversion to 350 persons and no percentage normalization has been made. The 2024 estimate and 2025–2027 forecasts were excluded. This is an official municipal audit document reproducing the administration's reported data, not the underlying primary statistical table; primary confirmation is still required.

Source ID: `kondinsky_labour_2023_ksp167`; **1 staging row**, `pending`, period 2023. This adds one post-2022 observation for Kondinsky district but does not resolve the need for newer actual data.

### Further source-access checks and exclusions

- Pyt-Yakh: located the official Administration page “Итоги социально-экономического развития”, which lists an archive for 2025: https://adm.py86.ru/deyatelnost/ekonomika/sotsialno-ekonomicheskoe-razvitie/itogi-sotsialno-ekonomicheskogo-razvitiya/. The link to the 2025 archive's child page could not be retrieved in this session. The three 01.07.2025 observations (36 people, 0.13%, employer demand 668) remain explicitly secondary, sourced to appraisal report No.24-2025, and have not been duplicated or promoted.
- Nizhnevartovsk district: a document at https://www.nvraion.ru/upload/iblock/e51/1947%20Прогноз.pdf was inspected. It is Administration Resolution No.1974 of 04.10.2019, a forecast for 2020 and 2021–2022, with 2018 reported and 2019 estimated values; it is not a 2023–2026 actual source. It was excluded.
- A Department of Labour and Employment HMAO explanatory note dated 15.07.2025 contains regional aggregate labour-market figures at 01.07.2025 (1,913 registered unemployed and 23,055 employer-declared vacancies), but no verified municipality-specific disaggregation in the inspected material. Those regional values were not assigned to Nizhnevartovsk district or any other municipality.
- No new numbers were added from the 2025 head-of-district report for Kondinsky because the DOCX attachment to decision No.1339 remains inaccessible. The catalogue-only source `kondinsky_labour_2025_head_report` remains `identified`.

### Latest direct Supabase control after sections M

The employment-category query (joining staging to `data_sources` by source ID) confirms:
- **125 employment staging rows** and **125 unique (source_id, source_record_key) pairs**.
- **125 pending**; **0 validation errors**; **0 unmapped municipality IDs**.
- **0 promoted rows** (`imported_indicator_id` remains null).
- **30 source IDs with staged observations**; a separate Kondinsky 2025 report source remains catalogue-only with no rows.
- All **22 municipality IDs** are represented in the combined employment-source set because of the 2022 Decree No.422-п baseline.

No analytical table, `main`, production deployment, or website interface was changed. All current labour observations remain isolated in review staging.

## Next acquisition priorities after section M

1. Obtain the primary attachment to Kondinsky district Duma decision No.1339 (2025 head-of-district report) and verify the 2023 count against the source administration report.
2. Find post-2022 actuals for Nizhnevartovsk district; continue to exclude city-level and HMAO-wide numbers where the municipal scope is not explicitly district-specific.
3. Retrieve the official Pyt-Yakh 2025 result archive and the HMAO Department primary tables to corroborate Pyt-Yakh and Langepas secondary snapshots.
4. Check the full Beryozovsky district head-of-district report for the number of registered unemployed alongside its already staged 0.54% rate.
5. Continue investigating the “Работа России” API only after verifying a live response and unambiguous municipality address field.
6. Continue keeping all rows pending until the joint Stage 1/2 review and normalization. Do not change `main`, production, or the site design.


## N. Wage-arrears municipal evidence and Stage 2 coverage control (21 November 2026)

### 1. Explicit municipal observations for indicator 8423001

Nine additional dated/period-specific records were added to private review staging. They are all explicitly reported as no overdue wage arrears, are stored as raw value `0` in thousand rubles, and are kept separate from the Rosstat archive observations:

| Source ID | Municipality | Observation period | Evidence |
|---|---|---|---|
| `hmrn_wage_arrears_zero_2020` | Khanty-Mansiysky district | 31.12.2020 | District annual report, citing the territorial Rosstat office |
| `hmrn_wage_arrears_zero_2022` | Khanty-Mansiysky district | 01.01.2022 | Duma resolution No.81 and 2021 annual report |
| `hmrn_wage_arrears_zero_2023` | Khanty-Mansiysky district | 01.01.2023 | Duma resolution No.253 and 2022 annual report |
| `nefteyugansky_wage_arrears_zero_2018_secondary` | Nefteyugansky district | 2018 annual results; exact day not stated | Secondary project document reproducing district administration order No.156-р dated 18.03.2019 |
| `oktregion_wage_arrears_zero_2017` | Oktyabrsky district | End of 2017; exact day not stated | Head-of-district annual report |
| `oktregion_wage_arrears_zero_2019` | Oktyabrsky district | 01.01.2019 | Head-of-district report for 2018 |
| `oktregion_wage_arrears_zero_2020` | Oktyabrsky district | 01.01.2020 | Head-of-district report for 2019 |
| `oktregion_wage_arrears_zero_2021` | Oktyabrsky district | 01.01.2021 | Head-of-district report for 2020 |
| `oktregion_wage_arrears_zero_2022` | Oktyabrsky district | 01.01.2022 | Head-of-district report for 2021 |

All nine rows were checked in Supabase: canonical municipality mapping, `review_status='pending'`, no validation errors. No zero was inferred from a blank archive row. The Nefteyugansky 2018 observation remains a secondary reproduction and needs a primary copy of the administration order/report before final analytical acceptance.

Official/municipal source links:
- HMR district annual report 2020: https://gazeta-hmrn.ru/images/PDF2021/07.pdf
- HMR Duma resolution No.81 / 2021 report: https://www.gazeta-hmrn.ru/images/PDF2022/81rd2022.pdf
- HMR Duma resolution No.253 / 2022 report: https://www.gazeta-hmrn.ru/images/PDF2023/253rd2023.pdf
- Nefteyugansky district 2018 quoted report: https://ovos.ecom.su/bitstream/handle/123456789/382/%D0%A0%D0%B0%D0%B7%D0%B4%D0%B5%D0%BB%20%D0%9F%D0%94%20%E2%84%968%20%D0%9A%D0%BD%D0%B8%D0%B3%D0%B0%20%E2%84%961.pdf?isAllowed=y&sequence=4
- Oktyabrsky reports 2017–2021: https://oktregion.ru/upload/docs/ekonomika-i-finansy/sotsialno-ekonomicheskoe-razvitie/doklady-glavy-administratsii-i-glavy-oktyabrskogo-rayona/Doklad_glavy_za_2017.pdf ; `Doklad_glavy_za_2018.pdf`, `Doklad_glavy_za_2019.pdf`, `Doklad_glavy_za_2020.pdf`, `Doklad_glavy_za_2021.pdf` in the same official directory.

### 2. Final raw source coverage for the Stage 2 wage/employment codes

| Code | Meaning | Rows in BDPMO section 32 | Municipal coverage | Period coverage |
|---|---|---:|---:|---|
| 8423001 | Total overdue wage arrears | 21 | 7 | 2017–2020 |
| 8423002 | Due to late federal budget funding | 0 | 0 | Not present in this regional extract |
| 8423003 | Due to late regional budget funding | 0 | 0 | Not present in this regional extract |
| 8423004 | Due to late local budget funding | 0 | 0 | Not present in this regional extract |
| 8423005 | Mean list employees (organisations excluding small enterprises) | 14,031 | 22 | 2017–2025 annual complete; 2026 Jan–Mar only |
| 8423006 | Payroll fund (organisations excluding small enterprises) | 14,127 | 22 | 2017–2025 annual complete; 2026 Jan–Mar only |
| 8423007 | Average monthly wage (organisations excluding small enterprises) | 15,370 | 22 | 2017–2025 annual complete; 2026 Jan–Mar only |
| 8423015 | Mean list employees (municipal-owned organisations) | 1,272 | 22 | 2017–2025 Jan–Dec |
| 8423016 | Payroll fund (municipal-owned organisations) | 1,302 | 22 | 2017–2025 Jan–Dec |
| 8423017 | Average monthly wage (municipal-owned organisations) | 2,273 | 22 | 2017–2025 Jan–Dec |

The 8423005–8423007 values for 2017–2025 appear in four cumulative periods each year: January–March, January–June, January–September and January–December. For 2026 the archive contains January–March only. **The latest complete annual value is 2025, not 2026.** Cumulative periods must not be added together. The sector dimension `okved2` is retained in the raw records; no duplicate sector table was imported.

Indicator 8423001 now has **30 staged observations across 10 municipalities**: 21 original BDPMO rows plus nine explicit municipal report observations. The three causal indicators 8423002–8423004 remain unavailable in this HMAO archive. Rosstat's municipal catalogue confirms they are separate monthly indicators for arrears caused by late receipt of federal, regional and local budget funds respectively; they must not be inferred from the total 8423001 or treated as zero just because this extract has no rows.

A historical national panel in the RCSI/INID catalogue (“База данных показателей муниципальных образований России за 2006–2020 гг.”) also lists codes 8423002–8423004 and supports municipal-level analysis, but the download interaction currently presents login/registration as a prerequisite. No attempt was made to bypass that access condition and no values were copied from this gated download. The official HMAO Rosstat labour page provides a regional wage-arrears workbook, but it is an Okrug-level series and cannot be assigned to individual municipalities.

### 3. Supabase final control after section N

The direct SQL control of the `Труд и занятость` source category confirms:
- **134 staging rows**, 134 unique `(source_id, source_record_key)` pairs.
- **134 pending** rows; **0 validation errors**.
- **0 unmapped municipality IDs**; all mapped values resolve to the canonical `public.municipalities` dictionary.
- **0 promoted rows** (`imported_indicator_id IS NULL`).
- **39 source IDs with staged observations**.
- All **22 canonical project municipality IDs** are represented in the combined labour source set (the 2022 Decree No.422-п base covers all 22).

The previous temporary HMR alias `hmr-raion` was corrected to the canonical ID `khanty-mansiysky-raion` for three new observations. A subsequent unmatched-ID query returned no rows. The source registry description for `tochno_bdmo_hmao_20260928` was corrected to describe both section 31 (demography) and section 32 (employment/wages), and its notes now explicitly record the 2026 partial-period limit and the missing 8423002–8423004 indicators.

These are coverage/control results, not evidence that every metric is fully populated for every municipality. All labour data remains isolated in review staging and has not been normalized or promoted.

### 4. Stage 2 closure assessment

**Data acquisition and import for the currently accessible official section 32 source are complete for the codes/records present in the archive. Stage 2 is not yet fully closed as a validated analytical dataset.** Open gaps remain:
1. Obtain a legitimate download/access path to the RCSI/INID historic municipal panel or a fresh Rosstat/Tyumenstat municipal extract for 8423002–8423004, then inspect HMAO rows.
2. Obtain a primary source for Nefteyugansky district 2018 and verify the ambiguous 2023 Kondinsky count (0.350 thousand people) against the primary administration report.
3. Confirm the secondary Pyt-Yakh and Langepas reports with primary municipal / HMAO Department tables.
4. Extend 8423001 observations to more municipalities and recent months/years; the current combined series remains sparse and should not be presented as full municipal coverage.
5. Finish joint Stage 1/2 review and normalization (indicator mapping, OKVED2 dimension, units, annual/cumulative periods and fact/estimate/source quality) before any analytical promotion.

No rows were promoted to `municipality_indicators`; no changes were made to `main`, production deployment, or website UI. The work-log status remains `partially_done` rather than falsely marking full statistical closure.


## O. Extractor audit of 8423002–8423004 — confirmed archive-level absence for HMAO (21 November 2026)

The employment extraction workflow and its saved status report were inspected directly after the initial coverage review. The ZIP archive **does contain** all three source CSV members:
- `data_Y48423002_112_v20260928.csv`
- `data_Y48423003_112_v20260928.csv`
- `data_Y48423004_112_v20260928.csv`

All three members were discovered by the extractor, fetched using HTTP Range, decompressed and passed the member size / CRC32 checks. The extraction result for each is `status=no_region71_yugra_rows`, `matched_rows=0`, `municipalities_matched=0`. The filter included region `71` and the project's 22 OKTMO codes. Therefore no HMAO municipal observation was skipped because of a missing archive member or extractor-code omission; the zero row count is the result returned by this archive release for region 71. It does **not** mean a measured zero value for any municipality.

Evidence:
- Successful extraction / upload workflow run: https://github.com/vanakazamkin-tech/yugra/actions/runs/44822162445
- Extractor source code: https://github.com/vanakazamkin-tech/yugra/blob/ops/extract-hmao-demography-2026-11/scripts/ops/extract_hmao_municipality_employment.py
- Saved extractor audit result: https://github.com/vanakazamkin-tech/yugra/blob/ops/extract-hmao-demography-2026-11/.ops-results/employment-extract-status.json

This closes the technical extraction question for 8423002–8423004 in the 2026-09-28 archive: the source members exist, have valid integrity checks, but contain no region-71 municipal rows. Alternative official municipal series are still required if the project needs those three indicators.



## P. Controlled transition to Stage 3 (21 November 2026)

At the user's direction, work proceeds to Stage 3 while the remaining Stage 2 evidence gaps stay explicitly open. This is a sequencing decision, not a claim that all employment indicators are complete or analytically verified.

Current Stage 2 facts retained:
- Rosstat/BDPMO section 32 extraction/upload: 48,396 source rows across codes 8423001, 8423005–8423007 and 8423015–8423017.
- Code 8423001: 30 staged observations across 10 municipalities (21 archive rows + 9 explicit municipal-report zero observations).
- Registered-unemployment / vacancies / employer-demand category: 134 staged observations across 39 source IDs; all remain pending.
- Codes 8423002–8423004: all source CSV members were extracted and CRC-checked; no HMAO region-71 municipal rows in archive release 2026-09-28. Absence is not a measured zero.
- No employment-stage row has been promoted into `municipality_indicators`.

Remaining Stage 2 gaps remain: permitted access to the historical INID/RCNI panel or another primary extract for 8423002–8423004; primary-source verification for selected secondary or ambiguous municipal values; broader and newer wage-arrears municipal coverage; and joint review/normalization of pending Stage 1/2 records. Continue these when primary data becomes available, without blocking Stage 3.

The latest all-staging SQL snapshot is 278,657 rows, 278,657 unique source keys, all pending, 22 canonical municipality IDs represented, 0 promoted; 8 validation errors are blank-value demographic rows for 2021 (codes 8112014/8112015), not employment rows. These eight blank records are retained as errors and must not be interpreted as zeros.

No production, `main`, public website or interface changes were made.
