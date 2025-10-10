# Whitecardopedia - Changelog

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

