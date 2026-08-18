# =============================================================================
# WHITECARDOPEDIA - VERSION HISTORY & RELEASE NOTES
# =============================================================================
#
# FILE       : CHANGELOG.md
# NAMESPACE  : Whitecardopedia
# MODULE     : Version History
# AUTHOR     : Adam Noble - Noble Architecture
# PURPOSE    : Track version history and feature releases
# CREATED    : 2025
#
# DESCRIPTION:
# - Comprehensive version history for Whitecardopedia application
# - Documents all features, bug fixes, and improvements
# - Follows Vale Design Suite documentation standards
#
# =============================================================================


# -----------------------------------------------------------------------------

## Whitecardopedia v0.6.16 - 18-Aug-2026 - Feature: Advanced Time Data, Production KPI Dashboard, Working-Day Turnaround

### Overview
Three connected pieces of work. The Time Analysis Tool gained a production KPI dashboard as its first panel; a new **Advanced Time Data** system lets out-of-scope hours be deducted from a job so KPIs reflect fair scope; and turnaround now measures **working days** rather than calendar days, so weekends no longer inflate delivery averages.

---

### 1. Advanced Time Data (offsettable hours)

A job's `timeTaken` is the **absolute time card**: every hour spent. Some of those hours fall outside the original brief. A whitecard that reads as 6 hours might be 2 hours of drawing, 3 hours building reusable assets and 1 hour of out-of-scope amendments. Scoring the studio against the full 6 hours is unfair; scoring against the 2 is the real measure.

**New JSON block** on `scheduleData`, written only when at least one category is non-zero so untouched records are never bloated:

```json
"scheduleData": {
    "timeAllocated"   : 6,
    "timeTaken"       : 6,
    "timeAdjustments" : {
        "timeAdjustments__Description"       : "Hours inside timeTaken that fall outside the original job scope...",
        "timeAdjustments__ReusableAssets"    : 3,
        "timeAdjustments__ScopeAmendments"   : 1,
        "timeAdjustments__DesignDevelopment" : 0,
        "timeAdjustments__AdditionalContext" : 0,
        "timeAdjustments__HealthImpact"      : 0
    }
}
```

The five categories are: Modelled Reusable Assets, Amendments Outside Original Scope, Additional Design Development Outside Original Scope, Additional Context Required Outside Original Scope, Additional Time Due To User Health.

**All arithmetic lives in one new module**, `Na__AppUtils__TimeAdjustments.js`, so the editor, viewer and analysis tool can never disagree on the maths:
- `na_calculate_net_time()` returns `{ absolute, offsets, net, hasAdjustments, overRecorded }`.
- `net` is floored at zero and can never exceed `absolute`, so a mis-keyed offset cannot produce a negative or inflated KPI. `overRecorded` flags that case for the editor.
- Placeholder / non-numeric `timeTaken` yields `hasAbsolute: false` rather than a bogus zero.

**Project Editor** (`Na__Feature__ProjectEditor__Form.jsx`) gained a collapsible **Advanced Time Data** section beneath Time Taken, with a live readout of Absolute -> Offsets -> Net -> Scope Efficiency that mirrors exactly what will be saved. It auto-opens on jobs that already carry offsets, and blocks saving when offsets exceed the recorded Time Taken. The builder deletes the block when every category is cleared.

**Project Viewer** shows the offset lines and a Net In Scope Time row only when a job records them. The Efficiency Scale now scores against net time, with a note giving the absolute figure.

**Backwards compatible throughout**: a record with no `timeAdjustments` behaves exactly as before, offsets are zero, and net equals absolute. The offset-specific tiles and charts stay hidden until offsets are actually in use.

---

### 2. ValeVision3D Production Key Performance Indicators panel

New first panel in the Time Analysis Tool. Unlike the artist charts, which only count jobs with numeric schedule data, the KPI panel analyses **every** discovered `project.json`, so its counts match the gallery.

**Twelve headline tiles**: Jobs Complete, Jobs This Year, Net Hours Delivered, 3D Production Efficiency, Out Of Scope Hours, Absolute Efficiency, Median Turnaround, Delivered In A Week, Average Job Size, Concept Artists, 3D Ready Jobs, Images Published, 3D Assets Published, Awaiting Time Review. The two offset tiles appear only when offsets exist.

**Breakdown tables** (jobs, share bar, hours): Jobs By Type, Jobs By Year, Incoming Source Material, Requesting Designers.

**Charts**: Monthly Delivery Throughput (D3 columns, trailing 18 months); Absolute Time Card vs Net In Scope Hours per artist; Where The Out Of Scope Hours Went (offset composition).

**Artist Productivity On Net Figures** table: jobs, allocated, absolute, out-of-scope, net, avg per job, jobs per day, scope efficiency.

**ValeVision3D Feature Coverage**: how far each viewer feature has rolled out (models published, default camera, orbit target, fog plane, walk/fly, imported SketchUp scenes, cross section, presentation scenes, render engine override, video studio).

**Records Needing Attention**: awaiting time review, no job type, no concept artist, no designer, no input source, no images, no notes, missing received or delivery dates. Zero-count rows are hidden.

**Implementation notes**
- Placeholder sentinels (`NOT YET REVIEWED`, `Default Input Type`, `Default Concept Artist`, `Nil`, anything containing `PLACEHOLDER`) are treated as "not set" so first-sync stubs do not inflate the breakdowns.
- Delivery year comes from the project folder path, because most 2025 records predate the `folderId` field. The discovery folder path is stashed as `__folderPath` on load so grouping never depends on optional JSON fields.
- `parseDateStrict` was added alongside `parseDate`, which returns *today* for invalid input and would otherwise silently corrupt every turnaround and throughput figure.

---

### 3. Working-day turnaround

Turnaround measured calendar days, so a job received Friday and delivered Monday read as 3 days when the studio had one working day on it. Weekends were inflating every delivery average.

`countBusinessDays()` measures days **elapsed** minus any Saturday or Sunday, so a job that never crosses a weekend is unchanged:

| Span | Before | After |
|---|---|---|
| Tue -> Wed | 1 | 1 (unchanged) |
| Mon -> Fri | 4 | 4 (unchanged) |
| Fri -> Mon | 3 | **1** |
| Fri -> Tue | 4 | **2** |
| Sat -> Sun | 1 | 1 (floored) |

Dates are normalised to UTC midnight so a British Summer Time transition cannot shift a day boundary. Floored at 1 so same-day delivery, or a span falling wholly on a weekend, still represents work done. Two separate implementations (`buildJobRecord` and `calculateTurnaroundDays`) now share the one helper so they cannot drift.

"Delivered In A Week" now means **5 working days**, not 7 calendar days.

**Impact**: 13 of 137 dated jobs changed, all weekend-spanning. Mean turnaround 1.42 -> 1.24 working days, median unchanged at 1, longest job 6 -> 4.

**Not covered**: public holidays are not deducted. That would need a holiday calendar in the app data; weekends alone remove the bulk of the distortion.

---

### 4. Designer backfill from Vale server link paths

45 of 144 records had no designer. The earlier CSV-based backfill only covered jobs with a `*__ProjectData__.json` metadata file, which left the legacy 2025 block empty.

The missing source was the auto-generated Vale server links: every job folder carries a shortcut into the office file server, and the target path names the designer's own sales folder — `N:\Sales\Gary Hood\Gary 2026\Lawrence62430 NEW DB`.

New `AutomationUtil__BackfillDesignersFromServerLinks__Main__.py` reads four sources in priority order: ProjectData metadata, the private server path inside that JSON, then `.lnk` (binary, both ASCII and UTF-16LE runs swept) and `.url` targets. Full names map to the app's first-name options list; anything unmapped is reported rather than guessed.

**Result: 44 of 45 filled.** Designers now read Dan 40, Steve 34, Gary 23, Martin 21, Tom 19, House 3, James 3. The one holdout, `2025/WK-3007__Weeks`, links to `N:\Clients\2025 Orders-Bespoke\...` rather than a designer's Sales folder, so there is genuinely nothing to extract. Two names surfaced unmapped: `Nick` (on `2760__AshybyHall__3dDetails`, not in the designer options list) and `Example Designer` (the template).

Dry run by default; existing values are never overwritten without `--overwrite`.

---

### 5. Layout and visual pass

- **Chart clipping fixed.** `clientWidth` includes a container's own padding, so every SVG was sized ~29px wider than its content box and `overflow-x: hidden` cut the edges. `margin.left` of 100px was also narrower than the longest axis label ("Default Concept Artist", 111px). Charts now measure the real content box (`measureChartWidth`) and the widest rendered label (`measureWidestLabel`, via an off-screen probe SVG). Verified zero clipped text across all five charts.
- **Horizontal scrollbars removed.** Four breakdown tables were squeezed into 359px grid tracks while needing 426-517px. Now two columns per row with fixed table layout; the redundant "Avg Job" column dropped.
- **Muted palette.** Desaturated tones harmonised with the brand navy `#172b3a`: slate `#5b7c99`, sage `#7d9471`, clay `#b0846a`, rose `#a3707a`, plum `#7d6b8f`, teal `#5f8a8b`, grey `#9aa5ac`.
- **Narrower dashboard.** Tool content capped at 1340px (was 1800px) so every section aligns.
- Removed the redundant "Artist Efficiency Data Visualisation Tool" title and subtitle.
- Panel titled **ValeVision3D Production Key Performance Indicators**; efficiency tile renamed **3D Production Efficiency**.
- **Wide table balanced.** The compact `.overview-table` rules pinned every numeric column to 68px, letting the Artist column take 55% of the width and truncating the Allocated and Scope Efficiency headers. A new `.overview-table--wide` modifier caps the label column and shares the rest evenly: Artist 673px -> 263px, numerics 68px -> 119px, header height 42px -> 32px.
- **Share column widened** 108px -> 124px. A five-character value such as "89.6%" needed 89px in an 88px content box, so every two-digit percentage was showing an ellipsis. Now 15px of headroom.
- Fixed "1 days" -> "1 day" pluralisation on the Median Turnaround tile.

---

### Files Changed
- `02__Src__AppModules/05__AppUtils/Na__AppUtils__TimeAdjustments.js` (new, v1.0.0)
- `02__Src__AppModules/13__Feature__TimeAnalysis/Na__Feature__TimeAnalysis__Main.jsx` (v1.5.0)
- `02__Src__AppModules/12__Feature__ProjectEditor/Na__Feature__ProjectEditor__Form.jsx`
- `02__Src__AppModules/11__Feature__ProjectViewer/Na__Feature__ProjectViewer__Main.jsx`
- `02__Src__AppModules/11__Feature__ProjectViewer/Na__Feature__ProjectViewer__EfficiencyScale.jsx`
- `02__Src__AppModules/10__Feature__ProjectGallery/Na__Feature__ProjectGallery__ContentDetector.js`
- `02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js` (token `2026-08-18-2`)
- `03__Style__AppStylesheets/Na__UiFeature__Styles__TimeAnalysis__.css`
- `03__Style__AppStylesheets/Na__UiFeature__Styles__Tools__.css`
- `03__Style__AppStylesheets/Na__CoreUi__Styles__App__.css`
- `app.html` (registers the new AppUtils module)
- `Tools__DevUtils/OneOff__DesignerArtistBackfill__/AutomationUtil__BackfillDesignersFromServerLinks__Main__.py` (new)
- `Projects/*/*/project.json` (44 designer backfills)

### Outstanding
- **7 jobs still awaiting time review** (all 2026 Whitecards): `61755__Goodson-Hudson`, `63569__Flynn`, `63592__Bressard-Kayode__ParapetOptions`, `63742__Hanson`, `63752__Kay`, `63770__Warwick`, `63984__Miah`. Six carry `timeTaken: "NOT YET REVIEWED"` with no `timeAllocated`; Bressard-Kayode has `timeTaken: 1` but no `timeAllocated`, so it cannot produce an efficiency figure.
- Local `project.json` writes still need pushing to R2, or the next sync restores the old copies.
- The hamburger menu still reads "Time Analysis Tool", now narrower than what the page does.

# -----------------------------------------------------------------------------

## Whitecardopedia v0.6.15 - 18-Aug-2026 - Removal: Legacy SketchUp Model URL Linking System

### Overview
ValeVision3D superseded the old SketchUp share-link workflow, so the `sketchUpModel` URL system has been removed end to end: the Project Viewer button, the gallery content-detector check, the Project Editor field, and the dead data block in every `project.json`.

