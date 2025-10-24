# Project Editor Tool - Whitecardopedia

## Overview

The Project Editor tool is a localhost-only utility for editing project.json metadata files directly within the Whitecardopedia application. It eliminates the need to open an IDE for simple project updates, streamlining the workflow for managing project data.

---

## Features

### Core Functionality
- **In-App Editing**: Edit project metadata without leaving the browser
- **Gallery-Style Selection**: Browse and search projects to find the one you want to edit
- **Form-Based Interface**: Clean, intuitive form for updating project fields
- **Real-Time Validation**: Validates required fields before saving
- **Success/Error Feedback**: Clear messaging for save operations
- **Localhost Detection**: Automatically detects if running on localhost vs static web

### Editable Fields
- **Project Name** - Display name for the project
- **Project Code** - Unique project identifier
- **Project Date** - Date in DD-MMM-YYYY format (e.g., 16-Oct-2025)
- **Production Input** - Source material type (CAD File, Hand Drawing, etc.)
- **Additional Notes** - Detailed production notes and context
- **SketchUp Model URL** - Link to SketchUp 3D Warehouse model

### Safety Features
- Form validation prevents saving invalid data
- Localhost-only operation prevents accidental edits on deployed version
- Alert message guides users to localhost when accessed from static web
- Original project.json preserved if save operation fails

---

## Architecture

### Backend - Flask API Server

The Project Editor uses a Flask server instead of Python's simple HTTP server to enable two-way communication.

**Server File**: `server.py`

**API Endpoints**:
- `GET /api/check-localhost` - Confirms localhost environment
- `GET /api/projects` - Lists all projects from masterConfig.json
- `GET /api/projects/<folder_id>` - Retrieves specific project.json
- `POST /api/projects/<folder_id>` - Saves updated project.json

**Dependencies**: Installed to `src/ThirdParty__VersionLockedDependencies/SERVER__FlaskServerDepencies/`
- Flask 3.0.0
- Flask-CORS 4.0.0
- Werkzeug, click, itsdangerous, Jinja2, MarkupSafe

### Frontend - React Components

**New Components**:
1. **HamburgerMenu.jsx** - Navigation menu for utility tools
   - Toggle button with three-line icon
   - Dropdown menu with "Project Editor" option
   - Positioned left of search bar in gallery
   - Designed for future tool additions

2. **ProjectEditor.jsx** - Main editor view
   - Gallery-style project selection interface
   - Search and filter controls for finding projects
   - Manages editor view states (selection/editing)
   - "Back to Gallery" navigation

3. **ProjectEditorForm.jsx** - Project data form
   - Input fields for all editable properties
   - Form validation and error handling
   - Save/Cancel buttons with disabled states
   - Success/error message display

**New Utilities**:
- **localhostDetector.js** - Detects localhost vs web deployment
  - Pings Flask API to confirm server availability
  - Shows alert if user tries to edit on static web version

**New Styles**:
- **tools.css** - Stylesheet for editor and future tools
  - Hamburger menu and dropdown styles
  - Form input and button styles
  - Success/error message styles
  - Follows Vale Design Suite standards

### Updated Components

**App.jsx**:
- Added `EDITOR` view state to `APP_VIEWS`
- Added `handleOpenProjectEditor` function with localhost check
- Added conditional rendering for `ProjectEditor` view
- Passes `onOpenProjectEditor` to `ProjectGallery`

**ProjectGallery.jsx**:
- Added `HamburgerMenu` component to controls section
- Receives `onOpenProjectEditor` prop from App
- Passes handler to HamburgerMenu component

**app.html**:
- Added `tools.css` stylesheet link
- Added script tags for new components and utilities
- Updated in correct dependency order

---

## Installation

### 1. Install Flask Dependencies

**Windows**:
```batch
cd D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia
pip install -r src\ThirdParty__VersionLockedDependencies\SERVER__FlaskServerDepencies\requirements.txt
```

**macOS/Linux**:
```bash
cd /path/to/WebApps/Whitecardopedia
pip3 install -r src/ThirdParty__VersionLockedDependencies/SERVER__FlaskServerDepencies/requirements.txt
```

See `src/ThirdParty__VersionLockedDependencies/SERVER__FlaskServerDepencies/INSTALL.md` for detailed installation instructions.

### 2. Start the Server

**Windows**:
```batch
start_server.bat
```

**macOS/Linux**:
```bash
./start_server.sh
```

The server will start on `http://localhost:8000`

---

## Usage

### Accessing Project Editor

1. **Launch Local Server**
   - Run `start_server.bat` (Windows) or `./start_server.sh` (macOS/Linux)
   - Open browser to http://localhost:8000

2. **Navigate to Gallery**
   - Click "Enter" from the home page
   - The gallery view will display with search and filter controls

3. **Open Project Editor**
   - Click the hamburger menu (☰) icon left of the search bar
   - Select "Project Editor" from the dropdown menu

