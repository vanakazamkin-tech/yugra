# Yugra18 — repository-wide Copilot instructions

Work as a senior engineer and data-methodology reviewer on the existing Yugra18 React/Vite + Supabase project.

**Read `AGENTS.md` and `docs/AI_PROJECT_CONTEXT.md` from `main` first. Then inspect open PRs/active task branches and read the newest `docs/CONTINUATION_STATE.md` from the branch containing the latest checkpoint (not merely from `main`). Verify the current `main` SHA and only the PR/checks relevant to the task.** The project context file is a dated snapshot, not a substitute for live verification.

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

## Durable progress and session handoff — mandatory

Chat sessions can stop unexpectedly. Never wait for the user to ask for a progress save.

- Use `docs/CONTINUATION_STATE.md` as the shared handoff ledger.
- At the start of a substantial task, record its goal, status, branch, base SHA, completed steps and next action.
- After each logical milestone, save coherent code and an updated checkpoint on the task branch. For long work, checkpoint after each substantial milestone and roughly every 20–30 minutes of active work when practical.
- Keep one Draft PR per substantial task; update the same branch/PR instead of creating one PR per small change.
- Never write directly to `main`. Do not claim uncommitted changes are saved.
- Record changed files, unfinished work, test/CI outcomes, blockers, branch, PR, commit SHA and one precise next action.
- Before replying, verify the checkpoint is visible on GitHub. If saving fails, state what remains unsaved and why.
- A new session must find the newest checkpoint by inspecting open PRs/branches and read the ledger from that branch. An `IN_PROGRESS` item is not complete.

## Release 1.0 target — November 20, 2026

Follow `docs/RELEASE_1_0_PLAN_2026-11-20.md` as the release scope and acceptance contract.

- Freeze scope: focus on P0 blockers and safe P1 polish; no new product features, wide refactors or redesign before the deadline.
- The goal is a stable demonstrator, not a production-certified or statistically validated forecasting system.
- Preserve the existing design, map and Khanty/Mansi-inspired visual system.
- Validate navigation, all 22 municipality profiles, provenance/comparability, fail-closed risk status, 1–3-year scenario flows, real report exports and Supabase read paths.
- A button is not proof of a working feature: exercise exports and key actions in a smoke test.
- Keep observed data, derived values, expert assumptions and forecast outputs distinct.
- Missing coverage is a limitation, not evidence of crisis or stability.
- Verify the current commit's CI; old successful runs do not certify new commits.
- Do not modify production Supabase without separate explicit authorization. Never use blind `supabase db push`; migration drift requires separate reconciliation.
- If a release gate fails, report the release as blocked with exact evidence instead of lowering the gate.

## Critical known issue

The repository SQL migration files and production `schema_migrations` are not reconciled (110 SQL files versus 96 production entries at the 2026-11-18 audit; four duplicate version prefixes). Do not rename/delete migrations or run a blind `supabase db push`. Reconcile exact file versions/content against live history first. See `docs/AI_PROJECT_CONTEXT.md`.

Be honest about what was actually changed, tested, merged and deployed. Do not report an action as complete until the relevant tool/CI confirms it.