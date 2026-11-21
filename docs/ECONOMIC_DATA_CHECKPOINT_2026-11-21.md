# Stage 3 — Economic data review checkpoint

Date: 2026-11-21
Repository: `vanakazamkin-tech/yugra`
Branch: `ops/extract-hmao-demography-2026-11`
Supabase project: `dmbikidqikjupkghywbz`

## Stage status

Stage 3 is in progress. The objective is to validate and extend municipal economic data without confusing municipal budget execution, household income, business activity, and investment-site inventories.

## Current verified economic/budget coverage in Supabase

| Source | Observations | Municipalities | Reference periods | Status |
|---|---:|---:|---|---|
| Duma Yugra, municipal budget execution, 9M 2025 Appendix 1 | 176 | 22 | Jan–Sep 2024 and Jan–Sep 2025 | Verified |
| Duma Yugra, municipal budget execution, 9M 2025 Appendix 2 | 44 | 22 | Jan–Sep 2025 | Verified |
| Khanty-Mansiysky district budget execution 2025 | 3 | 1 | FY 2025 | Verified |
| Khanty-Mansiysk city budget execution 2025 | 3 | 1 | FY 2025 | Verified |
| Megion city budget execution 2025 | 7 | 1 | FY 2025 | Verified |
| Nefteyugansk city budget execution 2025 | 3 | 1 | FY 2025 | Verified |
| Yugorsk city budget execution 2025 | 3 | 1 | FY 2025 | Verified |

The 9-month values are cumulative year-to-date figures and must not be presented as full-year results. Appendix 2 includes intergovernmental transfers and payroll fund with social contributions; the latter is not household income.

The annual 2023–2024 Duma municipal budget appendix is registered but has no observations loaded. It contains 22 municipal rows plus a total row and requires full column-by-column extraction and reconciliation. The local-budget section 13 of BDPMO is also catalogued but not yet extracted.

## Income, SME and investment sources

- Rosstat/Tyumenstat municipal social payments and taxable income datasets are registered but have no imported observations.
- Rosstat SME statistics and the Megion SME programme are registered but have no imported observations.
- InvestUgra municipal rating and investment portal sources are registered but have no imported indicator observations.
- Investment-site registers are separate operational inventories and must not be substituted for investment volume or capital investment indicators.

## Initial data-integrity controls

The full review staging table currently contains 278,657 rows, all pending, with 278,657 unique source keys, 22 mapped municipality IDs, zero promoted rows and eight validation errors. The eight errors are blank demographic values for 2021 in codes 8112014/8112015; they are not Stage 2 labour errors and are not zero values.

Employment source coverage and open gaps are recorded separately in [EMPLOYMENT_IMPORT_CHECKPOINT_2026-11-21.md](./EMPLOYMENT_IMPORT_CHECKPOINT_2026-11-21.md).

## Next execution sequence

1. Reconcile the 176 + 44 verified 9-month budget observations with the original Duma PDFs and their municipal totals.
2. Extract and validate the annual 2023–2024 municipal budget appendix, with all 22 municipality rows, correct column definitions and total-row controls.
3. Inspect BDPMO section 13 for local budget indicators and establish which fields are municipal, annual and comparable.
4. Retrieve the registered municipal social-payment / taxable-income datasets and inspect geographic/temporal dimensions before import.
5. Add SME and investment measures only where official definitions, municipal scope, periods and units are explicit.
6. Keep all new observations in staging until source, units, geography, period and duplicates are reviewed. Do not promote, change `main`, production or UI as part of data acquisition.

## Data interpretation safeguards

- Never treat municipal budget revenues as household disposable income.
- Keep own-source tax/non-tax revenues separate from intergovernmental transfers.
- Keep annual, quarter, 9-month cumulative and point-in-time observations distinct.
- Do not allocate HMAO regional aggregates to municipalities.
- Do not treat investment-site counts or announced projects as realized capital investment.
- Preserve estimates, forecasts and secondary-source values separately from official facts.


## Latest P3 verification — annual Duma municipal-budget appendix

The official PDF for the annual 2023–2024 municipal-budget analysis was reopened and text-extracted from the Duma Yugra website:
https://www.dumahmao.ru/povest/0745_4/03/50.pdf

Confirmed from the source:
- 22 municipal rows plus a separate regional control row “ВСЕГО”.
- Financial years 2023 and 2024.
- Unit: thousand rubles.
- Separate columns for total revenue, revenue excluding gratuitous receipts, tax and non-tax revenue, tax revenue, personal income tax, non-tax revenue, transfers, total expenditure, payroll expenditure and capital investment, plus detailed expenditure classifications.
- Growth rates are distinct percentage columns and must not be loaded as monetary observations.
- Dashes / blank cells are not zero. “св.100” means above 100 percent and must not be converted to a precise percentage.

