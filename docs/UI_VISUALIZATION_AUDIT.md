# UI / visualization audit — Yugra18

Branch: `feat/ui-visualization`  
Base: `main`

## Scope reviewed

The current application is a React/Vite single-page interface. The main workspace and most page composition live in `src/InvestmentDetails.jsx`; risk analysis is implemented in `src/components/UnifiedRiskForecast.jsx` with its own stylesheet; the scenario workspace is implemented in `src/components/Forecasting.jsx`. The current main navigation exposes these destinations:

- Main overview / municipal catalog
- Map and municipal selection
- Rating
- Risks and forecast
- Comparison
- Reports
- Data centre
- Concept / methodology

## Existing analytical UI retained

The inspected interface already contains:
- Municipality search, rating-group filters, quick slices and advanced filters.
- KPI cards, a municipal map, a ranking table and additional insight cards.
- Municipal passports with a separate list of verified official observations, source links, investment sites, facilities and programme execution.
- Separate official-data coverage views, geography-level distinctions and population / economic trend visualizations.
- Comparison and report workspaces, including CSV export.
- Forecast scenarios, data-coverage panels and risk-analysis views.
- Concept notices distinguishing illustrative values and scenarios from verified statistics.

No existing feature, navigation destination, data field, indicator, formula, filter rule or forecast calculation was removed or rewritten in this UI pass.

## Changes in this branch

A dedicated `src/ui-visualization.css` presentation layer is imported after the existing stylesheet. It is deliberately additive and limited to layout resilience and usability:

- Improves responsive navigation behavior on narrower screens without hiding destinations.
- Makes dense tables horizontally scrollable, keeps their headers visible, and improves row hover feedback.
- Normalizes focus-visible states for keyboard navigation.
- Prevents long labels and large numeric values from breaking KPI cards, filters, modal rows and chart layouts.
- Improves mobile wrapping for section headings, filters, action groups and municipal passports.
- Respects reduced-motion preferences.
- Keeps the existing Yugra palette, ornament assets and component hierarchy intact.

## Known review notes / items for dedicated follow-up

1. The main workspace is a large component. A future refactor into page-level components could improve maintainability, but should be a separate structural task with regression coverage.
2. The population trend and comparable economic trend charts currently use custom SVG markup. Their source metadata and period definitions should remain visible; this pass only improves their surrounding layout.
3. Several summary and ranking values are explicitly labelled as demo/conceptual. Keep those labels and the concept disclaimer until the underlying series and methodology are independently validated.
4. The forecast and risk modules contain methodological/data-coverage caveats. Visual changes must not imply statistical certainty or fill missing observations.
5. Automated CI is configured for pull requests into `main`; the PR should be checked for the production build and existing data-integrity regression scripts before merge.

## Validation status

- Repository structure and primary navigation inspected.
- Main overview, filters, KPI cards, map, ranking table, data-centre coverage/trend views, passport, report and concept sections inspected in source.
- Forecast and risk component structure / existing responsive styles inspected.
- Calculation and data-access modules intentionally left unchanged.
- Local production build was not run in this environment; GitHub Actions PR checks are the required build gate.
