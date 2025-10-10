# Whitecardopedia

**React-based Image Viewer for Vale Garden Houses Board Review**

A dynamic web application for reviewing whitecard (massing model) images with project metadata and star ratings.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Adding New Projects](#adding-new-projects)
- [Project Configuration](#project-configuration)
- [Rating System](#rating-system)
- [Development](#development)
- [Deployment](#deployment)

---

## Overview

Whitecardopedia is a quality control and presentation tool for the Vale Garden Houses board to review whitecard images (simple massing models). The application dynamically loads projects from a folder structure, displays project metadata, and presents star ratings for Quality, Prestige, and Value metrics.

**Author**: Adam Noble - Noble Architecture  
**Technology**: React (CDN), Vanilla CSS, JSON configuration  
**Design System**: Vale Design Suite Standards

---

## Features

- ✅ **Landing Page** - Whitecardopedia logo display with entry button
- ✅ **Project Gallery** - Grid view of all available projects with thumbnails
- ✅ **Project Viewer** - Full project display with image carousel
- ✅ **Star Ratings** - Visual display of Quality, Prestige, Value metrics (1-5 stars)
- ✅ **Image Carousel** - Navigate through multiple project images with thumbnails
- ✅ **Dynamic Loading** - Projects automatically loaded from folder structure
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile devices
- ✅ **Vale Design Suite** - Consistent branding and styling

---

## Project Structure

```
Whitecardopedia/
├── index.html                          # Redirect to app.html
├── app.html                            # React application container
├── README.md                           # This file
│
├── assets/
│   └── AppLogo__Whitecardopedia__.png  # Application logo
│
├── src/
│   ├── components/
│   │   ├── App.jsx                     # Root component with routing
│   │   ├── HomePage.jsx                # Landing page with logo
│   │   ├── ProjectGallery.jsx          # Project grid view
│   │   ├── ProjectViewer.jsx           # Individual project viewer
│   │   ├── StarRating.jsx              # Star rating component
│   │   └── ImageCarousel.jsx           # Image navigation component
│   │
│   ├── data/
│   │   ├── masterConfig.json           # Master project index
│   │   └── projectLoader.js            # Project loading utility
│   │
│   └── styles/
│       ├── variables.css               # CSS variables (Vale Design Suite)
│       └── app.css                     # Main application styles
│
└── Projects/
    └── 2025/
        └── [ProjectFolderName]/
            ├── project.json            # Project metadata
            └── *.jpg/*.png             # Project images
```

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
    "ratings": {
        "quality": 5,
        "prestige": 4,
        "value": 4
    },
    "productionData": {
        "input": "CAD File",
        "duration": 3,
        "additionalNotes": "Modern garden house with sustainable design principles"
    },
    "sketchUpModel": {
        "url": "https://3dwarehouse.sketchup.com/model/example"
    },
    "images": [
        "front_view.jpg",
        "side_view.jpg",
        "aerial_view.jpg"
    ],
    "description": "Modern garden house with sustainable design principles"
}
```

### Step 3: Add Project Images

Add image files (JPG or PNG) to the project folder. Image filenames must match the names listed in `project.json`.

```
Projects/2025/MyNewProject_GardenHouse_Beta/
├── project.json
├── front_view.jpg
├── side_view.jpg
└── aerial_view.jpg
```

### Step 4: Update Master Config

Edit `src/data/masterConfig.json` to include the new project:

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
| `ratings` | object | ✅ Yes | Nested ratings object containing quality, prestige, value |
| `ratings.quality` | number | ✅ Yes | Quality rating (1-5 stars) |
| `ratings.prestige` | number | ✅ Yes | Prestige rating (1-5 stars) |
| `ratings.value` | number | ✅ Yes | Value rating (1-5 stars) |
| `productionData` | object | ❌ No | Optional production information |
| `productionData.input` | string | ❌ No | Source material type (e.g., "CAD File") |
| `productionData.duration` | number | ❌ No | Production time in hours |
| `productionData.additionalNotes` | string | ❌ No | Free-form production notes |
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

## Rating System

All ratings use a **1-5 star scale**:

### Quality ⭐
Build quality, design execution, and attention to detail.

### Prestige ⭐
Brand positioning, market perception, and luxury appeal.

### Value ⭐
Cost effectiveness, market competitiveness, and ROI potential.

**Star Display**:
- ★★★★★ - 5 stars (Excellent)
- ★★★★☆ - 4 stars (Very Good)
- ★★★☆☆ - 3 stars (Good)
- ★★☆☆☆ - 2 stars (Fair)
- ★☆☆☆☆ - 1 star (Poor)

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

1. Create new component in `src/components/`
2. Follow Vale Design Suite conventions for code structure
3. Add corresponding CSS in `src/styles/app.css`
4. Import component in `app.html`
5. Integrate into `App.jsx` routing logic

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

**Version**: 1.0.0  
**Last Updated**: October 2025