The source registry entry was updated with these findings. No observations from this annual PDF have yet been loaded; a controlled column mapping and row-total reconciliation must precede staging.

## Verification of existing budget observations

Direct SQL checks of the verified analytical table found:
- 176 rows in Duma Appendix 1 (four indicators × 22 municipalities × two 9-month periods); all verified, 22 municipalities per indicator-period, no duplicate logical keys.
- 44 rows in Duma Appendix 2 (two indicators × 22 municipalities × 9M 2025); all verified, no duplicate logical keys.
- 19 annual 2025 observations across five separate municipal sources (Khanty-Mansiysky district, Khanty-Mansiysk, Megion, Nefteyugansk and Yugorsk); all verified, no duplicate logical keys.
- These 9-month observations remain Jan–Sep cumulative values, not full-year totals. The annual 2025 municipal records are distinct and currently cover only five municipal areas.

The next data-acquisition pass will transcribe a carefully selected set of indicators from the annual 2023–2024 PDF, validate all 22 rows against the PDF's “ВСЕГО” control row, and only then load them to review staging.


## Stage 3 BDPMO acquisition — successful import to Supabase staging (21 November 2026)

Source: processed Rosstat / BDPMO release 28.09.2026, "Если быть точным", CC BY 4.0. Four section archives were read using HTTP Range without downloading complete nationwide ZIP files. All selected CSV members passed decompression size and CRC32 validation. Extraction workflow: https://github.com/vanakazamkin-tech/yugra/actions/runs/44836498991

The extraction and staging upload completed successfully. Direct SQL verification in Supabase confirms **16,558 staging rows**, 16,558 unique source keys, all rows pending, zero validation errors, zero promoted rows and all 22 canonical municipality IDs represented for every imported indicator.

| Item | BDPMO code | Rows | Municipalities | Years | Notes |
|---|---|---:|---:|---|---|
| 30. Local-budget fixed capital investment | 8009001 | 415 | 22 | 2006–2024 | Annual; thousand rubles |
| 29. Fixed capital investment excluding SMEs | 8109001 | 3,487 | 22 | 2008–2024 | Annual; OKVED2 and financing-source dimensions retained |
| 31. Investment by municipal-owned organisations | 8109002 | 763 | 22 | 2008–2024 | Annual; financing-source dimension retained |
| 32. Investment per capita excluding budget funds | 8109003 | 308 | 22 | 2010–2024 | Annual; rubles per resident |
| 40. Retail turnover excluding SMEs | 8401003 | 2,794 | 22 | 2017–2026 | Quarterly cumulative; 2026 only Jan–Mar |
| 41. Industrial shipments by industry | 8401008 | 3,615 | 22 | 2017–2025 | Industrial production shipments for organisations with average staff over 15; OKVED2 retained |
| 33. Own-produced shipments | 8401011 | 3,325 | 22 | 2017–2025 | Quarterly cumulative; OKVED2 retained |
| 34. Non-own-produced goods sold | 8401012 | 1,455 | 22 | 2017–2025 | Quarterly cumulative; OKVED2 retained |
| 35. Registered organisations | 9010002 | 198 | 22 | 2024–2026 | Snapshot dates: 1 Jan / Apr / Jul / Oct; unit is organisations |
| 37. Individual entrepreneurs | 9010003 | 198 | 22 | 2024–2026 | Snapshot dates: 1 Jan / Apr / Jul / Oct; unit is persons/entries as defined by source |

Total rows by archive section: section 9 — 4,665; section 2 — 2,794; section 39 — 8,791; section 41 — 308.

### Interpretation safeguards

- Codes 8401003, 8401008, 8401011 and 8401012 contain cumulative values for Jan–Mar, Jan–Jun, Jan–Sep and Jan–Dec. Do not sum these periods. For 8401003, the 2026 extract only has Jan–Mar. The 8401003 series excludes SMEs and is **not** the total retail turnover of the whole municipal market.
- Codes 9010002 and 9010003 are point-in-time register snapshots, not annual totals. Keep the observation dates separate.
- Codes 8109001/8109002 retain their sector/financing dimensions. Do not collapse them prematurely into totals; do not sum financing-source values unless dimensions are mutually exclusive and the underlying methodology confirms this.
- Code 8401008 is a distinct industrial group (organisations above the stated staff threshold), not a replacement for 8401011.
- Historical BDPMO codes 8215003 (SMEs per 10,000 residents) and 8155040 (SME employment share) were intentionally excluded from this current import. These are periodic census-derived indicators, not a current annual series.
- All raw units, periods, dimensions, source URLs, source-member names, OKTMO, and SHA-256 row provenance were preserved in staging. Internal mappings and normalized periods remain unset pending review. No analytical table or public UI was changed.

## Remaining Stage 3 indicators

