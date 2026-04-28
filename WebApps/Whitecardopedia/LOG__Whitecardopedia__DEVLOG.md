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

**Last Updated**: 28-Apr-2026