4. **Select Project to Edit**
   - Browse the gallery of projects
   - Use search to filter by name or code
   - Click on a project card to edit it

5. **Edit Project Data**
   - Update any of the editable fields
   - Required fields: Project Name, Project Code, Project Date
   - Optional fields: Production Input, Notes, SketchUp URL

6. **Save Changes**
   - Click "Save Changes" to write updates to project.json
   - Success message confirms save operation
   - Form automatically returns to project selection after save

7. **Cancel Editing**
   - Click "Cancel" to discard changes and return to selection view

### Static Web Version Behavior

When accessing the Project Editor from a static web deployment:
- Clicking "Project Editor" in hamburger menu shows alert
- Alert message: "Sorry this tool is not yet available in the Web Version, Run on Local Host To Edit Project Details"
- User must run application on localhost to use editor

---

## File Structure

```
WebApps/Whitecardopedia/
├── server.py                              # Flask API server (NEW)
├── start_server.bat                       # Windows launcher (UPDATED)
├── start_server.sh                        # Unix/Mac launcher (UPDATED)
├── app.html                               # Main HTML (UPDATED)
├── SERVER__FlaskServerDepencies/          # Flask dependencies folder (NEW)
│   ├── requirements.txt                   # Version-locked dependencies
│   └── INSTALL.md                         # Installation guide
├── src/
│   ├── components/
│   │   ├── App.jsx                        # Main app component (UPDATED)
│   │   ├── ProjectGallery.jsx             # Gallery view (UPDATED)
│   │   ├── HamburgerMenu.jsx              # Menu component (NEW)
│   │   ├── ProjectEditor.jsx              # Editor view (NEW)
│   │   └── ProjectEditorForm.jsx          # Editor form (NEW)
│   ├── utils/
│   │   └── localhostDetector.js           # Localhost detection (NEW)
│   └── styles/
│       ├── variables.css                  # CSS variables (existing)
│       ├── app.css                        # Main styles (existing)
│       └── tools.css                      # Tools styles (NEW)
└── Projects/
    └── 2025/
        └── [project folders]/
            └── project.json               # Editable project metadata
```

---

## Code Conventions

All new code follows the **Adam Noble ValeDesignSuite** coding conventions:

### Regional Structure
- 77-character dividers for regions
- 58-character underlines for function headers
- 4-space indentation within regions for collapsible structure

### Commenting Style
- Inline arrow comments `// <--` for explanations
- Simple `//` comments for descriptions
- Column-aligned comments for related items

### File Headers
- Markdown-style header blocks with `=` dividers
- File metadata: FILE, NAMESPACE, MODULE, AUTHOR, PURPOSE, CREATED
- Description section with bullet points
- No VERSION field in headers

### CSS Conventions
- Property alignment at consistent column (39-40 characters)
- CSS custom properties in `:root` selector
- Vale Design Suite variable system
- Responsive design with media queries

---

## Future Expansion

The Project Editor tool is designed for future expansion:

### Hamburger Menu
- Structured to easily add more tools
- Menu items can be added from `Tools__LiveWebAppUtils/` folder
- Dropdown automatically accommodates additional items

### Flask API
- Structured to support additional endpoints
- Can be extended for other data management operations
- Ready for more complex data manipulation tools

### Tools Stylesheet
- Generic styling ready for other utility interfaces
- Consistent Vale Design Suite standards
- Reusable form and button components

---

## Troubleshooting

### "Module not found" Error
**Problem**: Flask dependencies not installed  
**Solution**: Run `pip install -r SERVER__FlaskServerDepencies\requirements.txt`

### Port 8000 Already in Use
**Problem**: Another service is using port 8000  
**Solution**: Edit `server.py` and change `SERVER_PORT = 8000` to another port

### Changes Not Saving
**Problem**: Running on static web version  
**Solution**: Use `start_server.bat` to run on localhost

### Alert When Clicking Project Editor
**Problem**: Application running on static web server  
**Solution**: Close static server and use Flask server instead

### Hamburger Menu Not Appearing
**Problem**: Component script not loading  
**Solution**: Check browser console for script errors, verify `app.html` includes all component scripts

---

## Technical Notes

### JSON Validation
- Required fields: `projectName`, `projectCode`, `projectDate`
- Validates structure before sending to API
- Prevents saving malformed JSON

### Data Persistence
- Changes written directly to project.json files
- No database required
- Original file preserved if save fails

### CORS Configuration
- Flask-CORS enables cross-origin requests
- Required for localhost development
- All routes accept requests from any origin

### Error Handling
- Network errors caught and displayed to user
- Server errors return JSON with error message
- Client-side validation before API calls

---

## Version History

**Version 1.0.0** - Initial Release
- Flask API server implementation
- Project Editor tool with form-based editing
- Hamburger menu navigation
- Localhost detection and alerts
- Vale Design Suite styling

---

## Author

**Adam Noble** - Noble Architecture

**Created**: 2025

**Purpose**: Streamline project metadata editing workflow for Whitecardopedia

