# ValeVision3D - Application Icons

This folder contains application icons and branding assets.

---

## Required Icons

Place Vale Design Suite branding icons in this folder:

### Icon__MainValeIcon__.svg
- **Purpose:** Main application favicon and branding
- **Format:** SVG (vector)
- **Size:** Scalable
- **Usage:** 
  - Browser favicon
  - Mobile home screen icon
  - Application logo

### Optional Additional Icons

- Navigation icons
- UI control icons
- Custom branding elements

---

## Default Location

Copy Vale brand icons from:
```
D:\10_CoreLib__ValeCodebase\Core__BrandAssets\Icons__ValeBrandIcons\
```

---

## Icon Specifications

### Favicon
- **Format:** SVG or PNG
- **Size:** 32x32px minimum
- **Name:** Icon__MainValeIcon__.svg

### Apple Touch Icon
- **Format:** PNG
- **Size:** 180x180px
- **Name:** Icon__MainValeIcon__180.png (optional)

### Progressive Web App Icons
- **Sizes:** 192x192px, 512x512px
- **Format:** PNG
- **Purpose:** Android home screen

---

## Usage in HTML

Icons are referenced in `app.html`:

```html
<link rel="icon" type="image/svg+xml" href="assets/AppIcons/Icon__MainValeIcon__.svg">
<link rel="apple-touch-icon" href="assets/AppIcons/Icon__MainValeIcon__.svg">
```

