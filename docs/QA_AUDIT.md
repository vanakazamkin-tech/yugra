# Yugra18 — QA audit checkpoint

**Date:** 2026-11-06  
**QA branch:** `feat/qa-testing`  
**Baseline:** `main` at `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c`  
**QA PR:** [#12](https://github.com/vanakazamkin-tech/yugra/pull/12), draft, not merged  
**Verified QA head:** `05db7572b24b6e3af6c836772bb06934820e28d0`

## Scope and integrity

- Repository default branch is `main`.
- The existing `feat/qa-testing` branch was identical to `main) before QA work. No existing work was overwritten.
- PRs #8 (index methodology), #9 (risk analysis), and #10 (UI visualization) remain separate workstreams and must be reviewed as PR code, not assumed to be in `main`.
- QA changes are isolated in `feat/qa-testing` and proposed through draft PR #12. No merge was performed.
- Latest check confirms `main` still points to `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c`.
- Repository API reports branch protection disabled on `main` (no required status checks). This is a process risk: merges are not technically gated by required CI checks.
- No production deployment, database migration, or data mutation was performed during this audit.

## Findings

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

Verified on latest QA head `05db7572b24b6e3af6c836772bb06934820e28d0`:

- **QA branch verification** — [GitHub Actions run #42269385316](https://github.com/vanakazamkin-tech/yugra/actions/runs/42269385316): completed successfully.
- **Build verification** — [GitHub Actions run #42269396983](https://github.com/vanakazamkin-tech/yugra/actions/runs/42269396983): completed successfully.
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

- **#8 — index methodology:** adds a separate strict six-pillar module and deterministic tests. It is not wired into the user-facing rating. This is the correct safety boundary until indicator definitions and methodology are approved. Build verification passed; this confirms branch tests/build, not methodological approval or production integration. Do not call it a production index.
- **#9 — risks:** addresses the unknown-direction coverage defect and adds repeated-deterioration explanations. Build verification passed. Review behavior at missing/undefined/null directions and streak boundaries before merge.
- **#10 — UI:** additive visualization changes; source review reports no calculation or data-access changes. Build verification passed. Browser-level visual and interaction testing remains outstanding.
- **#12 — QA:** consolidated regression runner, isolated QA workflow, and this audit record. Draft only; no merge.

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
