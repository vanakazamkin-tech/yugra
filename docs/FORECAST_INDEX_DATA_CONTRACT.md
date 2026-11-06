# Forecasting / resilience-index data integration contract

**Status:** implementation contract and read-only database audit; not approval of the index methodology and not permission to publish an index.  
**Audit date:** 2026-11-07.  
**Scope:** the interface between Supabase `municipality_indicators`, `calculateMunicipalIndex`, and the guarded forecasting adapter.

## 1. Supabase observation contract

The current source table is `public.municipality_indicators`. Its relevant fields are:

| Database field | Index calculator field | Rule |
|---|---|---|
| `municipality_id` | `municipality_id` | Must resolve to one of the 22 rows in `municipalities.id`; no name-based join |
| `indicator_code` | `indicator_code` | Must match a reviewed registry definition exactly |
| `indicator_name` | `indicator_name` | Must be included in that definition's explicit `acceptedNames` |
| `reference_year` | `reference_year` | One exact integer year per calculation |
| `reference_period` | `reference_period` | One exact period token per calculation; do not mix annual, YTD, quarter, or date snapshots |
| `value` | `value` | Finite numeric value; preserve zero; no silent coercion of invalid strings |
| `unit` | `unit` | Required and consistent within an indicator cohort |
| `verification_status` | `verification_status` | Only `verified` rows are eligible |
| `geographic_level` | `geographic_level` | Must equal `municipality`; region/city/settlement/other records are excluded |
| `source_id`, `source_url` | `source_id`, `source_url` | Preserve source provenance on every included observation |

The municipal roster is read from `public.municipalities`; its stable `id` is the only join key. The calculator must receive the complete roster, not only municipalities that happen to have observations, so missing coverage remains visible.

## 2. Read-only database snapshot (2026-11-07)

The connected Supabase project was inspected without changing data or schema:

- `municipalities`: 22 rows.
- `municipality_indicators`: 1,445 rows total.
- 1,389 verified municipality-level observations.
- 44 verified observations have a non-municipality geographic level and must not enter the index.
- 12 rows are `needs_review`; none may enter the index.
- No rows have `demonstration` status.
- `municipality_indicator_import_staging`: 0 rows.
- The verified municipality-level rows inspected had no missing `source_id` or `source_url`.

The table is not a ready-made balanced panel. Exact cohort examples:

| Indicator / cohort | Verified municipalities | Implication |
|---|---:|---|
| Population, 2025-01-01 | 22 | Context / denominator; its period token differs from annual and 2025-Q3 cohorts |
| Budget revenue excluding grants, 2025-Q3 | 22 | Broad coverage, but this is a nine-month cumulative execution snapshot |
| Total budget revenue and expenditure, 2025-Q3 | 22 each | Same cohort; correlated/overlapping budget quantities need redundancy controls |
| Fixed-capital investment excluding mining, annual 2022 and 2023 | 22 each | Broad historical cohort; do not splice with the different 2024–2025 investment definition |
| Average monthly salary excluding SMEs, annual 2024 and 2025 | 9 each | Meets technical peer minimum, but not broad enough for a robust 22-MO comparison |
| Average employees excluding SMEs, annual 2024 and 2025 | 10 each | Scale of surveyed organizations, not total resident employment |
| SME employment share, annual 2022 and 2023 | 19 verified each | Three further municipalities in each year remain unresolved; 2024 verified coverage is only 2 |
| Broad social-service and infrastructure indicators | No confirmed six-pillar common panel | Social and infrastructure pillars remain blockers for a complete index |

These are coverage facts, not expert approval of indicator definitions or directions.

## 3. Exact-period constraint

`calculateMunicipalIndex` deliberately requires a single exact `referenceYear` and `referencePeriod` for all rows in one run. This prevents accidental comparison of unlike windows.

Consequences for the current database:

- `annual`, `2025-Q3`, and `2025-01-01` are different period tokens and cannot be mixed in one index run.
- Q1/H1/Q3 values are cumulative-to-date observations where indicated by their source definitions; they must not be relabelled as independent quarters or annual totals.
- Population values dated 1 January can be a denominator for a derived annual metric only after the derivation defines the exact population basis and period alignment. The derived value must retain an auditable formula and provenance to all source rows.
- The current observation schema has one `source_id` and one `source_url` per row; a multi-source derived indicator needs a separate provenance manifest or a schema extension before it can be treated as fully traceable. Do not invent a synthetic source URL or silently discard secondary source lineage.

