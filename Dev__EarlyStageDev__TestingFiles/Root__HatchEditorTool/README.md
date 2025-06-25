# Vale Design Suite - Hatch Editor Tool

## Overview

The Hatch Editor Tool is a web-based interface for creating organic, humanized artistic hatches for architectural drawings. It provides real-time preview and adjustment capabilities for various hatching patterns with a modern, responsive layout featuring a draggable divider for customizable interface sizing.

## Features

- **Dynamic Pattern Loading**: Loads pattern configurations from JSON files
- **Real-time Preview**: Live preview of hatch patterns as you adjust parameters
- **Organic Rendering**: Creates hand-drawn appearance with jitter and randomness
- **Multiple Adjustment Parameters**: Fine-tune brick dimensions, randomness, jitter, and patch properties
- **DXF File Support**: Load and preview hatches on DXF boundary data
- **Responsive Layout**: Modern 1/3 - 2/3 split layout with draggable divider
- **Interactive Interface**: Drag to resize panels, double-click to reset layout

## Layout Features

### Default Layout Structure
- **Left Panel (1/3)**: Control panel containing all tool controls and settings
- **Right Panel (2/3)**: Canvas area for displaying and editing hatch patterns
- **Draggable Divider**: 6px wide divider between panels that can be dragged to adjust the split

### Interactive Layout Controls
- **Drag to Resize**: Click and drag the divider to resize panels in real-time
- **Double-Click Reset**: Double-click the divider to reset to the default 1/3 - 2/3 split
- **Visual Feedback**: Divider changes color and shows glow effect during interaction
- **Constraints**: Panel width is constrained between 250px (minimum) and 600px (maximum)
- **Hover Effects**: Divider changes color when mouse hovers over it with cursor change

### Responsive Design
- **Desktop**: Horizontal layout with draggable vertical divider
- **Mobile/Tablet**: Vertical layout with draggable horizontal divider (control panel on top, canvas below)
- **Automatic Adaptation**: Layout adjusts to different screen sizes automatically

## Quick Start

### Option 1: Using the Batch File (Windows)
1. Double-click `start_server.bat`
2. Open your browser to `http://localhost:8000/index.html`

### Option 2: Manual Server Start
1. Open a terminal/command prompt in this directory
2. Run: `python local_server.py`
3. Open your browser to `http://localhost:8000/index.html`

### Option 3: Using Node.js (Alternative)
1. Install Node.js if you don't have it
2. Run: `npx http-server -p 8000`
3. Open your browser to `http://localhost:8000/index.html`

## Usage

### Basic Workflow
1. **Load Test Data**: Click "Load Test Wall" to load a sample wall with windows
2. **Select Pattern**: Choose "Metric Brickwork - Pattern 01" from the dropdown
3. **Adjust Parameters**: Use the sliders to adjust:
   - **Brick Length**: Controls the length of individual bricks
   - **Brick Height**: Controls the height of individual bricks
   - **Brickwork Randomness**: Adds variation to brick dimensions
   - **General Linework Jitter**: Makes lines appear hand-drawn
   - **General Patch Occurrence**: Controls frequency of irregular patches
   - **General Patch Randomness**: Controls variation in patch properties
4. **Preview**: The preview updates automatically with "Live Preview" enabled
5. **Export**: Click "Export to SketchUp" to download the configuration

### Layout Customization
1. **Adjust Panel Size**: Click and drag the divider between panels to resize
2. **Reset Layout**: Double-click the divider to reset to default size
3. **Responsive**: Layout automatically adapts to different screen sizes
4. **Constraints**: Panel sizes are automatically constrained to usable limits

## File Structure

