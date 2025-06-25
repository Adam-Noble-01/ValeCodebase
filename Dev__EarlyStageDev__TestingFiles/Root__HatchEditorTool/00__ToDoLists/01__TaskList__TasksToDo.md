# Tasks To Do

## OBJECTIVE |  Develop Whole New Tool To Create Organic Humanised Artistic Hatches.

### Current Task - Root Location
`D:\10_CoreLib__ValeCodebase\Dev__EarlyStageDev__TestingFiles\Root__HatchEditorTool`  #<-- This is the root location of the Hatch Editor Tool During initial development.

### The Problem
- Using .jpg / .png textures to create hatches is not good enough.
  -  The repetitive nature of the textures makes the hatches look unnatural.
  - Vale Garden Houses's aesthetic cannot be achieved with using this image based approach.
  - The same is true with .pat / dxf / dwg files the repetition is visible.
- Vale Garden Houses use traditional Watercolour drawings currently.
- We need to digitise the process without loosing the human touch.

### My Observations
- I noticed a colleague physically drawing the hatches within sketchup upon walls so this is a good starting point.
- Having polygonal regions of say a wall marked out, we can then use the sketchup tools to create the hatch.
- The hatch can be then applied over a wider areas with more complex shapes and underlying randomisation steps.
- In a SketchUp Environment, we could select a target face / faces and then a new group will be created with the hatches geometry inside.

### The Solution
- Creating a new sketchup tool to create organic humanised artistic hatches.
- Generates the preview using the new HTML dialogue method and the initialisation of the tool is done via a HTML / JS / CSS.
- Only after commit the configured UI Settings in the HTML dialogue, the data be passed to SketchUp and geometry generated using the Sketchup Ruby API.

### Hatch Explanations
- The hatches will be represented as a series of lines.
- These lines will denote different architecture materials.
- They are designed to be stylised expressive and artistic.

#### CurrentMaterialList
- The patterns are stored in individual JSON files, one for each pattern.
- The JSON files are stored in the `D:\10_CoreLib__ValeCodebase\Dev__EarlyStageDev__TestingFiles\Patterns__HatchPatternLibrary` directory.


**BrickPattern__MetricBrickwork__Pattern-01.json**
```json
{
"Metadata": {
    "File"        : "BrickPattern__MetricBrickwork__Pattern-01.json",
    "Name"        : "MetricBrickwork_Pattern01",
    "Description" : "Brickwork Pattern 01",
    "Api"         : "SketchUp Ruby API",
    "Units"       : "millimeters",
    "Tolerance"   : 0.01,
    "CoorSystem"  : "right-handed",
    "Version"     : "2025",
    "Created"     : "25-Jun-2025",
    "Updated"     : "25-Jun-2025"
},
"HatchEditor__EnabledTools": {
    "HatchEditor__Slider01"  : "Adjustment__BrickLength",
    "HatchEditor__Slider02"  : "Adjustment__BrickHeight",
    "HatchEditor__Slider03"  : "Adjustment__BrickworkRandomness",
    "HatchEditor__Slider04"  : "Adjustment__GeneralLineworkJitter",
    "HatchEditor__Slider05"  : "Adjustment__GeneralPatchOccurrence",
    "HatchEditor__Slider06"  : "Adjustment__GeneralPatchRandomness"
},
"PatternComponents": {
    "componentsMeta": {
        "allComponents__ContainerName"     : "MetricBrickwork_Pattern01",
        "allComponents__SketchUpTag"       : "Brick_Layer",
        "allComponents__Visible"           : true,
        "allComponents__SmoothFaces"       : false,
        "allComponents__ShadowCasting"     : true,
        "allComponents__ShadowReceiving"   : true,    
        "allComponents__FrontFaceMaterial" : "Default",
        "allComponents__BackFaceMaterial"  : "Default"
    },
    "Brick__Standard_MetricBrick": {
        "SubComponent__Vertices": [
            {"point": [0.0, 10.0, 0.0]},  
            {"point": [215.0, 10.0, 0.0]},
            {"point": [215.0, 75.0, 0.0]},
            {"point": [0.0, 75.0, 0.0]}   
        ],
        "SubComponent__Transformation": {
            "origin": [0.0, 0.0, 0.0],
            "xaxis": [1.0, 0.0, 0.0],
            "yaxis": [0.0, 1.0, 0.0],
            "zaxis": [0.0, 0.0, 1.0]
        },
        "SubComponent__Macro": {
            "faceCreation"  :  false,
            "faceMaterial"  :  "Default"
        }
    },
    "MortarJoint__PerpendicularJoint": {
        "SubComponent__Vertices": [
            {"point": [215.0, 0.0, 0.0]},   
            {"point": [225.0, 0.0, 0.0]},   
            {"point": [225.0, 65.0, 0.0]},  
            {"point": [215.0, 65.0, 0.0]}   
        ],
        "SubComponent__Transformation": {
            "origin": [0.0, 0.0, 0.0],
            "xaxis": [1.0, 0.0, 0.0],
            "yaxis": [0.0, 1.0, 0.0],
            "zaxis": [0.0, 0.0, 1.0]
        },
        "SubComponent__Macro": {
            "faceCreation"  :  false,
            "faceMaterial"  :  "Default"
        }
    },
    "MortarJoint__BedJoint": {
        "SubComponent__Vertices": [
            {"point": [0.0, 0.0, 0.0]},    
            {"point": [225.0, 0.0, 0.0]},  
            {"point": [225.0, 10.0, 0.0]}, 
            {"point": [0.0, 10.0, 0.0]}    
        ],
        "SubComponent__Transformation": {
            "origin": [0.0, 0.0, 0.0],
            "xaxis": [1.0, 0.0, 0.0],
            "yaxis": [0.0, 1.0, 0.0],
            "zaxis": [0.0, 0.0, 1.0]
        },
        "SubComponent__Macro": {
            "faceCreation"  :  false,
            "faceMaterial"  :  "Default"
        }
    }
}
}

```

