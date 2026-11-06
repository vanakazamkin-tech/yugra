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


## Chart semantics follow-up (6 November 2026)

- Report comparison bars are exposed as a labelled list; each row keeps its municipality and formatted metric value in the accessibility tree.
- Forecast investment bars are likewise exposed as a labelled list with one item per municipality and the formatted model value.
- Decorative bar tracks are hidden from assistive technology so they do not create meaningless stops or duplicate content; the adjacent text values remain available.
- The municipality comparison chart is explicitly named as a group, and its decorative bar tracks are hidden; the same metric values remain available in the adjacent comparison cards and detailed table.
- No chart calculations, metric selection, data, scenario assumptions, or styling were changed.


## Filter and navigation state semantics (6 November 2026)

- Municipality-group filters, quick analytical slices, and education-facility type filters now expose their selected state through `aria-pressed`.
- The advanced municipality-filter disclosure reports `aria-expanded` and controls the identified filter panel.
- Forecast horizon buttons expose the selected horizon through `aria-pressed`.
- Sections in the unified risk-analysis navigation expose the active section with `aria-current="page"`.
- These changes add state information for assistive technology without changing filter behavior, forecast calculations, risk logic, or visual styling.


## Accessible filter groups and result announcements (6 November 2026)

- Municipality-group filters and quick analytical slices are now exposed as named control groups.
- Education-facility type filters are exposed as a named group.
- The active-filter summary announces the filtered municipality count through a polite status region when the selected search/slice changes.
- The forecast-horizon selector is exposed as a named group associated with its visible label; the selected horizon remains exposed through `aria-pressed`.
- No filter predicates, data values, forecast formulas, or visual styles were changed.


## Modal keyboard focus coverage (6 November 2026)

- The municipality passport modal focus trap now includes native disclosure summaries (`<summary>`) and editable content controls in its focusable-element scan.
- Disabled controls are excluded using the native `:disabled` state, including controls disabled by a parent fieldset.
- Elements inside any `aria-hidden="true"`, `hidden`, or `inert` ancestor are excluded, not only elements carrying the attribute themselves.
- Escape handling, focus containment, scroll locking, and restoration to the opener remain unchanged.


## Risk and scenario control groups (6 November 2026)

- Risk-light threshold sliders are grouped under a descriptive accessible name.
- The municipality, indicator, horizon, and shock controls in scenario forecasting are exposed as a named parameter group.
- Index sensitivity sliders are grouped as conditional impacts on the six index components.
- The scenario trajectory horizon control is separately named. Individual controls retain their existing visible labels and values.
- No thresholds, calculations, forecast behavior, or styling were changed.

## Map list disclosure state (6 November 2026)

- The map's show/hide list control now exposes its expanded/collapsed state through `aria-expanded`.
- The state follows the existing map-list visibility state and does not change the layout, map interactions, or selection behavior.
