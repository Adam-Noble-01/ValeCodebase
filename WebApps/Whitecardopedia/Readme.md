# Whitecardopedia React Image Viewer Application

## Application Structure

### Core Files Setup

- **index.html** - Immediate redirect to `app.html`
- **app.html** - React application container with proper script imports
- **Projects/** folder structure for dynamic project loading:
- - `Projects/2025/[ProjectFolderName]/` - Each subfolder represents a project
    - `Projects/2025/[ProjectFolderName]/project.json` - Project metadata file
    - `Projects/2025/[ProjectFolderName]/*.jpg|png` - Project images

### React Application Architecture

**Main Components** (in `src/components/`):

1. **App.jsx** - Root component, handles routing and state
2. **HomePage.jsx** - Landing page with Whitecardopedia logo
3. **ProjectGallery.jsx** - Grid view of all available projects
4. **ProjectViewer.jsx** - Individual project image viewer with ratings
5. **StarRating.jsx** - Reusable star rating display component
6. **ImageCarousel.jsx** - Image navigation component

**Data Management** (in `src/data/`):

- **masterConfig.json** - Master configuration file listing all projects
- **projectLoader.js** - Utility to dynamically load project data

**Styling** (in `src/styles/`):

- **variables.css** - Vale Design Suite CSS variables
- **app.css** - Main application styles following Adam Noble conventions

### Project JSON Schema

```
{  "projectName": "Garden House Alpha",  "projectCode": "VGH-2025-001",  "quality": 4,  "prestige": 5,  "value": 3,  "images": ["image1.jpg", "image2.jpg", "image3.jpg"],  "description": "Optional project description"}
```

### Vale Design Suite Styling Integration

- Color palette: Use `--TrueVision_PrimaryBrand: #555041`
- Typography: Open Sans font family
- Layout: Clean, professional board-presentation style
- Regional CSS structure with proper commenting
- Column-aligned CSS properties

### File Creation Checklist

1. Setup redirect `index.html` → `app.html`
2. Create React container `app.html` with CDN imports (React, ReactDOM, Babel)
3. Build component structure in `src/components/`
4. Implement CSS following Vale standards in `src/styles/`
5. Create `masterConfig.json` with project index
6. Build `projectLoader.js` for dynamic folder scanning
7. Create example project folder structure in `Projects/2025/ExampleProject/`
8. Add sample `project.json` and images for testing

### Key Features

- Immediate redirect from index to app
- Logo splash before project navigation
- Dynamic project loading from folder structure
- Star ratings for Quality, Prestige, Value
- Image carousel for multiple project images
- Clean, board-presentation interface
- Responsive design for different screen sizes