### Removed
- **`Na__Feature__ProjectViewer__Main.jsx`** - the `isValidSketchUpUrl()` helper and the "View SketchUp Model" anchor (with its SketchUp logo icon). The `--download` panel section stays; it still hosts the Download Image Files button.
- **`Na__Feature__ProjectGallery__ContentDetector.js`** - `checkSketchUpModelUrl()` deleted, and the SketchUp branch dropped from `has3DModelContent()`, which now simply returns `checkValeVisionModelUrl()`. A project with only a legacy SketchUp link no longer earns a 3D content badge.
- **`Na__Feature__ProjectEditor__Form.jsx`** - the `sketchUpUrl` form state, the "SketchUp Model URL" field with its "Leave blank or set to 'None', 'nil', or 'False'" help text, and the `sketchUpModel` write in `buildUpdatedProject`. The builder now explicitly deletes the block so a legacy copy carried in by the `restOfProject` spread is never written back.
- **`Projects/*/*/project.json`** - the `sketchUpModel` block stripped from all 146 records via `AutomationUtil__StripLegacySketchUpModelBlock__Main__.py`. No build or sync utility writes the field, so this is permanent.

### URLs Captured Before Removal
143 records held the placeholder `"Nil"`. Three held a real URL, recorded here so nothing is lost:
- `2025/NY-29951__McNerney` - `https://app.sketchup.com/share/tc/europe/EjShVZJYLRU`
- `2025/WK-3007__Weeks` - `https://app.sketchup.com/share/tc/europe/luls66XZsNs`
- `2025/00__ExampleProject` - `https://3dwarehouse.sketchup.com/model/example` (template placeholder)

### Deliberately Kept
These share the SketchUp name but belong to the live ValeVision Cloud Sync pipeline, not the removed link system:
- `ValeVison3D__SketchUpCameraData` - camera scenes imported from the SketchUp model
- `GLB_NAMODEL_NAMESPACE` / `__NaModel__` - the GLB export namespace marker
- The Project Editor rename note about renaming the local SketchUp folder to match
- `AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py` and the SketchUp plugin tooling

### Files Changed
- `02__Src__AppModules/10__Feature__ProjectGallery/Na__Feature__ProjectGallery__ContentDetector.js`
- `02__Src__AppModules/11__Feature__ProjectViewer/Na__Feature__ProjectViewer__Main.jsx`
- `02__Src__AppModules/12__Feature__ProjectEditor/Na__Feature__ProjectEditor__Form.jsx`
- `03__Style__AppStylesheets/Na__CoreUi__Styles__App__.css` (comment only)
- `Tools__DevUtils/OneOff__DesignerArtistBackfill__/AutomationUtil__StripLegacySketchUpModelBlock__Main__.py` (new)
- `Projects/*/*/project.json` (146 records)

# -----------------------------------------------------------------------------

## Whitecardopedia v0.6.14 - 18-Aug-2026 - Feature: Library Overview Panel In The Time Analysis Tool

### Overview
The localhost-only Time Analysis Tool previously opened straight into artist-level charts, and every metric it showed was filtered down to jobs with numeric `timeAllocated`/`timeTaken`. That meant the tool could report on artist efficiency but could never answer the simpler operational questions: how many jobs has the department actually completed, what is the split between Whitecard / Blockout / MaxModel work, how much of the library is 3D ready, and which records are still incomplete.

A new **Whitecardopedia Library Overview** panel is now the first section of the tool. It analyses **every** discovered `project.json` (not just time-reviewed ones), so the counts match the gallery rather than the efficiency charts.

### What The Panel Reports

**Headline KPI tiles**
- Jobs Complete (whole library) with the count that has been time reviewed
- Jobs This Year, with the rolling average jobs-per-month
- Hours Delivered vs Hours Allocated
- Studio Efficiency (allocated / taken) with the hour variance against quote
- Median and average turnaround in calendar days
- Percentage of jobs delivered inside a week
- Average job size in hours
- Concept artist count and requesting designer count
- 3D Ready Jobs percentage, images published, 3D assets published
- Awaiting Time Review backlog count

**Breakdown tables** (jobs, share bar, hours, average job size)
- Jobs By Type: Whitecard / Blockout / MaxModel / Unclassified
- Jobs By Year
- Incoming Source Material: CAD File / Early Stage Sketch / Hand Drawn Concept etc
- Requesting Designers

**Monthly Delivery Throughput** - a D3 column chart of jobs delivered per calendar month over the trailing 18 months, with jobs and hours on hover.

**ValeVision3D Feature Coverage** - how far each viewer feature has rolled out across the library: models published, default camera set, orbit target set, fog plane, walk/fly modes, imported SketchUp scenes, cross section, presentation scenes, render engine override, video studio content.

**Records Needing Attention** - a backlog list built from the same data: jobs awaiting time review, no job type, no concept artist, no designer, no input source, no images, no notes, missing received or delivery dates. Rows with a zero count are hidden.

**Library Composition** - jobs with and without imagery, alternative scheme entries, watercolour artwork jobs, the largest image set in the library, and total quoted vs delivered hours.

### Implementation Notes
- Placeholder sentinels (`NOT YET REVIEWED`, `Default Input Type`, `Default Concept Artist`, `Nil`, anything containing `PLACEHOLDER`) are treated as "not set" rather than as real values, so first-sync stubs do not inflate the breakdowns.
- Delivery year is derived from the project folder path (`Projects/<year>/<folder>`) rather than `folderId`, because most 2025 records predate the `folderId` field.
- `parseDateStrict` was added alongside the existing `parseDate`, which returns "today" for invalid input and would otherwise silently corrupt turnaround and throughput statistics.
- The discovery folder path is stashed on each loaded record as `__folderPath` so scheme-variant detection and year grouping do not depend on optional JSON fields.

### Files Changed
- `02__Src__AppModules/13__Feature__TimeAnalysis/Na__Feature__TimeAnalysis__Main.jsx` (v1.3.0)
- `03__Style__AppStylesheets/Na__UiFeature__Styles__TimeAnalysis__.css`


# -----------------------------------------------------------------------------

## Whitecardopedia v0.6.13 - 08-Jul-2026 - Fix: project.json Cache-Busting Gap + Auto Reload After Editor Save

### Overview
A user reported that after editing a project via the Project Editor (which saves live to R2 successfully), the gallery kept showing stale data until a **full manual browser cache clear** — and the app's own "Purge App Cache" tool did **not** fix it. Mapping every cache layer in the app (Service Worker Cache Storage, browser HTTP cache, Cloudflare edge cache, in-memory JS state) found that `project.json` was the one R2 SSOT JSON that skipped the cache-busting pattern already proven correct for masterConfig/masterIndex/the build manifest, on three separate layers at once. "Purge App Cache" could never have fixed this because it only clears Cache Storage/Service Worker/local-storage — a completely different mechanism from the browser's HTTP disk cache and Cloudflare's edge cache, which is where the staleness actually lived.

### Root cause (three gaps, one JSON)
1. **Fetch-level**: `na_fetch_project_json_r2_first()` fetched R2's `project.json` with a bare `fetch(url)` — no `?t=` cache-bust, no `cache:'no-store'` — unlike every other R2 SSOT fetch in the same file.
2. **Upload-level**: every R2 write of `project.json` (editor save, editor rename, and all three Python sync-pipeline upload paths) set a `ContentType` but never a `Cache-Control` header, so Cloudflare's edge was free to cache the object indefinitely by default.
3. **Service Worker level**: the SW's `wpwa-data-*` bucket (network-first) holds `project.json`, but the existing build-manifest-change eviction only ever cleared `wpwa-thumbs-*`.

### Changes
- **`Na__AppData__ProjectLoader.js`** — `na_fetch_project_json_r2_first` now cache-busts the R2 fetch exactly like `loadMasterConfig`/`na_load_master_index`/the build-manifest check. `na_clear_thumbnail_cache` renamed to `na_clear_stale_service_worker_caches` and now also evicts `wpwa-data-*`.
- **`CloudflareHandler__ProjectEditor__.js`** and **`CloudflareHandler__ProjectRename__.js`** — every `project.json` R2 write now sets `cacheControl: 'no-cache, max-age=0'` (matching the build manifest/masterConfig mirror pattern already in use).
- **`AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py`** — all three project.json R2 write paths (`na_upload_project_json_to_r2`, the camera-data merge, and the model-URL merge) now set the same `CacheControl`, keeping the SketchUp Cloud Sync pipeline consistent with the editor's live save path.
- **`Whitecardopedia__Pwa__ServiceWorker__Logic__.js`** — `NetworkFirst` now fetches with `cache:'no-store'` (defense in depth: a "network-first" strategy should never be quietly satisfiable by the browser's own disk cache), and `PWA_SW_VERSION_TOKEN` bumped to force a clean cache reset for all existing users.
- **New: automatic clear-cache-and-reload after every successful editor save or delete.** `Na__Feature__ProjectEditor__Main.jsx`'s `handleSaveSuccess`/`handleDeleteSuccess` no longer patch state in place or soft-reload the picker — both now close the form, return to the editor's selection view, and (after a short delay so the "Saved!" toast is visible) trigger the exact same "Purge App Cache" mechanism already wired to the hamburger menu. Since a full reload resets the app's in-memory view routing back to the main gallery, a new `?reopenEditor=1` flag (`Na__AppUtils__UrlQueryHandler.js`, honoured in `Na__AppCore__WhitecardopediaApp.jsx`'s boot effect) makes it land back on the editor instead.

### Files Changed
- `02__Src__AppModules/03__AppData/Na__AppData__ProjectLoader.js` (v0.2.8)
- `02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js` (v1.5.0)
- `CloudflareWorker/src/handlers/CloudflareHandler__ProjectEditor__.js` (v1.2.0)
- `CloudflareWorker/src/handlers/CloudflareHandler__ProjectRename__.js` (v1.2.0)
- `Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py`
- `02__Src__AppModules/05__AppUtils/Na__AppUtils__UrlQueryHandler.js` (v1.1.0)
- `02__Src__AppModules/02__AppCore/Na__AppCore__WhitecardopediaApp.jsx` (v1.1.0)
- `02__Src__AppModules/12__Feature__ProjectEditor/Na__Feature__ProjectEditor__Main.jsx` (v1.3.0)

# -----------------------------------------------------------------------------

## Whitecardopedia v0.6.12 - 08-Jul-2026 - Feature: Display Name Alias, Rename Hardening, and Safe Delete

### Overview
Three follow-ups to last release's rename tool, driven directly by real usage: renaming "Bressard-Kayode" to something containing a `|` character showed that the rename flow had no character validation — R2 tolerates far more in an object key than Windows NTFS tolerates in a folder name, so a rename like that could move the R2 folder while silently failing to move the local mirror, permanently drifting the two apart and baking a broken character into CDN URLs. Rather than only patching that hole, this release adds a fundamentally lower-risk way to change how a project is displayed at all — a Display Name Alias — plus a fully-verified Delete Project capability with a centred confirmation modal, so the Danger Zone (rename, delete) is reserved for when it's genuinely needed.

