# ValeVision3D v1.9.2 Tasks

## Materials System

### IMPORTANT BACKGROUND & LEGACY SYSTEM CONSIDERATIONS
- The render engine was built initially to handle Whitecard renders and it utilizes both a mesh and a linework model exports which should still be retained as it gives me flexibility rendering lines.
- There are two systems, a SketchUp to GLB exporter and a WebApp 3D Renderer.
- There are two Render pipelines, one is the main project code which is live and a test environment code which is used for testing and development.
  - ADD THIS SYSTEM TO BOTH PIPELINES
  - Update the core render pipeline to handle the new materials system and update the test environment to handle the new materials system, calling the required modules and functions into the test environment and not duplicating code as I want to roll this out in tandem using the main app as the main source of truth, only duplicate the app config so I can independently configure the test environment app data without effecting the main app data.

### INTRODUCTION 
- We need to add more materials and their respective PBR / render pipeline configurations
- I've started building out a library in which all materials can be found and their respective PBR / render pipeline configurations can be found in the file `src__AppConfig/Na__AppConfig__MaterialsLibrary.json`
- We need to add a lookup system that swaps the SketchUp/glb export model material configurations for what are shown in a materials config file `src__AppConfig/Na__AppConfig__MaterialsLibrary.json`

### THE ISSUE
- After the massing and basic form analysis section of the concept design is complete the app is currently very limited in terms of how it renders materials and whilst at the moment we don't need any complex materials we need to be able to render reflections and opacity correctly to be able to show simple concept models of houses etc. 
- currently window panes are solid when they should be transparent and have a slight reflection to mimic

### TASKS
1. Check how the current system applies materials, both the SketchUp glb export and the App logic.
2. Look at current materials .json and add a new template object with all possible config fields such An example section showing the PBR fields and then a second section with URLs if textures exist one for each map in the previous section so there are two sections per material one housing this settings that affect things like roughness or metallic or opacity etc and then second that has all of the URLs if the material loads web materials that should override the texture in the gltf/glb file loaded effectively acting as a hot swap.
3. Check the wider application and ensure you understand the render pipeline and how the materials are applied to the model, the project is highly modular so ensure you understand the dependencies between modules and files and how to wire up the new system to the existing systems.
4. Remove any old keys and values from the app data file as there will be older ones using the outdating naming conventions, translate the old values to a new default materials group in the json named in my naming conventions like the other sections of `src__AppConfig/Na__AppConfig__Main.json` and the test enviroment counterpart `80__Testing__PrototypeEnvironment/TestEnv__SubAppData__Config.json`

### AIMS OF SYSTEM
- to create a robust programmatic materials swapping system that targets SketchUp material names based on a strict naming convention `MAT001__Example` 
  - Analyise the existing data file and build out a mental picture of the structure of the data.
    Relative Location:
        `src__AppConfig/Na__AppConfig__MaterialsLibrary.json`
    WEB URL:
    `https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/src__AppConfig/Na__AppConfig__MaterialsLibrary.json`
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
- Ensure the legacy Look / Feel is maintained if no materials are found and loaded uses the new materials system.
- Add any new macro configs as a new object in the main app configs using the same naming conventions as the other objects in this .json file `src__AppConfig/Na__AppConfig__Main.json`

---

## MODULES TO DEVELOP
### WebApp Side:
- The web app will need to be updated to handle the new materials system.

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
- Update the UI to toggle *"Export Standard Indexed Materials"* - This exports the materials that are part of our system.
Update the app to read this file from URL and build some logic to handle the materials and apply them to the model.
`https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/src__AppConfig/Na__AppConfig__MaterialsLibrary.json` 
Using this URL Allows the Json to be read from the web and efficient sorting of the materials, If the material is not found in the library it should still be exported as it is currently (The Default Whitecard Material).
  - This avoid bloated GLB Files and ensures the SketchUp to GLB converter is efficient and fast.
- Before the option asking if you want to export standard indexed materials, have a first toggle which asks if you want to export materials.

SketchUp Plugin UI Functionality:
- User toggle is materials are to be exported or not if checked, section two is ungreyed and the user can then toggle wether they want all materials exported or just the standard indexed materials from the json lookup system.
- This allows for 3 possible export options for the final GLB Files.
1. No Materials Exported : A sanitised simple whitecard model exactly as it is currently.
2. All Materials Exported : All materials are exported from the SketchUp model including the custom materials assigned to meshes etc so everything is exported.
3. Standard Indexed Materials Exported : Only the standard indexed materials from the json lookup system are exported allowing for a more effecticent export process, ignoring custom materials assigned to meshes etc and skipping them only targeting the materials named with the prefixes such as `MAT001__Example` , `MAT304__Paint__Farrow&Ball__Down Pipe` , `MAT101__Glass__ClearDefault` etc as used in the json lookup system.

### MAP THE PROJECT FIRST BEFORE CODING
- The project is HIGHLY modular thus you need to build a picture of the existing systems to see how to wire up the new system to the existing systems.

## CONCLUSION
- We are aiming to create a robust programmatic materials swapping system that targets SketchUp material names based on a strict naming convention `MAT001__Example` 
- The SketchUp to GLB exporter will need to be updated to handle the new materials system.
- The WebApp will need to be updated to handle the new materials system.
- Render Loops should be updated to handle the new materials system and PBR Materials based on the configurations in the materials library.
- The app data file should be updated to handle the new materials system and PBR Materials based on the configurations in the materials library.
- The test environment app data file should be updated to handle the new materials system and PBR Materials based on the configurations in the materials library.
- The project is HIGHLY modular thus you need to build a picture of the existing systems to see how to wire up the new system to the existing systems.
- This is a major update to the app and will require a lot of testing and validation to ensure it works as expected.