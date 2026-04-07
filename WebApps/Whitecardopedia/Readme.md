# Whitecardopedia

**React-based Image Viewer for Vale Garden Houses Board Review**

A dynamic web application for reviewing whitecard (massing model) images with project metadata and schedule tracking.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Adding New Projects](#adding-new-projects)
- [Project Configuration](#project-configuration)
- [Development](#development)
- [Deployment](#deployment)

---

## Overview

Whitecardopedia is a quality control and presentation tool for the Vale Garden Houses board to review whitecard images (simple massing models). The application dynamically loads projects from a folder structure, displays project metadata, and tracks production schedule efficiency.

**Author**: Adam Noble - Noble Architecture  
**Technology**: React (CDN), Vanilla CSS, JSON configuration  
**Design System**: Vale Design Suite Standards

---

## Features

- ✅ **Landing Page** - Whitecardopedia logo display with entry button
- ✅ **PIN Authentication** - Secure 4-digit PIN entry system (PIN: 1234)
- ✅ **Dual Logo Header** - Vale Garden Houses + Whitecardopedia branding
- ✅ **Project Gallery** - Grid view of all available projects with thumbnails
- ✅ **Project Viewer** - Full project display with image carousel
- ✅ **Project Date Display** - Formatted dates with ordinal superscripts (1st, 2nd, 3rd)
- ✅ **Production Data Panel** - Input type, duration, and additional notes
- ✅ **SketchUp Model Links** - Conditional display of 3D model links
- ✅ **Download Images** - Download all project images as ZIP file (NEW in v0.0.7)
- ✅ **Star Ratings** - Visual display of Quality, Prestige, Value metrics (1-5 stars)
- ✅ **Image Carousel** - Navigate through multiple project images with thumbnails
- ✅ **Dynamic Loading** - Projects automatically loaded from folder structure
- ✅ **Image Auto-Discovery** - Python utility to automatically update project images
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile devices
- ✅ **Vale Design Suite** - Consistent branding and styling

---

## Project Structure

```
Whitecardopedia/
├── index.html                          # Redirect to app.html
├── app.html                            # React application container
├── README.md                           # This file
├── CHANGELOG.md                        # Version history and release notes
│
├── 01__AppAssets__Whitecardopedia/
│
├── 02__Src__AppModules/
│   ├── 01__AppDependencies__VersionLocked/
│   │   └── client-zip.2.4.4.min.js
│   ├── 02__AppCore/
│   │   ├── Na__AppCore__WhitecardopediaApp.jsx
│   │   ├── Na__AppCore__Header.jsx
│   │   └── Na__AppCore__HomePage.jsx
│   ├── 03__AppData/
│   │   ├── Na__AppData__MasterConfig__Main.json
│   │   └── Na__AppData__ProjectLoader.js
│   ├── 05__AppUtils/
│   │   ├── Na__AppUtils__DateFormatter.js
│   │   ├── Na__AppUtils__SearchFilter.js
│   │   ├── Na__AppUtils__SortProjects.js
│   │   └── Na__AppUtils__UrlQueryHandler.js
│   ├── 10__Feature__ProjectGallery/
│   ├── 11__Feature__ProjectViewer/
│   ├── 12__Feature__ProjectEditor/
│   ├── 13__Feature__TimeAnalysis/
│   ├── 14__Feature__Authentication/
│   ├── 61__Feature__PwaAppHelpers/
│   ├── 62__Feature__AppInstallability/
│   └── 70__System__DevTools/
│
├── 03__Style__AppStylesheets/
│   └── Na__CoreUi__Styles__Index__.css
│
├── 70__System__DevTools/
├── 04__Docs/
│
└── Projects/
    └── 2025/
        └── [ProjectFolderName]/
            ├── project.json            # Project metadata
            └── *.jpg/*.png             # Project images
```

**Critical Guardrail**: Do not rename, move, or refactor anything inside `Projects/`. This folder is intentionally treated as immutable project payload data.

---

## Installation & Setup

### 1. Clone or Download

Download the Whitecardopedia folder to your desired location.

### 2. Serve with Local Server

The application requires a web server (cannot run from `file://` protocol due to CORS restrictions).

**Option A: Python HTTP Server**
```bash
cd WebApps/Whitecardopedia
python -m http.server 8000
```

**Option B: Node.js HTTP Server**
```bash
npx http-server -p 8000
```

**Option C: VS Code Live Server Extension**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

### 3. Access Application

Open browser and navigate to:
```
http://localhost:8000
```

The application will automatically redirect from `index.html` to `app.html`.

### 4. Using the Application

1. Click **"Enter Whitecardopedia"** on the landing page
2. **Enter PIN: 1234** when prompted (default placeholder PIN)
3. Browse projects in the gallery view
4. Click any project card to view details
5. Navigate images using arrow buttons or thumbnails
6. Click **"Back to Gallery"** to return

**Note**: The PIN is currently set to `1234` for testing. To change it, edit `02__Src__AppModules/14__Feature__Authentication/Na__Feature__Authentication__PinEntry.jsx`.

---

## Adding New Projects

### Step 1: Create Project Folder

Create a new folder in `Projects/2025/`:

```
Projects/2025/MyNewProject_GardenHouse_Beta/
```

**Folder Naming Convention**: Use descriptive names with underscores (no spaces)

### Step 2: Add project.json

Create `project.json` in the project folder:

```json
{
    "projectName": "Garden House Beta",
    "projectCode": "VGH-2025-002",
    "productionData": {
        "input": "CAD File",
        "conceptArtist": "Anna",
        "additionalNotes": "Modern garden house with sustainable design principles"
    },
    "scheduleData": {
        "dateReceived": "08-Oct-2025",
        "dateFulfilled": "10-Oct-2025",
        "timeAllocated": 4,
        "timeTaken": 3
    },
    "sketchUpModel": {
        "url": "https://3dwarehouse.sketchup.com/model/example"
    },
    "images": [],
    "description": "Modern garden house with sustainable design principles"
}
```

**Note**: You can leave the `images` array empty - the auto-discovery utility will populate it for you!

### Step 3: Add Project Images

Add image files to the project folder using the **IMG## prefix naming convention**:

```
Projects/2025/MyNewProject_GardenHouse_Beta/
├── project.json
├── IMG01__3dView__FrontView__WhitecardImage__10-Oct-2025.png
├── IMG02__3dView__SideView__WhitecardImage__10-Oct-2025.png
├── IMG03__3dView__RearView__WhitecardImage__10-Oct-2025.png
└── IMG04__3dView__AerialView__WhitecardImage__10-Oct-2025.png
```

**Image Naming Convention**:
- ✅ **Required**: Must start with `IMG01__`, `IMG02__`, `IMG03__`, etc.
- ✅ **Supported formats**: `.png`, `.jpg`, `.jpeg`, `.svg`, `.gif`, `.webp`
- ✅ **Automatic sorting**: Images loaded in numeric order (IMG01, IMG02, IMG03...)
- ✅ **Descriptive names**: Use descriptive filenames after the prefix for organization

**Examples**:
```
IMG01__3dView__MainShot__WhitecardImage__09-Oct-2025.png
IMG02__3dView__PatioView__WhitecardImage__09-Oct-2025.png
IMG03__3dView__TopDownView__WhitecardImage__09-Oct-2025.png
```

### Step 3a: Auto-Discover Images (Recommended)

Run the **Image Auto-Discovery Utility** to automatically populate the `images` array:

**Windows**:
```bash
update_images.bat
```

**Python (All Platforms)**:
```bash
python update_project_images.py
```

**Preview Changes First (Dry-Run)**:
```bash
python update_project_images.py --dry-run
```

The utility will:
- ✅ Scan all project folders for images with `IMG##__` prefix
- ✅ Sort images by numeric prefix (IMG01, IMG02, IMG03...)
- ✅ Automatically update `project.json` with discovered images
- ✅ Provide summary report of all changes

**Alternative - Manual Entry**:

If you prefer manual control, you can still manually specify images in `project.json`:

```json
{
    "images": [
        "IMG01__3dView__FrontView__WhitecardImage__10-Oct-2025.png",
        "IMG02__3dView__SideView__WhitecardImage__10-Oct-2025.png",
        "IMG03__3dView__AerialView__WhitecardImage__10-Oct-2025.png"
    ]
}
```

### Step 4: Update Master Config

Edit `02__Src__AppModules/03__AppData/Na__AppData__MasterConfig__Main.json` to include the new project:

```json
{
    "applicationName": "Whitecardopedia",
    "version": "1.0.0",
    "projectsBasePath": "Projects/2025",
    "projects": [
        {
            "folderId": "ExampleProject_GardenHouse_Alpha",
            "enabled": true
        },
        {
            "folderId": "MyNewProject_GardenHouse_Beta",
            "enabled": true
        }
    ]
}
```

### Step 5: Refresh Application

Reload the application in your browser. The new project will appear in the gallery.

---

## Project Configuration

### project.json Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectName` | string | ✅ Yes | Display name of the project |
| `projectCode` | string | ✅ Yes | Unique project identifier (e.g., VGH-2025-001) |
| `productionData` | object | ❌ No | Optional production information |
| `productionData.input` | string | ❌ No | Source material type (e.g., "CAD File", "Hand Drawn Concept") |
| `productionData.conceptArtist` | string | ❌ No | Designer who created the concept (e.g., "Anna", "James") |
| `productionData.additionalNotes` | string | ❌ No | Free-form production notes |
| `scheduleData` | object | ❌ No | Optional schedule and time tracking information |
| `scheduleData.dateReceived` | string | ❌ No | Date project was received in DD-MMM-YYYY format |
| `scheduleData.dateFulfilled` | string | ❌ No | Date project was completed in DD-MMM-YYYY format |
| `scheduleData.timeAllocated` | number | ❌ No | Time allocated for project in hours |
| `scheduleData.timeTaken` | number | ❌ No | Actual time taken to complete project in hours |
| `sketchUpModel` | object | ❌ No | Optional SketchUp model link |
| `sketchUpModel.url` | string | ❌ No | URL to SketchUp model (omit or set "None"/"nil" to hide) |
| `images` | array | ✅ Yes | Array of image filenames |
| `description` | string | ❌ No | Optional project description |

### masterConfig.json Schema

| Field | Type | Description |
|-------|------|-------------|
| `applicationName` | string | Application name |
| `version` | string | Application version |
| `projectsBasePath` | string | Base path for project folders |
| `projects` | array | Array of project entries |
| `projects[].folderId` | string | Project folder name |
| `projects[].enabled` | boolean | Whether project is active |

---

## Development

### Technology Stack

- **React 18** - UI framework (CDN-loaded)
- **Babel Standalone** - JSX transformation
- **CSS Variables** - Vale Design Suite standards
- **JSON** - Configuration and data management

### CSS Architecture

Follows **Adam Noble Vale Design Suite** coding conventions:

- Regional structure with collapsible code folding
- Column-aligned CSS properties
- CSS custom properties for design system
- Inline commenting with `/* <-- Comment */` style
- Proper regional headers and dividers

### Component Architecture

**Presentational Components**:
- `StarRating` - Pure star display component
- `ImageCarousel` - Image navigation component

**Container Components**:
- `HomePage` - Landing page container
- `ProjectGallery` - Project list container
- `ProjectViewer` - Project detail container
- `App` - Root application container with routing

### Adding New Features

To add new features, follow these steps:

1. Create feature modules in `02__Src__AppModules/10__Feature__...` (or next appropriate numbered feature band)
2. Follow Vale Design Suite conventions and `Na__` naming
3. Add corresponding stylesheet in `03__Style__AppStylesheets/`
4. Import stylesheet via `03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css`
5. Register feature scripts in `app.html` and integrate into `02__Src__AppModules/02__AppCore/Na__AppCore__WhitecardopediaApp.jsx`

---

## Utility Tools

### Image Auto-Discovery Utility

The **Image Auto-Discovery Utility** (`update_project_images.py`) automatically discovers and updates project images based on the `IMG##__` prefix naming convention.

#### Features

- ✅ **Automatic Discovery** - Scans all project folders for images with `IMG##__` prefix
- ✅ **Numeric Sorting** - Sorts images by numeric prefix (IMG01, IMG02, IMG03...)
- ✅ **Multiple Formats** - Supports PNG, JPG, JPEG, SVG, GIF, WEBP
- ✅ **Safe Updates** - Preserves all other project.json fields
- ✅ **Dry-Run Mode** - Preview changes before applying them
- ✅ **Summary Report** - Shows detailed results for each project
- ✅ **Colored Output** - Easy-to-read console feedback

#### Usage

**Update All Projects**:
```bash
python update_project_images.py
```

**Preview Changes (Dry-Run)**:
```bash
python update_project_images.py --dry-run
```

**Update Specific Project**:
```bash
python update_project_images.py --project NY-29951__McNerney
```

**Windows Batch File**:
```bash
# Update all projects
update_images.bat

# Preview changes only
update_images.bat --dry-run
```

#### Example Output

```
================================================================================
IMAGE DISCOVERY RESULTS
================================================================================

[+] NY-29951__McNerney
    Images: 4 -> 7
    Status: Updated

[=] HS-61747__Harris
    Images: 2 (no changes)

================================================================================
SUMMARY
================================================================================
Projects processed    : 2
Successful operations : 2
Projects changed      : 1
Total images found    : 9
================================================================================
```

#### When to Use

- ✅ After adding new images to a project folder
- ✅ When setting up a new project with multiple images
- ✅ Before deploying to GitHub Pages
- ✅ To verify all projects have correct image references

---

## Deployment

### GitHub Pages Deployment

The application is designed to work with GitHub Pages at:

```
https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia
```

**Deployment Steps**:

1. Commit all files to repository
2. Push to GitHub
3. Enable GitHub Pages in repository settings
4. Application will be accessible at the URL above

### Important Notes

- `index.html` provides immediate redirect to `app.html`
- No additional build step required
- All assets use relative paths
- Compatible with static hosting services

### Alternative Hosting

The application can be hosted on any static hosting service:
- **Netlify** - Drag and drop deployment
- **Vercel** - Git-based deployment
- **AWS S3** - Static website hosting
- **Azure Static Web Apps** - Microsoft cloud hosting

---

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ Internet Explorer - Not supported (requires ES6)

---

## Troubleshooting

### Images Not Loading

**Problem**: Images show as broken links  
**Solution**: 
- Verify image filenames in `project.json` match actual files
- Ensure images are in correct project folder
- Check file extensions (JPG vs JPEG)
- Use lowercase filenames consistently

### Projects Not Appearing

**Problem**: Projects don't show in gallery  
**Solution**:
- Verify `masterConfig.json` includes project folder ID
- Check `enabled: true` in masterConfig
- Ensure `project.json` exists in project folder
- Validate JSON syntax (use JSONLint.com)

### CORS Errors

**Problem**: Console shows CORS or fetch errors  
**Solution**:
- Must use local web server (not `file://` protocol)
- Use Python HTTP server, Node.js http-server, or VS Code Live Server

---

## License

© 2025 Adam Noble - Noble Architecture  
Part of Vale Design Suite

---

## Support

For questions or issues, contact:  
**Adam Noble** - Noble Architecture

---

**Version**: 0.0.7 - Download Images Feature  
**Last Updated**: 10-Oct-2025
