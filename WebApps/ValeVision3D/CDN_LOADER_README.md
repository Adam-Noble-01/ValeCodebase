# ValeVision3D - CDN Loader Documentation

**Module:** GLB CDN Bucket Loader  
**File:** `src/utils/glbCdnLoader.js`  
**Purpose:** Intelligent loading of GLB models with external texture resources from CDN buckets

---

## Overview

The **GLB CDN Loader** is a specialized loading system designed for large photogrammetry models that use external texture files. Unlike standard GLB loaders that expect self-contained files, this loader intelligently discovers, validates, and loads all related resources from a CDN bucket.

---

## Problem Solved

**Standard GLB Loading Issue:**
- Large photogrammetry models often split textures into external files
- External textures can be 200-500MB each
- Standard loaders don't automatically discover related files
- Manual texture management is error-prone

**CDN Loader Solution:**
- Automatically discovers all related files in CDN bucket
- Loads files in optimal order (GLB first, then textures)
- Validates file structure before loading
- Tracks progress across multiple large files
- Handles external texture application to meshes

---

## File Structure Detection

The loader automatically detects this file naming pattern:

```
CDN Bucket: noble-architecture-cdn/VaApps/3dAssets/

02__FullSite__100k__OnlineVersion__2.0.0__.glb                    # 3 MB - Main model
02__FullSite__100k__OnlineVersion__2.0.0__.glb.rsInfo            # 2 KB - RealityCapture metadata
02__FullSite__100k__OnlineVersion__2.0.0__u0_v0_diffuse.png      # 261 MB - Texture tile 0,0
02__FullSite__100k__OnlineVersion__2.0.0__u1_v0_diffuse.png      # 200 MB - Texture tile 1,0
02__FullSite__100k__OnlineVersion__2.0.0__u0_v1_diffuse.png      # Optional - Texture tile 0,1
02__FullSite__100k__OnlineVersion__2.0.0__u1_v1_diffuse.png      # Optional - Texture tile 1,1
```

### Naming Convention

**Base Name:** `{ModelName}__`  
**GLB File:** `{BaseName}.glb`  
**Metadata:** `{BaseName}.glb.rsInfo`  
**Textures:** `{BaseName}__u{X}_v{Y}_diffuse.png`

Where:
- `{X}` = Horizontal tile index (0, 1, 2...)
- `{Y}` = Vertical tile index (0, 1, 2...)
- `diffuse` = Texture type (diffuse/albedo)

---

## Loading Process

### Step 1: Discovery Phase
```
Input: GLB URL from masterConfig.json
↓
Parse URL to extract base name
↓
Check CDN bucket for related files:
  - GLB file (required)
  - .rsInfo metadata (optional)
  - Texture tiles u0_v0, u1_v0, etc. (optional)
↓
Build list of discovered files with priorities
```

### Step 2: Validation Phase
```
Check discovered files:
  ✓ GLB file exists (required)
  ✓ File structure is valid
  ✓ URLs are accessible (HEAD request)
↓
Report validation results
```

### Step 3: Sequential Loading
```
Load in priority order:
  Priority 1: GLB file (geometry & structure)
  Priority 2: Metadata files (.rsInfo)
  Priority 3: Texture files (in tile order)
↓
Track progress for each file:
  - File-level progress (current file %)
  - Overall progress (across all files)
  - Bytes loaded / total bytes
```

### Step 4: Scene Integration
```
Load GLB into Babylon.js scene
↓
Apply external textures to meshes
↓
Return complete model object
```

---

## Configuration

### Enable CDN Loader for a Model

In `masterConfig.json`:

```json
{
  "models": [
    {
      "id": "fullsite-100k",
      "name": "Full Site 100k - Online Version 2.0",
      "glbUrl": "https://noble-architecture-cdn.r2.dev/VaApps/3dAssets/02__FullSite__100k__OnlineVersion__2.0.0__.glb",
      "enabled": true,
      "useCdnLoader": true,  // ← Enable specialized CDN loader
      "defaultCamera": {
        "alpha": 0,
        "beta": 1.0,
        "radius": 100
      },
      "metadata": {
        "captureDate": "2025",
        "location": "Full Site Photogrammetry",
        "fileSize": "464 MB (Total with textures)"
      }
    }
  ]
}
```

**Key Field:**
- `"useCdnLoader": true` - Activates the specialized CDN loader
- Without this flag, standard single-file loader is used

---

## CDN URL Structure

### Cloudflare R2 Bucket Structure

```
Base URL: https://noble-architecture-cdn.r2.dev/
Path: VaApps/3dAssets/

Full URL Format:
https://noble-architecture-cdn.r2.dev/VaApps/3dAssets/{ModelName}.glb
https://noble-architecture-cdn.r2.dev/VaApps/3dAssets/{ModelName}__u0_v0_diffuse.png
```

### Update CDN Base Path

In `masterConfig.json`:

```json
{
  "cloudflare": {
    "cdnBasePath": "https://noble-architecture-cdn.r2.dev/VaApps/3dAssets/",
    "modelsPath": "3dAssets",
    "environmentsPath": "environments"
  }
}
```

---

## Loading Priority System

Files are loaded in this order:

| Priority | File Type | Required | Example | Size |
|----------|-----------|----------|---------|------|
| 1 | GLB | Yes | `model.glb` | 3 MB |
| 2 | Metadata | No | `model.glb.rsInfo` | 2 KB |
| 3 | Textures | No | `model__u0_v0_diffuse.png` | 261 MB |
| 3 | Textures | No | `model__u1_v0_diffuse.png` | 200 MB |

**Why This Order:**
1. **GLB First** - Small file, contains geometry and references
2. **Metadata** - Optional info, very small
3. **Textures** - Large files, loaded after structure is known

