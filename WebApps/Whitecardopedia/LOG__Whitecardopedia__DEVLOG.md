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