### Changes
- **Display Name Alias (`projectNameAlias`)** — new optional field, collapsed under an "Advanced" disclosure directly beneath Project Name (auto-expanded if already set). When set, Whitecardopedia shows this name everywhere a project is displayed — gallery cards, the project viewer breadcrumb, the editor's own picker, search, and A-Z sort — instead of the raw `projectName`. It never touches `projectName`/`projectCode`/`folderId`, so setting or changing it goes through the ordinary two-phase save and can **never** trigger the rename flow. `buildUpdatedProject()` now explicitly rebuilds the saved object with `projectName`, `projectCode`, `projectNameAlias` first (in that order) so the new field always lands right after the project identity fields in the JSON, regardless of a project's prior key order.
- **Rename hardening** — the proposed new folder path (client-side in the editor form, and authoritatively again in the Worker's rename handler) is now validated against the Windows-reserved filename characters `< > : " \ | ? *` and control characters, with a clear rejection message, before any R2 move is attempted. This closes the exact failure class the pipe-character edit hit.
- **Delete Project Permanently** — a new always-visible Danger Zone in the editor form. Clicking it opens a centred modal (new reusable `.editor-modal-overlay`/`.editor-modal` pattern) that requires typing the project code to confirm, then:
  1. Deletes every object under the project's R2 prefix via a new Worker endpoint, removes the project's entry entirely from the master index and master config (not a disable — full removal), bumps the build manifest, and **re-lists the prefix to verify it's now empty**.
  2. Deletes the local mirror folder and local index/config entries via a new Flask endpoint, and **verifies the folder no longer exists**.
  3. Shows both verification results ("Cloudflare R2/CDN Data — Deleted and Verified" / "Local Mirror Data — Deleted and Verified") before returning to the gallery picker, which is force-reloaded since the project's `folderId` key no longer exists anywhere.

### Architecture Notes
- No Worker changes were needed for the alias — it rides through the existing save endpoint as an ordinary `project.json` field, which is exactly why it's the lower-risk option versus renaming.
- Delete is deliberately independent of the rename handler (small list/delete helpers are duplicated rather than shared) so each Worker handler stays self-contained.
- ValeVision3D and the ValeVision Cloud Sync SketchUp plugin are unaffected by either the alias or the delete feature — neither reads `projectNameAlias`, and a deleted project simply stops existing in the index/config the plugin never reads from directly.

### Files Changed
- `CloudflareWorker/src/handlers/CloudflareHandler__ProjectDelete__.js` (new)
- `CloudflareWorker/src/CloudflareHelper__MasterIndexR2__.js` (v1.1.0) — added `na_remove_master_index_entry`
- `CloudflareWorker/src/CloudflareHelper__MasterConfigR2__.js` (v1.1.0) — added `na_remove_master_config_entry`
- `CloudflareWorker/src/handlers/CloudflareHandler__ProjectRename__.js` (v1.1.0) — tightened folder-path validation
- `CloudflareWorker/src/index.js` (v1.3.0) — routed `/delete`
- `server.py` — added `/api/projects/<folder>/delete`
- `02__Src__AppModules/03__AppData/Na__AppData__ProjectLoader.js` (v0.2.7) — added `displayName`
- `02__Src__AppModules/10__Feature__ProjectGallery/Na__Feature__ProjectGallery__Main.jsx`
- `02__Src__AppModules/11__Feature__ProjectViewer/Na__Feature__ProjectViewer__Main.jsx`
- `02__Src__AppModules/12__Feature__ProjectEditor/Na__Feature__ProjectEditor__Main.jsx` (v1.2.0)
- `02__Src__AppModules/12__Feature__ProjectEditor/Na__Feature__ProjectEditor__Form.jsx` (v4.0.0)
- `02__Src__AppModules/13__Feature__TimeAnalysis/Na__Feature__TimeAnalysis__Main.jsx` (v1.2.0)
- `02__Src__AppModules/05__AppUtils/Na__AppUtils__SearchFilter.js` (v1.1.0)
- `02__Src__AppModules/05__AppUtils/Na__AppUtils__SortProjects.js` (v1.1.0)
- `03__Style__AppStylesheets/Na__UiFeature__Styles__Tools__.css` (v1.2.0)

# -----------------------------------------------------------------------------

## Whitecardopedia v0.6.11 - 07-Jul-2026 - Feature: Live Project Rename + Fuller Project Editor

### Overview
The Project Editor could already write `project.json` live to R2 via the `whitecardopedia-editor-api` Worker, but it had three real gaps: editing "Project Name"/"Project Code" never moved the actual R2 folder (so the folder path drifted from the displayed name forever), the `productionData.designer` field had no form control at all despite driving the gallery filter, and the Concept Artist/Production Input dropdowns rendered blank whenever the stored value wasn't in the canonical options list (e.g. legacy template defaults) even though the data was intact. This release closes all three gaps and adds a gallery-visibility (`enabled`) toggle, without requiring any changes to ValeVision3D or the ValeVision Cloud Sync SketchUp plugin — both remain fully data-driven off the master index / masterConfig / `project.json`.

### Changes
- **Live project rename** — Save now detects when the edited Project Code/Name would move the live `folderId` (e.g. `2026/63592__Bressard-Kayode` -> `2026/63592__Bressard-Kayode Scheme-01`, matching the existing "Fenner Scheme-01/02/03" naming convention already in the master config) and shows an inline confirm-and-rename panel with an editable proposed folder path before doing anything. Confirming performs an atomic move on R2 (stream-copies every image/thumbnail/GLB to the new prefix, rewrites the folder segment inside `valeVision_ModelUrls`, writes the corrected `project.json`, and only deletes the old objects once every new write has succeeded), patches the master index and masterConfig mirrors, then mirrors the same move to the local `Projects/` folder + local index/config copies via Flask. A rename never happens silently — un-renamed saves are completely unaffected.
- **Designer field added** — `productionData.designer` (used by the gallery filter, previously invisible in this form) is now a proper dropdown sourced from `Na__AppData__ValeDesignersList__Main.json`, wired identically to Concept Artist.
- **Fixed dropdown-vs-stored-value mismatch** — Production Input / Concept Artist / Designer selects now always inject the currently-stored value as a selectable option even when it isn't in the canonical list (e.g. `"Default Concept Artist"`), so the dropdown never silently shows blank for data that actually exists.
- **Gallery visibility (`enabled`) toggle** — added to the form and applied via new dedicated Worker/Flask endpoints, independent of the content save/rename. The editor's project picker now also lists disabled projects (with a "Hidden from Gallery" badge) via a new `loadAllProjectsIncludingDisabled()` loader — previously a disabled project could not even be found in the editor to re-enable it.
- **Read-only Project Info panel** — surfaces folder path, asset home, image count, GLB presence and last-synced date from the master index for transparency.

### Architecture Notes
- No GitHub Pages push is required for any of this — R2 remains the live SSOT and the local `Projects/`/index/masterConfig copies are best-effort mirrors kept in step for the next commit, matching the existing two-phase save pattern.
- Renaming only affects the live web/R2 copy. The ValeVision Cloud Sync SketchUp plugin derives its target folder purely from the local SketchUp project folder's name on disk and is unaware of this move — continuing to sync the same scheme after a rename requires renaming the local SketchUp folder to match (see the plugin's own DEVLOG).

### Files Changed
- `CloudflareWorker/src/CloudflareHelper__MasterConfigR2__.js` (new)
- `CloudflareWorker/src/CloudflareHelper__MasterIndexR2__.js` (new)
- `CloudflareWorker/src/CloudflareHelper__BuildManifest__.js` (new)
- `CloudflareWorker/src/handlers/CloudflareHandler__ProjectVisibility__.js` (new)
- `CloudflareWorker/src/handlers/CloudflareHandler__ProjectRename__.js` (new)
- `CloudflareWorker/src/index.js` (v1.2.0)
- `server.py` — added `/api/projects/<folder>/visibility` and `/api/projects/<folder>/rename`
- `02__Src__AppModules/03__AppData/Na__AppData__ProjectLoader.js` (v0.2.6)
- `02__Src__AppModules/12__Feature__ProjectEditor/Na__Feature__ProjectEditor__Main.jsx`
- `02__Src__AppModules/12__Feature__ProjectEditor/Na__Feature__ProjectEditor__Form.jsx` (v3.0.0)
- `03__Style__AppStylesheets/Na__UiFeature__Styles__Tools__.css`

# -----------------------------------------------------------------------------

## Whitecardopedia v0.6.10 - 02-Jul-2026 - PWA Manifest: Link-Handling Hint + Explicit App Id

### Overview
Two additive manifest changes supporting the new ValeVision3D app-notification email pipeline (see ValeVision3D v2.9.7). Neither change affects existing installs.

### Changes
- **`Whitecardopedia__Pwa__Manifest__.webmanifest`**
  - `"handle_links": "preferred"` added — declarative hint that in-scope links should open in the installed app. Microsoft Edge honours it at install time (sets "Open links in app" automatically); Chrome currently ignores it in favour of its per-app user setting; iOS ignores it entirely. Zero risk: unknown manifest members are skipped by non-supporting browsers.
  - `"id": "../../../"` → `"id": "/"` — explicit identity pin. Per the manifest spec, `id` is resolved against the start URL's *origin*, so the old relative value already computed to the origin root; `"/"` resolves to the **identical** app id, meaning existing installs on colleagues' machines keep updating (no orphaning). The value is now explicit and immune to future folder reshuffles. **This id is write-once — never change it; changing it orphans every existing install.**
- **`Whitecardopedia__Pwa__ServiceWorker__Logic__.js` (v1.4.0)** — `PWA_SW_VERSION_TOKEN` bumped to `2026-07-02-1` so the precached manifest is force-evicted and browsers re-read the updated copy.

### Honest Limitations (documented for future reference)
- No manifest field can make email links open the installed PWA on iOS/iPadOS — that capability is exclusive to native apps (Universal Links). On Windows, link capture remains a per-machine, per-browser setting. This is exactly why the notification-email pipeline (ValeVision3D v2.9.7) drops direct links in favour of "open the app" instructions.

# -----------------------------------------------------------------------------

## Whitecardopedia v0.6.9 - 01-Jul-2026 - Feature: Breadcrumb Navigation Replaces "Back to Gallery" Button

### Overview
On the project detail page, "Back to Gallery" previously lived as a primary (filled navy) button inside the **Project Actions** sidebar panel, stacked above the secondary "Copy Share Link" button. This mixed a navigation control in with record-level actions, buried it below the fold on smaller screens, and over-weighted its visual importance relative to the page's main purpose (reviewing the model). Replaced it with breadcrumb navigation: `‹ Project Gallery / <Project Title>`.