---

## Progress Tracking

The loader provides detailed progress information:

```javascript
onProgress(progress, loadedBytes, totalBytes, message)
```

**Parameters:**
- `progress` - Overall completion percentage (0-100)
- `loadedBytes` - Total bytes downloaded so far
- `totalBytes` - Total bytes across all files
- `message` - Human-readable status message

**Example Messages:**
```
"Discovering model resources..."
"Loading 02__FullSite__100k__OnlineVersion__2.0.0__.glb..."
"Loading 02__FullSite__100k__OnlineVersion__2.0.0__u0_v0_diffuse.png (45%)"
"Loading model into scene..."
```

---

## API Reference

### Main Functions

#### `loadGLBBundle(scene, modelConfig, onProgress)`

Load complete GLB asset bundle with all related files.

**Parameters:**
- `scene` - Babylon.js Scene object
- `modelConfig` - Model configuration from masterConfig.json
- `onProgress` - Progress callback function

**Returns:** Promise<Model> - Loaded model with meshes and textures

**Example:**
```javascript
const model = await ValeVision3D.GLBCdnLoader.loadGLBBundle(
  scene,
  modelConfig,
  (progress, loaded, total, message) => {
    console.log(`${message} - ${Math.round(progress)}%`);
  }
);
```

---

#### `discoverRelatedFiles(modelInfo)`

Discover all files related to a GLB model in the CDN bucket.

**Parameters:**
- `modelInfo` - Parsed model information (baseName, cdnPath)

**Returns:** Promise<Array> - List of discovered files with metadata

**File Object Structure:**
```javascript
{
  url: "https://cdn.../model__u0_v0_diffuse.png",
  fileName: "model__u0_v0_diffuse.png",
  type: "texture",
  priority: 3,
  required: false,
  loaded: false,
  data: null
}
```

---

#### `validateFileStructure(relatedFiles)`

Validate that discovered files form a complete, valid model.

**Parameters:**
- `relatedFiles` - Array of discovered files

**Returns:** Object - Validation result
```javascript
{
  valid: true,
  glbCount: 1,
  textureCount: 2,
  metadataCount: 1
}
```

---

## Error Handling

### Common Errors

**1. GLB File Not Found**
```
Error: Required file not found: model.glb
```
**Solution:** Check GLB URL in masterConfig.json

**2. CORS Error**
```
Error: Failed to fetch model.glb: CORS policy
```
**Solution:** Configure CORS on Cloudflare R2 bucket

**3. Invalid File Structure**
```
Error: Invalid file structure: GLB file not found
```
**Solution:** Ensure GLB file exists with correct naming

**4. Texture Loading Failed**
```
Warning: Optional file not found: model__u2_v0_diffuse.png
```
**Solution:** Check if all texture tiles are uploaded

---

## Performance Optimization

### Large File Handling

**For 200-500MB Texture Files:**
- Chunked reading with progress tracking
- Blob-based memory management
- Object URL creation for efficient loading
- Automatic cleanup of object URLs

### Memory Management

**Cleanup After Loading:**
```javascript
ValeVision3D.GLBCdnLoader.cleanup(loadedAssets);
```

This revokes object URLs to free memory.

---

## Debugging

### Enable Console Logging

The loader includes extensive console logging:

```
Found: 02__FullSite__100k__OnlineVersion__2.0.0__.glb
Found: 02__FullSite__100k__OnlineVersion__2.0.0__.glb.rsInfo
Found: 02__FullSite__100k__OnlineVersion__2.0.0__u0_v0_diffuse.png
Found: 02__FullSite__100k__OnlineVersion__2.0.0__u1_v0_diffuse.png
Discovered 4 related files for model
Model has 2 external texture files
Loaded: 02__FullSite__100k__OnlineVersion__2.0.0__.glb (3 MB)
Loaded: 02__FullSite__100k__OnlineVersion__2.0.0__u0_v0_diffuse.png (261 MB)
Model loaded: 1247 meshes, 2 external textures
```

---

## Cloudflare R2 Configuration

### Required CORS Settings

```json
{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}
```

### Public Access

Ensure bucket has public read access enabled for the `3dAssets` folder.

---

## Comparison: Standard vs CDN Loader

| Feature | Standard Loader | CDN Loader |
|---------|----------------|------------|
| Single GLB file | ✓ | ✓ |
| External textures | ✗ | ✓ |
| Auto-discovery | ✗ | ✓ |
| File validation | Basic | Complete |
| Progress tracking | Single file | Multi-file |
| Texture tiles | Manual | Automatic |
| Large files (>200MB) | Basic | Optimized |

---

## Testing Checklist

### Before Deploying Models

- [ ] GLB file uploaded to CDN
- [ ] All texture tiles uploaded
- [ ] File naming matches convention
- [ ] CORS headers configured
- [ ] Public access enabled
- [ ] Test HEAD request to GLB URL
- [ ] Test HEAD request to texture URLs
- [ ] Verify file sizes in config
- [ ] Test loading in browser

---

## Future Enhancements

### Planned Features

1. **Parallel Texture Loading** - Load multiple textures simultaneously
2. **Adaptive Quality** - Load lower-res textures on slow connections
3. **Caching** - Cache loaded textures in IndexedDB
4. **Compression** - Support compressed texture formats (KTX2, Basis)
5. **Streaming** - Stream geometry data progressively

---

## Support

For issues or questions:
- Check browser console for detailed error messages
- Verify CDN URLs are accessible
- Confirm CORS configuration
- Test with smaller models first

---

**Module Status: ✅ Production Ready**

Successfully handles multi-file GLB bundles with external textures up to 500MB per file.