- SME count and category structure: use the Federal Tax Service's Unified SME Register, latest published snapshot 10.11.2026. Before aggregation, verify the XML/XSD geographic fields allow unambiguous assignment to each of the 22 municipalities. Upload only aggregate municipal counts by legal entities / individual entrepreneurs and micro / small / medium categories; never expose individual taxpayer details.
- SMEs per 10,000 residents: derive only after aligning the registry snapshot date with a population reference date; document the formula and base population.
- Full retail turnover: 8401003 excludes SMEs. Find an official municipal source covering all market participants or a consistent method for adding the SME component without double counting.
- SME turnover: seek official municipal observations or a valid FNS/statistical municipal source; do not substitute tax receipts, support programmes or enterprise locations for turnover.
- Industrial production by major sectors: the OKVED2 dimensions in 8401008 and 8401011 can support this, but require an audited sector crosswalk and clear coverage notes.
- Continue reviewing the annual Duma 2023–2024 budget appendix and BDPMO section 13 for local-budget comparability.


## Retail indicator extension — annual food sales companion series (21 November 2026)

A follow-up inspection of the official BDPMO section-2 catalogue and its archive member list confirmed the archive contains indicator 8801004, “Общий объем всех продовольственных товаров, реализованных в границах муниципального образования”. It was restored to the extractor and loaded as a separate indicator, not mapped to total retail turnover.

Updated Stage 3 staging total: **16,690 rows** (the previous 16,558 plus 132 rows of 8801004), 16,690 unique source keys, all pending, 0 validation errors, 0 promoted rows, all 22 municipalities represented for every code. The final section-2 archive total is 2,926 rows (2,794 for 8401003 and 132 for 8801004). Latest successful workflow: https://github.com/vanakazamkin-tech/yugra/actions/runs/44837202819

| Code | Rows | Municipalities | Period | Scope |
|---|---:|---:|---|---|
| 8401003 | 2,794 | 22 | 2017–2026; cumulative Jan–Mar / Jun / Sep / Dec | Retail turnover excluding small businesses; 2026 only Jan–Mar |
| 8801004 | 132 | 22 | 2020–2025; annual | Total food goods sold in municipality |

These series have different definitions and periods. Do not add them together. 8401003 excludes small businesses; 8801004 is a broad measure of food goods sales but is not the full turnover of all retail goods.

The overall Stage 3 BDPMO staging total is now 16,690 (11 separate indicator codes): 4,665 in section 9; 2,926 in section 2; 8,791 in section 39; 308 in section 41. The 11 codes are 8009001, 8109001, 8109002, 8109003, 8401003, 8801004, 8401008, 8401011, 8401012, 9010002 and 9010003.


## Municipal SME and retail reporting — additional official observations (21 November 2026)

A follow-up acquisition pass added 21 observations from six municipal official reports to the same private review staging table. All remain pending; none was promoted to the analytical table.

| Municipality | SME / entrepreneur observations | Turnover observations | Source |
|---|---|---|---|
| Khanty-Mansiysky district | 442 SMEs as of 01.01.2026, including 367 IP, 73 micro and 2 small enterprises | 2025 small-business turnover 2,590.6m RUB, preliminary | District administration SME page |
| Nefteyugansk | 4,559 SMEs as of 01.01.2026, including 1,052 micro, 135 small, 23 medium and 3,349 IP | 2025 retail turnover across all forms of trade: 36,182.96m RUB | Administration resolution No.490-п, 27.05.2026 |
| Kogalym | 1,894 SMEs at end-2025: 458 legal entities and 1,436 IP | No turnover added from this source | City Duma annual report No.619, 18.02.2026 |
| Surgut | 20.9 thousand SMEs in 2025 (rounded official value) | Small-business turnover 283.3bn RUB in 2025; retain the source's “small business” label | City investment portal |
| Yugorsk | 1,242 SMEs at end-2025 | No turnover observation in this source | City head's investment message |
| Nyagan | 2,480 SMEs as of 01.01.2025: 1,880 IP, 591 small enterprises, 9 medium enterprises | No turnover added from this source | City infrastructure development programme, citing the Unified SME Register |

Source URLs:
- Khanty-Mansiysky district: https://hmrn.ru/raion/ekonomika/ip/index.php
- Nefteyugansk: https://base.garant.ru/414301420/1b93c134b90c6071b4dc3f495464b753/
- Kogalym: https://admkogalym.ru/upload/iblock/e5e/uy9nv5ut0xhw5y4zyjoge55634m2oi2j/619_GD-ot-18.02.2026.pdf
- Surgut: https://invest.admsurgut.ru/pages/Obshchaya-harakteristika-municipalnogo-obrazovaniya
- Yugorsk: https://www.adm.ugorsk.ru/about/statistics/ekonomika/investitsionnaya-deyatelnost/investitsionnoe-poslanie-glavy-goroda-.php
- Nyagan: https://base.garant.ru/414881362/da0ca740e319b67eff630b4065586e13/

