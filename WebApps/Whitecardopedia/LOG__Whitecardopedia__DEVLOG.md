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

---

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

---

## 10-Oct-2025 - Version 0.0.7 - Download Images Feature
### Features Added
- Download all project images as ZIP file
- Python utility to automatically update project images

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

**Last Updated**: 24-Feb-2026

