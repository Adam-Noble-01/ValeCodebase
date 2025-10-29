# ValeVision3D - Quick Start Guide

Get ValeVision3D running in 5 minutes.

---

## Prerequisites

- Modern web browser (Chrome, Safari, Firefox)
- Internet connection (for React CDN and model loading)
- Downloaded Babylon.js 8.2.0 files

---

## Step 1: Download Babylon.js Dependencies

ValeVision3D uses locally bundled Babylon.js 8.2.0 for version stability.

### Download Required Files

1. **Visit Babylon.js CDN:**
   ```
   https://cdn.babylonjs.com/8.2.0/
   ```

2. **Download these three files:**
   - `babylon.js` (or `babylon.min.js` for production)
   - `babylonjs.loaders.js` (or `babylonjs.loaders.min.js`)
   - `babylon.gui.js` (or `babylon.gui.min.js`)

3. **Place files in:**
   ```
   ValeVision3D/src/ThirdParty__VersionLockedDependencies/babylonjs/
   ```

### Direct Download Links

```bash
# Core Babylon.js Engine
https://cdn.babylonjs.com/8.2.0/babylon.js

# GLB/GLTF Loader
https://cdn.babylonjs.com/8.2.0/babylonjs.loaders.js

# GUI Library
https://cdn.babylonjs.com/8.2.0/babylon.gui.js
```

**For Production:** Use `.min.js` versions for smaller file sizes and faster loading.

---

## Step 2: Configure Your Models

### Edit Master Configuration

Open `src/data/masterConfig.json` and update with your model URLs:

```json
{
  "applicationName": "ValeVision3D",
  "version": "1.0.0",
  "cloudflare": {
    "cdnBasePath": "https://your-cdn-url.com/valevision3d"
  },
  "models": [
    {
      "id": "my-site-001",
      "name": "My Site Name",
      "description": "Site photogrammetry model",
      "glbUrl": "https://your-cdn-url.com/models/my-site.glb",
      "enabled": true,
      "defaultCamera": {
        "alpha": 0,
        "beta": 1.2,
        "radius": 50
      },
      "metadata": {
        "captureDate": "2025-10-29",
        "location": "Site Location",
        "fileSize": "250MB"
      }
    }
  ],
  "environments": [
    {
      "id": "outdoor-hdri",
      "name": "Outdoor Natural Light",
      "description": "Natural daylight HDRI",
      "hdrUrl": "https://your-cdn-url.com/environments/outdoor.hdr",
      "intensity": 1.0,
      "enabled": true,
      "rotation": 0
    }
  ]
}
```

### Model URL Requirements

- **Format:** GLB (binary GLTF)
- **CORS:** Must allow cross-origin requests
- **Size:** Any size supported (progress tracking built-in)
- **Compression:** Draco compression recommended for large files

---

## Step 3: Open the Application

### Option A: Direct File Open

1. Navigate to ValeVision3D folder
2. Open `index.html` in web browser
3. Browser will redirect to `app.html`

### Option B: Local Web Server (Recommended)

Using Python:
```bash
cd ValeVision3D
python -m http.server 8000
```

Then open:
```
http://localhost:8000
```

Using Node.js:
```bash
npx http-server -p 8000
```

---

## Step 4: Upload Models to CDN

### Cloudflare R2 Setup

1. **Create R2 Bucket:**
   - Log into Cloudflare Dashboard
   - Navigate to R2 Object Storage
   - Create new bucket: `valevision3d`

2. **Create Folders:**
   ```
   valevision3d/
   ├── models/
   └── environments/
   ```

3. **Upload Files:**
   - Upload GLB models to `models/` folder
   - Upload HDR environments to `environments/` folder

4. **Configure Public Access:**
   - Enable public access for bucket
   - Set CORS policy:
   ```json
   {
     "AllowedOrigins": ["*"],
     "AllowedMethods": ["GET", "HEAD"],
     "AllowedHeaders": ["*"],
     "MaxAgeSeconds": 3600
   }
   ```