### Comparability and data-quality notes

- Self-employed persons registered under the professional income tax regime are excluded from the SME counts. For Khanty-Mansiysky district, the source lists 1,416 self-employed persons separately; they were not imported as SMEs.
- The Khanty-Mansiysky district 2025 small-business turnover (2,590.6m RUB) is explicitly a preliminary estimate.
- Surgut's 20.9 thousand count is rounded. Its turnover of 283.3bn RUB is described as “small business turnover”, not necessarily total turnover of every SME category.
- Nyagan's source does not separately specify micro-enterprises; the 591 figure retains the report's term “small enterprises” rather than being split or re-labelled.
- For Nefteyugansk, the 4,559 total is exactly the source's sum of 1,052 micro, 135 small, 23 medium and 3,349 IP. Legal entities were not added as a separate derived observation.
- Nefteyugansk retail turnover includes all forms of trade and is distinct from BDPMO 8401003, which excludes small businesses. Keep both measures separate.

The FNS SME registry geography probe for the 10.11.2026 snapshot completed successfully. Its XSD includes Region, District, City, Settlement, regional-code, SME-category, SME-kind and registry-date fields. A sample of 12 XML members contained 955 region-86 records, with addresses naming municipal districts, cities and settlements. This confirms the fields needed for a municipality crosswalk exist, but the sample is not a full count and does not yet support 22-municipality totals. No taxpayer identifiers or personal data were written to the probe report. The FNS full bulk archive has not yet been ingested.

## Latest combined Stage 3 staging control

- BDPMO investment, trade, organisation and industrial series: **16,690 rows** (11 indicator codes) across all 22 municipalities.
- New municipal SME / retail observations: **21 rows** across six municipalities.
- These two groups are stored in private review staging; all rows remain pending with no promotion.
- Keep the Stage 3 checkpoint and P3 work log in progress until the remaining municipal SME, SME-turnover and complete retail-turnover coverage is collected and normalized.


## Further municipal extensions — Oktyabrsky district and Kogalym retail (21 November 2026)

### Oktyabrsky district

The official 2025 socioeconomic report adds seven observations:
- At 01.01.2026: 740 SMEs, including 110 legal entities and 630 individual entrepreneurs.
- Self-employed persons under the professional-income tax regime: 2,374, listed separately and excluded from the SME count.
- Preliminary 2025 industrial shipments by large and medium organisations: total 423,954.2m RUB; mining 422,648.5m; electricity/gas/steam, water supply and waste activities 964.0m; manufacturing 341.8m.
- The industrial breakdown is a separate municipal report series and should not automatically be treated as identical to BDPMO 8401008 / 8401011.

Official source: https://oktregion.ru/upload/docs/ekonomika-i-finansy/sotsialno-ekonomicheskoe-azvitie/itogi/Itogi_SER_za_2025.pdf

The same report gives a general “товарооборот” value of 5,897.9m RUB for 2025, but the report wording does not explicitly resolve whether this is a complete retail-turnover definition. It has not been loaded as official retail turnover pending definition confirmation.

### Kogalym retail turnover

A municipal half-year report gives preliminary retail turnover for the full circle of city organisations of **8,329.0m RUB** for January–June 2025. It is now staged as a separate Jan–Jun 2025 observation for Kogalym, not treated as a full-year total and not mixed with BDPMO 8401003 (which excludes SMEs).

Official source: https://admkogalym.ru/upload/medialibrary/16c/xowggy1l5sdmh47l1xo456zqh3efyj3h/8_icx_343_25.pdf

### Reuse of existing MСП per-capita observations

A SQL check found three already-verified Kogalym observations for the number of SMEs per 10,000 residents: 277.7 (2022), 286.6 (2023) and 290.2 (2024), source `ugra_municipal_efficiency_349rp_2024_kogalym`. They were not re-imported. This indicator should only be newly calculated for a municipality when the SME count date and population denominator can be made methodologically compatible.

## Revised Stage 3 staging count

The current Stage 3 import group consists of:
- 16,690 BDPMO records across 11 codes, all 22 municipalities.
- 21 SME/retail records from six municipality reports, all pending.
- 7 additional Oktyabrsky district SME/industry records.
- 1 additional Kogalym Jan–Jun 2025 full-circle retail-turnover record.

All new rows remain in private review staging, with pending status, no validation errors and no promotion. Annual, cumulative, preliminary and point-in-time records retain their distinct definitions.


## Municipal extensions — Surgut, Nizhnevartovsk and Beloyarsky (21 November 2026)

### Surgut — official investment message, 9 months 2026

The current official city investment message reports preliminary Jan–Sep 2026 values:
- 21 thousand SMEs (rounded count).
- SME turnover: 217bn RUB.
- Shipped industrial products, work and services by large and medium industrial organisations: 413.5bn RUB.
- Fixed capital investment by large and medium organisations from all funding sources: 45.2bn RUB.

