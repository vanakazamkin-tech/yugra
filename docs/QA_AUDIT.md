# Yugra18 — QA audit checkpoint

**Date:** 2026-11-06  
**QA branch:** `feat/qa-testing`  
**Baseline:** `main` at `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c`  
**QA PR:** [#12](https://github.com/vanakazamkin-tech/yugra/pull/12), draft, not merged  
**Verified QA head:** `72178a32f972828ebcec9562843a27932c1b3093`

## Scope and integrity

- Repository default branch is `main`.
- The existing `feat/qa-testing` branch was compared with `main`: identical, 0 commits ahead and 0 behind before QA work. No existing work was overwritten.
- Open pull requests at the audit checkpoint: #8 index methodology, #9 risk analysis, #10 UI visualization. They are separate from the baseline and must be tested as PR code, not assumed to be in `main`.
- QA changes are isolated in `feat/qa-testing` and proposed through draft PR #12. No merge was performed.
- No production deployment, database migration, or data mutation was performed during this audit.

## Findings

| Priority | Finding | Evidence / impact | Owner |
|---|---|---|---|
| High | Unknown risk direction can count as usable coverage in the current main branch | `assessRiskSignals` filters only `adverse !== null`; an undefined value passes. PR #9 contains the narrow fix requiring explicit `true/false`. Until that PR is merged, unknown-direction rows can distort the traffic-light coverage count. | Risks (#9) |
| Medium | No standard `npm test` entry point | Existing regression scripts were invoked individually by CI. This branch adds a consolidated runner. | QA |
| Medium | No dedicated QA branch verification | This branch adds an isolated push-triggered workflow. It has now executed successfully (see CI verification). | QA |
| Medium | No `package-lock.json` is present on the baseline | Dependencies use version ranges and CI uses `npm install`; installs are not fully reproducible. A lockfile should be generated and reviewed in a separate dependency-management change using a working package registry. | Build / platform |
| Medium | No browser-level end-to-end suite was found in the inspected package/workflow | Current checks are deterministic Node scripts and source guards plus a Vite production build. They do not exercise real navigation, form actions, browser rendering, network failures, or accessibility flows. | QA / UI |
| Medium | Vercel check is failing due to build-rate limit | GitHub commit status reports Vercel failure with a `build-rate-limit` URL and a 24-hour retry message. This is a deployment-provider limit, not evidence of an application runtime defect. | Platform / release |
| Info | Four public-schema tables have RLS enabled but no policies or client SELECT grants | `forecast_runs`, `municipality_indicator_import_staging`, `municipality_legacy_snapshots`, and `project_work_log`. Current behavior is fail-closed. Do not add policies until intended access requirements are confirmed. | Data / security |

## CI verification

Verified on commit `72178a32f972828ebcec9562843a27932c1b3093`:

- **QA branch verification** — GitHub Actions run [#42268127420](https://github.com/vanakazamkin-tech/yugra/actions/runs/42268127420): completed successfully.
  - dependency installation: success;
  - consolidated `npm test` regression suite: success;
  - `npm run build`: success.
- **Build verification** — GitHub Actions run [#42268172104](https://github.com/vanakazamkin-tech/yugra/actions/runs/42268172104): completed successfully.
  - migration staging syntax and filters: success;
  - forecast coverage classification: success;
  - risk data provenance/geography gates: success;
  - indicator classification and resilience model pillars: success;
  - official comparison, analytical report, municipality passport, and operational registry gates: success;
  - production bundle build: success.
- These results confirm the test suite and production bundle build on the QA branch commit. They do **not** prove that the deployed Vercel site is healthy or that browser-level user flows work.
- Vercel's separate commit status remains failed because of its build-rate limit; it is not a failing GitHub Actions test.

## Verified Supabase snapshot

Read-only inspection of project `dmbikidqikjupkghywbz`:

- Project status: `ACTIVE_HEALTHY`, PostgreSQL 17.
- `public.municipalities`: 22 rows; RLS enabled; public read policy exists.
- `public.municipality_indicators`: 1,445 rows:
  - 1,389 verified municipality-level;
  - 44 verified settlement-level;
  - 12 municipality-level `needs_review`.
- No duplicate verified municipality logical keys were returned for `municipality_id + indicator_code + reference_year + reference_period`.
- All inspected public tables have RLS enabled.
- Security advisor returned four `rls_enabled_no_policy` informational findings listed above; no security-critical finding was returned in this scan.
- Performance advisor reported 16 unused indexes. This is informational on a database with limited workload; no indexes were removed.

## Pull-request review notes

- **#8 — index methodology:** adds a separate strict six-pillar module and deterministic tests. It is not wired into the user-facing rating. This is the correct safety boundary until indicator definitions and methodology are approved. Test it after integration; do not call it a production index.
- **#9 — risks:** addresses the unknown-direction coverage defect and adds repeated-deterioration explanations. This change should be tested against missing/undefined/null directions and streak boundaries before merge.
- **#10 — UI:** additive CSS-only visualization layer; source review reports no calculation or data-access changes. The Vercel check currently prevents treating its deployment status as green.

## Verification limitations

- Local repository clone was unavailable in this environment because outbound DNS/network access to GitHub was unavailable. Tests and build were instead executed successfully by GitHub Actions on the QA branch.
- No browser interaction test, accessibility audit, or live website visual test is claimed as passed.
- The Vercel deployment check is blocked by the provider's build-rate limit.
- The public website could not be fetched by the web inspection service during the initial audit.

## Next QA actions

1. Add browser E2E coverage for index navigation, comparison filters, forecast controls, passport selection, exports, and offline/error states.
2. Re-run this audit against the merged integration commit after PRs #8–#10 are resolved.
3. Re-check the Vercel deployment once the provider's rate limit clears.
4. Do not change the four fail-closed RLS tables without confirmation of their intended exposure.