5. **Get Public URLs:**
   - Format: `https://pub-[your-id].r2.dev/models/site.glb`
   - Update URLs in `masterConfig.json`

---

## Step 5: Test on Tablet

### iPad/Android Tablet

1. Access application via local network or deployed URL
2. Test touch controls:
   - Single finger drag (rotate)
   - Two finger drag (pan)
   - Pinch (zoom)
   - Double tap (focus)

### Optimal Tablet Settings

For best performance on tablets:

```json
{
  "cameraSettings": {
    "touchSensitivity": 0.8,
    "inertia": 0.9,
    "pinchPrecision": 12.0,
    "panningSensibility": 50
  },
  "renderSettings": {
    "enableAntialiasing": true,
    "targetFPS": 60
  }
}
```

---

## Common Issues & Solutions

### Issue: Models Not Loading

**Solution:**
1. Check browser console (F12) for errors
2. Verify GLB URL is accessible (paste in browser)
3. Check CORS headers on CDN
4. Ensure GLB file is valid (test in Blender or glTF viewer)

### Issue: HDRI Not Displaying

**Solution:**
1. Verify HDR file format (must be .hdr)
2. Check HDR URL accessibility
3. Try reducing intensity to 0.5 for subtle effect
4. Enable default lighting as fallback

### Issue: Touch Controls Not Working

**Solution:**
1. Ensure `touch-action="none"` is set on canvas
2. Check browser supports touch events
3. Try in different browser (Chrome/Safari)
4. Clear browser cache and reload

### Issue: Performance Problems

**Solution:**
1. Use compressed GLB with Draco compression
2. Reduce HDRI resolution to 512px or 1024px
3. Close other browser tabs
4. Test on desktop first before tablet

---

## File Size Recommendations

### For Tablets

- **Models:** < 200MB for smooth loading
- **HDRI:** 512px or 1024px resolution
- **Target FPS:** 30-60 fps

### For Desktop

- **Models:** < 500MB recommended
- **HDRI:** 2048px or 4096px resolution
- **Target FPS:** 60 fps

---

## Next Steps

### 1. Optimize Models

- Use Draco compression in Blender/glTF exporter
- Remove unnecessary geometry
- Optimize texture sizes

### 2. Create Multiple Views

Add camera presets in `masterConfig.json`:

```json
{
  "models": [
    {
      "id": "site-001",
      "defaultCamera": {
        "alpha": 0,
        "beta": 1.2,
        "radius": 50
      },
      "cameraPresets": {
        "overview": { "alpha": 0, "beta": 1.0, "radius": 100 },
        "detail": { "alpha": 1.5, "beta": 1.3, "radius": 20 }
      }
    }
  ]
}
```

### 3. Customize Branding

- Replace Vale icons in `assets/AppIcons/`
- Update header colors in `src/styles/variables.css`
- Modify application name in `masterConfig.json`

---

## Support Resources

- **Full Documentation:** See README.md
- **Babylon.js Docs:** https://doc.babylonjs.com/
- **GLB Tools:** https://gltf.report/ (validate GLB files)
- **HDRI Resources:** https://polyhaven.com/hdris

---

## Deployment Checklist

- [ ] Babylon.js files downloaded and placed
- [ ] Models uploaded to Cloudflare CDN
- [ ] HDRI environments uploaded
- [ ] `masterConfig.json` updated with CDN URLs
- [ ] CORS headers configured on CDN
- [ ] Tested on desktop browser
- [ ] Tested on tablet device
- [ ] Optimized model file sizes
- [ ] Minified Babylon.js files for production

---

## Quick Reference

### Touch Controls
| Gesture | Action |
|---------|--------|
| Single finger drag | Rotate camera |
| Two finger drag | Pan camera |
| Pinch | Zoom in/out |
| Double tap | Focus on point |

### UI Controls
| Button | Action |
|--------|--------|
| Reset View | Return to default camera |
| Show/Hide Info | Toggle model information |
| Model List | Switch between models |

---

**You're ready to go!** 

Open `index.html` and explore your 3D photogrammetry models.