These are cumulative nine-month figures, not annual values. Investment coverage is explicitly “large and medium organisations / all sources”; it is not automatically identical to BDPMO 8109001 (excludes SMEs) or 8009001 (local-budget sources).

Source: https://invest.admsurgut.ru/pages/investitsionnoe-poslanie-glavy-goroda-surguta

### Nizhnevartovsk — official 2025 socioeconomic actuals

The city's official 2027 forecast attachment, administration order No.582-р dated 29.10.2026, includes actual 2025 data:
- About 4 thousand small and medium enterprises (rounded).
- 9.1 thousand individual entrepreneurs (rounded).
- SME turnover: 203,241.7m RUB.

The count values are retained as approximate because the source itself rounds them. The 4 thousand “small and medium enterprises” and 9.1 thousand individual entrepreneurs are not merged into an exact derived count. The turnover is the source's 2025 fact, not a forecast.

Source: https://base.garant.ru/415213799/53f89421bbdaf741eb2d1ecc4ddb4c33/

### Beloyarsky district — official preliminary 2024 results

The archived official administration page reports:
- SMEs as of 01.01.2025: 577 (502 IP and 75 legal entities).
- Industrial production by large and medium enterprises in 2024: 44,202.8m RUB.
- Own-produced shipments/work/services in the oil-extraction industry by large and medium enterprises in 2024: 42,005.4m RUB.

The same source reports 1,844 self-employed separately; they are not part of the 577 SME count. It also states total investments in district development of 10.083bn RUB and 355.3 thousand RUB per resident, but these labels are not explicitly aligned to BDPMO 8109001 / 8109003; those two values have not been added to standardized investment series pending methodological verification.

Source: https://star.admbel.ru/area/common/

All new observations were inserted into private Supabase review staging with pending status, no validation errors and no analytical promotion.

## Latest FNS registry aggregation attempt

The official 10.11.2026 FNS Unified SME Register XSD confirms the codes:
- ВидСубМСП: 1 legal entity, 2 individual entrepreneur, 3 head of a peasant (farm) enterprise.
- КатСубМСП: 1 micro, 2 small, 3 medium.

The 100-XML-member probe contained 90,004 documents and 955 region-86 documents. All 955 region-86 addresses in that sample mapped to 21 different Yugra municipalities with no unmatched address tuple; the sample simply did not include Pokachi. This sample is a crosswalk validation only, not an SME count.

A full-archive aggregate job has been started. It streams the 10.11.2026 ZIP and will write only municipal totals (not taxpayer IDs, organisation names or personal information). Upload is blocked automatically unless every region-86 record can be placed unambiguously across all 22 municipal IDs and all type/category codes validate.


## Nizhnevartovsk — additional 2024 and 9M 2025 economic series

Two more official municipal economic reviews were transcribed into private review staging.

### Full-year 2024 (official city economic department review)

- Shipped own-produced goods, works and services by large and medium enterprises: 108.9bn RUB.
- Industry structure by share of industrial output: mining 58.1%; manufacturing 16.8%; electricity/gas/steam 22.2%; water supply, wastewater and waste management 2.9%.
- SMEs: about 4.2 thousand (rounded).
- SME turnover: 190.6bn RUB (estimate).
- Investment volume: 61.8bn RUB (source-specific “investment volume”; not yet mapped to standard BDPMO 8109001 because its detailed coverage is not explicit in the overview).
- Retail turnover: 145.6bn RUB (estimate).

Official PDF: https://www.n-vartovsk.ru/upload/iblock/102/wot9sgh0u96gs1klhksfg5dxxkbj5yzz/yaqiotpv4sve44hhw5yw975vuwuv6rh4.pdf

### January–September 2025 (official preliminary city economic department review)

- Shipped own-produced goods, works and services by large and medium enterprises: 80.4bn RUB.
- Industry structure: mining 52.2%; manufacturing 18.9%; electricity/gas/steam 26.2%; water supply, wastewater and waste management 2.7%.
- SMEs: about 4.0 thousand (rounded point-in-time register figure; precise register date not stated in the review).
- SME turnover: 145.1bn RUB.
- Investment volume: 32.4bn RUB (source-specific; not mapped to standard BDPMO indicator pending definition review).
- Retail turnover: 109.3bn RUB.

Official PDF: https://www.n-vartovsk.ru/upload/iblock/ea1/vbv0sg29sjkubywf7bl21buwrw8nh7hr/40goi4g4b0vq8bjvahuta05e00v5fc8i.pdf

Both reviews state that macro- and microeconomic values are estimates subject to statistical revision. Jan–Sep 2025 values are cumulative nine-month figures, not full-year totals. Industry shares are stored as reported percentages; no money amounts were reverse-calculated from the shares.

