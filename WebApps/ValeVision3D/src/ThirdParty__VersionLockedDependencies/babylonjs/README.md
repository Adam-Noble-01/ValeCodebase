# Babylon.js 8.2.0 - Version-Locked Dependencies

This folder contains locally bundled Babylon.js 8.2.0 files for version stability.

---

## Required Files

Download these three files from the Babylon.js CDN and place them in this directory:

### 1. babylon.js (Core Engine)
**URL:** `https://cdn.babylonjs.com/8.2.0/babylon.js`  
**Size:** ~2.5MB (unminified) / ~800KB (minified)  
**Purpose:** Core Babylon.js 3D engine

### 2. babylonjs.loaders.js (GLB/GLTF Loader)
**URL:** `https://cdn.babylonjs.com/8.2.0/babylonjs.loaders.js`  
**Size:** ~500KB (unminified) / ~200KB (minified)  
**Purpose:** Load GLB and GLTF 3D model files

### 3. babylon.gui.js (GUI Library)
**URL:** `https://cdn.babylonjs.com/8.2.0/babylon.gui.js`  
**Size:** ~400KB (unminified) / ~150KB (minified)  
**Purpose:** 2D GUI overlays on 3D scene

---

## Quick Download Commands

### Windows PowerShell
```powershell
Invoke-WebRequest -Uri "https://cdn.babylonjs.com/8.2.0/babylon.js" -OutFile "babylon.js"
Invoke-WebRequest -Uri "https://cdn.babylonjs.com/8.2.0/babylonjs.loaders.js" -OutFile "babylonjs.loaders.js"
Invoke-WebRequest -Uri "https://cdn.babylonjs.com/8.2.0/babylon.gui.js" -OutFile "babylon.gui.js"
```

### Linux/Mac Terminal
```bash
curl -o babylon.js https://cdn.babylonjs.com/8.2.0/babylon.js
curl -o babylonjs.loaders.js https://cdn.babylonjs.com/8.2.0/babylonjs.loaders.js
curl -o babylon.gui.js https://cdn.babylonjs.com/8.2.0/babylon.gui.js
```

### Using wget
```bash
wget https://cdn.babylonjs.com/8.2.0/babylon.js
wget https://cdn.babylonjs.com/8.2.0/babylonjs.loaders.js
wget https://cdn.babylonjs.com/8.2.0/babylon.gui.js
```

---

## Production vs Development

### Development (Recommended for Testing)
- Use unminified `.js` files
- Easier debugging with readable code
- Larger file sizes

### Production (Recommended for Deployment)
- Use minified `.min.js` files
- Smaller file sizes for faster loading
- Replace `.js` with `.min.js` in download URLs

**Production URLs:**
```
https://cdn.babylonjs.com/8.2.0/babylon.min.js
https://cdn.babylonjs.com/8.2.0/babylonjs.loaders.min.js
https://cdn.babylonjs.com/8.2.0/babylon.gui.min.js
```

**Update app.html script tags accordingly:**
```html
<script src="src/ThirdParty__VersionLockedDependencies/babylonjs/babylon.min.js"></script>
<script src="src/ThirdParty__VersionLockedDependencies/babylonjs/babylonjs.loaders.min.js"></script>
<script src="src/ThirdParty__VersionLockedDependencies/babylonjs/babylon.gui.min.js"></script>
```

---

## Version Lock Rationale

### Why Local Bundle?

1. **Version Stability** - Application tested with specific Babylon.js version
2. **Offline Capability** - Works without external CDN dependency
3. **Performance** - No additional CDN latency
4. **Security** - No third-party CDN security concerns
5. **Reproducibility** - Exact same version across all deployments

### Babylon.js 8.2.0 Features

- WebGL 2.0 support
- Advanced PBR materials
- Improved performance
- Touch gesture support
- HDR environment lighting
- Draco mesh compression support

---

## File Structure

After downloading, this folder should contain:

```
babylonjs/
├── README.md (this file)
├── babylon.js
├── babylonjs.loaders.js
└── babylon.gui.js
```

---

## Verification

To verify files downloaded correctly:

1. **Check file sizes:**
   - babylon.js: ~2.5MB
   - babylonjs.loaders.js: ~500KB
   - babylon.gui.js: ~400KB

2. **Check first line of each file:**
   - Should contain: `var BABYLON = BABYLON || {};`

3. **Test in application:**
   - Open `app.html` in browser
   - Check browser console (F12) for errors
   - Should see "Babylon.js scene initialized"

---

## Troubleshooting

### Error: "BABYLON is not defined"

**Cause:** Babylon.js files not loaded or incorrect order  
**Solution:** 
1. Verify files exist in this folder
2. Check script tags in `app.html` load in correct order:
   - babylon.js (first)
   - babylonjs.loaders.js (second)
   - babylon.gui.js (third)

### Error: "Cannot load GLB model"

**Cause:** Loaders plugin not loaded  
**Solution:** Ensure `babylonjs.loaders.js` is present and loaded

### Files Won't Download

**Alternative:** Download from GitHub releases  
https://github.com/BabylonJS/Babylon.js/releases/tag/8.2.0

---

## License

Babylon.js is licensed under Apache License 2.0  
https://github.com/BabylonJS/Babylon.js/blob/master/LICENSE.md

---

## Additional Resources

- **Official Documentation:** https://doc.babylonjs.com/
- **Playground:** https://playground.babylonjs.com/
- **Forum:** https://forum.babylonjs.com/
- **GitHub:** https://github.com/BabylonJS/Babylon.js

