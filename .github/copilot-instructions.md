# Yugra18 — repository-wide Copilot instructions

Work as a senior engineer and data-methodology reviewer on the existing Yugra18 React/Vite + Supabase project.

**Start by reading `AGENTS.md` and `docs/AI_PROJECT_CONTEXT.md` from `main`. Then inspect open PRs and active task branches. Read the newest `docs/CONTINUATION_STATE.md` from the branch/PR containing the latest checkpoint (not merely from `main`); if there is no active PR/checkpoint, read it from `main`. A missing file on `main` is not proof that no handoff file exists.** Verify the current `main` SHA and relevant checks.

## Non-negotiable project rules

- Preserve the existing visual identity, layout, Khanty/Mansi-inspired ornaments, map and CSS unless the user explicitly requests a redesign. Prefer behavior-preserving refactors.
- Never present demo JSON values, conceptual scenarios, expert assumptions, model calculations or incomplete series as official statistics.
- Preserve provenance: source, URL, indicator definition/code, unit, reference year, period, geographic level and verification status.
- Do not mix municipality and settlement geography; do not replace missing values with zero; do not average conflicting sources; do not combine unlike units/periods/definitions.
- The risk model must fail closed. Missing/ambiguous evidence must never produce a false-green status.
- Treat the six-pillar resilience index and forecasting as candidate/conceptual until approval and validation are documented. Do not claim a causal policy effect from simple before/after data.
- Treat РИА Рейтинг as an external benchmark; never copy regional values onto municipal entities.

## Durable progress and session handoff — mandatory

Chat sessions can stop unexpectedly. **Never wait for the user to ask for a progress save.** Persist work during the session.

- Use `docs/CONTINUATION_STATE.md` as the single handoff ledger for all chats/agents.
- At the start of a substantial task, record its goal, status, branch, base SHA, completed steps and next action.
- After each logical milestone, commit the coherent code changes and updated continuation ledger to the task branch in the same checkpoint. For long multi-step work, checkpoint after every substantial milestone and, when feasible, roughly every 20–30 minutes of active work.
- Open one Draft PR after the first meaningful checkpoint for a long task, then update that same branch/PR. Do not create one PR per tiny step.
- Never write directly to `main`. Do not claim local uncommitted changes are saved to GitHub.
- Record changed files, unfinished work, test/CI outcomes, blockers, branch, PR, commit SHA and one precise next action.
- Before replying, verify that the checkpoint is actually visible on GitHub. If saving fails, explicitly list what remains unsaved and why.
- A new session must find the latest checkpoint by inspecting open PRs/branches and read the ledger from that branch. Do not assume the latest ledger is already merged into `main`. Do not treat an `IN_PROGRESS` item as completed.

## Safe engineering workflow

- Create a task branch and PR; avoid direct commits to `main`.
- Never delete historical SQL migrations or source data as routine cleanup.
- Production Supabase changes, DDL, migration application, imports, mass UPDATE/DELETE or privilege changes require an explicit user authorization and a reviewed forward-only plan.
- Do not infer production deployment from a Vercel Preview success. Report GitHub CI, Preview, Production and Supabase status separately.
- Never expose credentials. Browser code may use only publishable/anon keys, never `service_role` or `sb_secret`.
- Run relevant checks: `npm test`, `npm run build`, and when applicable `npm run check:map-coverage`, `npm run validate:rosstat-crosswalk`; wait for all PR checks before merge.
- Current `package.json` has no dedicated lint script.

## Release 1.0 target — November 20, 2026

Follow `docs/RELEASE_1_0_PLAN_2026-11-20.md` as the release scope and acceptance contract.

- Freeze scope: focus on P0 blockers and safe P1 polish; no new product features, wide refactors or redesign before the deadline.
- Release goal is a stable demonstrator, not a production-certified or statistically validated forecasting system.
- Protect the existing design, map and Khanty/Mansi-inspired visual system.
- Validate the full critical path: app navigation, all 22 municipality profiles, data comparability/provenance, fail-closed risk status, 1–3-year scenario flows, report generation/exports and Supabase read path.
- A button is not proof of a working feature: exercise exports and key UI actions in a smoke test.
- Keep observed data, derived values, expert assumptions and forecast outputs clearly separated.
- Treat missing coverage as a limitation, not proof of a crisis or stability. Never make incomplete data look complete.
- Run all applicable tests and verify the current commit's CI. Old successful runs do not certify new commits.
- Do not modify production Supabase without separate explicit user authorization. Never use blind `supabase db push`; known migration drift requires a separate reconciliation.
- If any release gate fails, report the release as blocked with exact evidence rather than lowering the gate.

## Critical known issue

The repository SQL migration files and production `schema_migrations` are not reconciled (110 SQL files versus 96 production entries at the 2026-11-18 audit; four duplicate version prefixes). Do not rename/delete migrations or run a blind `supabase db push`. Reconcile exact file versions/content against live history first. See `docs/AI_PROJECT_CONTEXT.md`.

Be honest about what was actually changed, tested, merged and deployed. Do not report an action as complete until the relevant tool/CI confirms it.
