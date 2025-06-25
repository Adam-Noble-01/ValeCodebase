# 🧠 ValeDesignSuite Project Architecture 3D Neural Network Visualizer

A dynamic, real-time project architecture visualization tool that creates interactive 3D neural network maps of your codebase dependencies using Three.js.

## ✨ New 3D Features

- **🌐 True 3D Space** - Navigate your project in full 3D with intuitive orbit controls
- **🎨 Visual Hierarchy** - Node sizes reflect importance and connection count
- **🔗 Connection Types** - Different colors and line weights for imports, requires, stylesheets, etc.
- **📊 Force-Directed Layout** - Physics simulation for natural node positioning
- **🏷️ Smart Labels** - Text labels that face the camera and scale appropriately
- **✨ Hover Effects** - Highlight connections and related nodes on hover
- **🎯 Node Selection** - Click to select and pulse connected nodes

## 🚀 Quick Start

### 1. Start the Dynamic Server
```bash
cd Dev__DeveloperToolsAndUtilties/DevUtility__ProjectArchitectureMapper/
python LocalServer__LaunchFlaskServer.py
```

### 2. Open the 3D Visualization
Navigate to: `http://localhost:5000`

The server will automatically:
- Scan your entire project structure
- Parse file dependencies with connection type detection
- Serve the interactive 3D neural network visualization

## 🎮 3D Navigation Controls

| Action | Description |
|--------|-------------|
| **Left Click + Drag** | Rotate camera around scene |
| **Right Click + Drag** | Pan camera position |
| **Scroll Wheel** | Zoom in/out |
| **Click Node** | Select and pulse connections |
| **Hover Node** | Highlight immediate connections |

### Keyboard Shortcuts
- **R** - Reset camera to default view
- **Space** - Pause/resume physics simulation
- **N** - Trigger random neural pulse effect

## 🏗️ Architecture

### Flask Server (`LocalServer__LaunchFlaskServer.py`)
- **Dynamic scanning** - Real-time project analysis
- **Connection type detection** - Identifies imports, requires, stylesheets, scripts, assets
- **API endpoints** - RESTful data serving with metadata
- **Performance tracking** - Scan timing and statistics

### Frontend Files
- **`index.html`** - Main visualization page with Three.js setup
- **`MapGraph__Stylesheet.css`** - Open Sans fonts & neural styling with 3D-specific styles
- **`MapGraph__3dVisualizationLogic.js`** - Three.js 3D neural network engine
- **`MapGraph__DataLoader.js`** - Dynamic API data loader

## 🎨 Visual Hierarchy System

### Node Sizing
- **Base size** - Determined by file type
- **Connection multiplier** - Larger nodes have more connections
- **Type multipliers**:
  - Folders: 2.0x (boxes instead of spheres)
  - HTML: 1.5x
  - JavaScript: 1.3x
  - CSS: 1.2x
  - JSON: 1.0x
  - SketchUp: 1.4x
  - Layout: 1.3x
  - CAD: 1.3x
  - Blender: 1.4x
  - Photoshop: 1.2x
  - PDF: 1.1x
  - Others: 0.8x

### Connection Types & Colors
- **Import** (Orange) - ES6 imports
- **Require** (Dark Orange) - CommonJS requires
- **Stylesheet** (Green) - CSS links
- **Script** (Cyan) - Script tags
- **Hierarchy** (Pink) - Folder structure
- **Contains** (Purple) - Folder contains file
- **Asset** (Yellow) - Images, fonts, models

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/graph-data` | GET | Project structure with typed connections |
| `/api/refresh` | POST | Force refresh project scan |
| `/api/status` | GET | Server status and configuration |

## 📁 File Types Supported

The 3D visualizer recognizes and color-codes these file types:

- **Web Files**: `.html` (cyan), `.js` (orange) JavaScript, `.css` (green), `.json` (light blue), `.md` (gray)
- **3D Models**: `.glb`, `.gltf` (orange-red)
- **Images**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp` (yellow)
- **Fonts**: `.ttf`, `.woff`, `.woff2`, `.otf` (purple)
- **HDRI**: `.hdr`, `.exr` (turquoise)
- **Audio**: `.mp3`, `.wav`, `.ogg` (peach)
- **Video**: `.mp4`, `.webm` (blue)
- **Design & CAD**: `.skp` SketchUp (red-orange), `.layout` Layout (orange-red), `.dwg/.dxf` CAD (blue), `.blend` Blender (bright orange), `.psd` Photoshop (blue), `.pdf` PDF (red)
- **Folders**: (pink boxes)