```
Root__HatchEditorTool/
├── index.html                              # Main interface
├── style.css                               # Styling with responsive layout
├── local_server.py                         # Python development server
├── start_server.bat                        # Windows server starter
├── README.md                               # This file
├── EditorTool__HatchEditorUI/              # UI JavaScript files
│   ├── LayoutManager.js                    # Draggable divider functionality
│   ├── UserInterface.js                    # Main UI controller
│   ├── FileHandlersAndSchedulers.js        # File operations
│   └── EventHandlers.js                    # Event handling
├── EditorTool__HatchAdjustmentLogicScripts/ # Adjustment logic
│   ├── Adjustment__BrickworkHatchingAdjustmentLogic.js
│   ├── Adjustment__GeneralLineworkJitter.js
│   ├── Adjustment__GeneralPatchOccurrence.js
│   └── Adjustment__GeneralPatchRandomness.js
├── Patterns__HatchPatternLibrary/          # Pattern definitions
│   └── BrickPattern__MetricBrickwork__Pattern-01.json
└── Import__FilesForTesting/                # Test files
    └── Testing__SimpleWall__IncludingWindowCutouts.dxf
```

## Pattern Configuration

Patterns are defined in JSON files with the following structure:

```json
{
  "Metadata": {
    "Name": "Pattern Name",
    "Description": "Pattern description",
    "Units": "millimeters"
  },
  "HatchEditor__EnabledTools": {
    "HatchEditor__Slider01": "Adjustment__BrickLength",
    "HatchEditor__Slider02": "Adjustment__BrickHeight"
  },
  "PatternComponents": {
    "componentsMeta": {
      "allComponents__ContainerName": "PatternName"
    },
    "Brick__Standard_MetricBrick": {
      "SubComponent__Vertices": [...],
      "SubComponent__Transformation": {...}
    }
  }
}
```

## Technical Implementation

### CSS Features
- **CSS Variables**: Consistent Vale Design Suite color scheme and spacing
- **Flexbox Layout**: Modern flexbox-based responsive layout
- **CSS Custom Properties**: Dynamic styling with CSS variables
- **Smooth Transitions**: CSS transitions for smooth visual feedback

### JavaScript Features
- **Event Handling**: Comprehensive mouse event handling for drag operations
- **Window Resize**: Automatic adjustment on window resize
- **State Management**: Proper state tracking for drag operations
- **Performance**: Optimized event handling with proper cleanup

## Development

### Adding New Patterns
1. Create a new JSON file in `Patterns__HatchPatternLibrary/`
2. Define the pattern structure following the existing format
3. Add the pattern to the dropdown in `index.html`
4. Create corresponding adjustment logic if needed

### Adding New Adjustment Parameters
1. Add the parameter to the pattern JSON's `HatchEditor__EnabledTools`
2. Create adjustment logic in a new JavaScript file
3. Make functions globally available with `window.functionName = functionName`

## Troubleshooting

### CORS Errors
- Make sure you're running the local server (not opening the HTML file directly)
- Check that the server is running on the correct port (8000)

### Pattern Not Loading
- Verify the JSON file exists in the correct location
- Check the browser console for error messages
- Ensure the server is running and accessible

### Preview Not Working
- Check that both a DXF file and pattern are loaded
- Verify that "Live Preview" is enabled
- Check the browser console for JavaScript errors

### Layout Issues
- Ensure you're using a modern browser with CSS Grid and Flexbox support
- Check that JavaScript is enabled for the draggable divider functionality
- Verify the LayoutManager.js file is properly loaded

## Browser Compatibility
- Modern browsers with CSS Grid and Flexbox support
- Responsive design works on desktop, tablet, and mobile devices
- JavaScript features require ES6+ support

## Vale Design Suite Integration
- Follows Vale Design Suite coding conventions
- Uses consistent color scheme and typography
- Maintains brand identity and user experience standards
- Implements proper regional structure and commenting style

## Future Development

- Support for additional pattern types (stonework, roof tiles, etc.)
- Integration with SketchUp Ruby API
- Advanced pattern generation algorithms
- Material-specific rendering engines
- Batch processing capabilities
- Enhanced layout customization options

## License

This tool is part of the Vale Design Suite and follows the project's coding conventions and standards. 