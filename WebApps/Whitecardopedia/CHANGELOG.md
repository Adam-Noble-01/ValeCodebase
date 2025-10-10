# Whitecardopedia - Changelog

---

## Version 0.0.6 - October 10, 2025

### 🎉 FIRST MAJOR STABLE RELEASE

**Milestone Release - Full Production Ready Application**

This marks the first complete, stable, production-ready release of Whitecardopedia. All core features are implemented, tested, and deployed with real project data.

---

### 📊 Complete Feature Set

**Core Application Features:**
- ✅ Landing page with Whitecardopedia branding
- ✅ PIN authentication system (secure access control)
- ✅ Dual logo header (Vale Garden Houses + Whitecardopedia)
- ✅ Project gallery with responsive grid layout
- ✅ Project viewer with detailed information display
- ✅ Image carousel with thumbnail navigation
- ✅ Star ratings (Quality, Prestige, Value)
- ✅ Production data panel with metadata
- ✅ Project date formatting with ordinal superscripts
- ✅ SketchUp model linking (conditional display)
- ✅ Responsive design (mobile, tablet, desktop)

**Technical Implementation:**
- 8 React components (App, Header, HomePage, PinEntry, ProjectGallery, ProjectViewer, ImageCarousel, StarRating)
- 2 JavaScript utilities (projectLoader, dateFormatter)
- 1 Python automation utility (image auto-discovery)
- Vale Design Suite styling compliance
- JSON-based configuration system
- Image prefix naming convention (IMG##__)
- Dynamic project loading

**Deployed Content:**
- 4 active real projects deployed
- Multiple project images (PNG format)
- Example project with documentation
- Template project for easy replication

---

### 🏗️ Architecture Summary

**React Components (8):**
- `App.jsx` - Root component with routing logic
- `Header.jsx` - Dual logo persistent header
- `HomePage.jsx` - Landing page with entry button
- `PinEntry.jsx` - PIN authentication modal
- `ProjectGallery.jsx` - Project grid view
- `ProjectViewer.jsx` - Project detail viewer
- `ImageCarousel.jsx` - Image navigation component
- `StarRating.jsx` - Star rating display

**JavaScript Utilities (2):**
- `projectLoader.js` - Project data loading from JSON
- `dateFormatter.js` - Date formatting with ordinal superscripts (1st, 2nd, 3rd, etc.)

**Python Automation (1):**
- `AutomationUtil__UpdateProjectImages__BasedOnImgPrefix__Main__.py` - Automatic image discovery and JSON updating

**Styling:**
- `variables.css` - CSS custom properties (Vale Design Suite standards)
- `app.css` - Main application styles (~800+ lines)
- Regional structure with collapsible code folding
- Column-aligned CSS properties
- Vale blue color scheme (#172b3a)

---

### 📈 Project Statistics

**Files Created**: 28 total files
- 8 React components
- 2 JavaScript utilities
- 2 CSS stylesheets
- 1 Python automation script
- 4 documentation files
- 1 HTML container
- 4 active project folders with metadata
- 4 batch/shell scripts for server launching

**Code Metrics:**
- Total Lines: ~3,500+ lines of code
- React Components: ~1,200 lines
- CSS Styles: ~900 lines
- JavaScript Utilities: ~300 lines
- Python Automation: ~420 lines
- Documentation: ~1,500+ lines

**Active Projects Deployed:**
- 00__ExampleProject (3 images)
- HS-61747__Harris (2 images)
- NY-29951__McNerney (7 images)
- JF-61131__Jolliffe (8 images)

**Total Images**: 20+ project images deployed

---

### 🔐 Security Features

**PIN Authentication System:**
- Modal overlay with 4-digit PIN entry
- Placeholder PIN: `1234` (configurable in `PinEntry.jsx`)
- Numeric-only input validation
- Error handling with shake animation
- Keyboard support (Enter to submit, Escape to cancel)
- Auto-focus on PIN input field
- Prevents unauthorized access to application

---

### 🎨 Design System

**Vale Design Suite Compliance:**
- Regional structure with 77-character dividers
- Function headers with proper object type classification
- 4-space indentation within regions
- Inline `// <--` comments for explanations
- Column-aligned CSS properties
- CSS custom properties for design system
- Dual logo header design
- Vale blue primary color (#172b3a)

---

### 🛠️ Developer Tools

**Image Auto-Discovery Utility:**
- Scans project folders for IMG##__ prefix pattern
- Automatically updates project.json files
- Sorts images by numeric prefix
- Supports multiple formats (png, jpg, jpeg, svg, gif, webp)
- Dry-run mode for safe preview
- Colored console output with status indicators
- Summary report with statistics
- Single project or batch processing modes

**Usage:**
```bash
# Update all projects with confirmation
python AutomationUtil__UpdateProjectImages__BasedOnImgPrefix__Main__.py

# Preview changes only
python AutomationUtil__UpdateProjectImages__BasedOnImgPrefix__Main__.py --dry-run-only

# Update specific project
python AutomationUtil__UpdateProjectImages__BasedOnImgPrefix__Main__.py --project NY-29951__McNerney
```

---

### 📋 JSON Schema

**project.json Structure:**
```json
{
    "projectName": "Project Name",
    "projectCode": "12345",
    "projectDate": "DD-MMM-YYYY",
    "ratings": {
        "quality": 1-5,
        "prestige": 1-5,
        "value": 1-5
    },
    "productionData": {
        "input": "CAD File",
        "duration": 3,
        "additionalNotes": "Notes here"
    },
    "sketchUpModel": {
        "url": "https://app.sketchup.com/share/..."
    },
    "images": ["IMG01__filename.png", "IMG02__filename.png"],
    "description": "Project description"
}
```

---

### 🚀 Deployment Status

**Ready for Production:**
- ✅ All features implemented and tested
- ✅ Real project data deployed
- ✅ Documentation complete
- ✅ GitHub Pages compatible
- ✅ Static hosting ready
- ✅ No build step required
- ✅ Cross-browser compatible

**Hosting:**
- Local development server (Python/Node.js)
- GitHub Pages deployment ready
- Compatible with Netlify, Vercel, AWS S3, Azure Static Web Apps

---

### 🔄 Previous Development History

**Version 1.3.0 - October 10, 2025**

### 🔗 SketchUp Model Link Feature

**Added Conditional SketchUp Model Button**

Enhanced project viewer with optional SketchUp 3D model linking:

**JSON Structure Update:**
- Added new `sketchUpModel` object with `url` field
- Conditional display based on URL validity

**Validation Logic:**
- Button displays ONLY when valid URL provided
- Automatically hides for invalid placeholder values:
  - "nil", "Nil", "None", "False" (case-insensitive)
  - Empty strings
  - Missing `sketchUpModel` object

**UI Features:**
- "SketchUp Model" subhead (same styling as Production Data)
- Full-width action button with Vale blue branding
- Opens model in new tab/window
- Hover effect with lift and shadow
- Positioned below Production Data section

**Files Modified:**
- `ProjectViewer.jsx` - Added `isValidSketchUpUrl` helper function and conditional section
- `app.css` - Added `.project-viewer__model-button` styles (~25 lines)
- `project.json` - Added `sketchUpModel` object
- `README.md` - Updated schema documentation
- `Projects/.../README.md` - Updated example schema with SketchUp link

**New Helper Function:**
```javascript
isValidSketchUpUrl(url) 
// Returns false for nil/none/false/empty values
```

**Usage Examples:**
```json
// Button displays
"sketchUpModel": {
    "url": "https://3dwarehouse.sketchup.com/model/example"
}

// Button hidden (any of these)
"sketchUpModel": { "url": "None" }
"sketchUpModel": { "url": "nil" }
// Or omit sketchUpModel object entirely
```

---

## Version 1.2.0 - October 10, 2025

### 📊 Production Data Fields

**Added Production Information Panel**

Enhanced project data display with new production tracking fields:

**JSON Structure Update:**
- Restructured ratings into nested `ratings` object
- Added new `productionData` object with three fields:
  - `input` - Source material type (e.g., "CAD File", "Hand Sketch")
  - `duration` - Production time in hours (displayed as "X Hours")
  - `additionalNotes` - Free-form production notes

**UI Enhancements:**
- Changed panel title from "Project Ratings" to "Project Data"
- Added "Production Data" subhead with border separator
- New data fields display below star ratings
- Clean, structured layout with uppercase labels
- Multi-line support for additional notes

**Backward Compatibility:**
- Components support both old and new JSON structures
- Falls back to top-level `quality`, `prestige`, `value` if `ratings` object not present
- Gracefully handles missing `productionData` object

**Files Modified:**
- `project.json` - Updated with nested structure
- `ProjectViewer.jsx` - Added production data display
- `ProjectGallery.jsx` - Updated to support nested ratings
- `app.css` - Added ~60 lines of production data styles
- `README.md` - Updated schema documentation
- `Projects/.../README.md` - Updated example schema

**New CSS Classes:**
- `.project-viewer__data-title` - Main panel title
- `.project-viewer__production-title` - Production data subhead
- `.project-viewer__data-field` - Data field container
- `.project-viewer__data-label` - Field label styling
- `.project-viewer__data-value` - Field value styling

---

## Version 1.1.0 - October 10, 2025

### 🎨 Branding Update

**Color Palette Change: Brown → Vale Blue**

Updated primary brand color from brown (#555041) to Vale Garden Houses standard blue (#172b3a):

- `--Vale_PrimaryBrand`: #172b3a (was #555041)
- `--Vale_TextPrimary`: #172b3a (was #555041)
- `--Vale_BorderPrimary`: #172b3a (was #555041)
- `--Vale_TextSubtle`: #5a6d7a (adjusted for blue consistency)

**Files Modified:**
- `src/styles/variables.css` - Updated CSS color variables

**Impact:**
- Header background now uses Vale blue
- All buttons use Vale blue
- Text and borders use Vale blue
- Consistent Vale Garden Houses branding throughout

---

### 🔐 PIN Authentication System

**Added PIN Entry Modal**

Implemented security feature requiring 4-digit PIN before accessing application:

**New Component:**
- `src/components/PinEntry.jsx` - PIN entry modal component

**Features:**
- Modal overlay with centered PIN input form
- 4-digit PIN validation (placeholder: 1234)
- Auto-focus on input field
- Numeric-only input (digits 0-9)
- Error message display for incorrect attempts
- Submit button (disabled until 4 digits entered)
- Cancel button to close modal
- Keyboard support (Enter to submit, Escape to cancel)
- Smooth animations (fade in, slide up, shake on error)

**Updated Components:**
- `src/components/HomePage.jsx` - Added PIN modal trigger
- `app.html` - Added PinEntry.jsx script import

**New Styles:**
- `src/styles/app.css` - Added PIN Entry Component Styles region
  - Modal overlay styling
  - PIN input field with large, centered text
  - Error message with shake animation
  - Submit/Cancel button styles
  - Responsive adjustments for mobile

**User Flow:**
1. User sees landing page with logo
2. User clicks "Enter Whitecardopedia" button
3. PIN entry modal appears
4. User enters 4-digit PIN (1234)
5. On correct PIN: Access granted, modal closes, gallery loads
6. On incorrect PIN: Error message shown, input cleared, focus restored

**Security Note:**
- Placeholder PIN: `1234`
- Configured in `PinEntry.jsx` constant: `CORRECT_PIN`
- Easily changeable for production use

---

### 📊 Statistics

**Files Created:**
- 1 new component (`PinEntry.jsx`)

**Files Modified:**
- `variables.css` - Color palette update
- `app.css` - Added ~185 lines of PIN entry styles
- `HomePage.jsx` - Added PIN modal logic
- `app.html` - Added script import

**Total New Code:**
- ~310 lines added
- 3 animations added (fadeIn, slideUp, shake)
- Full keyboard accessibility
- Responsive design for mobile

---

### 🎯 Testing Checklist

- [x] Color palette updated across all components
- [x] Vale blue displays correctly on header
- [x] Vale blue displays correctly on buttons
- [x] PIN modal appears on "Enter" button click
- [x] PIN input accepts only numeric digits (0-9)
- [x] PIN input limited to 4 characters
- [x] Submit button disabled until 4 digits entered
- [x] Correct PIN (1234) grants access
- [x] Incorrect PIN shows error message
- [x] Error clears input and refocuses
- [x] Cancel button closes modal
- [x] Enter key submits form
- [x] Escape key closes modal
- [x] Animations work smoothly
- [x] Responsive on mobile devices
- [x] No linting errors

---

### 🔄 Upgrade Notes

**From Version 1.0.0 to 1.1.0:**

No breaking changes. Existing project structure and data remain compatible.

**New Behavior:**
- Users must enter PIN to access application
- PIN is currently hardcoded as "1234" for testing

**To Customize PIN:**
Edit `src/components/PinEntry.jsx`, line 25:
```javascript
const CORRECT_PIN = '1234';  // Change to your desired PIN
```

---

### 📝 Documentation Updates Needed

- README.md - Add PIN authentication section
- QUICKSTART.md - Add PIN information (1234)
- IMPLEMENTATION_SUMMARY.md - Update with v1.1.0 changes

---

### 🚀 Future Enhancements

**Potential Improvements:**
- [ ] Move PIN to external configuration file
- [ ] Add PIN change functionality
- [ ] Implement session storage (remember authentication)
- [ ] Add multiple user accounts with different PINs
- [ ] PIN complexity requirements
- [ ] Failed attempt lockout mechanism
- [ ] Biometric authentication option

---

**Version**: 1.1.0  
**Release Date**: October 10, 2025  
**Developer**: Adam Noble - Noble Architecture

