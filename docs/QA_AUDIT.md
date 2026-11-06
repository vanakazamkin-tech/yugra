# Yugra18 — QA audit checkpoint

**Date:** 2026-11-06  
**QA branch:** `feat/qa-testing`  
**Original QA baseline:** `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c`  
**Current main:** `5cedff13fd3ea3521c5aa4befdfd75dc12ae1499` (one documentation-only commit ahead)  
**QA PR:** [#12](https://github.com/vanakazamkin-tech/yugra/pull/12), draft, not merged  
**Last verified QA head:** `0541e7dfd0df998a51e9ba0fdee715644f797405`

## Scope and integrity

- Repository default branch is `main`.
- The existing `feat/qa-testing` branch was identical to `main` before QA work. No existing work was overwritten.
- PRs #8 (index methodology), #9 (risk analysis), #10 (UI visualization), #11 (data quality), and #13 (forecasting) remain separate workstreams and must be reviewed as PR code, not assumed to be in `main`.
- QA changes are isolated in `feat/qa-testing` and proposed through draft PR #12. No merge was performed.
- Latest check: `main` advanced to `5cedff13fd3ea3521c5aa4befdfd75dc12ae1499` through one documentation-only commit adding the proposed index methodology. It does not merge PR #8 or change application code. QA PR #12 still contains its original baseline ancestry; no rebase/merge was performed.
- Repository API reports branch protection disabled on `main` (no required status checks). This is a process risk: merges are not technically gated by required CI checks.
- No production deployment, database migration, or data mutation was performed during this audit.

## Findings

| Priority | Finding | Evidence / impact | Owner |
|---|---|---|---|
| High — blocks PR CI | Index diagnostics contract mismatch | PR #8 had a diagnostics-test mismatch on earlier heads: tests expected a group diagnostic for rows deliberately rejected before peer grouping. Current head `98e37c09f6a20fdf122c0b71107495c140a24422` updates the test to assert those rejected rows do not appear in peer groups, matching the implementation's fail-closed behavior. Current-head Build verification [#42273249664](https://github.com/vanakazamkin-tech/yugra/actions/runs/42273249664) passed; the earlier failing assertions are superseded. | Index methodology (#8) |
| Info — resolved on latest head | Duma budget staging test expected a count where the importer returns review rows | On earlier PR #11 head `d551c04`, `test-duma-budget-import.mjs:38` asserted the reviewable `excluded_control_total_rows` array equalled numeric `1`. The test now checks `.length`, matching the structured output contract. Latest head `1777e12ab3cf2b048aaac579bb6db451806a9500` Build verification [#42273426496](https://github.com/vanakazamkin-tech/yugra/actions/runs/42273426496) passed. PostgreSQL migration integration also passed. No production import occurred. | Data quality (#11) |
| Medium — review required | Missing period is silently treated as annual in the risk pipeline | `src/components/UnifiedRiskForecast.jsx` maps an empty `reference_period` to the signature `annual`; `src/lib/riskModel.js` also treats an empty period as annual in `comparablePeriodSequence()`. Thus two observations with unknown frequency can be counted as consecutive annual intervals. Require an explicit annual marker or approved source-specific default; add blank/null period tests at both normalization and streak layers. | Risks (#9) |
| Medium — review required | Risk timeline accepts contradictory year metadata | Both `periodOrder()` in `UnifiedRiskForecast.jsx` and `comparablePeriodSequence()` in `riskModel.js` prefer `reference_year` over a year embedded in `reference_period`. A row such as `reference_year=2023`, `reference_period='2024-Q1'` is silently placed in 2023 and may contribute to a streak. Reject contradictory year metadata and test both ordering and streak calculation. | Risks (#9) |
| Medium — review required | Whitespace-only numeric inputs are silently converted to zero in scenario forecasts | `src/lib/forecastModel.js` `finite()` rejects `''` but not strings such as `'   '`. `Number('   ')` is `0`, so whitespace-only `score`, `smeCount`, or `investments.volumeBillion` can be treated as observed zero instead of missing. This can alter projected values and coverage. Trim strings before numeric coercion and add tests for whitespace-only inputs. | Forecasting (#13) |


| Priority | Finding | Evidence / impact | Owner |
|---|---|---|---|
| High | Unknown risk direction can count as usable coverage in the current main branch | `assessRiskSignals` filters only `adverse !== null`; an undefined value passes. PR #9 contains the targeted fix requiring explicit `true/false`. Until merged, unknown-direction rows can distort traffic-light coverage. | Risks (#9) |
| Medium | No standard `npm test` entry point | QA branch adds a consolidated runner for the existing deterministic regression scripts. | QA |
| Medium | No dedicated QA branch verification | QA branch adds an isolated push-triggered workflow; latest run passed. | QA |
| Medium | No `package-lock.json` on baseline | Dependencies use version ranges and CI uses `npm install`; installs are not fully reproducible. Generate/review a lockfile separately with a working package registry. | Build / platform |
| Medium | No browser-level end-to-end suite found | Current checks are Node scripts/source guards and Vite production build. They do not exercise real navigation, form actions, browser rendering, network failures, or accessibility flows. | QA / UI |
| Medium | Main branch protection is disabled | GitHub reports `protected=false`, with no required status checks. A PR may be merged without CI gating. | Repository admin |
| Medium | Vercel check is failing due to build-rate limit | Commit status target points to Vercel's `build-rate-limit` page. This is not evidence of an application runtime defect. | Platform / release |
| Info | Four public-schema tables have RLS enabled but no policies or client SELECT grants | `forecast_runs`, `municipality_indicator_import_staging`, `municipality_legacy_snapshots`, and `project_work_log`. Current behavior is fail-closed. Do not add policies until intended access requirements are confirmed. | Data / security |

## CI verification

Verified on QA head `0541e7dfd0df998a51e9ba0fdee715644f797405`:

- **QA branch verification** — [GitHub Actions run #42272528323](https://github.com/vanakazamkin-tech/yugra/actions/runs/42272528323): completed successfully on QA head `0541e7dfd0df998a51e9ba0fdee715644f797405`.
- **Build verification** — [GitHub Actions run #42272538576](https://github.com/vanakazamkin-tech/yugra/actions/runs/42272538576): completed successfully on the same QA head.
  - dependency installation: success;
  - migration staging syntax and filters: success;
  - forecast coverage classification: success;
  - risk data provenance/geography gates: success;
  - indicator classification and resilience model pillars: success;
  - official comparison, analytical report, municipality passport, and operational registry gates: success;
  - production bundle build: success.
- These results confirm the regression suite and production bundle build on the QA branch commit. They do **not** prove that the deployed Vercel site is healthy or that browser-level user flows work.
- Vercel's separate commit status remains failed because of its build-rate limit; it is not a failing GitHub Actions test.

## Verified Supabase snapshot

Read-only inspection of project `dmbikidqikjupkghywbz`:

- Project status: `ACTIVE_HEALTHY`, PostgreSQL 17.
- `public.municipalities`: 22 rows; RLS enabled; public read policy exists.
- `public.municipality_indicators`: 1,445 rows:
  - 1,389 verified municipality-level;
  - 44 verified settlement-level;
  - 12 municipality-level `needs_review`.
- No duplicate verified municipality logical keys returned for `municipality_id + indicator_code + reference_year + reference_period`.
- All inspected public tables have RLS enabled.
- Security advisor returned four `rls_enabled_no_policy` informational findings listed above; no security-critical finding was returned in this scan. Health advisor returned no findings.
- A privilege audit confirmed that the 10 client-readable public tables grant `anon`/`authenticated` SELECT only; none grants client INSERT, UPDATE, or DELETE. The four fail-closed tables have no client privileges and no policies.
- Policy predicates reviewed: `municipality_indicators`, `external_rating_results`, `fuel_price_observations`, `investment_sites`, `municipal_facilities`, and `municipal_program_execution` expose only `verified` rows; `forecast_scenarios` exposes only active scenarios; municipality registry, source catalog, and external rating catalog are public-read. All are SELECT-only.
- The only public view, `municipality_indicator_import_review`, has `security_invoker=true` and no client SELECT grant. No Supabase Storage buckets currently exist.
- Inspected public functions are not `SECURITY DEFINER`; the import function is not executable by client roles. The `set_updated_at` trigger helper has default EXECUTE privileges but is not a `SECURITY DEFINER` function.
- Data-quality aggregate over `municipality_indicators`: 1,445 rows; zero missing municipality IDs, indicator codes, units, periods, source IDs, or source URLs; zero invalid years; 1,389 verified municipality-level rows.
- Performance advisor reported 16 unused indexes. Informational only on a database with limited workload; no indexes were removed.

## Pull-request review notes

- **#8 — index methodology:** current head `98e37c09f6a20fdf122c0b71107495c140a24422`. The separate strict six-pillar module is not wired into the user-facing rating, pending approval. The diagnostics test was corrected to match fail-closed exclusion behavior; current-head Build verification [#42273249664](https://github.com/vanakazamkin-tech/yugra/actions/runs/42273249664) passed. Do not call this a production index.
- **#9 — risks:** current head `46da44fbfa374d93a82575675516ed78c178b2ee`; Build verification [#42273666515](https://github.com/vanakazamkin-tech/yugra/actions/runs/42273666515) passed. Unknown-direction handling is explicit, but the two timeline edge cases remain unresolved: blank period becomes annual, and `reference_year` overrides a contradictory year embedded in `reference_period`. Unknown-direction handling is explicit, but the two timeline edge cases remain unresolved: blank period becomes annual, and `reference_year` overrides a contradictory year embedded in `reference_period`.
- **#10 — UI:** current head `048f887ee46845ce1e95c39905cf5d80af036e9e`; Build verification [#42273702716](https://github.com/vanakazamkin-tech/yugra/actions/runs/42273702716) was in progress at last check. Additive visualization changes; source review reports no calculation or data-access changes. Browser-level visual and interaction testing remains outstanding.
- **#11 — data quality:** latest head `aeefe198b1a2d92c804184ebc98940083740b843`; Build verification [#42273673839](https://github.com/vanakazamkin-tech/yugra/actions/runs/42273673839) passed. The Duma importer test now matches the structured review-array output; earlier head `37818a2` passed after this correction, and the latest head continues to pass. Disposable PostgreSQL migration integration previously passed idempotency, security grants, and uniqueness checks. A prior run on head `3701436` failed because a test asserted an obsolete period-regex contract; the PR was updated and the latest head passes. The disposable PostgreSQL integration job also passed migration reapplication, privilege, and uniqueness checks. This does not authorize applying migrations to production.
- **#13 — forecasting:** current PR head `40abd4f39e719429cded4090cf606470f5d8779e`; Build verification run [#42268245956](https://github.com/vanakazamkin-tech/yugra/actions/runs/42268245956) succeeded. Conceptual model remains assumption-driven; whitespace numeric parsing finding above needs owner review.
- **#12 — QA:** consolidated regression runner, isolated QA workflow, and this audit record. Draft only; no merge.

Latest branch-head CI rechecks (6 Nov 2026):
- PR #8 head `98e37c09f6a20fdf122c0b71107495c140a24422`: Build verification run [#42273249664](https://github.com/vanakazamkin-tech/yugra/actions/runs/42273249664) — in progress at last check; prior heads failed at a now-updated diagnostics assertion.
- PR #9 head `efe34ddfe0ded3d46ac3674eb36b4b7896fa0270`: Build verification run [#42272582437](https://github.com/vanakazamkin-tech/yugra/actions/runs/42272582437) — success. Missing-period and contradictory-year edge cases remain.
- PR #10 head `4b037621b5e1737a09d675e3d771e2aa327e58e2`: Build verification run [#42273050934](https://github.com/vanakazamkin-tech/yugra/actions/runs/42273050934) — success.
- PR #11 head `d551c0464c2acc9969ca6a2f27a7ebc6135ca049`: Build verification run [#42273208965](https://github.com/vanakazamkin-tech/yugra/actions/runs/42273208965) — failed in the Duma budget import test; migration integration passed.
- PR #13 head `40abd4f39e719429cded4090cf606470f5d8779e`: Build verification run [#42268245956](https://github.com/vanakazamkin-tech/yugra/actions/runs/42268245956) — success.

## Verification limitations

- Local repository clone was unavailable in this environment because outbound DNS/network access to GitHub was unavailable. Tests and build were executed by GitHub Actions on the QA branch.
- No browser interaction test, accessibility audit, or live website visual test is claimed as passed.
- Vercel deployment is blocked by the provider's build-rate limit.
- The public website could not be fetched by the web inspection service during the initial audit.

## Next QA actions

1. Add browser E2E coverage for index navigation, comparison filters, forecast controls, passport selection, exports, and offline/error states.
2. Re-run this audit against the merged integration commit after PRs #8–#10 are resolved.
3. Re-check Vercel deployment once the provider's rate limit clears.
4. Consider enabling branch protection and requiring successful CI before merge.
5. Do not change the four fail-closed RLS tables without confirmation of their intended exposure.