### HatchEditor__EnabledTools
- There will need to be scripts that drive these parameters from the HTML dialogue.
- The underlying math will need to be calculated and passed to the Ruby API from the HTML dialogue.
- The underlying match will be in Javascript.
- The JSON file configures what methods are available to the HTML dialogue.
- The Items in the JSON File dictate the loading order of the sliders in the UI integral to the Hatch Editor.
- The hatch editor allows for a graphical representation of the hatching process.
- Hatch Editor Sliders control the parameters of the hatch.
- The Hatch Editor Sliders will need to be able to be adjusted in real time.
- Due to the need for humanised artistic hatches these adjustable parameters are important.
- Different materials by nature require different parameters to be adjusted.
- Some materials may be able to share the same parameters.
  - Some examples may be:
    - `Adjustment__BrickworkRandomness`
    - `Adjustment__GeneralLineworkJitter`
    - `Adjustment__GeneralPatchOccurrence`
    - `Adjustment__GeneralPatchRandomness`



**Full List of Materials**
Note These are Future Materials not yet implemented.
- Stonework - Rough Limestone
- Stonework - Dressed Ashlar
- Roof Tiles - Slate Roof Tiles
- Roof Tiles - Clay Roman Roof Tiles
- Roof Tiles - Clay Rosemary Roof Tiles
- Wood Cladding - Oak
- Glass - Cross Hatching
- Metal - Steel


## --------------------------------------------------------

#### Step 01 - Create Temporary HTML file to test the UI
- This is important for rapid development and testing.
- Many features such as testing different hatching types etc will need to be tested in a temporary environment.
- This is much quicker than reloading SketchUp each time.

##### Placeholder File In lieu of vector data provided from Ruby API to HTML dialogue
- In the testing instance load this dxf file and test the hatching tool.
- `D:\10_CoreLib__ValeCodebase\Dev__EarlyStageDev__TestingFiles\Import__FilesForTesting\Testing__SimpleWall__IncludingWindowCutouts.dxf`
- this testing file is a simple wall face outline with windows punched out of it.
- In the future the tool will be able to load vector data from the Ruby API, directly from the SketchUp model. 
  - Eventually this will be the users selection of the target face / faces.

##### Testing Environment Files Created
- I have made the following files to test the UI and the hatching tool.

  *Editor Tool - Hatch Editor Testing Environment*
  - `index.html`
  - `style.css`

    *Editor Tool - Hatch Editor UI*
  - `/EditorTool__HatchEditorUI/UserInterface.js`
  - `/EditorTool__HatchEditorUI/FileHandlersAndSchedulers.js`
  - `/EditorTool__HatchEditorUI/EventHandlers.js`

  *Editor Tool - Hatch Adjustment Logic Scripts*
  - `/Patterns__HatchPatternLibrary/BrickPattern__MetricBrickwork__Pattern-01.json`

  *Editor Tool - Adjustment Logic Scripts*
  - `/EditorTool__HatchAdjustmentLogicScripts/Adjustment__BrickworkHatchingAdjustmentLogic.js`
  - `/EditorTool__HatchAdjustmentLogicScripts/Adjustment__GeneralLineworkJitter.js`
  - `/EditorTool__HatchAdjustmentLogicScripts/Adjustment__GeneralPatchOccurrence.js`
  - `/EditorTool__HatchAdjustmentLogicScripts/Adjustment__GeneralPatchRandomness.js`

  *Import__FilesForTesting*
  - This is the default file that is loaded into the testing environment.
  - This is a simple wall face outline with windows punched out of it.
  - The area of the wall is defined by the dxf file and will be used to test the hatching tool.
  - `Testing__SimpleWall__IncludingWindowCutouts.dxf`
  


## --------------------------------------------------------

### FUTURE DEVELOPMENT IDEAS

**HOT SWAPABLE MATERIALS**
- Utilise the the naming standards already used.
- Have SketchUp use materials already applied to faces for selecting the face for the hatching tool.
- The hatching tool uses these faces to define its area of application.
- This would be a highly efficient way to quickly create hatches on an entire file.
- Each face would have a unique group created for it and have the hatching applied to it.