## 4. Registry and geography gates

The candidate registry in PR #8 is not approved. `acceptedNames` must remain an explicit, reviewed allow-list; never use fuzzy name matching in the production calculation.

The Rosstat OKTMO crosswalk template currently contains 22 project municipalities but the official match fields are blank and all rows are pending. The current structural validation (22 unique project IDs) does not establish any official OKTMO match. Do not import or join by guessed OKTMO codes or municipality names.

The staging table is empty. Its review view is preflight only; rows are eligible for import only after manual acceptance, normalization, source checks, and the controlled service-role import path. Staged, pending, rejected, duplicate, needs-mapping, demonstration, needs-review, or non-municipality rows must never be passed to `calculateMunicipalIndex`.

## 5. Required integration sequence

1. Load the complete 22-row municipality roster.
2. Select one exact year and period from a verified source panel.
3. Load only verified municipality-level observations with non-empty source provenance.
4. Apply an explicitly approved registry definition and exact `acceptedNames` allow-list.
5. Validate units, duplicate logical keys, duplicate municipality IDs, and minimum peer coverage. The calculator's minimum of five is a technical floor, not evidence of robust representativeness; the expert target is materially higher where feasible.
6. Calculate the index and retain diagnostics, including excluded rows, peer coverage, missing pillars, and municipality-level completion status.
7. Build a separate, versioned approved methodology contract. The calculation result itself does not approve its methodology.
8. Pass the run, complete roster, expected year/period, and contract to `createForecastIndexOptions`.
9. The adapter passes only complete, identity-matched, finite 0–100 results. Missing or invalid results remain unavailable; it never falls back to `municipalities.score`.
10. Keep the adapter out of the live parent-screen flow until the registry is approved and all six pillars have adequate, comparable coverage.

## 6. Current release decision

The forecasting index adapter is a tested integration boundary, not a production data pipeline. A live resilience-index mode is still blocked by:
- candidate-only registry and no approved methodology version;
- no official OKTMO crosswalk matches (0/22);
- incomplete coverage in several candidate cohorts;
- no common, adequately populated social and infrastructure panels;
- unresolved source lineage for any multi-source derived indicators;
- exact-period differences between otherwise broad annual, population-date, and budget YTD observations.

The conceptual forecast remains explicitly separate. No production Supabase migration, RLS/grant change, data import, or deployment is authorized by this document.


## 7. Multi-source provenance dependency (PR #11)

PR #11 (`feat/data-quality`) proposes `private.municipality_indicator_source_links` to retain multiple source documents for one observation, including `primary`, `input`, `methodology`, `validation`, and `context` roles. This is a useful future contract for derived indicators, but PR #11 remains open and the live Supabase project currently has no tables in schema `private`; the migration has not been applied. Do not assume that the multi-source relation is available in production.

The current adapter requires the primary `sourceId` and `sourceUrl` fields carried by each `resilienceIndex.js` indicator result. This protects traceability to one primary observation source; it does not yet prove complete multi-source lineage for derived indicators. Until the PR #11 provenance layer is deployed and a trusted server-side loader can read it, exclude multi-source derived indicators from an approved index run or attach a separately verified provenance manifest and extend the result contract/tests. Do not expose the private source-link table to browser roles merely to satisfy the index UI.


## 8. Explicit peer-coverage approval contract

The technical calculation floor (`minimumPeers >= 5`) is not by itself a sufficient expert release criterion. The forecasting adapter therefore requires the separately approved, versioned contract to state both `minimumPeerMunicipalities` (integer, at least 5) and `minimumPeerCoveragePercent` (greater than 0 and at most 100). Every indicator used in every one of the six pillars must have a matching comparable-group diagnostic whose distinct municipality count and coverage percentage meet both thresholds. The run's `complete` flag alone is not enough.

The current PR #8 proposal recommends aiming for 15–22 municipalities for expert robustness where feasible. The adapter does not hard-code 15 as a universal rule: the exact approved thresholds must be decided and versioned by the methodology owner. If no municipality result clears the approved thresholds, the adapter reports the run unavailable and passes no index scores to forecasting.
