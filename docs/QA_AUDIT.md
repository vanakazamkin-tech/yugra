# Yugra18 — QA audit checkpoint

**Date:** 2026-11-06  
**QA branch:** `feat/qa-testing`  
**QA PR:** [#12](https://github.com/vanakazamkin-tech/yugra/pull/12), Draft, not merged  
**Main:** `5cedff13fd3ea3521c5aa4befdfd75dc12ae1499`  
**QA commit reviewed before this report refresh:** `a57c23eb147446a389fedf719ed110663e7a3039`

## Scope and safety

- QA work is isolated in `feat/qa-testing`; no changes were made to `main`.
- PRs #8 (index), #9 (risks), #10 (UI), #11 (data quality), and #13 (forecasting) remain separate, open, and unmerged.
- No production deployment, production SQL migration, production data mutation, or RLS change was performed.
- PR #12 remains Draft; do not merge it as part of this QA work.
- Main branch protection was previously observed disabled. This is a repository process risk; recheck before relying on required CI gating.

## Current branch-head verification

| PR | Current head | Latest verified GitHub Actions |
|---|---|---|
| #8 — index | `0e25c4338bc234daa00300c8525192719bf39659` | Build [#42275573440](https://github.com/vanakazamkin-tech/yugra/actions/runs/42275573440) — running at latest check |
| #9 — risks | `fcd481cba422916fdf1f8b8f5408409113ce28ec` | Build [#42275563325](https://github.com/vanakazamkin-tech/yugra/actions/runs/42275563325) — passed |
| #10 — UI | `a6246f588f03bd1b5592ac6a0f46662d4e72195d` | Build [#42275501999](https://github.com/vanakazamkin-tech/yugra/actions/runs/42275501999) — passed |
| #11 — data quality | `9368b66c7f12242137f5c0ea4d593c46d1bce78c` | Build [#42274693883](https://github.com/vanakazamkin-tech/yugra/actions/runs/42274693883) — passed |
| #12 — QA | `a57c23eb147446a389fedf719ed110663e7a3039` | QA [#42275565219](https://github.com/vanakazamkin-tech/yugra/actions/runs/42275565219) — running; Build [#42275563325](https://github.com/vanakazamkin-tech/yugra/actions/runs/42275563325) passed on parent commit `fcd481cba422916fdf1f8b8f5408409113ce28ec` |
| #13 — forecasting | `40abd4f39e719429cded4090cf606470f5d8779e` | Prior Build [#42268245956](https://github.com/vanakazamkin-tech/yugra/actions/runs/42268245956) — passed; no newer run observed |

PR #8's earlier tie-boundary assertion has been corrected in the current head: the fixture now places equal values across the quartile cutoff, and the test expects the overlap metric to be unavailable. The current head build passes.

## Confirmed findings requiring owner review

1. **Risk period metadata — medium, PR #9.** In `src/lib/riskModel.js`, `comparablePeriodSequence()` still treats a blank `reference_period` as annual when a year is present. `src/components/UnifiedRiskForecast.jsx` similarly defaults a blank period signature to annual. Unknown frequency can therefore be treated as annual cadence. Require an explicit annual marker or an approved source-specific default.
2. **Conflicting risk year metadata — medium, PR #9.** Timeline helpers prefer `reference_year` over a year embedded in `reference_period`. A row with `reference_year=2023` and `reference_period='2024-Q1'` can be silently placed in the wrong year. Reject or quarantine contradictory metadata.
3. **Whitespace numeric coercion — medium, PR #13.** `src/lib/forecastModel.js` defines `finite()` so whitespace-only strings pass `Number.isFinite(Number(value))`; `Number('   ')` is zero. Such values may be treated as observed zeros instead of missing values. Trim strings before conversion and add tests for whitespace-only score, SME count, and investment volume.

These findings are static source-review findings. They have not been fixed in the owning PRs by the QA branch.

## QA automation added in PR #12

- `npm test` runs the existing Node regression checks through `scripts/test-all.mjs`.
- The runner covers migration staging, forecast coverage, risk provenance/geography, risk model pillars, official comparison, analytical report gates, municipality passports, operational registry, and the six-pillar index test when that script exists on the branch.
- `.github/workflows/qa.yml` runs the suite and production build on pushes to `feat/qa-testing` and via manual dispatch.
- `docs/QA_AUDIT.md` records verified branch heads, findings, limitations, and historical Supabase inspection.
- No `package-lock.json` exists on the baseline; CI uses `npm install`, so dependency resolution is not fully locked/reproducible.

## Historical read-only Supabase inspection

Previously inspected project `dmbikidqikjupkghywbz` (snapshot, not a fresh live recheck in this pass):

- Project status was `ACTIVE_HEALTHY`, PostgreSQL 17.
- `public.municipalities`: 22 rows.
- `public.municipality_indicators`: 1,445 rows (1,389 verified municipality-level, 44 verified settlement-level, 12 municipality-level `needs_review`).
- No duplicate verified municipality logical keys were returned for municipality + indicator + year + period.
- RLS was enabled on inspected public tables. Client-readable tables had SELECT-only grants; four tables without policies/client grants were fail-closed: `forecast_runs`, `municipality_indicator_import_staging`, `municipality_legacy_snapshots`, and `project_work_log`.
- The inspection found no critical Security Advisor finding and no Health Advisor finding at that time. Four informational `rls_enabled_no_policy` findings related to the fail-closed tables were observed.
- No SQL mutation, migration, or data change was made. Recheck live state before treating this snapshot as current.

## Verification limitations

- GitHub Actions verifies scripts and the Vite production bundle; it does not prove the deployed site or real browser flows work.
- Browser E2E, visual regression, keyboard/screen-reader checks, and live-site smoke tests remain outstanding.
- Vercel previously returned a build-rate-limit response; no bypass was attempted and no deployment was triggered.
- The public site was not successfully inspected by the web inspection service in the prior audit. Do not claim production health until a real browser check succeeds.

## Next QA actions

1. Confirm the latest QA workflow and build results for the current PR #12 head.
2. Re-run all branch-head checks if any owner pushes new commits.
3. Add browser E2E coverage for index navigation, municipality comparisons, forecast controls, risk warnings, passport selection, exports, and offline/error states when a runnable browser environment is available.
4. Ask owners of PR #9 and #13 to address the confirmed metadata and numeric coercion findings.
5. Recheck the live Vercel deployment only after the provider's build-rate limit clears.
6. Keep production database and RLS changes outside QA scope unless explicitly authorized.
