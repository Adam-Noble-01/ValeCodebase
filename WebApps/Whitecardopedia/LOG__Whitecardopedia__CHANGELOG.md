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

---

## 10-Dec-2025 - Major Update - Version 0.2.8 - Deep Linking & Shareable URLs

### Features Added
- ✅ **Deep Link URL System** - Direct links to specific projects using URL structure `projects2025/[projectCode]`
- ✅ **Share Link Button** - Copy project URL to clipboard with visual feedback (checkmark animation)
- ✅ **URL Manifest Generation** - Python build script automatically generates `urlManifest.json` mapping project codes to folder IDs
- ✅ **Browser History Integration** - Back/forward navigation works correctly with deep links
- ✅ **Absolute Path Resolution** - All asset paths converted to absolute URLs for deep link compatibility

### Technical Changes
- Added `projectUrlHelper.js` utility module for URL generation and parsing
- Enhanced `App.jsx` with deep link detection on mount and browser history API integration
- Extended `projectLoader.js` with URL manifest loading and project lookup by code
- Updated Flask server (`server.py`) with explicit route handler for deep link URLs (`/projects<year>/<project_code>`)
- Converted all relative asset paths to absolute paths in components and HTML
- Added ShareButton component to Header bar (positioned next to Back to Gallery button)

### Files Modified
- `server.py` - Added deep link route handler
- `src/components/App.jsx` - Added URL routing and deep link detection
- `src/components/Header.jsx` - Integrated ShareButton component
- `src/components/ProjectViewer.jsx` - Removed ShareButton from body (moved to header)
- `src/data/projectLoader.js` - Added URL manifest loading and project lookup by code
- `src/utils/projectUrlHelper.js` - New utility module for URL operations
- `src/components/ShareButton.jsx` - New component for clipboard functionality
- `src/styles/app.css` - Added ShareButton styling and header button group layout
- `app.html` - Updated script imports and converted paths to absolute
- `Tools__DevUtils/AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__Main__.py` - Added URL manifest generation

### Files Created
- `src/data/urlManifest.json` - Auto-generated manifest mapping project codes to URLs
- `src/utils/projectUrlHelper.js` - URL helper utility module
- `src/components/ShareButton.jsx` - Share link button component

### URL Structure
- Format: `{{BaseURL}}/projects2025/55876` where `55876` is the project code
- Examples:
  - `http://localhost:8000/projects2025/62108`
  - `https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/projects2025/55876`

---

## 10-Oct-2025 - Version 0.0.7 - Download Images Feature

### Features Added
- ✅ **Download Images** - Download all project images as ZIP file
- ✅ **Image Auto-Discovery** - Python utility to automatically update project images

---

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

---

**Last Updated**: 10-Dec-2025

