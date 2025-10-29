# ValeVision3D - 3D Photogrammetry Site Viewer

**Version:** 1.0.0  
**Author:** Adam Noble - Noble Architecture  
**Created:** 2025

---

## Overview

ValeVision3D is a professional 3D photogrammetry viewer designed for large-scale architectural site analysis. Built with React and Babylon.js 8.2.0, it provides tablet-optimized navigation for exploring high-resolution site models and photogrammetry data.

### Key Features

- **Tablet-First Navigation** - Optimized touch controls for iPad and tablet devices
- **Large Model Support** - Handles massive photogrammetry GLB models with progress tracking
- **HDRI Lighting** - Professional environment lighting from Cloudflare CDN
- **Pure Static HTML** - No server required, runs directly from file system
- **Version-Locked Dependencies** - Babylon.js 8.2.0 bundled locally for stability
- **Responsive Design** - Adapts to mobile, tablet, and desktop screens

---

## Project Structure

```
ValeVision3D/
├── index.html                          # Redirect to app.html
├── app.html                            # Main React container
├── README.md                           # This file
├── QUICKSTART.md                       # Quick start guide
├── assets/
│   ├── AppIcons/                       # Application icons
│   └── AppLogo/                        # Branding assets
└── src/
    ├── components/                     # React components
    │   ├── App.jsx                     # Main app orchestrator
    │   ├── BabylonScene.jsx           # Babylon.js scene manager
    │   ├── LoadingScreen.jsx          # Progress loading screen
    │   ├── CameraControls.jsx         # Camera control UI
    │   ├── ModelSelector.jsx          # Model switching interface
    │   ├── InfoPanel.jsx              # Model info display
    │   └── Header.jsx                 # Application header
    ├── utils/
    │   ├── configLoader.js            # Configuration loader
    │   ├── modelLoader.js             # GLB model loader
    │   ├── hdriLoader.js              # HDRI environment loader
    │   └── cameraManager.js           # Camera utilities
    ├── data/
    │   └── masterConfig.json          # Application configuration
    ├── styles/
    │   ├── variables.css              # Vale Design Suite variables
    │   ├── app.css                    # Application styles
    │   └── babylon.css                # 3D canvas styles
    └── ThirdParty__VersionLockedDependencies/
        └── babylonjs/                 # Babylon.js 8.2.0 bundle
            ├── babylon.js
            ├── babylonjs.loaders.js
            └── babylon.gui.js
```

---

## Configuration

### Master Configuration File

All application settings are defined in `src/data/masterConfig.json`:

```json
{
  "applicationName": "ValeVision3D",
  "version": "1.0.0",
  "cloudflare": {
    "cdnBasePath": "https://cdn.yourcloudflare.com/valevision3d"
  },
  "models": [
    {
      "id": "site-001",
      "name": "Site Name",
      "glbUrl": "https://cdn.cloudflare.com/path/to/model.glb",
      "enabled": true,
      "defaultCamera": { "alpha": 0, "beta": 1.2, "radius": 50 }
    }
  ],
  "environments": [
    {
      "id": "hdri-outdoor",
      "name": "Outdoor HDRI",
      "hdrUrl": "https://cdn.cloudflare.com/path/to/hdri.hdr",
      "intensity": 1.0,
      "enabled": true
    }
  ],
  "cameraSettings": {
    "touchSensitivity": 0.8,
    "inertia": 0.9,
    "pinchPrecision": 12.0
  }
}
```

### Adding New Models

1. Upload GLB model to Cloudflare CDN
2. Add model entry to `models` array in `masterConfig.json`
3. Set `enabled: true` to make model available
4. Configure `defaultCamera` position for optimal initial view

### Adding HDRI Environments

1. Upload HDR file to Cloudflare CDN
2. Add environment entry to `environments` array
3. Set `enabled: true` for primary environment
4. Adjust `intensity` (0.0 - 2.0) for lighting brightness

---

## Touch Controls

### Tablet Navigation (Primary)

- **Single Finger Drag** - Rotate camera around model
- **Two Finger Drag** - Pan camera left/right/up/down
- **Pinch Gesture** - Zoom in/out
- **Double Tap** - Focus camera on tapped point

### Desktop Navigation

