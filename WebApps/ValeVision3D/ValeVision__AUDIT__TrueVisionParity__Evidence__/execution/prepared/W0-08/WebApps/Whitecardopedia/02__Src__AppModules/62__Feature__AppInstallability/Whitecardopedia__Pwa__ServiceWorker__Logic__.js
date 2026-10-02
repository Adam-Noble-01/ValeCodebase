// =============================================================================
// WHITECARDOPEDIA - PWA SERVICE WORKER LOGIC
// =============================================================================
//
// FILE       : Whitecardopedia__Pwa__ServiceWorker__Logic__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__Pwa__ServiceWorker__Logic
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Caching brain of the Whitecardopedia + ValeVision3D PWA
// CREATED    : 2026
//
// DESCRIPTION:
// - Loaded via importScripts() from the WebApps-level stub so this file can
//   live alongside the rest of the install module set without sacrificing
//   the broad service-worker scope required to cover both apps.
// - Cache buckets:
//     * wpwa-shell-<token>     : HTML / CSS / JSX / JS / manifest / fonts / icons /
//                                HDRI (stale-while-revalidate on deployed origins,
//                                network-first on localhost; HTML network-first)
//     * wpwa-data-<token>      : project.json / masterConfig.json / app config /
//                                DataLib JSON (network-first)
//     * wpwa-thumbs-<asset>    : 524p gallery thumbnail images
//                                (stale-while-revalidate, capped)
//     * wpwa-models-<asset>    : GLB / GLTF models (network-first with a
//                                slow-network grace window, capped)
//     * wpwa-images-<asset>    : ValeVision3D sheet pictures, filed under
//                                05__Layout__DrawingDocs__Images (cache-first,
//                                capped: each name carries its content hash)
//     * wpwa-published-<asset> : ValeVision3D published drawings, under
//                                06__Layout__PublishedDocuments (hashed files
//                                cache-first, capped; the index, manifests and
//                                element files network-first; PDFs not cached)
// - Full-resolution IMG##__* project images are intentionally NOT cached so
//   the project view always shows the latest delivered art.
// - TWO TOKENS. PWA_SW_VERSION_TOKEN (<token>) names the shell and data
//   buckets; PWA_SW_ASSET_VERSION_TOKEN (<asset>) names the other four. The
//   activate step deletes every owned bucket that is not current, so a shell
//   bump evicts the shell and data buckets only. Nothing in the other four can
//   go stale with a shell change - models are network-first, thumbnails
//   refresh in the background, pictures and published files carry their
//   content hash - so a shell bump no longer re-downloads every client's
//   models. Bump the asset token only to empty those four on purpose.
// - TOKEN RULE (ValeVision3D parity plan, decision DR-07, the default in
//   force from 01-Oct-2026): no feature change edits or bumps this worker.
//   Adam bumps PWA_SW_VERSION_TOKEN at deploy - once per deployed
//   ValeVision3D wave or Whitecardopedia release - with one log line naming
//   the versions it covers. A deploy needs it whenever a warm client could
//   hold half of a change: a module renamed or moved, an export renamed or
//   newly imported by name, a changed stylesheet or index.html dependency.
// - The app also evicts the thumbnail and data buckets on its own when the
//   shared R2 build-version manifest reports a newer build (see
//   ProjectLoader). The images and published buckets never need that: their
//   files are content-hashed or network-first, so an editor save that writes
//   them needs no build-manifest bump.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.17
// - NOT BUMPED: PWA_SW_VERSION_TOKEN stays 2026-09-18-1. Prepared for the
//   ValeVision3D TrueVision-parity programme (package W0-08) and left for
//   Adam to deploy with a shell bump (TOKEN RULE above). Deploy it with or
//   before the ValeVision3D drawing-folder renumber: a warm client holding
//   the old loading sequence beside the new index.html cannot link the app.
// - TOKEN SPLIT. PWA_SW_ASSET_VERSION_TOKEN - also 2026-09-18-1, so no bucket
//   changes name - now names the thumbs and models buckets and the two new
//   ones below. The activate step keeps all six current buckets: it used to
//   delete the CURRENT models bucket on every activation, because its
//   keep-list named only shell, thumbs and data.
// - Stale-while-revalidate refreshes with fetch(request, { cache:
//   'no-cache' }), from TrueVision3D's worker logic 1.9.54 (29-Sep-2026). A
//   plain fetch(request) took the browser's own HTTP-cache copy, fresh for
//   the host's max-age after the last download, and wrote it back as new, so
//   a browser that had loaded the app before a deploy kept running the old
//   modules for that long - through a token bump too, since a new bucket
//   fills its misses through the same fetch. The revalidation is a
//   conditional request, answered 304 with no body when nothing changed.
// - PRECACHE. The ten ValeVision3D Layout Editor stylesheets that are linked
//   lazily - the editor loader's eight and the Custom and Parametric
//   Scrapbook panels' own - join the shell list, so the token governs them
//   and a deploy reaches them on the first load (TrueVision3D precaches its
//   lazily linked sheets for the same reason). The DistanceCulling entry
//   follows the module to 05__RenderPipeline/ (ValeVision3D renumber); the
//   old 02__Engine__MaxEngine/ path no longer exists.
// - Two new buckets, after TrueVision3D's tv-images (1.9.15) and
//   tv-published (1.9.42): wpwa-images for sheet pictures (cache-first,
//   capped at 160 - a .png picture no longer lands in the uncapped shell
//   bucket) and wpwa-published for published drawings (hashed files
//   cache-first, capped at 240; the index, manifests and element files
//   network-first; PDFs left to the browser). Both are classified before
//   every older pattern - their folders hold nothing else - and both are
//   owned, kept by the activate step and cleared by wpwa-clear-caches.
// - Gallery thumbnail, full-image, data, model, HDRI and HTML rules, and the
//   localhost shell rule, are unchanged.
//
// 18-Sep-2026 - Version 1.0.16
// - Token bumped (2026-09-18-1): unpkg.com started answering the React,
//   ReactDOM and Babel standalone requests with 500s and no CORS header, so
//   app.html and ValeVision3D__ProductionKpi__.html loaded no React at all and
//   died on ReactDOM.createRoot. Both pages now load those three from
//   cdnjs.cloudflare.com, pinned to 18.3.1 / 18.3.1 / 7.29.7, each followed by
//   an inline document.write fallback to jsdelivr if the global is still
//   missing. A deployed origin answering app.html from the old shell cache
//   would keep asking unpkg, so the shell has to be evicted.
//
// 16-Sep-2026 - Version 1.0.15
// - Token bumped (2026-09-16-7): the container-level z-index bump wasn't
//   enough - the active card's blue ring was still rendering behind the
//   prev/next chevron buttons (same stacking context, sibling elements).
//   Gave .na-pm-carousel__nav and .na-pm-carousel__cards their own
//   position:relative + z-index so the cards wrapper unconditionally paints
//   above the nav buttons.
//
// 16-Sep-2026 - Version 1.0.14
// - Token bumped (2026-09-16-6): scene carousel z-index raised from 1000 to
//   1004 so the active card's blue ring never renders behind the nav toolbar,
//   header, or help panel.
//
// 16-Sep-2026 - Version 1.0.13
// - Token bumped (2026-09-16-5): card pop animation toned down from scale(1.12)
//   to scale(1.06) - the original was too strong.
//
// 16-Sep-2026 - Version 1.0.12
// - Token bumped (2026-09-16-4): scene carousel now flashes its wake/opaque
//   state on PageUp/PageDown and the number-key scene-jump hotkeys (not just
//   clicks), and the newly active card plays a scale-up "pop" animation on
//   click, touch, or hotkey. Changes the scene carousel module and its
//   stylesheet.
//
// 16-Sep-2026 - Version 1.0.11
// - Token bumped (2026-09-16-3): ValeVision3D hotkey remap - number keys 1-9
//   now jump to that position in the current presentation scene group, Walk
//   and Fly moved to T/Y, Orbit/Reset moved to B/R. Changes index.html, the
//   hotkeys dictionary JSON, and the scene carousel module.
//
// 16-Sep-2026 - Version 1.0.10
// - Token bumped (2026-09-16-2): ValeVision3D v2.48.1 changes the progressive
//   renderer's settle trigger and the loading sequence that drives it. No new
//   files, so this is a shell cache eviction only.
//
// 16-Sep-2026 - Version 1.0.9
// - Token bumped (2026-09-16-1): ValeVision3D v2.48.0 adds the progressive
//   renderer, which brings two new modules under 05__RenderPipeline and changes
//   index.html, the loading sequence, the MaxEngine setup, the supersampler,
//   the profile-lines Dev control and the dropdown stylesheet. A deployed
//   origin answering the shell from the old cache would run the previous loop
//   against the new index.html and never load either new module.
// - Both new modules join the shell pre-cache, and so does the supersampler:
//   it used to load only when a video export asked for it and is now on the
//   startup path, because the progressive renderer imports it.
//
// 15-Sep-2026 - Version 1.0.8
// - Token bumped (2026-09-15-2): every ValeVision Layout Editor module moved
//   into numbered subfolders of 51__System__LayoutEditor (v2.47.0), so their
//   URLs changed, and index.html, the CSS index and RenameDrawing now name the
//   new paths. A deployed origin answering those three from the old shell
//   cache would ask for files that are no longer there. Also covers v2.45.1
//   and v2.46.0 (Viewport panel, mode controller, the new ThumbnailBake
//   module and both drawing Dev editors), and v2.47.1 (index.html's shadow
//   map type and the sharpen effect's readback buffers).
//
// 15-Sep-2026 - Version 1.0.7
// - Localhost shell assets (JS, CSS) are network-first, revalidated with
//   cache:'no-cache', instead of stale-while-revalidate. A module edited in
//   place was served from the shell cache at its old version while a module
//   the cache had never seen arrived fresh from disk, and the mixed graph
//   failed to link: ValeVision's Na__LayoutEditor__ModelLayers__ threw "does
//   not provide an export named Na__ModelToggle__GetCategoryKeys" until a
//   reload had let the background refresh land. Deployed origins keep
//   stale-while-revalidate and rely on the token below.
// - Token bumped (2026-09-15-1) for the same fault on deployed origins (the
//   token had not moved since 11-Sep while ValeVision modules changed), and
//   for the ValeVision Layout Editor loading on first use (new Loader,
//   LoadingScreen and Boot stylesheet; TabStrip, DevMenu, ModeController,
//   RenameDrawing, index.html and the CSS index edited).
//
// 11-Sep-2026 - Version 1.0.6
// - Token bumped again (2026-09-11-1) for ValeVision per-scene and per-keyframe navigation modes (new Switcher module, Video Studio and Presentation Mode edits).
// - Token bumped again (2026-09-11-2) for ValeVision per-keyframe door animation (Video Studio, door proximity and door animation modules).
// - Token bumped again (2026-09-11-3) for ValeVision supersampled video export anti-aliasing (Video Studio, new Supersampler module, both render engines).
// - Token bumped again (2026-09-11-4) for the ValeVision Layout Mode switch (Layout Editor tab strip, mode controller, Dev section, drawings data).
// - Token bumped again (2026-09-11-5) for the ValeVision Video Studio anti-aliasing default raised to 16x (VideoData module).
//
// 10-Sep-2026 - Version 1.0.5
// - Token bumped again (2026-09-10-2) for the ValeVision clipper2-js vendoring (import map in index.html).
// - Token bumped again (2026-09-10-3) for the ValeVision Layout Editor context menu styles and help text (index.html, Styles__Main).
// - Token bumped again (2026-09-10-4) for the ValeVision Layout Editor grips, draw tool and help text (index.html, Styles__Main).
// - Token bumped again (2026-09-10-5) for the ValeVision Layout Editor raster select styles (Styles__Main).
// - Token bumped again (2026-09-10-6) for the ValeVision Layout Editor title block rebuild (title block, sheet chrome, layout, config).
// - Token bumped again (2026-09-10-7) for the ValeVision Layout Editor vector fills and the arrow key axis lock (index.html, Styles__Main, new AxisLock module).
// - Token bumped again (2026-09-10-1) for the ValeVision port Phase 5 shell edits (index.html, CSS index, header offsets).
// 09-Sep-2026 - Version 1.0.4
// - Token bumped again (2026-09-09-4) for the ValeVision port Phase 4 shell edits (index.html, CSS index).
// - Token bumped again (2026-09-09-3) for the ValeVision port Phase 3 shell edits (index.html, CSS index).
// - Token bumped again (2026-09-09-2) for the ValeVision port Phase 2 shell edits (index.html, CSS index).
// - PWA_SW_VERSION_TOKEN bumped to 2026-09-09-1 (ValeVision3D v2.16.0: three r184
//   version-locked vendor set; import map and shell precache paths moved from
//   04__Lib__ThirdParty__Three to 04__Lib__ThirdParty__VersionLocked, and
//   three.core.js added to the precache because three.module.js now imports it).
//
// 19-Aug-2026 - Version 1.0.3
// - PWA_SW_VERSION_TOKEN bumped to 2026-08-19-5 (five approximation passes
//   removed from Export Render Layers).
//
// 19-Aug-2026 - Version 1.0.3
// - PWA_SW_VERSION_TOKEN bumped to 2026-08-19-4 (Canny is now inverted Line
//   Art, sRGB target reverted, sky-dome exclusion tokens).
//
// 19-Aug-2026 - Version 1.0.3
// - PWA_SW_VERSION_TOKEN bumped to 2026-08-19-3 (Pose removed, Clay rename,
//   Line Art on the composed profile-line path, line weight scale fix).
//
// 19-Aug-2026 - Version 1.0.3
// - PWA_SW_VERSION_TOKEN bumped to 2026-08-19-2 (Export Render Layers colour
//   round-trip fix, measured depth range and bulk selection controls).
//
// 19-Aug-2026 - Version 1.0.3
// - PWA_SW_VERSION_TOKEN bumped to 2026-08-19-1 (ValeVision3D Export Render
//   Layers dev system: new shell JS modules, new stylesheet import and new
//   index.html markup, so the old shell cache must be force-evicted).
//
// 30-Jul-2026 - Version 1.0.3
// - PWA_SW_VERSION_TOKEN bumped to 2026-08-18-2 (legacy SketchUp URL system
//   removed from the viewer, gallery detector and editor).
// - PWA_SW_VERSION_TOKEN bumped to 2026-08-18-1 (Advanced Time Data + Library
//   Overview panel: new AppUtils module, app.html + stylesheet changes).
// - PWA_SW_VERSION_TOKEN bumped to 2026-07-30-3 (Advanced Hotkeys help panel).
//
// 30-Jul-2026 - Version 1.0.2
// - PWA_SW_VERSION_TOKEN bumped to 2026-07-30-2 (fog forcefield per-frame gate +
//   case-insensitive letter hotkeys).
//
// 30-Jul-2026 - Version 1.0.1
// - PWA_SW_VERSION_TOKEN bumped to 2026-07-30-1 (force shell cache eviction after
//   ValeVision3D Alt+Shift+F fog/forcefield hotkey + FogPlane SystemLogic coupling).
//
// 2026 - Version 1.0.0
// - Initial PWA service worker with shell / thumbs / data / models cache buckets.
//
// 09-Jul-2026 - Version 1.5.2
// - PWA_SW_VERSION_TOKEN bumped to 2026-07-09-1 (force shell cache eviction after
//   ValeVision3D v2.9.11 WYSIWYG export line width compensation — updated
//   LineworkSettings state, ProfileLines effect, and tiled export renderer).
//
// 08-Jul-2026 - Version 1.5.1
// - PWA_SW_VERSION_TOKEN bumped to 2026-07-08-2 (force shell cache eviction after
//   ValeVision3D v2.9.9 tiled static export renderer rebuild — new ImageExport
//   modules, ProfileLines shader uniforms, and Advanced Linework Settings UI
//   must not be shadowed by the stale shell cache).
//
// 08-Jul-2026 - Version 1.5.0
// - PWA_SW_VERSION_TOKEN bumped to 2026-07-08-1 (force full cache eviction —
//   NetworkFirst now fetches with cache:'no-store' so "network-first" for
//   project.json/masterConfig/HTML can never be quietly satisfied by the
//   browser's own HTTP disk cache; without this, an editor save's fresh R2
//   write could still be shadowed by a stale disk-cached response that no
//   Cache-Storage-level "clear cache" action could ever reach).
//
// 02-Jul-2026 - Version 1.4.1
// - PWA_SW_VERSION_TOKEN bumped to 2026-07-02-2 (force shell cache eviction after
//   the Scene Entourage 2D billboard naming/toggle changes; ValeVision3D shell JS
//   -- Na__UiFeature__ModelToggle__Controls.js and Na__ModelLoader__MultiModel.js --
//   was stuck serving the old "Scene Context" / "SiteEntourage2D" cached copy under
//   the stale-while-revalidate JS/CSS strategy).
//
// 02-Jul-2026 - Version 1.4.0
// - PWA_SW_VERSION_TOKEN bumped to 2026-07-02-1 (force shell cache eviction after
//   the manifest gained "handle_links": "preferred" and an explicit "id": "/";
//   ensures browsers re-read the updated manifest rather than a stale cached copy).
//
// 01-Jul-2026 - Version 1.3.0
// - PWA_SW_VERSION_TOKEN bumped to 2026-07-01-1 (force shell cache eviction after
//   the gallery filter drawer responsive reflow fix; ensures the corrected
//   Na__CoreUi__Styles__App__.css and the FilterPanel drawer styling are served
//   fresh to older/narrow webviews still holding a pre-FilterPanel shell cache).
//
// 26-Jun-2026 - Version 1.2.0
// - PWA_SW_VERSION_TOKEN bumped to 2026-06-26-1 (force shell cache eviction after
//   designer/artist filter feature; ensures FilterControls.jsx, updated Main.jsx,
//   and ProjectLoader loadOptionsListFromFile changes are served fresh to all users).
//
// 25-Jun-2026 - Version 1.1.0
// - PWA_SW_VERSION_TOKEN bumped to 2026-06-25-2 (force shell cache eviction after
//   ProjectLoader R2-first changes; avoids stale double-reload for users).
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Cache Configuration
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Cache Identifiers and Limits
    // ------------------------------------------------------------
    const PWA_SW_VERSION_TOKEN              = '2026-09-18-1';                                                                       // <-- SHELL TOKEN: names the shell and data buckets. Adam bumps it at deploy, once per deployed wave, with a log line naming the versions covered (TOKEN RULE in the header), whenever shell JS/CSS changes in a way a warm client could hold half of.
    const PWA_SW_ASSET_VERSION_TOKEN        = '2026-09-18-1';                                                                       // <-- ASSET TOKEN: names the thumbs, models, images and published buckets, which a shell bump leaves alone. Bump only to empty them on purpose (every client re-downloads its models).
    const PWA_SW_CACHE_NAME_SHELL           = `wpwa-shell-${PWA_SW_VERSION_TOKEN}`;                                                 // <-- App shell cache id
    const PWA_SW_CACHE_NAME_THUMBS          = `wpwa-thumbs-${PWA_SW_ASSET_VERSION_TOKEN}`;                                          // <-- Gallery thumbnail cache id
    const PWA_SW_CACHE_NAME_DATA            = `wpwa-data-${PWA_SW_VERSION_TOKEN}`;                                                  // <-- Project JSON cache id
    const PWA_SW_CACHE_NAME_MODELS          = `wpwa-models-${PWA_SW_ASSET_VERSION_TOKEN}`;                                          // <-- Model GLB cache id (network-first, offline fallback)
    const PWA_SW_CACHE_NAME_IMAGES          = `wpwa-images-${PWA_SW_ASSET_VERSION_TOKEN}`;                                          // <-- ValeVision3D sheet pictures cache id (content-hashed names, cache-first)
    const PWA_SW_CACHE_NAME_PUBLISHED       = `wpwa-published-${PWA_SW_ASSET_VERSION_TOKEN}`;                                       // <-- ValeVision3D published drawings cache id (hashed files cache-first, JSON network-first)
    const PWA_SW_CACHE_PREFIXES_OWNED       = ['wpwa-shell-', 'wpwa-thumbs-', 'wpwa-data-', 'wpwa-models-', 'wpwa-images-', 'wpwa-published-']; // <-- Owned cache prefixes (for cleanup)
    const PWA_SW_THUMBS_MAX_ENTRIES         = 256;                                                                                  // <-- LRU cap on thumbnail cache
    const PWA_SW_MODELS_MAX_ENTRIES         = 36;                                                                                   // <-- LRU cap on model cache (GLBs are large; ~3-6 projects worth)
    const PWA_SW_IMAGES_MAX_ENTRIES         = 160;                                                                                  // <-- LRU cap on the sheet pictures cache (a CGI is a few MB; TrueVision3D uses 160)
    const PWA_SW_PUBLISHED_MAX_ENTRIES      = 240;                                                                                  // <-- LRU cap on the published drawings cache (TrueVision3D uses 240)
    const PWA_SW_MODELS_NETWORK_TIMEOUT_MS  = 4000;                                                                                 // <-- Slow-network grace: serve cached model if network exceeds this (fresh copy still refreshes cache in background)
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Path Recognition Patterns
    // ------------------------------------------------------------
    const PWA_SW_PATH_PATTERN_THUMBNAIL     = /__Thumbnail__524p__\.(webp|jpg|jpeg|png)(\?.*)?$/i;                                  // <-- Gallery thumbnail filenames
    const PWA_SW_PATH_PATTERN_FULL_IMAGE    = /\/IMG\d{2}(?:_ART\d{2})?__[^\/]+\.(png|jpg|jpeg|svg|gif|webp)(\?.*)?$/i;             // <-- Full-resolution project images
    const PWA_SW_PATH_PATTERN_PROJECT_JSON  = /\/(project|.+masterConfig.*|.+ValeDesignersList.*|.+ValeConceptArtistsList.*|.+Hotkeys.*|Na__AppConfig.*|Na__DataLib__CoreIndex.*)\.json(\?.*)?$/i;   // <-- Data + app config + DataLib SSOT JSONs
    const PWA_SW_PATH_PATTERN_HTML          = /\.(html?)(\?.*)?$/i;                                                                 // <-- HTML documents
    const PWA_SW_PATH_PATTERN_MODEL_GLB     = /\.(glb|gltf)(\?.*)?$/i;                                                              // <-- 3D model files (R2 CDN + local)
    const PWA_SW_PATH_PATTERN_HDRI          = /\.hdr(\?.*)?$/i;                                                                     // <-- HDR environment maps (immutable, filename-versioned)
    const PWA_SW_PATH_PATTERN_SHELL_ASSET   = /\.(css|js|jsx|mjs|webmanifest|ico|png|svg|woff2?)(\?.*)?$/i;                         // <-- App shell assets
    const PWA_SW_PATH_PATTERN_SHEET_IMAGE   = /\/05__Layout__DrawingDocs__Images\/[^\/]+\/[^\/]+\.(webp|jpe?g|png)(\?.*)?$/i;       // <-- ValeVision3D sheet pictures (immutable: the name carries the content hash)
    const PWA_SW_PATH_PATTERN_PUBLISHED_ASSET = /\/06__Layout__PublishedDocuments\/.+__[0-9a-f]{10}\.(svg|webp|png)(\?.*)?$/i;      // <-- Published baked files and shared images (immutable: content-hashed names)
    const PWA_SW_PATH_PATTERN_PUBLISHED_DATA  = /\/06__Layout__PublishedDocuments\/.+\.json(\?.*)?$/i;                              // <-- Published index, manifests, sheets and element files (fixed names, changed by a re-publish)
    const PWA_SW_PATH_PATTERN_PUBLISHED_PDF   = /\/06__Layout__PublishedDocuments\/.+\.pdf(\?.*)?$/i;                               // <-- Published PDFs (downloaded once: left to the browser)
    const PWA_SW_APP_FOLDER_TOKENS          = ['/Whitecardopedia/', '/ValeVision3D/', '/assets__CommonApplicationAssets/'];          // <-- Folders we manage
    const PWA_SW_REMOTE_ORIGINS_OWNED       = [                                                                                     // <-- Cross-origin hosts we cache (CORS-enabled)
        'https://cdn.noble-architecture.com',                                                                                       // <-- Cloudflare R2 CDN (model GLBs)
        'https://raw.githubusercontent.com'                                                                                         // <-- DataLib SSOT JSONs (MaxEngine materials)
    ];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | App Shell Pre-cache List (Relative to scope)
    // ------------------------------------------------------------
    const PWA_SW_SHELL_PRECACHE_RELATIVE    = [                                                                                     // <-- Best-effort pre-cache list (relative to scope)
        // WHITECARDOPEDIA SHELL
        'Whitecardopedia/app.html',
        'Whitecardopedia/index.html',
        'Whitecardopedia/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css',
        'Whitecardopedia/03__Style__AppStylesheets/Na__CoreUi__Styles__Variables__.css',
        'Whitecardopedia/03__Style__AppStylesheets/Na__CoreUi__Styles__App__.css',
        'Whitecardopedia/03__Style__AppStylesheets/Na__UiFeature__Styles__ImageCarouselOverlay__.css',
        'Whitecardopedia/03__Style__AppStylesheets/Na__UiFeature__Styles__Tools__.css',
        'Whitecardopedia/03__Style__AppStylesheets/Na__UiFeature__Styles__TimeAnalysis__.css',
        'Whitecardopedia/03__Style__AppStylesheets/Na__UiFeature__Styles__Blockoutopedia__.css',
        'Whitecardopedia/03__Style__AppStylesheets/Na__UiFeature__Styles__PwaInstallability__.css',
        'Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__Manifest__.webmanifest',
        'Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Na__AppInstallability__Icon__192x192.png',
        'Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Na__AppInstallability__Icon__512x512.png',
        // VALEVISION3D SHELL + CONFIG (mandatory for boot; boot hangs without these)
        'ValeVision3D/index.html',
        'ValeVision3D/02__Src__AppModules/02__AppData/Na__AppConfig__Main.json',
        'ValeVision3D/02__Src__AppModules/02__AppData/Na__AppConfig__MaterialsLibrary.json',
        // VALEVISION3D HDRI ENVIRONMENT (MaxEngine reflections ? optimised 1024p, 1.46 MB)
        'ValeVision3D/01__AppAssets__ValeVision/05__AppAssets__SkyDomes/HdriSkydome__RuralLandscape__AutumnField__SunnyDay__OptimisedVersion__1024p__.hdr',
        // VALEVISION3D VENDORED THREE.JS (full dependency graph ? every relative import must be present)
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/build/three.module.js',

        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/build/three.core.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/controls/OrbitControls.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/lines/Line2.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/lines/LineGeometry.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/lines/LineMaterial.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/lines/LineSegments2.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/lines/LineSegmentsGeometry.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/loaders/GLTFLoader.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/loaders/RGBELoader.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/postprocessing/EffectComposer.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/postprocessing/MaskPass.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/postprocessing/Pass.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/postprocessing/RenderPass.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/postprocessing/ShaderPass.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/shaders/CopyShader.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/shaders/FXAAShader.js',
        'ValeVision3D/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0/examples/jsm/utils/BufferGeometryUtils.js',
        // VALEVISION3D STYLESHEETS
        'ValeVision3D/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css',
        'ValeVision3D/03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css',
        'ValeVision3D/03__Style__AppStylesheets/Na__UiFeature__Styles__NavigationToolbar__.css',
        'ValeVision3D/03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css',
        // VALEVISION3D LAYOUT EDITOR STYLESHEETS - LINKED LAZILY, PRECACHED ON PURPOSE
        // Not boot-critical: the Layout Editor loader links its eight sheets the first
        // time a drawing opens, and the Custom and Parametric Scrapbook panels link
        // their own on first use. Off this list they are ordinary shell requests, and
        // away from localhost the shell is stale-while-revalidate, so the FIRST load
        // after a deploy painted the editor with the previous release's sheet.
        // Precached, the token governs them like everything else and a bump evicts
        // them outright (TrueVision3D precaches its lazily linked sheets for the same
        // reason). Every sheet a later release links lazily joins this group.
        'ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css',
        'ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css',
        'ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css',
        'ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css',
        'ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css',
        'ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Notes__.css',
        'ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Read__.css',
        'ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/80__Feature__WebViewer/Na__LayoutEditor__Styles__WebViewer__.css',
        'ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/56__Feature__ScrapbookCustom/Na__LayoutEditor__Styles__ScrapbookCustom__.css',
        'ValeVision3D/02__Src__AppModules/51__System__LayoutEditor/57__Feature__ScrapbookParametric/Na__LayoutEditor__Styles__ScrapbookParametric__.css',
        // VALEVISION3D APP CORE MODULES
        'ValeVision3D/02__Src__AppModules/01__AppCore/Na__AppConfig__Loader.js',
        'ValeVision3D/02__Src__AppModules/01__AppCore/AppCore__DataLib__Loader.js',
        'ValeVision3D/02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js',
        'ValeVision3D/02__Src__AppModules/01__AppCore/Na__AppCore__GpuLifecycle__.js',
        'ValeVision3D/02__Src__AppModules/01__AppCore/Na__AppCore__LoadWatchdog__.js',
        'ValeVision3D/02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js',
        'ValeVision3D/02__Src__AppModules/03__AppUtils/Na__AppUtils__ResilientLoad__.js',
        'ValeVision3D/02__Src__AppModules/04__MathUtils/Na__Math__Units.js',
        // VALEVISION3D RENDER PIPELINE
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/01__Engine__PureEngine/Na__RenderPipeline__PureEngine__Setup.js',
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/02__Engine__MaxEngine/Na__RenderPipeline__MaxEngine__Setup.js',
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js',
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProfileLines__.js',
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js',
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__Supersampler__.js',
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/Na__RenderEngine__State.js',
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__Invalidation.js',
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/Na__UiFeature__RenderEngine__Controls.js',
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/Na__UiFeature__VisualEffects__Controls.js',
        // VALEVISION3D SCENE + MODEL LOADER
        'ValeVision3D/02__Src__AppModules/06__Scene__LightingEffects/Na__Scene__DefaultSceneLighting.js',
        'ValeVision3D/02__Src__AppModules/07__Scene__EnvironmentEffects/Na__RenderEffect__AmbientOcclusion__.js',
        'ValeVision3D/02__Src__AppModules/07__Scene__EnvironmentEffects/Na__RenderEffect__AmbientOcclusion__Shader.js',
        'ValeVision3D/02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js',
        // VALEVISION3D NAVIGATION + CAMERAS
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__Camera__ProjectStartState.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__IpadControls.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__MouseControls.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__NavigationModes__State.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__FlyMode__SystemLogic.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationToolbar__Controls.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationHelpPanel__Controls.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__WalkModeControls.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__FlyModeControls.js',
        'ValeVision3D/02__Src__AppModules/11__CameraUtils/Na__UiFeature__CameraPosition__Controls.js',
        'ValeVision3D/02__Src__AppModules/11__CameraUtils/Na__UiFeature__CameraLens__Controls.js',
        'ValeVision3D/02__Src__AppModules/11__CameraUtils/Na__UiFeature__SaveCameraSettings.js',
        // VALEVISION3D MATERIALS + INTERACTIONS + SYSTEMS
        'ValeVision3D/02__Src__AppModules/20__System__MaterialsSystem/Na__MaterialsSystem__LibraryLoader.js',
        'ValeVision3D/02__Src__AppModules/20__System__MaterialsSystem/Na__MaterialsSystem__MaterialSwap.js',
        'ValeVision3D/02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js',
        'ValeVision3D/02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js',
        'ValeVision3D/02__Src__AppModules/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js',
        'ValeVision3D/02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__SystemLogic.js',
        'ValeVision3D/02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__UiControls.js'
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helper Utilities
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Scope Origin Path Prefix
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Logic__GetScopePathPrefix() {
        const scopeUrl          = new URL(self.registration && self.registration.scope ? self.registration.scope : self.location.href);   // <-- Parse scope URL
        const pathPrefix        = scopeUrl.pathname.endsWith('/') ? scopeUrl.pathname : `${scopeUrl.pathname}/`;                    // <-- Ensure trailing slash
        return pathPrefix;                                                                                                          // <-- Path-only prefix
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Determine if URL is Inside Owned App Folders
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Logic__IsOwnedRequest(requestUrl) {
        try {
            const targetUrl     = new URL(requestUrl);                                                                              // <-- Parse target URL
            if (PWA_SW_REMOTE_ORIGINS_OWNED.indexOf(targetUrl.origin) !== -1) return true;                                          // <-- Trusted CORS-enabled remote hosts (R2 CDN models, DataLib SSOT)
            if (targetUrl.origin !== self.location.origin) return false;                                                            // <-- Skip all other cross-origin
            const pathname      = targetUrl.pathname;                                                                               // <-- Path-only segment
            return PWA_SW_APP_FOLDER_TOKENS.some(token => pathname.indexOf(token) !== -1);                                          // <-- Match against owned folders
        } catch (error) {
            return false;                                                                                                           // <-- Treat parse failures as not-owned
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Classify Request for Cache Routing
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Logic__ClassifyRequest(request) {
        const requestUrl        = request.url || '';                                                                                // <-- Snapshot URL

        // ValeVision3D's sheet pictures and published drawings are tested FIRST.
        // Their folders hold nothing else, so no gallery file can match them, and
        // the older patterns would misfile them: a .png or .svg is a shell asset
        // (the uncapped shell bucket) and a picture named IMG01__... a full image.
        if (PWA_SW_PATH_PATTERN_SHEET_IMAGE.test(requestUrl)) return 'sheet-image';                                                 // <-- Content-hashed: download once
        if (PWA_SW_PATH_PATTERN_PUBLISHED_ASSET.test(requestUrl)) return 'published-asset';                                         // <-- Content-hashed: download once
        if (PWA_SW_PATH_PATTERN_PUBLISHED_DATA.test(requestUrl)) return 'published-data';                                           // <-- Fixed names: network first
        if (PWA_SW_PATH_PATTERN_PUBLISHED_PDF.test(requestUrl)) return 'published-pdf';                                             // <-- Left to the browser

        if (PWA_SW_PATH_PATTERN_THUMBNAIL.test(requestUrl)) return 'thumbnail';                                                     // <-- Gallery thumbnail
        if (PWA_SW_PATH_PATTERN_FULL_IMAGE.test(requestUrl)) return 'full-image';                                                   // <-- Full-resolution image
        if (PWA_SW_PATH_PATTERN_MODEL_GLB.test(requestUrl)) return 'model';                                                         // <-- 3D model GLB/GLTF
        if (PWA_SW_PATH_PATTERN_HDRI.test(requestUrl)) return 'hdri';                                                               // <-- HDR environment map
        if (PWA_SW_PATH_PATTERN_PROJECT_JSON.test(requestUrl)) return 'data';                                                       // <-- Project / config / DataLib JSON
        if (PWA_SW_PATH_PATTERN_HTML.test(requestUrl)) return 'html';                                                               // <-- HTML document
        if (PWA_SW_PATH_PATTERN_SHELL_ASSET.test(requestUrl)) return 'shell';                                                       // <-- Shell asset
        return 'other';                                                                                                             // <-- Fall through
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Trim Cache to Maximum Entry Count
    // ---------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Logic__TrimCacheLru(cacheName, maxEntries) {
        try {
            const cacheInstance = await caches.open(cacheName);                                                                     // <-- Open cache
            const allRequests   = await cacheInstance.keys();                                                                       // <-- List entries
            const overflowCount = allRequests.length - maxEntries;                                                                  // <-- Compute overflow
            if (overflowCount <= 0) return;                                                                                         // <-- Nothing to do

            for (let entryIndex = 0; entryIndex < overflowCount; entryIndex += 1) {
                await cacheInstance.delete(allRequests[entryIndex]);                                                                // <-- Drop oldest entries first
            }
        } catch (error) {
            console.warn('Whitecardopedia PWA SW LRU trim failed:', error);                                                         // <-- Non-blocking log
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cache Strategies
// -----------------------------------------------------------------------------

    // FUNCTION | Cache First Strategy
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Logic__CacheFirst(request, cacheName) {
        const cacheInstance     = await caches.open(cacheName);                                                                     // <-- Open named cache
        const cachedResponse    = await cacheInstance.match(request);                                                               // <-- Lookup cached entry
        if (cachedResponse) return cachedResponse;                                                                                  // <-- Cache hit -> return immediately

        try {
            const networkResponse = await fetch(request);                                                                           // <-- Network fetch
            if (networkResponse && networkResponse.ok) {
                cacheInstance.put(request, networkResponse.clone()).catch(() => {});                                                // <-- Persist clone (best-effort)
            }
            return networkResponse;                                                                                                 // <-- Return live response
        } catch (error) {
            return Response.error();                                                                                                // <-- Fail closed when offline + uncached
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Cache First, Capped
    // ------------------------------------------------------------
    // Cache first for content that can never change under its name - a sheet
    // picture or a published file whose name ends in its content hash - with
    // the bucket trimmed back to its cap after each new entry lands. The plain
    // fetch is right here: the browser's own copy of such a file is never stale.
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Logic__CacheFirstCapped(request, cacheName, maxEntries) {
        const cacheInstance     = await caches.open(cacheName);                                                                     // <-- Open named cache
        const cachedResponse    = await cacheInstance.match(request);                                                               // <-- Lookup cached entry
        if (cachedResponse) return cachedResponse;                                                                                  // <-- Cache hit -> return immediately

        try {
            const networkResponse = await fetch(request);                                                                           // <-- Network fetch
            if (networkResponse && networkResponse.ok) {
                cacheInstance.put(request, networkResponse.clone())
                    .then(() => Whitecardopedia__Pwa__ServiceWorker__Logic__TrimCacheLru(cacheName, maxEntries))                    // <-- Keep the bucket under its cap
                    .catch(() => {});                                                                                               // <-- Best-effort (quota failures must not break the response)
            }
            return networkResponse;                                                                                                 // <-- Return live response
        } catch (error) {
            return Response.error();                                                                                                // <-- Fail closed when offline + uncached
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Stale While Revalidate Strategy
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Logic__StaleWhileRevalidate(request, cacheName) {
        const cacheInstance     = await caches.open(cacheName);                                                                     // <-- Open named cache
        const cachedResponse    = await cacheInstance.match(request);                                                               // <-- Cached entry (may be undefined)

        // cache:'no-cache' makes the background refresh revalidate with the server
        // instead of taking the browser's own HTTP-cache copy, which the host marks
        // fresh for its max-age after the last download. With a plain
        // fetch(request) that copy came back unchanged and was written into this
        // bucket as though it were new, so a browser that had loaded the app
        // before a deploy kept running the old files for that long - through a
        // token bump too, since a new bucket fills its misses through this same
        // fetch. A revalidation is a conditional request, answered 304 with no
        // body when the file has not changed. ('no-store', as NetworkFirst uses,
        // would download every file in full on every load.)
        const networkPromise    = fetch(request, { cache: 'no-cache' }).then((networkResponse) => {                                 // <-- Revalidate with the server, never the HTTP cache
            if (networkResponse && networkResponse.ok) {
                cacheInstance.put(request, networkResponse.clone()).catch(() => {});                                                // <-- Refresh cache in background
            }
            return networkResponse;                                                                                                 // <-- Return live response
        }).catch(() => null);                                                                                                       // <-- Swallow network errors

        return cachedResponse || (await networkPromise) || Response.error();                                                        // <-- Prefer cache, fallback to network, then error
    }
    // ---------------------------------------------------------------


    // FUNCTION | Network First Strategy
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Logic__NetworkFirst(request, cacheName) {
        const cacheInstance     = await caches.open(cacheName);                                                                     // <-- Open named cache

        try {
            // cache:'no-store' overrides the captured Request's own cache mode so a
            // "network-first" strategy can never be quietly satisfied by the browser's
            // HTTP disk cache — it must genuinely hit the network (or origin edge cache
            // honouring its own Cache-Control) every time. Without this, a stale
            // project.json/masterConfig response could sit in the browser's HTTP cache
            // and keep getting written straight back into wpwa-data-* as if it were fresh.
            const networkResponse = await fetch(request, { cache: 'no-store' });                                                    // <-- Try network first, bypassing the browser HTTP cache
            if (networkResponse && networkResponse.ok) {
                cacheInstance.put(request, networkResponse.clone()).catch(() => {});                                                // <-- Refresh cache
            }
            return networkResponse;                                                                                                 // <-- Return live response
        } catch (error) {
            const cachedResponse  = await cacheInstance.match(request);                                                             // <-- Lookup fallback
            if (cachedResponse) return cachedResponse;                                                                              // <-- Serve stale data when offline
            return Response.error();                                                                                                // <-- Fail closed when uncached
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Is This Service Worker Serving a Development Origin?
    // ---------------------------------------------------------------
    // localhost, 127.0.0.1 and 0.0.0.0 are the Flask and static dev servers;
    // *.localhost names are the per-session hosts the preview tools use.
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Logic__IsDevelopmentOrigin() {
        const hostname          = self.location.hostname;                                                                           // <-- The service worker's own origin
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname.endsWith('.localhost');   // <-- Local servers only
    }
    // ---------------------------------------------------------------


    // FUNCTION | Network First, Revalidated Against the Server (Development Shell)
    // ------------------------------------------------------------
    // On a development origin modules are edited in place under the same URL.
    // Stale-while-revalidate there hands the page a MIXED module graph: a file
    // the shell cache holds comes back at its old version while a file the
    // cache has never seen arrives fresh, and an ES module graph that mixes
    // versions fails to link ("does not provide an export named ..."). The
    // next reload works, because the background refresh landed meanwhile,
    // which makes the fault look like a timing error.
    // cache:'no-cache' asks the server every time; an unchanged file comes back
    // as a 304 from the same machine, so nothing is downloaded twice. Offline,
    // or with the local server stopped, the cached copy is still served.
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Logic__NetworkFirstRevalidate(request, cacheName) {
        const cacheInstance     = await caches.open(cacheName);                                                                     // <-- Open named cache

        try {
            const networkResponse = await fetch(request, { cache: 'no-cache' });                                                    // <-- Always ask the server; a 304 costs no body
            if (networkResponse && networkResponse.ok) {
                cacheInstance.put(request, networkResponse.clone()).catch(() => {});                                                // <-- Keep the offline copy current
            }
            return networkResponse;                                                                                                 // <-- The file as it is on disk now
        } catch (error) {
            const cachedResponse  = await cacheInstance.match(request);                                                             // <-- Server unreachable
            if (cachedResponse) return cachedResponse;                                                                              // <-- Serve the last copy
            return Response.error();                                                                                                // <-- Fail closed when uncached
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Network First With Slow-Network Grace (Model GLBs)
    // ------------------------------------------------------------
    // Behaviour contract (model caching strategy):
    //   - Good connection  : fresh network copy always wins; cache refreshed.
    //   - Slow connection  : if the network exceeds the grace timeout AND a
    //                        cached copy exists, the cached model is served
    //                        immediately. The in-flight network fetch still
    //                        completes and refreshes the cache in background,
    //                        so the NEXT load gets the fresh copy.
    //   - Offline          : cached copy served; error only when uncached.
    //   - Cache writes are LRU-trimmed so large GLBs cannot grow unbounded.
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Logic__NetworkFirstWithGrace(request, cacheName, graceTimeoutMs, maxEntries) {
        const cacheInstance     = await caches.open(cacheName);                                                                     // <-- Open named cache
        const cachedResponse    = await cacheInstance.match(request);                                                               // <-- Existing cached copy (may be undefined)

        const networkPromise    = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
                cacheInstance.put(request, networkResponse.clone()).then(() => {
                    Whitecardopedia__Pwa__ServiceWorker__Logic__TrimCacheLru(cacheName, maxEntries);                                // <-- LRU trim after successful put only
                }).catch(() => {});                                                                                                 // <-- Quota failures must not break response
            }
            return networkResponse;                                                                                                 // <-- Live response
        });

        if (!cachedResponse) {
            return networkPromise.catch(() => Response.error());                                                                    // <-- No fallback available; network is the only source
        }

        const graceTimer        = new Promise((resolve) => setTimeout(() => resolve('grace-expired'), graceTimeoutMs));            // <-- Slow-network grace window
        const raceWinner        = await Promise.race([networkPromise.catch(() => 'network-failed'), graceTimer]);                  // <-- First settled outcome wins

        if (raceWinner === 'grace-expired' || raceWinner === 'network-failed') {
            return cachedResponse;                                                                                                  // <-- Serve cache; background fetch still refreshes for next load
        }
        return raceWinner;                                                                                                          // <-- Fresh network response (good connection path)
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lifecycle Event Handlers
// -----------------------------------------------------------------------------

    // EVENT HANDLER | Service Worker Install
    // ------------------------------------------------------------
    self.addEventListener('install', (installEvent) => {
        installEvent.waitUntil((async () => {
            try {
                const shellCache    = await caches.open(PWA_SW_CACHE_NAME_SHELL);                                                   // <-- Open shell cache
                const scopePrefix   = Whitecardopedia__Pwa__ServiceWorker__Logic__GetScopePathPrefix();                             // <-- Resolve scope prefix
                const absoluteUrls  = PWA_SW_SHELL_PRECACHE_RELATIVE.map(relative => `${scopePrefix}${relative}`);                  // <-- Build absolute URLs

                await Promise.all(absoluteUrls.map(async (absoluteUrl) => {
                    try {
                        const response = await fetch(absoluteUrl, { cache: 'reload' });                                             // <-- Force fresh fetch
                        if (response && response.ok) {
                            await shellCache.put(absoluteUrl, response.clone());                                                    // <-- Best-effort precache
                        }
                    } catch (resourceError) {
                        // Silent: missing precache entries should not fail the install
                    }
                }));
            } catch (error) {
                console.warn('Whitecardopedia PWA SW install precache failed:', error);                                             // <-- Non-blocking log
            }
            await self.skipWaiting();                                                                                               // <-- Activate immediately
        })());
    });
    // ---------------------------------------------------------------


    // EVENT HANDLER | Service Worker Activate
    // ------------------------------------------------------------
    self.addEventListener('activate', (activateEvent) => {
        activateEvent.waitUntil((async () => {
            try {
                const keepList      = [                                                                                             // <-- Buckets belonging to this version
                    PWA_SW_CACHE_NAME_SHELL,
                    PWA_SW_CACHE_NAME_DATA,
                    PWA_SW_CACHE_NAME_THUMBS,
                    PWA_SW_CACHE_NAME_MODELS,                                                                                       // <-- Was missing: every activation deleted the current models bucket
                    PWA_SW_CACHE_NAME_IMAGES,
                    PWA_SW_CACHE_NAME_PUBLISHED
                ];

                const allCacheNames = await caches.keys();                                                                          // <-- Enumerate all caches
                await Promise.all(allCacheNames.map(async (cacheName) => {
                    const isOwnedCache  = PWA_SW_CACHE_PREFIXES_OWNED.some(prefix => cacheName.startsWith(prefix));                 // <-- Owned caches only
                    if (!isOwnedCache) return;                                                                                      // <-- Skip foreign caches
                    if (keepList.indexOf(cacheName) !== -1) return;                                                                 // <-- Keep every current bucket
                    await caches.delete(cacheName);                                                                                 // <-- Delete superseded version
                }));
            } catch (error) {
                console.warn('Whitecardopedia PWA SW activate cleanup failed:', error);                                             // <-- Non-blocking log
            }
            await self.clients.claim();                                                                                             // <-- Take control of open clients
        })());
    });
    // ---------------------------------------------------------------


    // EVENT HANDLER | Fetch Routing
    // ------------------------------------------------------------
    self.addEventListener('fetch', (fetchEvent) => {
        const request           = fetchEvent.request;                                                                               // <-- Snapshot request
        if (request.method !== 'GET') return;                                                                                       // <-- Only handle GET
        if (!Whitecardopedia__Pwa__ServiceWorker__Logic__IsOwnedRequest(request.url)) return;                                       // <-- Skip non-owned requests

        const classification    = Whitecardopedia__Pwa__ServiceWorker__Logic__ClassifyRequest(request);                             // <-- Classify request

        if (classification === 'full-image') return;                                                                                // <-- Always network for full-res images

        if (classification === 'sheet-image') {
            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__CacheFirstCapped(                                    // <-- Content-hashed: download once, keep the bucket capped
                request, PWA_SW_CACHE_NAME_IMAGES, PWA_SW_IMAGES_MAX_ENTRIES
            ));
            return;
        }

        if (classification === 'published-asset') {
            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__CacheFirstCapped(                                    // <-- Content-hashed: download once, keep the bucket capped
                request, PWA_SW_CACHE_NAME_PUBLISHED, PWA_SW_PUBLISHED_MAX_ENTRIES
            ));
            return;
        }

        if (classification === 'published-data') {
            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__NetworkFirst(request, PWA_SW_CACHE_NAME_PUBLISHED));     // <-- A re-publish must be seen; the last copy serves offline
            return;
        }

        if (classification === 'published-pdf') return;                                                                             // <-- A baked PDF is downloaded once: left to the browser, never cached

        if (classification === 'thumbnail') {
            fetchEvent.respondWith((async () => {
                const cacheInstance = await caches.open(PWA_SW_CACHE_NAME_THUMBS);
                const cachedThumb   = await cacheInstance.match(request);   // <-- Serve cache immediately if present

                // STALE-WHILE-REVALIDATE | Always refresh in the background so a re-synced
                // thumbnail (same URL) is picked up on the next view rather than locked forever.
                const networkRefresh = fetch(request).then((networkThumb) => {
                    if (networkThumb && networkThumb.ok) {
                        cacheInstance.put(request, networkThumb.clone()).then(() => {
                            // LRU trim only runs after a successful put (L3 fix: not on every request)
                            Whitecardopedia__Pwa__ServiceWorker__Logic__TrimCacheLru(PWA_SW_CACHE_NAME_THUMBS, PWA_SW_THUMBS_MAX_ENTRIES);
                        }).catch(() => {});
                    }
                    return networkThumb;
                }).catch(() => null);                                        // <-- Network failure: keep the cached copy

                if (cachedThumb) return cachedThumb;                         // <-- Fast path: cache now, refresh in background
                const networkThumb = await networkRefresh;                   // <-- Cache miss: wait for the network
                return networkThumb || Response.error();
            })());
            return;
        }

        if (classification === 'model') {
            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__NetworkFirstWithGrace(
                request, PWA_SW_CACHE_NAME_MODELS, PWA_SW_MODELS_NETWORK_TIMEOUT_MS, PWA_SW_MODELS_MAX_ENTRIES                      // <-- Fresh on good connection, cache on slow/offline
            ));
            return;
        }

        if (classification === 'hdri') {
            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__CacheFirst(request, PWA_SW_CACHE_NAME_SHELL));       // <-- Immutable filename-versioned asset; one download per SW version
            return;
        }

        if (classification === 'data') {
            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__NetworkFirst(request, PWA_SW_CACHE_NAME_DATA));      // <-- Network-first JSON (project.json + Na__AppConfig + DataLib SSOT)
            return;
        }

        if (classification === 'html') {
            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__NetworkFirst(request, PWA_SW_CACHE_NAME_SHELL));     // <-- HTML: network-first to prevent stale/module mismatch (C4 fix)
            return;
        }

        if (classification === 'shell') {
            if (Whitecardopedia__Pwa__ServiceWorker__Logic__IsDevelopmentOrigin()) {
                fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__NetworkFirstRevalidate(request, PWA_SW_CACHE_NAME_SHELL)); // <-- Localhost: modules are edited in place, so one load must never mix old and new files
                return;
            }
            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__StaleWhileRevalidate(request, PWA_SW_CACHE_NAME_SHELL)); // <-- JS/CSS: stale-while-revalidate (fast, background refresh)
            return;
        }
    });
    // ---------------------------------------------------------------


    // EVENT HANDLER | Message-Based Cache Reset (Diagnostic)
    // ------------------------------------------------------------
    self.addEventListener('message', (messageEvent) => {
        if (!messageEvent.data || messageEvent.data.type !== 'wpwa-clear-caches') return;                                           // <-- Ignore unrelated messages

        messageEvent.waitUntil((async () => {
            try {
                const ownedCaches   = (await caches.keys()).filter(cacheName => PWA_SW_CACHE_PREFIXES_OWNED.some(prefix => cacheName.startsWith(prefix))); // <-- Owned caches
                await Promise.all(ownedCaches.map(cacheName => caches.delete(cacheName)));                                          // <-- Drop all
                if (messageEvent.source && messageEvent.source.postMessage) {
                    messageEvent.source.postMessage({ type: 'wpwa-cleared', success: true });                                       // <-- Acknowledge
                }
            } catch (error) {
                if (messageEvent.source && messageEvent.source.postMessage) {
                    messageEvent.source.postMessage({ type: 'wpwa-cleared', success: false, error: String(error) });                // <-- Report failure
                }
            }
        })());
    });
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