## Current Stage 3 staging update

Direct SQL checks as of this update:
- **16,755 observations** across the Stage 3 BDPMO and municipal official sources.
- **16,755 unique source keys**.
- All 16,755 are pending.
- 0 validation errors in this Stage 3 source set.
- 0 promoted rows.
- All 22 canonical municipal IDs appear in the BDPMO series.

The full FNS SME snapshot aggregation is still running and is not included in the 16,755-row subtotal.


## Surgut annual report extension — 2025 SME, retail, and industrial indicators (21 November 2026)

Official source: City Duma decision/report No. 963-VII DG dated 03.03.2026. PDF:
https://dumasurgut.ru/upload/iblock/80f/xzxknp8dh16e3mftqxj3zm870d0xc7ut/963-VII%20%D0%94%D0%93%20%D0%BE%D1%82%2003.03.2026.pdf

Nineteen new observations were added to the private review staging table; all remain pending, with no validation errors and no promotion.

### SME turnover and retail trade

- The report's municipal SME-programme KPI states **323.4bn RUB** for 2025 as the turnover of SME subjects (against a plan of 321.7bn). This is kept as a separate indicator from the tabled small-business turnover; the two published values are not forced to reconcile.
- The report's table 5.1 gives small-business turnover of **257,232.8m RUB** for 2024 and **283,335.8m RUB** for 2025. The 2025 rounded equivalent (283.3bn) already existed in an earlier municipal source and was not duplicated.
- Table 6.1 gives retail turnover by large and medium organisations of **121,339.8m RUB** in 2024 and **128,749.8m RUB** in 2025. This is not the full market turnover.
- The report estimates the 2025 consumer market at **258.6bn RUB** and says retail turnover accounts for 76.3% of the market. A derived estimate of full retail turnover is therefore **about 197.31bn RUB** (258.6 × 0.763). This is explicitly staged as a derived estimate from two rounded source values, not a directly published absolute figure.
- The report lists 20.9 thousand active small-business entities for 2025. The source calls these “субъекты малого бизнеса”; the prior staging label has been corrected so it is not presented as the total register of all SME categories.

### Industrial shipments and sectors

The same report distinguishes total shipments by large and medium organisations from shipments of industrial-product manufacturers:
- All large and medium organisations, own-produced goods/work/services: **1,168,784.6m RUB** (2024) and **1,129,957.2m RUB** (2025).
- Industrial-product manufacturers, large and medium: **936,848.3m RUB** (2024) and **876,888.7m RUB** (2025). Industrial physical-volume index in 2025: **101.0%** year-on-year.
- Sector detail (large and medium industrial producers), 2024 / 2025, million RUB:
  - Mining: 23,318.7 / 27,609.3
  - Manufacturing: 808,740.0 / 734,868.4
  - Electricity, gas, steam and air conditioning: 98,087.3 / 107,209.4
  - Water supply, wastewater, waste collection/treatment and remediation: 6,702.3 / 7,201.6

The four sectors sum exactly to the reported industrial-manufacturer shipment total for each year. This is a useful municipality-level sector cross-check alongside the BDPMO OKVED2 detail; do not combine the two series until their reporting populations and coverage are reconciled.

### Investment data not duplicated

The same report gives 2025 fixed-capital investment by large and medium organisations of 98,365.1m RUB, up 5.6% in comparable prices. This figure is already present in the verified analytical table under the municipal 2025 report and was deliberately not staged again. The earlier report also contains the 2024 value of 85,552.7m RUB, which is already present in the verified series.

## Latest combined Stage 3 control — 21 November 2026

A direct Supabase SQL control over the defined Stage 3 source group now reports **17,096 rows**, 17,096 unique source keys, all pending, 0 validation errors, 0 promoted rows and all 22 canonical municipalities represented. This supersedes the earlier interim subtotal of 16,755 shown in the preceding checkpoint text. The newest batch is the 19-row Surgut annual-report extension. The 2025 FNS / Rosstat density-derived series remains labelled an estimate; no new values have been moved to the analytical table.


## Additional municipal report acquisitions — Kogalym, Yugorsk, Surgutsky district (21 November 2026)

### Kogalym — annual report No. 619-GD (18.02.2026)

Official source: https://admkogalym.ru/upload/iblock/e5e/uy9nv5ut0xhw5y4zyjoge55634m2oi2j/619_GD-ot-18.02.2026.pdf

The staging batch for `kogalym_economy_2025_duma_report` contains 16 new observations:
- Full-circle retail turnover: 15,256.8m RUB in 2024 (reported) and 20,319.3m RUB in 2025 (preliminary).
- Fixed-capital investment: 26,823m RUB in 2024 (reported) and 27,769m RUB in 2025 (preliminary).
- Own-produced shipments: 135,025m RUB in 2024 (reported) and 148,976m RUB in 2025 (preliminary).
- Industrial production index: 98.3% in 2024 and 107.3% in 2025 (preliminary).
- Sector shipments 2024 / 2025, m RUB: manufacturing 80,637 / 89,023; mining 41,957 / 47,495; electricity/gas/steam 12,054 / 12,066; water/waste 377 / 392.

