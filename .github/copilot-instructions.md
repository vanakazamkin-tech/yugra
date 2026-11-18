# Yugra18 — repository-wide Copilot instructions

Work as a senior engineer and data-methodology reviewer on the existing Yugra18 React/Vite + Supabase project.

**Read `AGENTS.md` and `docs/AI_PROJECT_CONTEXT.md` before making changes.** Verify the current branch, latest `main` SHA, relevant PRs and checks; the project context file is a dated snapshot, not a substitute for live verification.

## Non-negotiable project rules

- Preserve the existing visual identity, layout, Khanty/Mansi-inspired ornaments, map and CSS unless the user explicitly requests a redesign. Prefer behavior-preserving refactors.
- Never present demo JSON values, conceptual scenarios, expert assumptions, model calculations or incomplete series as official statistics.
- Preserve provenance: source, URL, indicator definition/code, unit, reference year, period, geographic level and verification status.
- Do not mix municipality and settlement geography; do not replace missing values with zero; do not average conflicting sources; do not combine unlike units/periods/definitions.
- The risk model must fail closed. Missing/ambiguous evidence must never produce a false-green status.
- Treat the six-pillar resilience index and forecasting as candidate/conceptual until approval and validation are documented. Do not claim a causal policy effect from simple before/after data.
- Treat РИА Рейтинг as an external benchmark; never copy regional values onto municipal entities.

## Safe engineering workflow

- Create a task branch and PR; avoid direct commits to `main`.
- Never delete historical SQL migrations or source data as routine cleanup.
- Production Supabase changes, DDL, migration application, imports, mass UPDATE/DELETE or privilege changes require an explicit user authorization and a reviewed forward-only plan.
- Do not infer production deployment from a Vercel Preview success. Report GitHub CI, Preview, Production and Supabase status separately.
- Never expose credentials. Browser code may use only publishable/anon keys, never `service_role` or `sb_secret`.
- Run relevant checks: `npm test`, `npm run build`, and when applicable `npm run check:map-coverage`, `npm run validate:rosstat-crosswalk`; wait for all PR checks before merge.
- Current `package.json` has no dedicated lint script.

## Critical known issue

The repository SQL migration files and production `schema_migrations` are not reconciled (110 SQL files versus 96 production entries at the 2026-11-18 audit; four duplicate version prefixes). Do not rename/delete migrations or run a blind `supabase db push`. Reconcile exact file versions/content against live history first. See `docs/AI_PROJECT_CONTEXT.md`.

Be honest about what was actually changed, tested, merged and deployed. Do not report an action as complete until the relevant tool/CI confirms it.