- **Left Click + Drag** - Rotate camera
- **Right Click + Drag** - Pan camera
- **Mouse Wheel** - Zoom in/out
- **Double Click** - Focus on clicked point

---

## Camera Settings

Fine-tune camera behavior in `cameraSettings` section:

```json
{
  "touchSensitivity": 0.8,      // Touch rotation sensitivity (0.0 - 1.0)
  "wheelPrecision": 0.5,         // Mouse wheel zoom speed
  "inertia": 0.9,                // Camera momentum (0.0 = none, 0.99 = max)
  "pinchPrecision": 12.0,        // Pinch zoom sensitivity
  "panningSensibility": 50,      // Pan gesture sensitivity
  "minZ": 0.1,                   // Near clipping plane
  "maxZ": 10000,                 // Far clipping plane (for large sites)
  "lowerRadiusLimit": 5,         // Minimum zoom distance
  "upperRadiusLimit": 500,       // Maximum zoom distance
  "lowerBetaLimit": 0.1,         // Minimum vertical angle
  "upperBetaLimit": 1.5,         // Maximum vertical angle
  "allowUpsideDown": false       // Prevent camera inversion
}
```

---

## Performance Optimization

### Large Model Handling

- **Progressive Loading** - Shows progress bar during model download
- **Memory Management** - Automatic cleanup when switching models
- **GPU Acceleration** - Hardware-accelerated rendering via WebGL2

### Recommended Settings

For models over 200MB:
- Reduce HDRI texture size to 512px or 1024px
- Disable antialiasing in `renderSettings`
- Use compressed GLB format with Draco compression

---

## Browser Compatibility

### Supported Browsers

- **Chrome/Edge** - v90+ (Recommended)
- **Safari** - v14+ (iOS/iPadOS)
- **Firefox** - v88+

### Requirements

- WebGL 2.0 support
- Minimum 4GB RAM (8GB+ recommended for large models)
- Modern GPU with hardware acceleration

---

## Deployment

### Static Hosting

ValeVision3D is a pure static application and can be deployed to:

- **Cloudflare Pages**
- **GitHub Pages**
- **Netlify**
- **AWS S3 + CloudFront**
- Any static web host

### Cloudflare CDN Setup

1. Create Cloudflare R2 bucket or use CDN
2. Upload GLB models and HDR environments
3. Generate public URLs with appropriate CORS headers
4. Update `masterConfig.json` with CDN URLs

### CORS Configuration

Ensure Cloudflare CDN allows cross-origin requests:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD
Access-Control-Allow-Headers: Content-Type
```

---

## Development

### Code Style

Follows **Vale Design Suite Coding Standards**:

- Regional structure with collapsible code blocks
- Inline arrow comments `// <--` for explanations
- 4-space indentation within regions
- Column-aligned constants and CSS properties

### Module Structure

```javascript
// -----------------------------------------------------------------------------
// REGION | Module Description
// -----------------------------------------------------------------------------

    // FUNCTION | Function Description
    // ---------------------------------------------------------------
    function exampleFunction() {
        const SETTING_ONE = true;                                // <-- Comment
        return SETTING_ONE;                                      // <-- Return value
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
```

---

## Troubleshooting

### Model Not Loading

1. Check browser console for errors
2. Verify GLB URL is accessible (test in browser)
3. Confirm CORS headers are set on CDN
4. Check model file is valid GLB format

### HDRI Not Displaying

1. Verify HDR file format (.hdr extension)
2. Check HDR URL is accessible
3. Ensure `intensity` is not set to 0
4. Try enabling default lighting as fallback

### Performance Issues

1. Check model polygon count (recommend < 5M triangles)
2. Use compressed GLB with Draco compression
3. Reduce HDRI texture resolution
4. Close other browser tabs/applications

---

## License

© 2025 Noble Architecture - Vale Design Suite  
All rights reserved.

---

## Support

For technical support or questions:
- **Email:** support@nobledesignsuite.com
- **Documentation:** See QUICKSTART.md for setup guide

---

## Version History

### Version 1.0.0 (2025)
- Initial release
- Babylon.js 8.2.0 integration
- Tablet-optimized touch controls
- Cloudflare CDN support
- Progressive loading screen
- Multiple model support
- HDRI environment lighting