The four industrial sector values reconcile exactly to total own-produced industrial shipments in each year (135,025m and 148,976m respectively). All 16 observations remain pending.

The existing Kogalym SME source was supplemented with 2024 count observations: 1,864 total SMEs, including 464 legal entities and 1,400 IP. The 2025 figures remain 1,894 (458 legal entities, 1,436 IP). The report separately lists 5,232 self-employed persons, who are not added to SME totals.

### Yugorsk — investment message 2025

Official source: https://adm.ugorsk.ru/about/statistics/ekonomika/investitsionnaya-deyatelnost/investitsionnoe-poslanie-glavy-goroda-.php

A more detailed official investment message gives a preliminary 2025 fixed-capital investment estimate of **3,899.9m RUB**. This supersedes the earlier rounded phrase “3bn RUB” in the mayor's public report. The earlier 3,000m observation was removed from staging and replaced by the 3,899.9m value under source `ugorsk_investment_message_2025`. The 1,242 SME count at year-end 2025 and 203.1m RUB in tax receipts from aggregate-income tax remain distinct observations; tax receipts are not SME turnover.

### Surgutsky district — forecast No. 1836 (26.10.2026)

Source: https://base.garant.ru/415158419/da0ca740e319b67eff630b4065586e13/

Ten observations were added from the official 2027–2029 forecast table:
- Fixed-capital investment 2025: 361,669.5m RUB (reported); 2026: 324,393.9m RUB (estimate).
- Industrial production index 2025: 98.1%, with sector indices mining 97.9%, manufacturing 103.4%, electricity/gas/steam 100.9%, water/waste 97.6%.
- Retail turnover index 2025: 99.5%; 2026 estimate: 100.5%.

The document gives an index, not an absolute retail turnover amount. No ruble turnover is inferred from the index without the base amount. All ten rows remain pending.

## Updated Stage 3 Supabase control — 21 November 2026

Direct SQL control for the selected Stage 3 source group now reports **17,126 staging rows**, 17,126 unique `(source_id, source_record_key)` keys, all pending, zero validation errors, zero promoted rows and all 22 canonical municipalities represented. The latest additions are 16 Kogalym economic observations, 3 2024 Kogalym SME observations, 1 precise Yugorsk investment estimate (replacing the earlier rounded estimate without changing total row count), and 10 Surgutsky district observations. Nothing has been promoted into `public.municipality_indicators`.


## Further municipal data — Sovietsky district, Yugorsk and Surgutsky district (21 November 2026)

### Sovietsky district — investment passport with 2024 content

Official source: https://econ.sovrnhmao.ru/upload/iblock/130/xh7wd3ftdptm4jv49ophmi19fcktw31h/Investitsionnyy-pasport-Sovetskogo-rayona-2023-261223.pdf

The file name contains “2023”, but the actual document text gives 2024 results and register observations at the beginning of 2025. Ten observations were added to private staging:
- Retail turnover in 2024: **16,408.2m RUB**.
- Own-produced shipments / works / services by organisations excluding SMEs: **126,990.9m RUB**.
- Industry sectors, 2024, m RUB: mining 116,414.2; manufacturing 8,431.3; electricity/gas/steam 1,980.1; water/waste 165.3. These four values reconcile exactly to the reported 126,990.9m total.
- At the beginning of 2025: 336 “small enterprises” and 1,149 IP; 3,274 self-employed persons are separately listed and are not added to SME counts.
- Small-business employment share including self-employed persons: 30%. This is not the standard SME employment share because its definition includes self-employed people.

Two values were deliberately not imported:
- 2024 fixed-capital investment of 10,873.8m RUB in this passport conflicts with another municipal investment-message estimate of 12,287.4m RUB and Rosstat's non-SME organisation investment series of 9,571.592m RUB. The definitions / populations require reconciliation before selection.
- Retail turnover per capita 305.1k RUB does not match the simple ratio of reported retail turnover 16,408.2m RUB to population 46,803. Its denominator / method requires clarification.

### Yugorsk — refined 2025 investment estimate

The earlier rounded 3bn RUB investment figure from the mayor's public speech was superseded by the more precise preliminary amount in the city's investment message: **3,899.9m RUB** for 2025. The 3,000m observation was removed from staging and replaced with the precise amount under `ugorsk_investment_message_2025`.

Official source: https://adm.ugorsk.ru/about/statistics/ekonomika/investitsionnaya-deyatelnost/investitsionnoe-poslanie-glavy-goroda-.php

