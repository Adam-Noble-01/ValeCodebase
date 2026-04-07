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

**Last Updated**: 07-Apr-2026

