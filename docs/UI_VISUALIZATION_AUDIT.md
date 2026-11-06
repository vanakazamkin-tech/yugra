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

## Analytics section switcher semantics (6 November 2026)

- The in-place analytics section switcher is now represented as a named control group rather than a navigation landmark with page-current states.
- Each section button exposes its selected state through `aria-pressed`, synchronized with the existing active section.
- The existing section switching, visual classes, content, and analytical behavior are unchanged.

## Rating filter and result feedback (6 November 2026)

- The rating page's municipality-group filter is now a named control group; each option exposes its selected state through `aria-pressed`.
- The rating table's municipality count is exposed as a polite status announcement when the visible result set changes.
- Existing filter predicates, sort order, data, and visual styling are unchanged.

## Responsive analytics navigation (6 November 2026)

- The seven-section analytics switcher now allows long labels to wrap cleanly and keeps its controls at a consistent touch-friendly minimum height.
- At phone widths, the switcher uses a two-column grid and lets the final, seventh section span the full row rather than leaving an isolated half-width control.
- Existing tab order, selected state, content switching, calculations, and the project's visual palette are unchanged.

## CSV download lifecycle follow-up (6 November 2026)

- The main analytical workspace, conceptual forecast export, and unified risk/forecast export now defer revoking each generated object URL until one second after the download click.
- This avoids revoking the temporary file URL synchronously while the browser is still initiating the download, improving compatibility across browsers.
- CSV contents, column definitions, scenario metadata, filenames, and calculations are unchanged.
- This is a source-level compatibility fix; browser download verification remains outstanding.

## Report builder selection feedback (6 November 2026)

- The manual municipality selector now exposes its selection count as a polite live status, so assistive technology announces changes without requiring focus to move.
- The municipality checkbox collection and report metric checkbox collection now have descriptive group names.
- Searching the manual municipality list now displays an explicit empty state when no municipality matches, instead of leaving a blank list.
- Selection rules, report scope, data, export content, and calculations are unchanged.
- Browser/assistive-technology verification remains outstanding.

## Missing-value clarity in municipality comparison (6 November 2026)

- The comparison chart now counts finite, non-null values for the selected indicator before choosing its scale.
- If no selected municipality has a usable value, the chart displays an explicit status message recommending another indicator or a source-data check.
- If coverage is partial, the chart states how many territories have values and explicitly warns that missing values are not treated as zero.
- Municipality rows and formatted values remain visible; no source data, metric definitions, ranking logic, or calculations were changed.
- Verification is pending CI; interactive browser rendering has not yet been tested.

## Municipality passport data-coverage summary (7 November 2026)

- Added a compact coverage summary to each municipality passport for four available datasets: verified official indicators, investment sites, education facilities, and municipal-program execution reports.
- Each category displays the number of records associated with the selected municipality; empty categories are explicit rather than silently omitted from the overview.
- The summary reflects the official-data catalogue state (loading, connected, error, or not connected) and displays the last successful catalogue sync time when available.
- Added responsive two-column layout for narrow screens, retaining the existing Khanty-inspired palette and modal structure.
- Counts describe records present in the current database only; they are not completeness scores and do not imply that missing indicators equal zero.
- No source records, indicator calculations, ranking logic, or methodology were changed. Browser verification remains pending CI.

## Mobile chart and table readability (7 November 2026)

- Comparison, report, and forecast bar charts switch to a two-line mobile row: territory name and numeric value remain visible on the first line, with the bar spanning the second line.
- Long municipality names wrap instead of being cut off with ellipses at phone widths.
- Forecast table filters stack vertically on narrow screens; the table remains horizontally scrollable rather than compressing columns until values become unreadable.
- Added touch-friendly horizontal scrolling and a more visible, themed scrollbar for keyboard-accessible table regions.
- Scenario cards use a single-column layout on phones, while comparison summary cards retain a compact two-column grid on very narrow screens.
- No metric values, model assumptions, calculations, source records, or table columns were changed. Browser verification remains pending CI.

## Touch interaction and mobile municipality map (7 November 2026)

- On narrow screens, the municipality map and its territory list now form a single-column layout, placing the list below the map instead of squeezing it into a side column.
- The territory list has a bounded, touch-scrollable viewport on phones so it remains usable without dominating the full page.
- Municipality list buttons have a minimum 44px touch target, visible keyboard focus, and pressed feedback.
- SVG map targets use manipulation touch behavior and suppress the browser tap highlight without changing map selection handlers.
- Small-screen footer actions stack vertically and retain a comfortable tap area.
- Municipality IDs, map geometry, group classification, selected-item behavior, and all underlying data remain unchanged. Browser/device testing remains pending CI.

## Municipality map passport action semantics (7 November 2026)

- Interactive map targets now expose that activating a territory opens a dialog/passport (`aria-haspopup="dialog"`); their accessible names announce the territory and action.
- The map description now explains mouse, touch, and keyboard selection and the passport-opening result, including the list position on narrow screens.
- Municipality list buttons also announce the dialog action to assistive technology.
- Selection callbacks and the existing municipality passport dialog remain unchanged; this is an accessibility clarification, not a change to data or navigation logic.

## Municipality passport opening focus (7 November 2026)

- When a municipality passport opens, keyboard/screen-reader focus now moves to the municipality heading rather than the close button, so the opened territory is announced immediately.
- The heading is programmatically focusable without adding it to the normal Tab sequence.
- The focus trap now correctly routes Tab from the heading to the first control and Shift+Tab to the last control, while preserving normal movement between controls, Escape closing, scroll locking, and focus restoration.
- The dialog content, selected municipality, and data remain unchanged.

## Data provenance in overview and CSV exports (7 November 2026)