The same message gives 1,242 SMEs at year-end 2025 and 203.1m RUB in taxes from aggregate-income tax. The tax amount is not SME turnover.

### Surgutsky district — report No.1836

Official source: https://base.garant.ru/415158419/da0ca740e319b67eff630b4065586e13/

Ten observations were staged from the district's 2027–2029 forecast, which provides 2025 report values and 2026 estimates:
- 2025 fixed-capital investment: 361,669.5m RUB; 2026 estimate: 324,393.9m RUB.
- Industrial production index 2025: 98.1%, broken down by mining 97.9%, manufacturing 103.4%, energy 100.9%, water/waste 97.6%.
- Retail turnover index 2025: 99.5%; 2026 estimate: 100.5%.

The retail percentages are indices, not absolute retail turnover. No ruble value was inferred.

## Latest combined Stage 3 control — 21 November 2026

A direct Supabase SQL check for the Stage 3 source group reports **17,136 rows**, 17,136 unique source keys, all pending, zero validation errors, zero promoted rows and all 22 canonical municipalities represented. This includes 10 Sovietsky district observations, 10 Surgutsky district observations, the refined Yugorsk investment observation and previous acquisitions. No rows have been moved into `public.municipality_indicators`.


## Surgutsky district — Chapter 4 absolute 2026 estimates and SME turnover (21 November 2026)

The complete Chapter 4 text of the official 2027–2029 forecast (Decision No.1836, 26.10.2026) was inspected through the published Garant text. The following 13 additional observations were staged separately:

- Retail turnover across all forms of trade: **34,648m RUB** for 2026, estimate. This is an absolute amount, not the previously staged retail index of 100.5%.
- Turnover of small and medium enterprises, including microenterprises: **24.0bn RUB** for 2026, estimate.
- Number of small and medium enterprises including microenterprises: **3,052** at the beginning of 2026 (source-reported); estimated **3,100** by year-end 2026. The report uses “предприятия”; keep this source wording and do not silently re-label it as a full FNS entity/sole-trader count.
- Self-employed under the professional income tax regime are separate: **12,064** at the beginning of 2026; **12,300** estimated by year-end. Do not add them to SMEs.
- Employment in SMEs: **18,617** at the beginning of 2026. A separate estimate of **18,800** at year-end explicitly includes self-employed people, so it is not directly comparable to the first figure.
- Industrial shipments in the full circle of industrial product manufacturers: **1,568,811.5m RUB** for 2026, estimate.
- 2026 industrial components, m RUB: oil extraction and related services 1,482,585.3; manufacturing 59,957.6; electricity/gas/steam and air conditioning 24,905.9; water/waste 1,362.8.

The four sector components sum to 1,568,811.6m RUB, 0.1m above the reported total. The source values have been retained without manual adjustment; the small difference is noted as rounding.

Official source: https://base.garant.ru/415158419/510567bc799b499f450a4638e59966a6/

## Latest combined Stage 3 control — 21 November 2026

The earlier checkpoint subtotal of 17,136 rows has been superseded. After adding the 13 new Surgutsky district observations, direct Supabase SQL reports **17,149 rows**, 17,149 unique source keys, all pending, zero validation errors, zero promoted rows, and all 22 canonical municipalities represented within the selected Stage 3 source group. Nothing has been moved to `public.municipality_indicators`.


## Surgutsky district — municipal SME programme KPI, 2025 actual and 2026–2028 plans (21 November 2026)

Official source: Administration order No. 1046-r dated 02.11.2026, appendix:
https://base.garant.ru/415212273/53f89421bbdaf741eb2d1ecc4ddb4c33/

Ten additional observations were staged under `surgutsky_sme_performance_2025_2028_order1046`:
- The programme's small-business count **including IP and self-employed persons** per 10,000 residents: 2025 plan 944.32; 2025 actual 1,148.9; 2026 plan 1,171.99; 2027 plan 1,200.00; 2028 plan 1,224.00.
- The programme's combined number of SMEs **including self-employed persons**: 2025 plan 12,694; 2025 actual 15,116; 2026 plan 15,450; 2027 plan 15,605; 2028 plan 15,761.

These are municipal programme KPIs and include self-employed people; they must not be substituted for the clean FNS Unified SME Register count (3,105 in Surgutsky district on 10.11.2026) or the standard SME-only per-10,000 measure. All ten records remain pending.

A 25.09.2026 revision to the district socioeconomic strategy also restates the official SME-per-10,000 measure: 226.1 for 2024; target values 233.2 by 2030 and 235.0 by 2036. The verified analytical table already has 226.0 for 2024, so this near-identical revision value was not duplicated; the 0.1 difference is retained as a source-version/rounding discrepancy for reconciliation.

Latest source-control total for the selected Stage 3 set: **17,159 rows**, 17,159 unique source keys, all pending, zero validation errors, zero promoted rows and 22 canonical municipalities represented.
