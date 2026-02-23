# ValeVision3D v1.9.2 Tasks

## Materials System

### BACKGROUND 
The render engine was built initially to handle Whitecard renders and it utilizes both a mesh and a line work model export which should still be retained as it gives me flexibility rendering lines.

### INTRODUCTION 
- We need to add more materials I've started building out a library in which all materials can be found `src__AppConfig/Na__AppConfig__MaterialsLibrary.json`
- there should be a lookup system that swaps the SketchUp/glb export model material configurations for what are shown in a materials config file `src__AppConfig/Na__AppConfig__MaterialsLibrary.json`

### THE ISSUE
- After the massing and basic form analysis section of the concept design is complete the app is currently very limited in terms of how it renders materials and whilst at the moment we don't need any complex materials we need to be able to render reflections and opacity correctly to be able to show simple concept models of houses etc. 
- currently window panes are solid when they should be transparent and have a slight reflection to mimic

### TASKS
1. Check how the current system applies materials, both the SketchUp glb export and the App logic.
2. Look at current materials .json and add a new template object with all possible config fields such An example section showing the PBR fields and then a second section with URLs if textures exist one for each map in the previous section so there are two sections per material one housing this settings that affect things like roughness or metallic or opacity etc and then second that has all of the URLs if the material loads web materials that should override the texture in the gltf/glb file loaded effectively acting as a hot swap.

### AIMS OF SYSTEM
- to create a robust programmatic materials swapping system that targets SketchUp material names based on a strict naming convention `MAT0001__Example` 
- The SketchUp to GLB exporter should save the materials in a format where these names can be read downstream by the web app and then matched with the material data .json to configure different materials such as Glass / Mirror etc based on the configurations in the PBR sections of each respective material in the material data. 
- Create and efficient hot swap system that just works and doesn't require any intermediate configuration as the configuration will be handled by the materials library which is a single source of Truth.
- By using a central .json file To configure the materials this also means it will be extensible in the future as the material system naming devised is modular by Design and over time more series will be added expanding the list of materials further

### IMPORTANT CODING RULES
- Separate concerns as much as possible within new files. 
- Use the established three-stage name spacing system. 
- Carefully check all of the systems and build out a mental picture of the structures of dependencies between scripts. 
- Strictly use the existing units and Mass helper scripts already set up don't reinvent the wheel. 
- Use the app config file as much as possible for defaults driving downstream variables and constants in the modules. 

### IMPORTANT 
- The material data .json should be a single source of truth for the app and if materials within the model match the naming in here then the render engine should render things like metallic-ness roughness bump normal opacity roughness etc, all of your typical PBR effects.
- it is important that if the SketchUp material is not named or if the material in the web app is just the default material it should still be rendered in the white card style currently utilized as I don't want to detract from the app being able to be used for schematic easy first stage massing like it was originally developed for it should exclude rendering any of the PBR effects unless PBR materials are found in the materials data library. 
- think of it as if the material is tagged with one of our prefixes then the renderer knows to render that such as glass or mirror but if the naming is not found it renders it exactly as it is now so we retain the look and feel of the app currently meaning simple massing models will still be achievable but then if you want to add Windows to the building, if the materials are correctly named in SketchUp when you run the SketchUp to glb converter they will be correctly named in the exports and then loaded by the web app and checked against the data and any materials swapped / the PBR attributes assigned automatically.

## MODULES TO DEVELOP
WebApp Side:

### SketchUp Ruby Side:
- The GLB Exporter will need to be updated to handle the new materials system.
LOCATION = `C:\Users\Administrator\AppData\Roaming\SketchUp\SketchUp 2026\SketchUp\Plugins\Na__TrueVision__WhitecardModel__GlbBuilderUtility__Modules__`
FILE: `Na__TrueVision__GlbBuilder__EngineCore__MaterialHandling__.rb`
- This module is responsible for handling the materials in the SketchUp model and exporting them to a GLB file.
- This current materials handler is a minimal placeholder system that needs to be updated to handle the new materials system.
- Note there are several other files not limit to . . . .
FILE: `Na__TrueVision__GlbBuilder__Main__.rb`
FILE: `Na__TrueVision__GlbBuilder__EngineCore__.rb`
FILE: `Na__TrueVision__GlbBuilder__CoreExport__.rb`
- So ensure you map out the export process and how the materials are handled and exported.

#### NEW PLUGIN SIDE RUBY FILE TO DEVELOP: 
`Na__TrueVision__GlbBuilder__EngineCore__MaterialLookupSystem__.rb`
- Update the UI to toggle "Export Standard Materials" - This exports the materials that are part of our system.
Update the app to read this file from URL and build some logic to handle the materials and apply them to the model.
`https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/src__AppConfig/Na__AppConfig__MaterialsLibrary.json` 
Using this URL Allows the Json to be read from the web and efficient sorting of the materials, If the material is not found in the library it should still be exported as it is currently (The Default Whitecard Material).
  - This avoid bloated GLB Files and ensures the SketchUp to GLB converter is efficient and fast.

### MAP THE PROJECT FIRST BEFORE CODING
- The project is HIGHLY modular thus you need to build a picture of the existing systems to see how to wire up the new system to the existing systems.