## 🎨 ValeDesignSuite 3D Design Standards

- **Typography**: Open Sans font family with proper weights
- **Color Scheme**: Neural network themed with type-specific node colors
- **Layout**: 3D space with force-directed physics simulation
- **Animations**: Smooth transitions, hover effects, and pulse animations
- **Materials**: Emissive glow effects with Phong shading

## ⚡ Performance Optimizations

- **Force simulation** - D3.js physics with configurable parameters
- **LOD system** - Level of detail for large projects
- **Efficient rendering** - WebGL with antialiasing
- **Smart updates** - Only re-render changed elements
- **Curved connections** - Bezier curves for visual clarity

## 🔧 Development

### Requirements
- Python 3.7+
- Flask
- Modern web browser with WebGL support
- Three.js r128 (loaded from CDN)
- D3.js v7 (for force simulation)

### Configuration
Edit constants in `MapGraph__3dVisualizationLogic.js`:

```javascript
const SCENE_CONFIG = {
    BACKGROUND_COLOR: 0x0a0a1a,
    FOG_NEAR: 100,
    FOG_FAR: 1000,
    CAMERA_FOV: 75,
    INITIAL_CAMERA_POS: { x: 200, y: 200, z: 200 }
};

const PHYSICS_CONFIG = {
    FORCE_STRENGTH: -300,
    LINK_DISTANCE: 100,
    LINK_STRENGTH: 0.2,
    CENTER_FORCE: 0.05,
    DAMPING: 0.95
};
```

### Project Structure
```
DevUtility__ProjectArchitectureMapper/
├── LocalServer__LaunchFlaskServer.py          # Flask server with connection type detection
├── index.html         # 3D visualization page
├── MapGraph__Stylesheet.css          # Styling with 3D-specific styles
├── MapGraph__3dVisualizationLogic.js # Three.js 3D neural network engine
├── MapGraph__DataLoader.js          # Dynamic API data loader
└── README.md             # This file
```

## 🎯 Key Improvements in 3D Version

- **Spatial Separation** - Nodes spread out in 3D space, reducing clustering
- **Visual Connection Types** - Different colors and weights show relationship types
- **Orbit Controls** - Industry-standard 3D navigation like CAD software
- **Node Hierarchy** - Visual size represents importance in the project
- **Physics Simulation** - Natural positioning with force-directed layout
- **Camera-Facing Labels** - Text sprites that always face the viewer
- **Depth Cues** - Fog and lighting for better depth perception

## 🔮 Future Enhancements

- **VR Support** - WebXR integration for immersive exploration
- **Clustering** - Group related files into collapsible clusters
- **Time Machine** - Visualize project evolution over git history
- **Heat Maps** - Show file change frequency or complexity
- **Search & Filter** - Find and isolate specific parts of the project
- **Export** - Save visualizations as images or 3D models

---

**ValeDesignSuite 3D Project Architecture Visualizer**  
*Navigate your codebase in stunning 3D neural networks*

## Deprecated Files

**⚠️ DEPRECATED - 2D Visualization**
- `map_visualization.js` - Old D3.js 2D visualization (replaced by 3D version)

The 2D approach became too cluttered for complex projects.
The 3D approach provides better spatial separation and navigation. 