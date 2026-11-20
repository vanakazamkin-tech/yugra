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
