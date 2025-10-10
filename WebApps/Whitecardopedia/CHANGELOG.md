# Whitecardopedia - Changelog

---

## Version 1.3.0 - October 10, 2025

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

