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