- The overview notice now explicitly states that new cards are calculated from the project's existing dataset and that no new official statistical series have been uploaded.
- CSV exports generated from the shared demonstration-metric exporter now include a `Статус данных` column on every row, identifying the exported values as demonstration values rather than official statistics.
- The change does not alter values, formulas, selected municipalities, filters, or official-observation exports.
- Browser download verification and a CI build for the resulting branch head remain outstanding.

## Explicit empty states in municipality passports (7 November 2026)

- Investment sites, education facilities, and municipal-program execution sections now remain visible when a municipality has no matching records.
- Each empty section explains that records are not currently loaded for the territory; it does not imply that the real-world facilities, investment sites, or program activity do not exist.
- Record counts remain visible and are consistent with the passport coverage summary.
- Existing records, filters, source links, calculations, and database content are unchanged.
- This is a source-level UX correction. Browser verification and a successful build for the latest branch head remain outstanding.

## Municipality map coverage regression guard (7 November 2026)

- Added `scripts/check-map-coverage.mjs` and the `npm run check:map-coverage` package script.
- The check compares municipality IDs in `data/municipalities-detailed.json` with map feature IDs in `src/ugraMapGeo.js`, and fails on missing or duplicate IDs.
- A source-data comparison during this change found 22 map features and 22 municipality records, with no missing or duplicate IDs.
- The check is intended to prevent a future data/map edit from silently removing a municipality from either the map or the data-backed list.
- The check logic and current ID sets were inspected against the GitHub source. The script has not been executed in a local Node environment in this session; build and browser checks remain outstanding.

## CI integration for map coverage (7 November 2026)

- The shared GitHub Actions workflow now includes `feat/ui-visualization` in its push branch filter.
- CI runs `node --check scripts/check-map-coverage.mjs` and `npm run check:map-coverage` before the production build.
- This makes the map/data ID consistency guard part of the branch's automated checks rather than a documented manual command only.
- The workflow change is committed, but its execution result must be read from GitHub Actions after the push; this entry does not claim that the new run has passed.

## Keyboard focus on interactive SVG map (7 November 2026)

- Added a visible `:focus-visible` treatment to SVG map targets with `role="button"`, including district paths and city target groups.
- The focus treatment uses the existing warm-gold interface accent and a subtle drop shadow; it does not change the map's default appearance.
- Pointer focus that is not keyboard-visible does not retain the focus outline.
- Static source inspection confirms the selectors cover the SVG targets created by `UgraMap`. Browser and assistive-technology verification are still required.

## Risk passport selector accessible name (7 November 2026)

- Added an explicit accessible name to the municipality selector in the risk passport section: `Выбрать муниципалитет для паспорта рисков`.
- The control's value, selected municipality state, options, layout, and risk calculations are unchanged.
- Source inspection identified this as the standalone selector in the risk passport heading; the other risk/forecast selectors remain associated with visible labels or explicit accessible names.
- Browser and screen-reader verification remain outstanding.

## Accessibility follow-up review (7 November 2026)

A source-level review of the shared municipality passport dialog and analytical controls confirmed the following existing safeguards:

- The municipality passport dialog has `role="dialog"`, `aria-modal="true"`, a programmatic title and description, initial focus placement, Escape-to-close behavior, Tab/Shift+Tab focus containment, body-scroll locking, and focus restoration to the invoking element.
- Analytical tables are placed in labelled, keyboard-focusable horizontal-scroll regions; table headers use column scope.
- The forecasting and risk controls use visible label associations or explicit accessible names. The risk passport's previously unnamed municipality selector now has an explicit Russian accessible name.
- The visualization stylesheet includes a reduced-motion media query and visible focus styling.

This was a static source review only. It does not replace keyboard-only, screen-reader, zoom, or real-device browser testing. The relevant CI run for commit `747bad35f3dd7790d693689355e532af4d5d9b90` completed successfully, including map coverage validation and the production bundle build.

## Keyboard access to official-observations report table (7 November 2026)

The optional official-observations table in the live report preview already had a horizontally scrollable wrapper, but unlike the other analytical tables its wrapper was not keyboard-focusable and had no accessible region name. The wrapper now uses `role="region"`, `tabIndex={0}`, and a Russian accessible name that explains horizontal scrolling. The table content, official-data filtering, print layout, and data values are unchanged.

This is a source-level accessibility fix; keyboard operation still requires manual browser verification.

## Skip-link focus destination (7 November 2026)

The application already exposed a visible-on-focus “Перейти к содержимому” skip link targeting the main landmark. The target `<main id="main-content">` was not explicitly programmatically focusable. Added `tabIndex={-1}` so keyboard and assistive-technology users can move focus to the main content when activating the skip link. This does not add a persistent tab stop or change the visual design.

Source-level check only; verify actual focus behavior in supported browsers during manual keyboard testing.

## Map interaction and live-status accessibility review (7 November 2026)

A further source-level review of `src/components/UgraMap.jsx` and the application shell confirmed:

- Municipality shapes on the SVG map are keyboard-focusable button targets with municipality-specific accessible names; Enter and Space open the corresponding passport.
- The adjacent municipality list uses native buttons, providing an alternative to selecting small SVG targets.
- The map has a labelled SVG group and a description that explains pointer, touch, and keyboard interaction.
- The database synchronization message is exposed as a polite live status and distinguishes connected, loading, unconfigured, and error states; retry is available when connection fails.
- Global visible focus styles cover buttons, links, inputs, selects, and textareas; map regions and city targets have dedicated focus treatment.

This review is based on source inspection, not live assistive-technology or touch testing. The PR's recent CI runs pass, but deployment preview is separately constrained by Vercel's free-plan daily deployment limit noted in the PR checks.
