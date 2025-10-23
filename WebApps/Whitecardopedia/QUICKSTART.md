# Whitecardopedia - Quick Start Guide

Get up and running with Whitecardopedia in 5 minutes.

---

## 🚀 Quick Start (3 Steps)

### Step 1: Start Local Server

**Windows:**
```bash
# Double-click this file:
start_server.bat
```

**Mac/Linux:**
```bash
# Make executable first:
chmod +x start_server.sh

# Then run:
./start_server.sh
```

**Or use Python directly:**
```bash
python -m http.server 8000
```

### Step 2: Open Browser

Navigate to:
```
http://localhost:8000
```

### Step 3: Use the Application

1. Click **"Enter Whitecardopedia"** on the landing page
2. **Enter PIN: 1234** when prompted (default placeholder PIN)
3. Browse projects in the gallery view
4. Click any project card to view details
5. Navigate images using arrow buttons or thumbnails
6. Click **"Back to Gallery"** to return

**Note**: The PIN is currently set to `1234` for testing. To change it, edit `src/components/PinEntry.jsx`.

---

## 📁 Add Your First Project

### 1. Create Project Folder

```
Projects/2025/MyProject_Name/
```

### 2. Add project.json

```json
{
    "projectName": "My Garden House",
    "projectCode": "VGH-2025-002",
    "projectDate": "10-Oct-2025",
    "productionData": {
        "input": "CAD File",
        "additionalNotes": "Project notes here"
    },
    "scheduleData": {
        "timeAllocated": 4,
        "timeTaken": 3
    },
    "sketchUpModel": {
        "url": "https://app.sketchup.com/share/..."
    },
    "images": ["image1.jpg", "image2.jpg"],
    "description": "Project description here"
}
```

### 3. Add Images

Copy your JPG or PNG images to the project folder:
```
Projects/2025/MyProject_Name/
├── project.json
├── image1.jpg
└── image2.jpg
```

### 4. Update masterConfig.json

Edit `src/data/masterConfig.json`:

```json
{
    "projects": [
        {
            "folderId": "MyProject_Name",
            "enabled": true
        }
    ]
}
```

### 5. Refresh Browser

Reload `http://localhost:8000` - your project will appear!

---

## ⭐ Rating Guide

**1-5 Star Scale:**

- **Quality** - Build quality and design execution
- **Prestige** - Brand positioning and market appeal
- **Value** - Cost effectiveness and competitiveness

---

## 🔧 Troubleshooting

**Problem**: Images don't load  
**Solution**: Check filenames in `project.json` match actual files

**Problem**: Project doesn't appear  
**Solution**: Verify folder ID in `masterConfig.json` matches folder name

**Problem**: CORS errors  
**Solution**: Must use local server (not `file://` protocol)

---

## 📖 Full Documentation

See [README.md](README.md) for complete documentation.

---

## 🎯 Example Project

An example project is included at:
```
Projects/2025/ExampleProject_GardenHouse_Alpha/
```

This demonstrates the correct structure with placeholder SVG images.

---

## 🌐 Deployment

For GitHub Pages deployment to:
```
https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia
```

Just push to GitHub - no build step required!

---

**Questions?** Contact Adam Noble - Noble Architecture

**Version**: 0.0.6 - First Major Stable Release

