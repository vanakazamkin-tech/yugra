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
- Normalizes focus-visible states for keyboard navigation, including visible focus indicators on interactive SVG map regions and city targets.
- Gives the interactive SVG map a labelled group structure and an explicit description so its keyboard-operable regions are not hidden behind a parent image role.
- Prevents long labels and large numeric values from breaking KPI cards, filters, modal rows and chart layouts.
- Improves mobile wrapping for section headings, filters, action groups and municipal passports.
- Respects reduced-motion preferences.
- Keeps the municipal map list sections mounted as stable components, preventing unnecessary DOM remounts when hover/focus state changes.
- Makes the municipal passport dialog keyboard-contained: Tab/Shift+Tab stay inside the dialog, Escape closes it, focus returns to the opener, and background page scrolling is locked while the dialog is open.
- Explicitly marks interface action buttons as `type="button"` so they cannot accidentally submit a form if the page is later wrapped in one.
- Extends explicit button types to the forecasting and risk workspaces; a repository-wide JSX scan found and corrected 15 remaining buttons across those two modules.
- Makes all 17 horizontally scrollable data-table wrappers in the main workspace, forecast workspace and risk workspace keyboard-focusable named regions; visible focus styling makes the active scroll area clear.
- Adds explicit `scope="col"` semantics to 121 table column headers across those three UI modules.
- Announces the filtered result count in the forecast table with a polite live region, so search and municipality-filter changes are conveyed to assistive technology.
- Exposes the active sort column and direction on the corresponding ranking-table header with `aria-sort`; inactive headers do not claim a sort state. The visible municipality count is also announced when the selected table view changes.
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
- Map keyboard semantics reviewed: the SVG root exposes a labelled group; each existing region/city target retains its button role and Enter/Space handling.
- Municipal passport dialog keyboard behavior reviewed in source: focus containment, Escape close, focus restoration, and background scroll lock are implemented.
- Map-list rendering reviewed: list sections are now stable module-level components rather than nested component definitions.
- All seven JSX/TSX source files scanned for buttons without an explicit type; the 15 remaining buttons in forecast and risk workspaces were corrected. No untyped buttons remain in the scan.
- All 17 table-scroll wrappers across the three analytical UI modules were checked and made keyboard-focusable labelled regions; table headers were assigned column scope.
- GitHub Actions `Build verification` run #1007 passed on head `d14ec9fa3527c2f9d63db995e770847a70683a46`: dependency installation, all data-integrity regression checks, and production bundle build succeeded.
- Local browser-based visual regression was not run in this environment; viewport-specific manual verification remains outstanding.