### Changes
- **Placement** — the breadcrumb is not a separate header row above the viewer. It floats as an overlay pinned to the top-left corner of the 3D/whitecard image itself (`.project-viewer__carousel-container`, `position: relative` + absolutely-positioned nav, `z-index: 20`, sitting below the carousel's own nav-button/counter `z-index` of 90/100). This reclaimed the blank vertical gap that previously sat above the viewer whenever a project had no description text.
- **Typography** — all three breadcrumb segments ("Project Gallery", `/`, current project title) share one font-size (`--Vale_FontSize_SubHeading`). Hierarchy is communicated by weight and colour only — muted/regular for the "Project Gallery" link, bold/dark for the current page — rather than the large title-size jump used in the first pass, matching the reference mockup's flatter, thickness-driven hierarchy.
- **Accessibility** — wrapped in `<nav aria-label="Breadcrumb"><ol>…</ol></nav>` per standard breadcrumb markup; current crumb marked `aria-current="page"`; separator marked `aria-hidden="true"`; the entire "‹ Project Gallery" segment (icon + label) is one keyboard-focusable `<button>` with a visible focus ring, giving a single comfortable click/tap target.
- **Sidebar** — the Project Actions panel now holds only "Copy Share Link"; the "Back to Gallery" button and its icon reference were removed entirely.

### Files Changed
- `02__Src__AppModules/11__Feature__ProjectViewer/Na__Feature__ProjectViewer__Main.jsx` (v1.2.0)
- `03__Style__AppStylesheets/Na__CoreUi__Styles__App__.css`

---

## Whitecardopedia v0.6.8 - 01-Jul-2026 - Fix: Filter Drawer Overflow on Narrow / Older Screens

### Overview
The gallery "Project Filters" drawer looked broken on slightly narrow PC windows and in the older/narrower SketchUp embedded webview, while rendering correctly on wide Chrome screens. Two compounding causes were addressed.

**Cause 1 — No responsive reflow for the open drawer:** The filter drawer is inline in a single non-wrapping toolbar row and, when open, demands a fixed `max-width: 720px` with three dropdowns each pinned at `min-width: 200px` (so it cannot shrink below ~600px). Combined with the toggle, hamburger and tabs the open row needs ~1100px, and a usable search box pushes that to ~1300px. There was no responsive handling for the filter panel above 1024px, and the existing tablet block (769-1024px) actively re-applied `flex-wrap: nowrap`, so on narrow widths the row stayed crammed / overflowed instead of reflowing.

**Cause 2 — Stale PWA shell cache:** `FilterPanel.jsx` and its CSS most likely shipped after `PWA_SW_VERSION_TOKEN = 2026-06-26-1` without a further bump, so older webviews were still served pre-FilterPanel CSS — which renders as browser-default fallback (visible `Artist:/Designer:/Sort by:` labels + vertically stacked dropdown groups), exactly matching the reported screenshot.

### Investigation
Two full-codebase trawls confirmed there are no inline `style` props, no runtime style mutation, no embedded/injected CSS, no runtime `--Vale_UIScale`/`:root` overrides, and no duplicate/conflicting CSS for the toolbar — every toolbar/filter selector is defined once in `Na__CoreUi__Styles__App__.css`. The symptom is purely missing/stale CSS at runtime plus the inline drawer's fixed width appetite.

### Changes
- **`Na__CoreUi__Styles__App__.css`** — new `@media (max-width: 1300px)` block plus removal of the conflicting `769-1024px` tablet block (which re-applied `flex-wrap: nowrap` and overrode the reflow). At this tier the `.filter-panel` wrapper is dissolved with `display: contents`, so the funnel toggle and drawer become direct toolbar flex items: the toggle stays **inline on row 1** next to the search box (`order: 5`), and only the open drawer breaks onto its own **full-width row** below the toolbar (`order: 6; flex-basis: 100%; max-width: 100%`, 720px cap dropped). Drawer-scoped `.project-gallery__sort-control` / `.project-gallery__sort-select` lose their hard `min-width` so dropdowns stretch and wrap with no horizontal overflow at any width (verified 1440/1300/1024/800/420px). Wide desktop (>= 1301px) behaviour is unchanged.
- **`Na__CoreUi__Styles__App__.css`** (follow-up) — collapsed the *closed* drawer's height at this tier (`max-height: 0; align-self: center`, released to `max-height: none` when open). Because `display: contents` promotes the drawer to a direct toolbar flex item and `flex-wrap` makes its three dropdowns stack vertically inside the 0-width box, the closed drawer otherwise kept a ~130px intrinsic height that stretched the toolbar row and left large empty bands above/below the search box. Height now collapses to 0 when closed, so the closed toolbar is a single compact row (verified: closed row height 32px vs search 32px).
- **`Whitecardopedia__Pwa__ServiceWorker__Logic__.js`** (v1.3.0) — `PWA_SW_VERSION_TOKEN` `2026-06-26-1` → `2026-07-01-2`.
- **`WebApps/live_sw.js`** (v1.3.0) — matching `PWA_SW_VERSION_TOKEN` bump to `2026-07-01-2` (this is the file the browser actually registers; both must match to force cache eviction).

### Files Changed
- `03__Style__AppStylesheets/Na__CoreUi__Styles__App__.css`
- `02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`
- `WebApps/live_sw.js`

---

## Whitecardopedia v0.6.7 - 26-Jun-2026 - Fix: ValeVision3D Badge Stale Index + Missing Model URLs

### Overview
Two separate bugs prevented the ValeVision3D badge from appearing after a sync and the 3D model from loading after clicking it.

**Bug 1 — Stale master index in open sessions:** `na_load_master_index()` in `Na__AppData__ProjectLoader.js` was fetching the R2 index once per session with no cache-busting. If the app was already open when a sync ran and updated `hasGlb_R2` from `false` to `true`, the old value remained in memory for the lifetime of the tab. Fix: added `?t=${Date.now()}` + `cache: 'no-store'` to the R2 primary URL fetch, consistent with how `loadMasterConfig` and the build manifest are already fetched.

**Bug 2 — `valeVision_ModelUrls` never patched on re-sync:** `valeVision_ModelUrls` was only written into `project.json` once, during the first-sync scaffold (`na_ensure_wcp_project_scaffold`). Every subsequent `na_sync_all` / `na_sync_glb` uploaded the GLBs to R2 and set `hasGlb_R2: true` in the master index, but never updated the model URL array in `project.json` — so ValeVision3D could see the badge but had no URLs to load. Fix: added three new helpers (`na_build_model_urls_from_glb_dir`, `na_merge_model_urls_into_project_json`, `na_merge_model_urls_in_r2_project_json`) that rebuild and patch the URL array after every GLB upload, mirroring the pattern already used for camera data.

### Changes
- **`Na__AppData__ProjectLoader.js`** — cache-bust master index fetch (v0.2.5).
- **`AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py`** — three new helpers + wired into `na_sync_all` and `na_sync_glb` (v1.2.0).

### Files Changed
- `02__Src__AppModules/03__AppData/Na__AppData__ProjectLoader.js`
- `Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py`

---

## Whitecardopedia v0.6.6 - 26-Jun-2026 - Fix: Designer & Artist Dropdown Filter (PWA Cache Bust)

### Overview
Fixed the designer and concept artist filter dropdowns not working on the live site. The filter UI and logic (`FilterControls.jsx`, updated `Na__Feature__ProjectGallery__Main.jsx`, `Na__AppData__ProjectLoader.js`) had been pushed to GitHub in v0.6.3/v0.6.2, but the PWA service worker was serving all returning users stale cached JavaScript from the `wpwa-shell-2026-06-25-1` bucket. Bumping `PWA_SW_VERSION_TOKEN` to `2026-06-26-1` in both service worker files forces a full shell cache eviction and fresh asset delivery on next visit. The underlying project data (`productionData.designer`) was correct on R2 throughout — this was a client-side caching issue only.

### Root Cause
`live_sw.js` (the deployed service worker entry point at the WebApps root) was at token `2026-06-25-1`. The canonical logic file `Whitecardopedia__Pwa__ServiceWorker__Logic__.js` had already been bumped to `2026-06-25-2` for a prior R2-first loader change, but `live_sw.js` was never updated to match. Because `live_sw.js` is the file the browser actually registers, the version the browser saw never changed — no new SW was installed and the old shell cache persisted for all returning users.

### Changes
- **`WebApps/live_sw.js`** — `PWA_SW_VERSION_TOKEN` `2026-06-25-1` → `2026-06-26-1`; dev log added.
- **`Whitecardopedia__Pwa__ServiceWorker__Logic__.js`** — `PWA_SW_VERSION_TOKEN` `2026-06-25-2` → `2026-06-26-1`; dev log entry added explaining the designer filter cache bust.

### Files Changed
- `WebApps/live_sw.js`
- `02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`

---

## Whitecardopedia v0.6.5 - 26-Jun-2026 - Purge App Cache Button

### Overview
Added a one-click **Purge App Cache** button to the Whitecardopedia hamburger menu. Performs a brutal full reset of all client-side caches so the app loads as if it has never been opened — while preserving the user's saved login token. Eliminates the need to manually clear caches in DevTools when troubleshooting stale assets.

### Changes
- **Shared PWA Registrar (v1.2.0)** — `Whitecardopedia__Pwa__ServiceWorker__Registrar__.js`: added `PWA_PRESERVE_LOCALSTORAGE_KEYS` constant (single source of truth for auth keys to survive a purge) and new `PurgeAppCacheAndReload()` function. Clears all Cache Storage buckets, unregisters all service workers, wipes `localStorage`/`sessionStorage`, and best-effort deletes all IndexedDB databases — then restores preserved auth keys and hard-reloads. Exposed on the global API as `window.Whitecardopedia__Pwa__ServiceWorker__Registrar.purgeAppCache()`.
- **Hamburger menu** — `Na__Feature__ProjectGallery__HamburgerMenu.jsx`: new `onPurgeCacheClick` prop and third menu item "Purge App Cache" with `.hamburger-menu__item--danger` styling (muted red on hover).
- **Gallery wiring** — `Na__Feature__ProjectGallery__Main.jsx`: `onPurgeCacheClick` threaded through to `<HamburgerMenu>`.
- **App handler** — `Na__AppCore__WhitecardopediaApp.jsx`: `handlePurgeCache` shows a `confirm()` guard then calls `registrar.purgeAppCache()`. Passed to `<ProjectGallery>`.
- **Styles** — `Na__UiFeature__Styles__Tools__.css`: `.hamburger-menu__item--danger` modifier (muted red text, soft red hover/active states).

### Cross-reference
- **ValeVision3D v2.9.4** — same purge function exposed in the Tools & Settings → App Settings submenu.

### Files Changed
- `02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Registrar__.js`
- `02__Src__AppModules/10__Feature__ProjectGallery/Na__Feature__ProjectGallery__HamburgerMenu.jsx`
- `02__Src__AppModules/10__Feature__ProjectGallery/Na__Feature__ProjectGallery__Main.jsx`
- `02__Src__AppModules/02__AppCore/Na__AppCore__WhitecardopediaApp.jsx`
- `03__Style__AppStylesheets/Na__UiFeature__Styles__Tools__.css`

---

## Whitecardopedia v0.6.4 - 26-Jun-2026 - R2-First Localhost Project Data Saves (Editor API Worker)

### Overview
Localhost project editing and ValeVision3D Dev menu saves now follow an **R2-first, local-mirror-second** contract: `project.json` changes go live on the CDN without a GitHub Pages push. A new Cloudflare Worker (`whitecardopedia-editor-api`) is the write path to R2; Flask remains the local disk mirror and serves Worker URL + API key to the browser at runtime. Phase 1 (R2) must succeed; Phase 2 (Flask mirror) is best-effort.

### Changes
- **Editor API Worker** — new `CloudflareWorker/` scaffold (`wrangler.jsonc`, deploy/dev batch scripts). `POST /api/editor/projects/{folderId}` writes `VaApps/Projects/{folderId}/project.json`, upserts master index (`hasProjectJson_R2`, `lastSynced` only — all sync-pipeline fields preserved), and bumps `Na__BuildVersion__Manifest__.json` for SW cache eviction on next gallery load.
- **Shared CORS helper (v1.1.0)** — `CloudflareHelper__Cors__.js` centralises origin allow-listing. Permits `localhost` and `127.0.0.1` on any port for local dev, plus GH Pages and noble-architecture.com domains. Fixes preflight rejection when ValeVision3D/Whitecardopedia run on `http://127.0.0.1:8000` (previously only `http://localhost` was recognised).
- **Flask runtime config** — `GET /api/editor-config` reads `EDITOR_WORKER_URL` and `EDITOR_API_KEY` from `Tools__DevUtils/API__Cloudflare/Token__CloudflareAPI.env` and returns them to frontends (secrets never committed).
- **Project Editor (v2.1.0)** — `Na__Feature__ProjectEditor__Form.jsx` two-phase save: Worker R2 write then Flask mirror; phase status on Save button ("Saving to cloud…", "Mirroring locally…"). Floating toast overlay (green success, red hard failure, amber local-mirror-only failure) with 4 s auto-dismiss.
- **Project Editor config** — `Na__Feature__ProjectEditor__Config.json` holds production + localhost Worker base URLs and request timeout (no secrets).
- **Agent rule** — `.cursor/rules/15-R2First-LocalhostSave--DevTools-SSOT-.mdc` documents the two-phase contract for all localhost dev tools that mutate `project.json`.

### Cross-reference
- **ValeVision3D v2.9.3** — shared `Na__AppUtils__R2SaveProjectJson__.js`; all Dev menu `project.json` writers migrated off GET-merge-POST-to-Flask-only.

### Files Changed
- `CloudflareWorker/` (new: `src/index.js`, `src/handlers/CloudflareHandler__ProjectEditor__.js`, `src/CloudflareHelper__Cors__.js`, `wrangler.jsonc`, `package.json`, deploy scripts)
- `server.py` (`/api/editor-config`)
- `02__Src__AppModules/12__Feature__ProjectEditor/Na__Feature__ProjectEditor__Form.jsx`
- `02__Src__AppModules/12__Feature__ProjectEditor/Na__Feature__ProjectEditor__Config.json` (new)
- `03__Style__AppStylesheets/Na__UiFeature__Styles__Tools__.css` (toast overlay + warning message variant)
- `Tools__DevUtils/API__Cloudflare/Token__CloudflareAPI.env` (`EDITOR_WORKER_URL`, `EDITOR_API_KEY`)
- `.cursor/rules/15-R2First-LocalhostSave--DevTools-SSOT-.mdc` (new, WebApps root)

### Deployment notes
- Worker deployed to `https://whitecardopedia-editor-api.adam-fb3.workers.dev`
- Secrets: `EDITOR_API_KEY`, `ALLOWED_ORIGIN` via `wrangler secret put`
- Direct browser GET to `/api/editor` without `X-Editor-Api-Key` correctly returns 401; `/api/editor/health` is unauthenticated

---

## Whitecardopedia v0.6.3 - 26-Jun-2026 - Designer & Artist Backfill (All Projects)

### Overview
One-off backfill of `productionData.designer` (and `productionData.conceptArtist` where missing) across all 127 Whitecardopedia `project.json` files. 80 projects patched automatically from the master CSV; 47 legacy 2025 projects have a pre-filled supplement CSV generated for manual completion. All updated files pushed to Cloudflare R2 via the audit backfill script.

### Changes
- **Designer backfill pipeline** — new one-off dev utility at `Tools__DevUtils/OneOff__DesignerArtistBackfill__/`. Contains the CSV extractor (`AutomationUtil__ExtractProjectDesignersAndArtists__Main__.py`), the apply script (`AutomationUtil__ApplyDesignersToWhitecardopedia__Main__.py`), the master CSV, and the legacy supplement template.
- **79 project.json files updated** — `designer` field written for all 2026 projects and 11 2025 projects that had a `*__ProjectData__.json` source. 1 project (Warwick) already had the correct value and was skipped.
- **Supplement template generated** — `Project__Data__Query__Legacy2025Supplement__.csv` lists the 45 real legacy 2025 projects with `conceptArtist` pre-filled and a notes snippet; user fills `Designer` column then re-runs `--apply --supplement` for the second pass.
- **R2 CDN updated** — 866 files force-uploaded; master index, build manifest, and master config mirror all rebuilt.

---

## Whitecardopedia v0.6.2 - 25-Jun-2026 - First-Sync Scaffold, Production Data Automation, PWA Cache Recovery

### Overview
Completes the ValeVision Cloud Sync first-sync workflow so a brand-new project can be pushed to R2 from SketchUp without a pre-existing Whitecardopedia folder. Production metadata (designer, concept artist) is now authored once in the local `*__ProjectData__.json` and auto-carried into `project.json`. New projects stamp `dateFulfilled` with the creation/sync date so they sort to the top of the default gallery. Adds a one-keystroke PWA cache reset for stale shell-cache recovery after loader changes.

### Changes
- **First-sync scaffold (Python orchestrator)** — `na_ensure_wcp_project_scaffold()` runs before any `project.json`-dependent step. When no Whitecardopedia folder exists it creates `{year}/{code}__Name/` + `project.json` from the canonical template (DRY-reusing `AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py`), registers the project in local masterConfig, and sets `report.first_sync = true`. See ValeVision Cloud Sync v0.2.1 for the matching SketchUp UI (Update cards locked until first successful sync).
- **Production data automation** — `read_local_project_metadata()` reads `Project__MetaData` from `00__ProjectData/*__ProjectData__.json` and maps `Project__ConceptArtist` + `Project__Designer` into `productionData.conceptArtist` / `productionData.designer`. Unreviewed fields use the `NOT YET REVIEWED` sentinel; `timeAllocated` is omitted until review so the Efficiency Scale stays hidden. Both the bulk cloner and the single-project sync orchestrator call this helper.
- **Gallery sort fix** — `create_project_json()` now sets `scheduleData.dateFulfilled` to the creation/sync date (`datetime.now()` in the plugin path; content-folder date or today in the bulk cloner). Eliminates `TBD` / template dates that pushed new projects to the bottom of the default `date-newest` sort.
- **ProjectViewer** — new **Designer** field in Production Data; Time Taken only appends "Hours" when numeric; Efficiency Scale gated on numeric `timeAllocated` + `timeTaken`.
- **Time Analysis** — skips projects whose schedule data is still placeholder (non-numeric hours) so analytics are not polluted by first-sync sentinels.
- **PWA cache recovery** — `Whitecardopedia__Pwa__ServiceWorker__Registrar__HardResetAndReload()` wipes all Cache Storage buckets, unregisters every service worker, clears `wcp_last_build_version`, and reloads. Exposed as `--ClearCache` in the browser console (`window.ClearCache` getter) and `window.na_clear_cache()`.
- **PWA shell cache bump** — `PWA_SW_VERSION_TOKEN` bumped to `2026-06-25-2` so clients force-evict stale shell caches after ProjectLoader / registrar changes without requiring a double reload.
- **R2-first architecture docs** — MDC rules (`14-R2IndexArchitecture--VaApps-SSOT-.mdc`, Whitecardopedia + ValeVision3D SSOT rules) now document that R2 is the live runtime source for project/index data and must not require a GitHub Pages push to go live.

### Files Changed
- `Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py`
- `Tools__DevUtils/AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py`
- `02__Src__AppModules/11__Feature__ProjectViewer/Na__Feature__ProjectViewer__Main.jsx`
- `02__Src__AppModules/13__Feature__TimeAnalysis/Na__Feature__TimeAnalysis__Main.jsx`
- `02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`
- `02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Registrar__.js`
- `Projects/2026/63770__Warwick/project.json` (corrected production/schedule data for Warwick)
- `.cursor/rules/14-R2IndexArchitecture--VaApps-SSOT-.mdc`
- `.cursor/rules/00-R2IndexArchitecture--Whitecardopedia-SSOT-.mdc` (Whitecardopedia)
- `.cursor/rules/08-R2IndexArchitecture--ValeVision3D-SSOT-.mdc` (ValeVision3D)

### Cross-reference
- **ValeVision Cloud Sync v0.2.1** — first-sync UI state (`first_sync_complete` model-dictionary flag, greyed Update cards until first successful sync).

---

## Whitecardopedia v0.6.1 - 25-Jun-2026 - Carousel Gate for ValeVision 3D Projects

### Overview
Projects with a 3D model (`hasGlb_R2: true` in the master index) now display only IMG01 in the project viewer with no carousel navigation controls (no prev/next arrows, no counter, no thumbnail strip). This nudges users to open the ValeVision 3D viewer rather than paging through static whitecard images. Projects without a 3D model are unaffected and retain the full carousel.

### Changes
- **ProjectLoader** — `loadProjectData()` now forwards `hasGlb_R2` from the master index entry onto the project data object, making the flag available to all downstream components.
- **ProjectViewer** — `carouselImages` derivation replaced `checkValeVisionModelUrl()` with `project.hasGlb_R2`, using the index flag directly. When `true`, the carousel receives only the first image; the `ImageCarousel` component already suppresses all navigation when `images.length === 1`.

---

## Whitecardopedia v0.6.0 - 25-Jun-2026 - R2-Driven Cache Invalidation + Real-Time Master Config

### Overview
Replaced the manual Service Worker version bump with an automated, R2-driven build-version manifest shared by Whitecardopedia and ValeVision3D. Every sync (plugin or manual) now writes `VaApps/Index/Na__BuildVersion__Manifest__.json` with an increasing Unix-timestamp `buildVersion`. The gallery reads it on load (cache-busted) and evicts only the `wpwa-thumbs-*` Service Worker bucket when the build is newer, so re-synced thumbnails appear without a manual `PWA_SW_VERSION_TOKEN` change. The master config is also mirrored to R2, so adding or enabling a project goes live without a GitHub Pages push + deploy wait. The sync now purges superseded images from R2.

### Changes
- **NEW build-version manifest (sync)** — `na_update_build_manifest()` writes an increasing `buildVersion` to R2 after every sync (own R2 client; `put_object` with `CacheControl`).
- **NEW R2 master-config mirror (sync)** — `na_upload_master_config_to_r2()` mirrors `Na__AppData__MasterConfig__Main.json` to `VaApps/Index/`.
- **NEW stale-image purge (sync)** — `na_purge_stale_r2_images()` (mirrors `na_purge_stale_r2_glbs`) deletes old PNG/WebP/JPG not in the current local keep-set; wired into `na_sync_all` and `na_sync_images`.
- **SW thumbnail strategy** — thumbnail handler switched from CacheFirst to StaleWhileRevalidate (background refresh, preserves LRU trim); `PWA_SW_VERSION_TOKEN` bumped to `2026-06-25-1` for a one-time stale-cache wipe.
- **App build check (ProjectLoader v0.2.3)** — `na_check_and_clear_on_build_change` + `na_clear_thumbnail_cache`; `loadMasterConfig` now R2-first (cache-busted) with GH Pages fallback.

### Files Changed
- `Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py`
- `02__Src__AppModules/03__AppData/Na__AppData__ProjectLoader.js`
- `02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`

# -----------------------------------------------------------------------------

## Whitecardopedia v0.5.0 - 25-Jun-2026 - R2 Master Index + Full CDN Mirror + SketchUp Sync Tooling

### Overview
Whitecardopedia and ValeVision3D now share an authoritative **master project index** on Cloudflare R2 (`VaApps/Index/Na__MasterIndex__ProjectLocations__.json`) with a committed GitHub Pages fallback copy. The gallery and ValeVision3D resolve each project's true year, folder id, and asset home (R2 vs GH-only) before fetching — eliminating the blind-R2 404 flood. New Python tooling backs the ValeVision Cloud Sync SketchUp plugin for single-project sync, R2 audit/backfill, and shared R2 plumbing. See ValeVision3D v2.8.0 and ValeVision Cloud Sync v0.2.0 for the upstream/downstream pipeline.

### Changes
- **R2-first loading (v0.2.0)** — `loadProjectData`, `getImageUrl`, and `getThumbnailImage` try CDN before GH Pages; fallback toast on GH fallback.
- **Thumbnail path fix (v0.2.1)** — correct `__Thumbnail__524p__.webp` sibling naming (not a subfolder path); `getImageUrlPair` / `getThumbnailImagePair` return `{ primary, fallback }` with `onerror` swap.
- **Master index (v0.2.2)** — `na_load_master_index` (R2-first, memoised) + `na_resolve_project_base`; skip doomed R2 request when index marks project as `assetHome: gh`.
- **Config SSOT** — `AssetUrls__IndexUrl` and `AssetUrls__IndexFallbackUrl` added to `Na__AppData__MasterConfig__Main.json`.
- **NEW shared R2 library** — `AutomationUtil__R2Common__Lib__.py`: boto3 client, HEAD/list/upload, content-type map, master index read/upsert/write (R2 + GH copy).
- **NEW single-project sync orchestrator** — `AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py`: clone images → 524p thumbnails → upload R2 → rebuild `images[]` → merge `ValeVison3D__SketchUpCameraData` → upsert index; `--report-file` for SketchUp GUI host.
- **NEW audit + backfill tool** — `AutomationUtil__AuditAndBackfillR2__ProjectJsonAndImages__Main__.py`: dry-run/apply missing `project.json`/images/thumbnails per project; rebuild index after apply.
- **Bulk GLB builder** — regenerates master index after bulk upload via shared lib (`AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py`).
- **Initial master index seed** — `Na__MasterIndex__ProjectLocations__.json` committed under `02__Src__AppModules/03__AppData/` and uploaded to R2.
- **Synced project data** — projects such as `63592__Bressard-Kayode` now carry updated images, thumbnails, GLBs, and SketchUp camera data on R2 and in the local repo.

### Files Changed
- `02__Src__AppModules/03__AppData/Na__AppData__ProjectLoader.js`
- `02__Src__AppModules/03__AppData/Na__AppData__MasterConfig__Main.json`
- `02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json` (new)
- `Tools__DevUtils/AutomationUtil__R2Common__Lib__.py` (new)
- `Tools__DevUtils/AutomationUtil__SyncSingleProject__ToCloudAndWeb__Main__.py` (new)
- `Tools__DevUtils/AutomationUtil__AuditAndBackfillR2__ProjectJsonAndImages__Main__.py` (new)
- `Tools__DevUtils/AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py`
- `Projects/2026/*/` (synced project content)

---

## Whitecardopedia v0.4.1 - 17-Jun-2026 - Responsive Toolbar Layout

### Overview
Gallery toolbar (hamburger, filter tabs, search, sort) was breaking on iPad Portrait and clipping off-screen on mobile. Implemented a 3-tier responsive layout: Desktop → Tablet Portrait → Mobile.

### Changes
- **Sort control moved inside `controls-left`** — sort now shares a single flex row with all other toolbar items, allowing CSS to manage alignment without hacks
- **Sort always right-aligned** — `controls-left` is `width: 100%`; search `flex: 1` fills the gap so sort is always pinned to the far right edge
- **"Sort by:" label removed** — dropdown content is self-explanatory; label was redundant at all screen sizes
- **Tablet Portrait (769px–1024px)** — new breakpoint caps search width at 300px so sort stays inline on one row without line-breaking
- **Mobile (≤768px)** — tabs + hamburger on row 1; search + sort on row 2 at 85% scale; no inter-row conflicts via flex `order` + `::after` line-break element
- **Tab scaling on narrow phones** — `clamp()` on tab font-size and padding so all three tabs fit inline at any viewport width without wrapping
- **Consistent search spacing** — `margin-right` removed from toggle; `gap: var(--Vale_Spacing_Medium)` on `controls-left` gives equal spacing between every toolbar item

### Files Changed
- `02__Src__AppModules/10__Feature__ProjectGallery/Na__Feature__ProjectGallery__Main.jsx` — `<SortControls>` moved inside `controls-left`
- `03__Style__AppStylesheets/Na__CoreUi__Styles__App__.css` — base toolbar layout, 3-tier responsive breakpoints
- `03__Style__AppStylesheets/Na__UiFeature__Styles__Blockoutopedia__.css` — tab scaling with `clamp()`, mobile toggle pin

---

## Whitecardopedia v0.4.0 - 11-Jun-2026 - Model / HDRI / DataLib Caching Strategy + MaxModel Load Speed

### Overview
MaxModel projects were hanging noticeably longer than whitecard models on load despite simpler geometry. Diagnosis: a fixed MaxEngine "tax" — 24.5 MB 4K HDRI download (never cached), DataLib SSOT fetches from GitHub raw (never cached), and no service-worker caching of model GLBs at all (R2 CDN is cross-origin so the SW ignored it entirely; offline = no models). This release fixes all three.

### Changes
- **Optimised HDRI adopted**: `Scene__Environment__HdriUrl` now points at the new 1024p HDRI (1.46 MB vs 24.5 MB — 94% smaller). Reflections-only usage (glass/mirror) makes it visually identical. Also added to the SW precache so installed clients never download it at model-load time.
- **Model GLB caching (NEW `wpwa-models-` cache)**: new `NetworkFirstWithGrace` strategy —
  - Good connection: fresh network copy always wins, cache refreshed.
  - Slow connection: if network exceeds a 4 s grace window and a cached copy exists, the cached model is served instantly; the in-flight fetch still refreshes the cache in background for next load.
  - Offline: cached copy served.
  - LRU-capped at 36 entries so large GLBs cannot grow unbounded.
- **Cross-origin caching enabled**: `cdn.noble-architecture.com` (R2 model CDN) and `raw.githubusercontent.com` (DataLib SSOT) added to an owned-remote-origins allowlist — the SW now manages these requests (both hosts are CORS-enabled).
- **DataLib SSOT JSONs**: `Na__DataLib__CoreIndex*.json` added to the data-cache pattern — network-first with offline fallback, so MaxEngine materials survive flaky connections.
- **HDRI route**: `.hdr` requests are cache-first (filename-versioned immutable asset) — downloaded once per SW version.
- **SW version token bumped** to `2026-06-11-3`.

### Files Changed
- `ValeVision3D/02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` — HdriUrl → 1024p optimised version
- `02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js` — models cache, remote origins, new routes/strategy, precache, token bump

---

## Whitecardopedia v0.3.8 - 11-Jun-2026 - HOTFIX - Vendored Three.js Broken Module Graph (No Models Loading)

### Overview
v0.3.7 switched ValeVision3D from esm.sh CDN imports to a locally vendored Three.js, but four transitive dependency files were never vendored. Every `three/addons/` import chain failed to resolve (404), killing the entire ES module graph — **no model could load on any fresh client** (first seen on iPad, where no stale CDN-based cache existed to mask the fault).

### Root Cause
Missing files inside `ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/`:
- `postprocessing/Pass.js` — required by `RenderPass.js`, `ShaderPass.js`, `MaskPass.js`
- `postprocessing/MaskPass.js` — required by `EffectComposer.js`
- `shaders/CopyShader.js` — required by `EffectComposer.js`
- `utils/BufferGeometryUtils.js` — required by `GLTFLoader.js`

### Changes
- **Four missing files vendored** from `three@0.160.0` (matches vendored `three.module.js` REVISION `'160'`). Module graph now resolves completely.
- **SW version token bumped** to `2026-06-11-2` — all clients drop v0.3.7 caches and adopt the repaired module graph.
- **Vendored Three.js actually added to the precache list** — the v0.3.7 notes claimed this but the entries were never present. All 17 library files now precache.

### Files Changed
- `ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/postprocessing/Pass.js` (NEW)
- `ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/postprocessing/MaskPass.js` (NEW)
- `ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/shaders/CopyShader.js` (NEW)
- `ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/utils/BufferGeometryUtils.js` (NEW)
- `02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`

---

## Whitecardopedia v0.3.7 - 11-Jun-2026 - PWA Stability Fix

### Overview
Shared PWA stability pass covering the Whitecardopedia + ValeVision3D combined PWA.

### Changes
- **SW version token bumped** to `2026-06-11-1` — forces all clients to adopt the new cache configuration.
- **HTML → network-first** in the SW: `index.html` / `app.html` now use network-first (not SWR) so deploys cannot pair stale HTML with freshly-revalidated modules.
- **Na__AppConfig JSONs added** to the data-cache pattern and precache list so `Na__AppConfig__Main.json` and `Na__AppConfig__MaterialsLibrary.json` ride network-first-with-fallback rather than always requiring a live network connection.
- **Expanded ValeVision3D precache**: all `02__Src__AppModules/` entry-point JS files, CSS stylesheets, and the vendored Three.js modules added to the precache list. The viewer now boots from cache on poor connections.
- **`controllerchange` reload bridge** implemented in `Whitecardopedia__Pwa__ServiceWorker__Registrar__.js` — reloads exactly once per session, only when no ValeVision model load is in flight.
- **Thumbnail LRU trim** now runs only after a successful cache `put` (was running on every thumbnail request).
- **Legacy manifest deleted**: `Na__AppInstallability__Manifest.webmanifest` removed (was unreferenced).
- **React production builds** + pinned Babel @7.29.7 in `app.html` — removes React dev overhead and floating Babel version.

### Files Changed
- `02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`
- `02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Registrar__.js`
- `app.html`
- DELETED: `02__Src__AppModules/62__Feature__AppInstallability/Na__AppInstallability__Manifest.webmanifest`

---

## Whitecardopedia v0.3.6 - 10-Jun-2026 - Max Models Tab + Builder Tagging

### Overview
Third gallery tab — **Max Models** — added to Whitecardopedia, sitting alongside Whitecard Models and Blockout Models. Max Models are premium full-PBR projects built with ValeVision3D's MaxEngine (ambient occlusion, physically-based materials, glass/mirror reflections). The gallery tab is driven by `ProjectType: "MaxModel"` in `project.json`. Both builder tools now recognise source folders suffixed `__MaxModel` and tag them automatically.

### Features Added
- **Max Models gallery tab**: A third button in the gallery mode toggle. Filters `ProjectType === "MaxModel"`. Default mode remains Whitecard Models — existing projects are unaffected.
- **MaxModel info banner**: A blue informational banner appears above the grid when the Max Models tab is active, explaining what MaxEngine quality means for those projects.
- **Empty state guidance**: When no MaxModel projects exist yet, the empty state message tells the developer how to create one (rename a source folder with the `__MaxModel` suffix and run the WCP builder).
- **WCP builder (`AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py`)**: Recognises `__MaxModel` folder suffix (both legacy `EX-12345__Name__MaxModel` and new `12345__Name__MaxModel` formats). Writes `ProjectType: "MaxModel"` and additionally writes `RenderEngine__Config: { "RenderEngine__Active": "MaxEngine" }` into `project.json` so ValeVision3D automatically boots into MaxEngine for these models. The dry-run report highlights MaxModel projects in cyan and confirms the config that will be written. For non-MaxModel types, any stale `RenderEngine__Config` key is cleaned up from the template.
- **GlbBot (`AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__Main__.py`)**: `__MaxModel` added to folder scan pattern so MaxModel GLBs upload to Cloudflare R2 and the post-step `valeVision_ModelUrls` refresh covers MaxModel projects.

### Technical Implementation
- `02__Src__AppModules/20__Feature__Blockoutopedia/Na__Feature__Blockoutopedia__GalleryModeToggle.jsx` — third button added (`onModeChange('maxmodel')`); mode check uses `galleryMode === 'maxmodel'`
- `02__Src__AppModules/20__Feature__Blockoutopedia/Na__Feature__MaxModel__InfoBanner.jsx` — new `MaxModelInfoBanner` component (blue palette, parallel structure to `BlockoutWarningBanner`)
- `02__Src__AppModules/10__Feature__ProjectGallery/Na__Feature__ProjectGallery__Main.jsx` — `filterProjectsByGalleryMode` extended with `maxmodel` branch (before `blockout`); `MaxModelInfoBanner` rendered on `galleryMode === 'maxmodel'`; empty-state message updated
- `03__Style__AppStylesheets/Na__UiFeature__Styles__Blockoutopedia__.css` — added `.gallery-mode-toggle__button:not(:first-child):not(:last-child)` rule for correct three-button border layout; added `max-model-info-banner__*` styles (sky-blue palette); mobile adjustments extended
- `app.html` — `Na__Feature__MaxModel__InfoBanner.jsx` script tag added after existing Blockoutopedia scripts

### Cross-reference
The `RenderEngine__Config` key written by the WCP builder is read on load by ValeVision3D (`Na__AppFlow__LoadingSequence.js`) which was built as part of the Dual Render Engine port (ValeVision3D v2.4.0). No ValeVision3D changes required for this feature.

---

## Whitecardopedia v0.3.5 - 30-Apr-2026 - Portrait Mobile Layout Fix (Header + Project Viewer)
### Features Added
- **Decluttered Mobile Header**: On portrait phones (≤600px viewport) the Whitecardopedia / Blockoutopedia title logo is now hidden so the Vale Garden Houses logo, hamburger menu, gallery-mode toggle, and search box can all share the limited horizontal space without truncation. The title logo continues to render exactly as before on landscape phones, iPad portrait, and desktop — only narrow portrait viewports are affected. Resolves the issue visible on the user's phone screenshot where "Whitecardope..." was clipping the search input
- **Stacked Project Viewer on Portrait Mobile**: The project detail page no longer hides the carousel thumbnail and ValeVision3D click-through behind the production-data column. On viewports ≤600px the page now flows naturally as **Image carousel → Actions → Stats**:
  - Image carousel sits at the top with a guaranteed `aspect-ratio: 4 / 3` so the project image is always visible (capped at `max-height: 70vh` for tall phones); the existing ValeVision3D "Click here" overlay is now reachable as the primary tap target
  - Project Actions immediately below the carousel — Back to Gallery, Copy Share Link, plus SketchUp model and Download Image Files when the project has no ValeVision3D model
  - Production Data + Efficiency Scale follow as scrollable secondary content
  - Resolves the issue where mobile users had no way to launch ValeVision 3D from a project card and could not see the project image on the detail page
- **Natural-Flow Scrolling on Mobile**: Replaced the `height: calc(90vh - header)` lock on `.project-viewer` with `min-height` for portrait phones so the page scrolls organically through the new stack instead of clipping content behind the fixed-height container
- **Compact ValeVision Click-Through Overlay**: Added a third responsive tier to the ValeVision3D overlay sizing (already 270 / 225 / 180px at desktop / 1024 / 768) — now `150px × Vale_UIScale` at ≤600px so the overlay sits comfortably over the smaller portrait carousel without feeling oversized

### Technical Implementation
- New `@media (max-width: 600px)` block appended to `03__Style__AppStylesheets/Na__CoreUi__Styles__App__.css` (kept separate from the existing `768px` block so iPad portrait + landscape phones inherit the previous behaviour):
  - Header: `.app-header__logo-container--right { display: none }` and a slight `.app-header__logo-left` height nudge for balance
  - Project viewer container: switched from grid to `display: flex; flex-direction: column; gap` on `.project-viewer__content`; released `90vh` height lock via `height: auto; min-height: calc(100vh - var(--Vale_HeaderHeight))`
  - Carousel: `aspect-ratio: 4 / 3`, `min-height: unset`, `max-height: 70vh` on `.project-viewer__carousel-container`; overrode the `768px` carousel `min-height: 400px / max-height: 800px` rule so the new aspect-ratio drives sizing
  - Section ordering: `order: 1/2/3/4` applied to four new section wrappers so DOM order (data → download → viewer-actions → efficiency) is rendered as (viewer-actions → download → data → efficiency) on portrait mobile only
  - Hid the now-redundant `.project-viewer__divider--viewer-actions` and the duplicate `.project-viewer__actions-title--viewer-actions` heading on mobile (sections self-separate via flex column spacing)
- Updated `02__Src__AppModules/11__Feature__ProjectViewer/Na__Feature__ProjectViewer__Main.jsx` — wrapped the four logical regions inside `.project-viewer__ratings-panel` in semantic group divs (purely additive, no JSX behaviour change for desktop):
  - `project-viewer__panel-section project-viewer__panel-section--data` — Production Data title + production data fields
  - `project-viewer__panel-section project-viewer__panel-section--download` — SketchUp + Download Image Files (rendered only when `!checkValeVisionModelUrl(project)`)
  - `project-viewer__panel-section project-viewer__panel-section--viewer-actions` — Back to Gallery + Copy Share Link
  - `project-viewer__panel-section project-viewer__panel-section--efficiency` — Efficiency Scale
- Appended a new `@media (max-width: 600px)` rule to `03__Style__AppStylesheets/Na__UiFeature__Styles__ImageCarouselOverlay__.css` alongside the existing 1024 / 768 tiers, scaling `.image-carousel__valevision-overlay` to `calc(150px * var(--Vale_UIScale))`
- No changes to `Na__AppCore__Header.jsx`, the gallery components, the carousel JS logic, the ValeVision3D click-through navigation handler (`handleValeVisionClick` in `Na__Feature__ProjectViewer__ImageCarousel.jsx`), or any service worker / project loader code

### Validation
- DevTools at 390 × 844 (iPhone 13/14/15 portrait): header shows VGH logo only; toolbar (hamburger / mode toggle / search) fits without overflow
- Tap a project: image carousel renders at the top with the ValeVision3D "Click here" overlay reachable; Project Actions follow immediately below; Production Data + Efficiency Scale scroll into view as expected
- Rotated to landscape on the same device: layout reverts cleanly to the existing desktop-style two-column grid + dual-logo header
- DevTools at 768 × 1024 (iPad portrait) and 1280 × 800 (desktop): no visual difference vs prior behaviour confirmed
- No console errors introduced; no linter warnings on edited CSS or JSX
- ValeVision3D deep-link path from the carousel (`window.Na__Feature__PwaAppHelpers__ValeVisionLinkRouting.navigateToValeVisionProject(projectData)`) untouched and verified still operational

# -----------------------------------------------------------------------------

## Whitecardopedia v0.3.4 - 29-Apr-2026 - Progressive Gallery Loading + Newest-First Order + Lazy Thumbnails
### Features Added
- **Progressive Batched Loading**: Gallery no longer blocks on `Promise.all` for all 100 enabled `project.json` files before rendering. Projects now stream in batches of 10 — the grid becomes interactive after the first batch lands (~10 cards) and the remaining 90 continue loading in the background. Resolves the long blank-screen wait on localhost where Flask + HTTP/1.1 was serialising the 200+ requests through the browser's ~6-connection cap
- **Newest-First Load Order**: The batched loader now sorts the enabled project list by year DESC then by appended-position DESC before slicing into batches. Because the auto-cloner script appends new projects to the end of `masterConfig.json`, this surfaces the most recently delivered work first — the visible viewport on first paint matches the gallery's default `date-newest` sort, so users see the cards they care about as soon as they appear instead of waiting for older 2025 entries to finish loading first
- **Native Lazy Thumbnails**: Added `loading="lazy"` + `decoding="async"` to every gallery card thumbnail and to the two `ContentIndicatorIcons` (watercolor / 3D-model badges); the browser now defers image decode until each card is near the viewport's prefetch margin (verified: only ~60 of 100 thumbnails fetched on first paint, with the rest fetched on scroll). Same attributes applied to the `ImageCarousel` thumbnail strip for projects with many images, so opening a project no longer eagerly fetches every full-resolution image
- **Streaming Progress Indicator**: Below the grid, a small `Loading more projects... X / Y` line appears while batches are still arriving and auto-hides once `loaded === total`. Search / sort / mode-toggle keep working as projects stream in — the visible count and filtered results update live, matching the "continue loading" UX the user expected

### Technical Implementation
- Updated `02__Src__AppModules/03__AppData/Na__AppData__ProjectLoader.js`:
  - Added `loadProjectsInBatches(initialBatchSize, subsequentBatchSize, onBatchLoaded)` that fetches enabled projects in chunks via `Promise.all` per batch and invokes `onBatchLoaded(batch, loadedCount, totalEnabled)` after each chunk resolves
  - Added two helpers: `extractFolderIdYear(folderId)` reads the leading 4-digit year prefix, and `sortProjectEntriesNewestFirst(entries)` performs an indexed stable sort by year DESC then by `originalIndex` DESC inside each year
  - Added `GALLERY_INITIAL_BATCH_SIZE` and `GALLERY_SUBSEQUENT_BATCH_SIZE` module constants (both `10`) for clarity, even though current call site passes literals
  - `loadAllProjects()` left unchanged — still used by `Na__AppCore__WhitecardopediaApp.jsx` for URL deep-link routing (`?id=...`)
- Updated `02__Src__AppModules/10__Feature__ProjectGallery/Na__Feature__ProjectGallery__Main.jsx`:
  - Replaced the single `useEffect` `Promise.all` with a streaming-append effect calling `loadProjectsInBatches(10, 10, ...)`. The grid reveals as soon as the first batch lands; subsequent batches are appended via `setProjects(prev => [...prev, ...batch])`
  - Added `loadProgress` state and an inline indicator rendered after the grid (auto-hides when complete)
  - Added a `cancelled` flag returned from the effect cleanup to avoid `setState` after unmount when the user navigates away mid-load
  - Added `loading="lazy"` + `decoding="async"` to the project card thumbnail `<img>` and to both `ContentIndicatorIcons` images
- Updated `02__Src__AppModules/11__Feature__ProjectViewer/Na__Feature__ProjectViewer__ImageCarousel.jsx` — `loading="lazy"` + `decoding="async"` on the bottom thumbnail strip; the main carousel image stays eager (correct UX — it's the focus)

### Validation
- Network panel on cold load shows exactly 10 sequential batches of 10 `project.json` requests, with batch 1 entirely 2026 projects (Beevers, Hendy, James, Thompson, Marsh, Berry, McLoughlin, Matharu, Thorpe, Lee-Smith) and 2025 projects only appearing from batch 5 onwards — confirms newest-first order is correct
- First image requests on first paint are also all 2026 thumbnails (Beevers, Matharu, McLoughlin, Lee-Smith, Hampson, King, Lorriman, Smee, Lister, Lamming) — load order, render order, and visible viewport now match the date-newest sort
- Lazy loading verified: 60 of 100 thumbnail requests on first paint, remainder triggered as the user scrolls
- Search / sort / mode-toggle continue working while batches stream in; no console errors introduced (only pre-existing Babel-standalone and React-devtools dev warnings)
- `loadAllProjects()` URL deep-link path (`?id=<projectCode>`) still functions because it was deliberately left untouched

# -----------------------------------------------------------------------------

## Whitecardopedia v0.3.3 - 28-Apr-2026 - Cross-Platform PWA Install + Shared Service Worker + Gallery Thumbnails
### Features Added
- **Cross-Platform PWA Installability**: First-time visitors are now greeted with a platform-aware install prompt rather than relying on the hidden browser address-bar icon. One small handler module per platform / browser combo so future OS updates only touch one file:
  - **Chromium (Chrome / Edge / Opera / Samsung Internet on Windows, macOS, Linux, Android)**: captures `beforeinstallprompt`, defers the mini-infobar, and renders a Vale-branded compact install bar; a click triggers the native `prompt()` and `appinstalled` clears state
  - **iPhone Safari (iOS 16.4+)**: centred instruction sheet with three steps (Share → Add to Home Screen → Add) and an animated arrow pointing **down** at the share icon
  - **iPad / iPadOS Safari (iPadOS 26)**: same instruction sheet but the arrow points **up** at the top-bar share icon; iPad-as-Mac UA quirk handled via `navigator.maxTouchPoints` so iPadOS never gets misclassified as macOS
  - **iOS Chrome / Edge / Firefox**: explains that only Safari can install web apps on iOS, plus a `Copy Link` button (modern Clipboard API with `execCommand` fallback)
  - **macOS Safari 17+**: instruction sheet for File → Add to Dock
  - **Already installed (any platform)**: controller never instantiates a handler, prompt never renders
- **Single PWA Container Spanning Both Apps**: Whitecardopedia and ValeVision 3D are now installed together as a single PWA called "ValeVision 3D"; navigating from a project card into the 3D viewer stays inside the standalone window with no browser chrome
- **Shared Service Worker With Smart Caching**: Reduces load times after first visit and survives short connection drops; cache strategy avoids stale full-resolution project images:
  - App shell (HTML / CSS / JSX / JS / manifest / icons): `stale-while-revalidate`
  - Gallery thumbnails (`*__Thumbnail__524p__.*`): `cache-first` with a 256-entry LRU cap
  - `project.json`, `masterConfig.json`, designer / artist / hotkey lists: `network-first` with cached fallback when offline
  - Full-resolution `IMG##__*` project images: pass-through (network only) so the project view always shows the latest delivered art
  - Bumping a single VERSION token at the top of the SW logic file invalidates every owned cache via the `activate` cleanup step
- **Gallery Thumbnails (524p)**: New build step generates a 524p long-edge WebP plus JPG fallback for the first IMG01 image of every project and patches `project.json` with a `thumbnailImage` field, drastically shrinking the gallery payload (no more full 4K images for thumbnails); the main project viewer continues to load full-resolution images as before
- **PWA Snooze Ladder**: Dismissing the install prompt schedules an exponential backoff (1 min → 1 hr → 1 day → 1 week → 1 month) tracked in localStorage so users are never nagged
- **Diagnostic API**: `window.Whitecardopedia__Pwa__InstallController.requestShow()` re-triggers the install flow on demand (useful for an "Install app" link in a future About menu); legacy `Na__AppInstallability__BrowserDelegate` global remains as a slim shim so any existing callers keep working

### Build Tooling Updates
- **Gallery Thumbnail Generator**: New `AutomationUtil__GenerateGalleryThumbnails__524p__Main__.py` walks every enabled project, finds the first IMG01 source, produces 524p WebP + JPG named `*__Thumbnail__524p__.{webp,jpg}` next to the original, and patches `project.json` with `"thumbnailImage": "<filename>"`; idempotent (only regenerates when source is newer), supports `--dry-run`, `--force`, and `--project <folderId>`; uses Pillow only
- **Build Pipeline Hook**: `AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py` now calls the thumbnail generator as a non-blocking post-step, so a freshly imported project gets its gallery thumbnail automatically
- **Convenience Launcher**: `AutomationUtil__GenerateGalleryThumbnails__524p__.bat` matches the existing `.bat` launcher pattern

### Technical Implementation
- Created `WebApps/Na__Pwa__ServiceWorker__.js` — thin loader stub at the WebApps root (only file outside Whitecardopedia, required because GitHub Pages cannot send `Service-Worker-Allowed` headers; keeping the stub at WebApps level guarantees the SW scope covers both apps); pulls real logic via `importScripts()`
- Created modular install stack inside `02__Src__AppModules/62__Feature__AppInstallability/`:
  - `Whitecardopedia__Pwa__Url__Constructor__.js` — environment-aware URL helper resolving WebApps / Whitecardopedia / ValeVision3D / manifest / SW / start URLs for localhost ports 8000 + 5500, GitHub Pages `/ValeCodebase/WebApps/`, and any future custom domain (with optional `<meta name="vale-pwa-base">` override); auto-injects manifest and apple-touch-icon link tags so static HTML doesn't need to know dev vs prod paths
  - `Whitecardopedia__Pwa__PlatformDetector__.js` — OS + browser + display-mode classification with iPad-as-Mac UA quirk handling and live `(display-mode: standalone)` subscription
  - `Whitecardopedia__Pwa__SessionState__.js` — localStorage dismissal/snooze tracker with in-memory fallback for private mode
  - `Whitecardopedia__Pwa__PromptUi__.js` — vanilla DOM banner / instruction sheet (mounts before React boots; no React dependency)
  - `Whitecardopedia__Pwa__Handler__Chromium__.js`, `_IosSafari__.js`, `_IosNonSafari__.js`, `_MacSafari__.js`, `_InstalledStandalone__.js` — five platform handlers, each owning a single rendering strategy
  - `Whitecardopedia__Pwa__InstallController__.js` — orchestrator that picks the handler from the platform descriptor, schedules first show after a 4.5 s engagement delay, retries while Chromium warms up, and queries `getInstalledRelatedApps()` to suppress prompts when an installed PWA already exists
  - `Whitecardopedia__Pwa__ServiceWorker__Logic__.js` — actual SW caching brain (loaded via `importScripts` from the WebApps stub)
  - `Whitecardopedia__Pwa__ServiceWorker__Registrar__.js` — registers the SW from the URL helper, gated to HTTPS or localhost so file:// never tries to register
- Created `Whitecardopedia__Pwa__Manifest__.webmanifest` replacing the old manifest with `categories`, `description`, `shortcuts` (gallery + 3D viewer), `display_override: ["standalone","minimal-ui","browser"]`, `launch_handler.client_mode: "navigate-existing"`, and dual `purpose: any` + `purpose: maskable` icons; `start_url` and `scope` paths chosen so they resolve correctly on both the localhost dev server (Whitecardopedia served as origin root) and production GitHub Pages
- Refactored existing `Na__UiFeature__AppInstallability__BrowserDelegate.js` into a slim shim that delegates to the new modules so any current callers continue to work
- Created `03__Style__AppStylesheets/Na__UiFeature__Styles__PwaInstallability__.css` — banner + sheet styles, animated arrow keyframes, dark/light-friendly tokens, automatically hides itself when the page is running in `display-mode: standalone | minimal-ui | fullscreen | window-controls-overlay`
- Created `Tools__DevUtils/AutomationUtil__GenerateGalleryThumbnails__524p__Main__.py` and `.bat` launcher; wired into `AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py` as a non-blocking post-step
- Updated `02__Src__AppModules/03__AppData/Na__AppData__ProjectLoader.js` — `getThumbnailImage()` now prefers `project.thumbnailImage` and falls back to `images[0]` when absent so existing data stays unbroken
- Updated `app.html` — replaced the single delegate `<script>` with the full ordered handler stack, swapped to the new manifest, and added `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`, `mobile-web-app-capable`, and `application-name` meta tags
- Updated `ValeVision3D/index.html` — same install handler stack referenced via `../Whitecardopedia/...` so the install flow works no matter which app the user lands on first
- Updated `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css` to import the new install stylesheet
- Updated `server.py` — serves `Na__Pwa__ServiceWorker__.js` at origin root with `Service-Worker-Allowed: /` and `Cache-Control: no-cache`, mirrors `/Whitecardopedia/...` paths so production URL shapes resolve identically in dev, sets `application/manifest+json` MIME for `.webmanifest` files, and applies `no-cache` headers to HTML

### Validation
- All 14 PWA module files pass `node --check`; thumbnail generator + build script + server pass `py_compile`; manifest is valid JSON
- All key endpoints respond `200 OK` with correct MIME types and headers (manifest = `application/manifest+json`; SW = `text/javascript` with `Service-Worker-Allowed: /`; HTML = `no-cache`)
- DevTools Application panel confirms: every PWA global mounts on both `app.html` and `ValeVision3D/index.html`, the service worker activates with scope `http://127.0.0.1:8000/` covering both apps, and the URL helper resolves all paths correctly; `getActiveDescriptor()` returns `chromium-desktop-windows` so the Chromium handler is selected
- Real-device install verification (Chrome on Windows, Edge on Android, Safari on iPhone / iPad, Safari on macOS) is the next manual follow-up since browser automation embedded in Cursor's Electron shell suppresses `beforeinstallprompt`; `window.Whitecardopedia__Pwa__InstallController.requestShow()` from the console is the easiest way to force-test the prompt UI on any device

# -----------------------------------------------------------------------------

## Whitecardopedia v0.3.2 - 07-Apr-2026 - Keyboard Navigation Hotkeys
### Features Added
- **Global Hotkey System**: App-wide keyboard shortcut handler with bindings loaded from a JSON data file
  - `Alt + Left Arrow` or `Alt + Backspace` — navigate back to the gallery from any project view (Viewer, Editor, Time Analysis)
  - `Alt + Right Arrow` — navigate forward into the last viewed project from the gallery
  - Hotkeys are suppressed when focus is on any input, textarea, or select element to prevent typing conflicts
  - Designed as a pageless SPA workaround — browser native back/forward do not work in this app as there is no `popstate` listener

### Technical Implementation
- Created `02__Src__AppModules/03__AppData/Na__AppData__Hotkeys__Main.json` — data file defining all hotkey bindings (key, modifiers, action name, description); extend by adding entries here without touching handler logic
- Created `02__Src__AppModules/05__AppUtils/Na__AppUtils__HotkeyHandler.js` — fetches bindings JSON, attaches a single `window keydown` listener, dispatches to registered action callbacks; exposes `initHotkeys(callbacks)` and `destroyHotkeys()` for React lifecycle wiring
- Modified `Na__AppCore__WhitecardopediaApp.jsx` — added `lastSelectedProject` state (persists across back navigations for forward hotkey), updated `handleSelectProject` to track it, added `useEffect` to register/destroy hotkeys on `currentView` and `lastSelectedProject` changes
- Updated `app.html` with new `HotkeyHandler.js` script tag

# -----------------------------------------------------------------------------

## Whitecardopedia v0.3.1 - 07-Apr-2026 - Blockoutopedia (Dual Gallery Mode)
### Features Added
- **Gallery Mode Toggle**: Two toggle buttons ("Whitecard Models" / "Blockout Models") in the gallery controls bar allow switching between Whitecard and Blockout gallery views
- **Blockoutopedia Logo Swap**: Header right-side logo dynamically swaps to the Blockoutopedia title image when Blockout mode is active, and back to Whitecardopedia when Whitecard mode is active
- **Blockout Warning Banner**: Amber warning banner displayed above cards in Blockout mode explaining what blockout models are, their limitations as bullet points, a red confidentiality notice restricting use to Concept Artists only, and a placeholder "Request Full Whitecard Model" button for future use
- **ProjectType Data Field**: New `"ProjectType"` field added to all project.json files ("Whitecard" or "Blockout") used to filter projects into the correct gallery view
- **Backward Compatibility**: Projects without a ProjectType field default to the Whitecard gallery

### Build Tooling Updates
- **Migration Script**: One-time `MigrationUtil__AddProjectTypeField__OneTimeUse__.py` script added `"ProjectType": "Whitecard"` to all 93 existing project.json files across 2025 and 2026
- **Auto-Cloner Updated**: `AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py` now recognises `__Blockout` suffix folders alongside `__Whitecard`, and embeds the detected `ProjectType` into generated project.json files
- **Vale Project Structure Builder Updated**: "Blockout" added to the Project Type dropdown (2nd position after Whitecard) with `__Blockout` folder suffix in `Py_WinUtil__BuildValeProjectStructure__Main__.py`

### Technical Implementation
- Created `02__Src__AppModules/20__Feature__Blockoutopedia/Na__Feature__Blockoutopedia__GalleryModeToggle.jsx`
- Created `02__Src__AppModules/20__Feature__Blockoutopedia/Na__Feature__Blockoutopedia__WarningBanner.jsx`
- Created `03__Style__AppStylesheets/Na__UiFeature__Styles__Blockoutopedia__.css`
- Modified `Na__AppCore__Header.jsx` with `galleryMode` prop and `HEADER_LOGO_CONFIG` constant for dynamic logo URLs
- Modified `Na__Feature__ProjectGallery__Main.jsx` with `galleryMode` state, `filterProjectsByGalleryMode()` helper, toggle and banner wiring
- Updated `app.html` with two new Blockoutopedia script tags
- Updated `Na__CoreUi__Styles__Index__.css` with Blockoutopedia stylesheet import
- Created test blockout project at `Projects/2026/00__TestBlockoutProject/`

# -----------------------------------------------------------------------------

## Whitecardopedia v0.3.0 - 07-Apr-2026 - Structural Realignment (ValeVision/ValePlanner Pattern)
### Major Refactor
- Restructured runtime code into numbered app bands and feature folders aligned with newer project conventions
- Added `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css` as the single stylesheet index entry point
- Migrated active runtime scripts to `02__Src__AppModules/*` with `Na__` naming and updated `app.html` references
- Moved master config source-of-truth to `02__Src__AppModules/03__AppData/Na__AppData__MasterConfig__Main.json`
- Updated localhost/dev tooling scripts and `server.py` to read the new master config path

### Scope Guardrail
- `Projects/` remained untouched (no folder renames, no file moves, no payload edits)

# -----------------------------------------------------------------------------

## Whitecardopedia v0.2.11 - 20-Mar-2026 - PWA App Installability (Edge & Chrome)
### Features Added
- **Web App Manifest**: Linked from `app.html` so Chromium-based browsers can treat Whitecardopedia as an installable app (Install / Save as app, Start menu and taskbar shortcuts, standalone window with `display: standalone`)
- **Install Icons**: PNG icons at 192×192 and 512×512 generated from shared Vale main icon SVG for manifest install criteria
- **Browser Install Delegate**: Captures `beforeinstallprompt`, exposes `window.Na__AppInstallability__BrowserDelegate` for future in-app install UI (`isStandaloneMode`, `isPromptAvailable`, `triggerInstallPrompt`)

### Technical Implementation
- Added `02__Src__AppModules/62__Feature__AppInstallability/Na__AppInstallability__Manifest.webmanifest` — `start_url` and `scope` resolve to Whitecardopedia root and `app.html`
- Added `02__Src__AppModules/62__Feature__AppInstallability/Na__UiFeature__AppInstallability__BrowserDelegate.js` — install event wiring and global API
- Added `02__Src__AppModules/62__Feature__AppInstallability/Na__AppInstallability__Icon__192x192.png` and `Na__AppInstallability__Icon__512x512.png`
- Updated `app.html` — `<link rel="manifest" ...>` in head; delegate script included with other utilities

# -----------------------------------------------------------------------------

## Whitecardopedia v0.2.10 - 11-Mar-2026 - ValeVision Project Actions Exemption
### Minor Update
- **Project Actions Section**: Hidden for projects with Vale Vision 3D files
  - Projects with Vale Vision 3D models no longer show the "Project Actions" section (Download Image Files, View SketchUp Model)
  - Projects without Vale Vision 3D continue to display the section as before
- Updated `src/components/ProjectViewer.jsx` — wrapped Project Actions block in `!checkValeVisionModelUrl(project)` conditional

# -----------------------------------------------------------------------------

## Whitecardopedia v0.2.9 - 24-Feb-2026 - Right-Click Image Protection
### Features Added
- **Right-Click Save Prevention**: Disabled browser right-click "Save Image As" context menu on all project content images
  - Applied to main carousel image, ART comparison base and top layer images, and thumbnail strip
  - Applied to gallery card thumbnails in the project gallery
  - Users are directed to use the "Download Image Files" button for all image downloads
- **Drag-to-Save Prevention**: Blocked HTML5 image drag behaviour on all project images
  - Prevents drag-to-desktop and drag-to-folder save paths
  - CSS `user-select: none` and `-webkit-user-drag: none` applied to all protected image classes

### Technical Implementation
- Updated `src/components/ImageCarousel.jsx` — added `onContextMenu={(e) => e.preventDefault()}` and `draggable="false"` to 4 image elements (main display, ART base, ART top layer, thumbnails)
- Updated `src/components/ProjectGallery.jsx` — same attributes added to gallery card thumbnail
- Updated `src/styles/app.css` — added `user-select: none` and `-webkit-user-drag: none` to `.image-carousel__image`, `.image-carousel__thumbnail`, and `.project-card__image`
- All existing click handlers (thumbnail navigation, ValeVision overlay, ART comparison drag slider) remain fully unaffected

# --------------------------------------------------------------------------    ---

## 11-Dec-2025 - Major Update - Version 0.2.8 - Project Sharing URLs
### Features Added
- **URL Query Parameter System**: Direct project linking via `?id=12345` query parameter
  - Projects can be accessed directly using their project code in the URL
  - Format: `app.html?id=62361` (uses project code from project.json)
  - Compatible with static GitHub Pages hosting (client-side only)
- **Share Link Button**: Added "Copy Share Link" button in project viewer header
  - Positioned next to "Back to Gallery" button
  - Generates full sharing URL with project code
  - Copies URL to clipboard with visual confirmation
  - Uses Vale button styling consistent with existing UI
- **PIN Authentication Enforcement**: Shared links now require PIN authentication
  - PIN entry modal appears immediately when accessing shared link
  - Project data is not loaded until PIN is successfully entered
  - URL parameter is cleared if PIN entry is cancelled
  - Prevents unauthorized access via direct URLs
- **URL State Management**: Browser history integration for proper navigation
  - URL updates automatically when selecting projects from gallery
  - Query parameter removed when returning to gallery
  - Browser back/forward buttons work correctly
  - Bookmarkable URLs for easy project access

### Technical Implementation
- Created `src/utils/urlQueryHandler.js` utility module for URL management
- Updated `App.jsx` with authentication state and PIN entry integration
- Modified `Header.jsx` to include share link button
- Enhanced `ProjectViewer.jsx` to pass project data to header

# -----------------------------------------------------------------------------

## 10-Oct-2025 - Version 0.0.7 - Download Images Feature
### Features Added
- Download all project images as ZIP file
- Python utility to automatically update project images

# -----------------------------------------------------------------------------

## Previous Versions

### Version 0.0.6
- Star Ratings feature
- Image Carousel improvements

### Version 0.0.5
- Production Data Panel
- Schedule tracking

### Version 0.0.4
- Project Gallery grid view
- Dynamic project loading

### Version 0.0.3
- PIN Authentication system
- Dual Logo Header

### Version 0.0.2
- Landing Page
- Basic project viewer

### Version 0.0.1
- Initial Release
- Basic project structure

# -----------------------------------------------------------------------------

