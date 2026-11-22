# Yugra18 — GitHub static snapshot architecture

## Branch responsibilities

- `main` contains the application, browser cache, export code, and workflows.
- `data` contains only public snapshot files. It is intentionally separate from application source.
- The Vercel project serves the application from `main`. Git-triggered builds are ignored for every non-`main` branch.
- GitHub Pages publishes only `data/snapshots/`; it does not publish the application repository.

## Published layout

The `data` branch stores:

- `snapshots/current.json` — pointer to the current immutable manifest.
- `snapshots/previous.json` — pointer to the last known-good manifest.
- `snapshots/manifests/<version>.json` — immutable manifests.
- `snapshots/chunks/<dataset>/<sha256>.json.gz` — immutable gzip-compressed chunks.
- `snapshots/history.json` — compact metadata for up to 200 published versions.
- `snapshots/health/latest.json` — last successful publication and size metrics.
- `snapshots/.nojekyll` — prevents Jekyll transformations.

The snapshot pointer and manifest paths retain the `snapshots/` prefix in Git. GitHub Pages publishes the `snapshots/` directory as its site root; the browser loader strips that prefix when resolving the published asset URL.

## Export and validation

The export script uses the existing Yugra18 readers and merge functions.

- A full reconciliation reads DB1 and DB2. DB1 reads remain serialized.
- An incremental refresh reads DB2 only and retains DB1-only datasets from the previous complete snapshot.
- Empty refresh fields cannot erase populated retained fields.
- Dataset identity and existing source/period/geography/unit fields are preserved by the existing merge keys.
- Verification statuses are carried as source data; the exporter does not promote or downgrade them.
- Publication is blocked on source read errors, missing datasets, row/checksum mismatches, or anything other than 22 unique municipalities.
- Every chunk is SHA-256 addressed and gzipped. A chunk over 90 MiB is rejected.
- The Pages bundle is capped at 800 MiB and 5,000 files, leaving margin below Pages' published-site limits.

The current and previous manifests and all chunks they reference remain available. Older unreferenced chunk files are removed from the current branch tree. Git history is periodically compacted after 25 commits; the compact `history.json` ledger retains version metadata for up to 200 releases.

## Browser loading

The browser requests `/snapshot-data/current.json` from the existing Yugra18 domain. Project-level Vercel routing will reverse-proxy that path to the GitHub Pages project site. This is same-origin from the browser's perspective, so browser CORS permission from GitHub Pages is not required.

The loader verifies the manifest, every chunk checksum, each chunk row count, dataset totals, and all 22 municipality IDs before returning data to the application. Gzip is detected by its magic bytes, so transparent upstream decompression does not break validation.

Chunk paths include their content hash and are immutable. The application uses normal HTTP cache semantics for unchanged chunks and continues to persist the complete last-known-good snapshot in IndexedDB.

## Cutover safety

- The snapshot workflow is manual-only while the existing DB2 Cron still calls the old Vercel Blob endpoint.
- Do not enable the Actions schedule until the old Cron is disabled.
- The first static snapshot requires a controlled `full` run. Incremental mode deliberately refuses to publish if no full baseline exists.
- The existing production application and Blob-backed API remain in place until a complete static snapshot is verified and the Vercel rewrite is ready.
- Vercel external rewrite caching is enabled at project level. Project-level routing changes can be published without a new application deployment.
- GitHub Pages must be enabled once in repository Settings → Pages with Source set to GitHub Actions before the first Pages artifact can be deployed.

## Workflow operation

Run `.github/workflows/publish-static-snapshot.yml` manually:

- `full`: first baseline or deliberate DB1+DB2 reconciliation.
- `incremental`: subsequent DB2-only update, requiring an existing baseline.

The workflow does not deploy the application to Vercel. If all data is unchanged, it skips the Git data commit and the GitHub Pages deployment.
