# Yugra18 — QA audit checkpoint

**Date:** 2026-11-07 (refreshed after current-head review)  
**QA branch:** `feat/qa-testing`  
**QA PR:** [#12](https://github.com/vanakazamkin-tech/yugra/pull/12), Draft, not merged  
**QA head reviewed:** `5923d1a61b2b4157e3529818a41fed931779b9af`  
**PR base snapshot:** `fa006173aa096188a2f4eef0d2cb4bcfe135ae1c` (PR #10 reports a newer base snapshot; branch bases are not uniform)

## Scope and safety

- QA work is isolated in `feat/qa-testing`; no changes were made to `main`.
- PRs #8 (index), #9 (risks), #10 (UI), #11 (data quality), and #13 (forecasting) remain separate, open, and unmerged.
- No production deployment, production SQL migration, production data mutation, or RLS change was performed.
- PR #12 remains Draft; do not merge it as part of this QA work.
- Main branch protection was previously observed disabled. This is a repository process risk; recheck before relying on required CI gating.

## Current branch-head verification (7 Nov 2026)

| PR | Current head (7 Nov check) | Latest CI observed for that head |
|---|---|---|
| #8 — index | `ed2fc7ddde4bcb2be1508f69b4e730356585a25a` | No PR-triggered workflow run returned for this exact head; previous Build #42275603972 belongs to an older commit |
| #9 — risks | `0b83d8625566e0d9e411f1dd4c95d2fc409427a9` | Build #42277756610 — in progress at inspection |
| #10 — UI | `94bff0003f8eafb2455c85b781aff795f62f74a9` | Build #42277658644 — passed |
| #11 — data quality | `a83bc05262ae70a23234436358ce249f231765d5` | Build #42277695712 — passed, but migration blocker remains |
| #12 — QA | `5923d1a61b2b4157e3529818a41fed931779b9af` | QA #42276401153 — passed; Build #42276410586 — passed |
| #13 — forecasting | `40abd4f39e719429cded4090cf606470f5d8779e` | Build #42268245956 — passed on the current unchanged head |

All PRs #8–#13 remain open and unmerged. PR #12 remains Draft. The connected Supabase migration history currently ends at `20261106171350`; the three new PR #11 migrations have not been applied.

## Confirmed findings requiring owner review

1. **Risk period metadata — medium, PR #9.** In the current PR #9 head `0b83d8625566e0d9e411f1dd4c95d2fc409427a9`, `comparablePeriodSequence()` still treats a blank `reference_period` as annual when a year is present. `UnifiedRiskForecast.jsx` still maps a blank period signature to `annual`. Unknown frequency can therefore be treated as annual cadence; current risk regression tests do not cover this blank-period case. Require an explicit annual marker or an approved source-specific default.
2. **Conflicting risk year metadata — medium, PR #9.** `comparablePeriodSequence()` and `periodOrder()` prefer `reference_year` over a year embedded in `reference_period`. A row with `reference_year=2023` and `reference_period='2024-Q1'` can be silently assigned to the wrong annual slot. Current regression tests cover missing years and mismatched quarters, but not contradictory year fields. Reject or quarantine contradictory metadata.
3. **Whitespace numeric coercion — medium, PR #13.** Current PR #13 head `40abd4f39e719429cded4090cf606470f5d8779e` still defines `finite()` using `Number.isFinite(Number(value))` without trimming strings; `Number('   ')` is zero. Whitespace-only `score`, `smeCount`, `volumeBillion`, and numeric scenario parameters can therefore be treated as zero instead of missing/default input. Add trim-aware validation and regression tests.

These findings are static source-review findings. They have not been fixed in the owning PRs by the QA branch.

## QA automation added in PR #12

- `npm test` runs the existing Node regression checks through `scripts/test-all.mjs`.
- The runner covers migration staging, forecast coverage, risk provenance/geography, risk model pillars, official comparison, analytical report gates, municipality passports, operational registry, and the six-pillar index test when that script exists on the branch.
- `.github/workflows/qa.yml` runs the suite and production build on pushes to `feat/qa-testing` and via manual dispatch.
- `docs/QA_AUDIT.md` records verified branch heads, findings, limitations, and historical Supabase inspection.
- No `package-lock.json` exists on the baseline; CI uses `npm install`, so dependency resolution is not fully locked/reproducible.

## Live Supabase migration preflight — blocking finding (7 Nov 2026)

A read-only inspection of the connected Supabase project `dmbikidqikjupkghywbz` found that the currently deployed relation has a **UNIQUE constraint** named `municipality_indicators_observation_unique` with definition `UNIQUE (municipality_id, indicator_code, reference_year, reference_period, source_id)`. PostgreSQL exposes its backing unique index under the same name. The three new PR #11 migrations are not present in the database migration history; no migration was applied during this inspection.

In PR #11 migration `20261106210000_data_quality_provenance_guardrails.sql`, the new wider unique index is created and then the migration executes:
`drop index if exists public.municipality_indicators_observation_unique;`

**Blocking issue:** this index backs a table UNIQUE constraint. PostgreSQL will reject dropping the backing index directly while the constraint depends on it (the migration must drop the constraint with `ALTER TABLE ... DROP CONSTRAINT`, then ensure the replacement index is installed safely). The migration therefore is expected to fail on the connected database before completion.

**Test gap:** `supabase/tests/data_quality_migrations_bootstrap.sql` creates `municipality_indicators_observation_unique` as a standalone unique index, not as a UNIQUE constraint. Consequently the disposable PostgreSQL integration test does not reproduce the live schema dependency and can pass while the migration fails against the actual project.

Required owner action in PR #11:
1. Reproduce the deployed schema exactly in the disposable bootstrap by defining the old UNIQUE constraint, not only a standalone index.
2. Replace the direct `DROP INDEX` with a constraint-aware migration sequence; preserve the preflight and ensure the replacement uniqueness rule is installed without leaving an unsafe interval.
3. Re-run the disposable migration integration test against both a constraint-backed fixture and the idempotent re-application case.
4. Do not apply these migrations to production until the corrected migration passes against a schema snapshot matching the live project.

This is a source-review + live catalog finding. The live check was read-only; no schema, data, policy, or migration history was changed.

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

1. Recheck the in-progress PR #9 build, and obtain a current build result for PR #8 head `ed2fc7d` (no PR-triggered run was returned for that SHA).
2. Require PR #11 to correct the constraint-backed index migration and make its disposable fixture match the live schema before approval.
3. Re-run all branch-head checks if any owner pushes new commits.
4. Add browser E2E coverage for index navigation, municipality comparisons, forecast controls, risk warnings, passport selection, exports, and offline/error states when a runnable browser environment is available.
5. Ask owners of PR #9 and #13 to address the confirmed metadata and numeric coercion findings.
6. Recheck the live Vercel deployment only after the provider's build-rate limit clears.
7. Keep production database and RLS changes outside QA scope unless explicitly authorized.
