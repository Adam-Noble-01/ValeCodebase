# OBJECTIVE: Automate Vale Vision 3D Export Via A Dedicated Plugin

## PLUGIN NAME: ValeVision Cloud Sync

## THE CURRENT ISSUE
- Exporting A SketchUp Model To ValeVision 3D Is Manual And Time Consuming
  - It currently involves two seperate Python Build Scripts and the use of a legacy SketchUp Pluign tool to export the scene images for the ValeVision 3D application.
- There is no way to automate the export of the SketchUp Scenes To Animation Scenes.
- We need to eliminate all of the manual steps and automate the process.
- We need to have one simple way to sync a project from within SketchUp.
- We need to update Whitecardopedia and ValeVision 3D to load primarily from the Cloudflare R2 Bucket and fallback to the Whitecardopedia project folder (The GH Sites ones) if the Cloudflare R2 Buckets are not available, this keeps things more live and up to date without needing to push to GitHub Pages each time a small update is made to the content.

## Existing System

### Whitecardopedia
Whitecardopedia is the main hub that collects the data and builds a project gallery.

*Gallery View* 
- Uses lower resolution preview images to create an array of cards for users to select a project 
*Project View*
- Uses the full resolution SketchUp Scene Images and has a button to open ValeVision 3D for the project.

### ValeVision 3D
- We currently have a animation system in ValeVision 3D configured using the Dev Tools Menu & Writes Json Data to each projects Cloudflare R2 Bucket.
- We need to create a module in the new ValeVision Export Plugin for capturing scene camera positions and data on the SketchUp side and writing to a `ValeVison3D__SketchUpCameraData__.json`
`ValeVison3D__SketchUpCameraData__.json` can then be used and targetted by the build related scripts to create the animation scenes within ValeVision 3D. as this data can be targetting and patched into the cloudflare r2 bucket and whitecardopedia project folder (The GH Sites ones) so that the animation scenes are updated live and instantly.

### Our Plugin Must Create This Content For Use Downstream
- Create Low Resolution Thumbnails for the Gallery View
- Create Full Resolution Scene Images for the Project View
- Create Camera Data for the Animation System
- Create a `ValeVison3D__SketchUpCameraData` object in the prohect data file containing sub json objects for each scene that contains the camera data for the scene. 
  - Each scene in SketchUp will have a unique name with the `IMG##__` Prefix.
  - Use this to create a json object in capturing the camera data for the sketchup scene, this data will be used downstream in the ValeVision 3D application to build the animation scenes loading the thumbnails and the camera data (albeit translating it as needed from SU to 3.js).

Whitecardopedia Uses a manually built index, perhaps our plugin can automate this process too so a project can be built and indexed from within SketchUp.
The json data that links project and code and urls etc should be kept mirrored on Cloudflare R2 Bucket and Whitecardopedia updated to always atrtempt to load that version first as this would help me avoidn waiting for GitHub Pages to push updates and build each time.

## Vale Projects
- An employee uses the `D:\10_CoreLib__ValeCodebase\Root_GeneralDeveloperTools\02_Python\10__Python__WinFileSystemTools\Py_WinUtil__BuildValeProjectStructure` tool to create a new Vale Local Production Project structure and files, this automates the creation of the SketchUp Template files and builds the critical file strucutre and data file relied on by the ValeVision 3D application build tools.
- Once a SketchUp File is complete employees use a legacy tool to export the Thumbnail Image



# STAGE 01 BUILD THE ValeVision Cloud Sync Plugin
- ValeVision Cloud will be a new plugin used to convert and package a SketchUp model to a ValeVision 3D project.
- It captures the SketchUp scene camera data for all scenes named with the `IMG##__` Prefix
  - Creates a Full resolution scene image as per the legacy tool standards
  - Creates Scene thumbnails as per the ValeVision 3D Standards (We have a build tool that generates these thumbnails) but this plugin should do this too.
- Creates a `ValeVison3D__SketchUpCameraData__.json` file for each scene that contains the camera data for the scene. 
  - Each scene in SketchUp will have a unique name with the `IMG##__` Prefix.
  - Use this to create a json object in capturing the camera data for the sketchup scene, this data will be used downstream in the ValeVision 3D application to build the animation scenes loading the thumbnails and the camera data (albeit translating it as needed from SU to 3.js).

## Legacy Tool - ValeDesignSuite
`C:\Users\adamw\AppData\Roaming\SketchUp\SketchUp 2026\SketchUp\Plugins\ValeDesignSuite` This was used to create scene by scene export targeting the scene names such as `IMG01__3dView__ViewOption-01__` `IMG01__3dView__ViewOption-02__` etc. 
- This tool was previously how we exported the scene images for the ValeVision 3D application.
- We will copy and refactor the code for the scene by scene export to the new plugin. 
  - We will **NOT** duplicate anything related to the CAD Export functionality, we will only copy the code for the scene by scene **IMAGE** export.
- Look at how SketchUp is Automated Via the Ruby API, we will use the same approach to automate the image export.
- Use the same image export naming conventions and standards as the legacy tool.
- Use the same image settings such as resolution, quality, etc as the legacy tool.


## USER INTERFACE, TOOLBAR BUTTON AND HTML DIALOGUE WINDOW
 - Copy the Vale Logo Icon from the legacy Vale Design Suite plugin and use it in the new plugin.
 - Create a new sketchup toolbar button with the Vale Logo Icon that launches the new plugin and opens a HTML Dialogue Window.
  - See My Noble3DTools Plugin, this is how I build my plugins using the new modern SketchUp Plugin API HTML Dialogue Method

### PLUGIN TABS
- See my Noble3DTools Plugin, I built a custom tab system, do a similar approach here



### UI BUTTONS AND ACTIONS
#### Export Tab
- "Sync Project To ValeVision 3D"
- "Update Images For ValeVision 3D"
- "Update GLB Models For ValeVision 3D"
- "Update Camera Data For ValeVision 3D"

#### Settings Tab
- Reload Plugin (See Noble3DTools Plugin, copy the same functionality for hot reloading the plugin)
- Project Path This is the path to the ValeVision Project Folder on the local machine, save this to a model dictionary name "ValeVision__CloudExport" so there is persistance of the project path between sketchup sessions.


The project Structures locally are always using that subfolder structure, so ensure the plugin, once the path is extracted from the model path or overidden in the settings, uses a map so the different action buttons dont require constant manual user input of paths. 

### Practical Example:
Pressing "Sync Project To ValeVision 3D" in the HTML Dialogue Window should:

#### STEP 01 - WRITE IMAGE FILES TO THE LOCAL VALEVISION PROJECT FOLDER
  Target : {{Path-Generated-From-Model-Dictionary-ValeVision__CloudExport}}\10__ContentDelivered__Local
    Search if prior files exist in the target folder Example "VisDpt__Whitecard__FirstEdition__24-Jun-2026"
      IF so, make new folder "VisDpt__Whitecard__SecondEdition__25-Jun-2026"
      ELSE create new folder "VisDpt__Whitecard__FirstEdition__{{TodaysDate}}"
        Loop through all scenes in the SketchUp model named with the `IMG##__` Prefix
          IF scene is found, write the full resolution scene image to the target folder
          IF scene is found, write the thumbnail image to the target folder
          IF scene is found, write the camera data to the target folder
          IF scene is found, write the GLB model to the target folder
          IF scene is found, write the data file to the target folder
          IF scene is found, write the project.json to the target folder

#### STEP 02 - WRITE GLB MODELS TO THE LOCAL VALEVISION PROJECT FOLDER
  Target : {{Path-Generated-From-Model-Dictionary-ValeVision__CloudExport}}\ValeVision__GlbFileSync
    Loop through all GLB files in the SketchUp model named with the `GLB##__` Prefix
      IF existing glb files are found, archive them by creating a .zip file wrapping all of the previous glb files if they existing in a subfolder named `00__ArchivedModels` and each Zip File created for the collection each time a set is archived is named. `{{ProjectName}}__GLBFileSync__ArchivedModel__{{TodaysDate}}.zip`
      IF no existing glb files are found, Write GLB Files to `{{ProjectPathFromDictionary/SettingsTabOverride}}\10__ContentDelivered__Local\ValeVision__GlbFileSync

#### STEP 03 - WRITE CAMERA DATA TO THE LOCAL VALEVISION PROJECT FOLDER
  Target : "{{ProjectPathFromDictionary/SettingsTabOverride}}\00__ProjectData\63592__Bressard-Kayode__ProjectData__.json"
    Loop through all scenes in the SketchUp model named with the `IMG##__` Prefix
      IF scene is found, write the camera data to the project data file
        Create a new SketchUp Scene Camera Data Object in my Json Naming Convention.
          Create Child Objects for each SketchUp Scene (Named Page in Ruby API 2026) 
            Add keys and values for the camera data for each SketchUp Scene named with the `IMG##__` Prefix
              - Camera Position
              - Camera Rotation
              - Camera Field of View

#### STEP 04 - Validate And Clone To Whitecardopedia Project Folder
  Target : Whitecardopedia Project Folder
    Validate the local project data file and scene images are valid.
      IF valid, clone to the Whitecardopedia project folder (The one used for GH Pages and as a fallback if CF R2 Buckets are not available.)
      IF invalid, display an error message to the user in the HTML Dialogue Window with a toast notification.


#### STEP 05 - Mirror the Whitecardopedia Data to the Cloudflare R2 Bucket
  Target : Cloudflare R2 Bucket - (See Cloudflare R2 Workers already in place for this purpose.)
    Use a similar atomation like we already use with the Build D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Tools__DevUtils\AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__.py script, but instead of looping through all possible projects like it does, we can add a new section to pass our specific project data and mirror it to the Cloudflare R2 Bucket without having to loop through all possible projects (this has been a pain point for me in the past, I need to automate this as the loop takes ages!) instead we can pass the specific project data and mirror it to the Cloudflare R2 Bucket without having to loop through all possible projects which will be much faster and more efficient. 
    - If Error occurs, display an error message to the user in the HTML Dialogue Window with a toast notification.

#### STEP 06 - Final Report
- Display a final report in the HTML Dialogue Window with a toast notification.
  - Report the success or failure of each step.
  - Report the total time taken to complete the process.
  - Report the total files processed.
  - Report the total files failed.
  - Report the total files skipped.
  - Report the total files archived.
  - Report the total files mirrored to the Cloudflare R2 Bucket.
  - Report the total files cloned to the Whitecardopedia project folder.


## ValeVision 3D & Whitecardopedia Data Handling Updates
- Use the Images, Thumbnails, and Data files from the Cloudflare R2 Bucket for the ValeVision 3D application.
  - Use the GitHub Files instead of the local files if the Cloudflare R2 Buckets are not available. show a toast notification reporting failed to fetch CDN Files, Fallback to GH Statis Assets Phrase it generally like that to not report to users we use cloudflare r2 or GHithub, keep the notification language general.
- All build scripts should be updated to use the Cloudflare R2 Bucket for the Images, Thumbnails, and Data files mirroring the structure of the Whitecardopedia Project Folder and Data File. it should be an exact mirror to avoid confusion (This should already be the case as we already have a build script that does this for the GLB Builder and manageing camera and fog data settings per project, we are just expanding this to include the Images, Thumbnails, and Data files.) so that Whitecardopedia and ValeVision 3D rely primarily on the Cloudflare R2 Bucket so updates are instant and live not not requiring a GitHub Pages Push to update basic content such as models, images, thumbnails, project data etc.
- The fallback should be working how things are now.
- Ensure parity between the Cloudflare R2 Bucket and the Whitecardopedia Project Folder structure, Data Files, content etc.


### Why this system is robust
- The Local Production Project Structure is always the same, so the plugin can use a map to determine the paths to the different action buttons without having to manually input the paths each time.
- The local production folder on each employees machine is forgiving of errors and will not break the system, it will simply report the error and continue on with the next action.
- The local production folder on each employees machine is a backup of the files without needing vast amounts of data to be pushed to the Cloudflare R2 Bucket each time, i.e archived versions are not pushed to Cloudflare R2 Bucket or GitHub, the Whitecardopedia files are the committed files and are updated to to suit i.e. Images and Glbs on on Cloudflare R2 Bucket and GH Pages are completely replaced with the users latest selection, and parts of the data files updated live.
- Its important to understand not to delete or totally overwrite the project data files on the Cloudflare R2 Bucket or Whitecardopedia project folder (The GH Sites ones) instead inject only the required parts of the data files to update the project data files such as camera data scene data etc (We already achieve this using our local host dev version of ValeVision 3D and Whitecardopedia.)
- The SketchUp Plugin Is used as a medium to commit the latest files from the local production folder to the Cloudflare R2 Bucket and Whitecardopedia project folder (The GH Sites ones) and to update the local production folder with the latest files from the Cloudflare R2 Bucket and Whitecardopedia project folder (The GH Sites ones).

I understand the Whitecardopedia GH Pages version will always be out of date until pushed, but its a fallback if the Cloudflare R2 Buckets are not available.  


### Practical Example - Update Images:
Acts as a quick way to update the images for the project, it will not update the GLB models, camera data, or project data files.
Pressing "Update Images" in the HTML Dialogue Window should:
  Target : 10__ContentDelivered__Local
    Search if prior files exist in the target folder Example "VisDpt__Whitecard__FirstEdition__24-Jun-2026"
      IF so, make new folder "VisDpt__Whitecard__SecondEdition__25-Jun-2026"
      ELSE create new folder "VisDpt__Whitecard__FirstEdition__{{TodaysDate}}"
        Loop through all scenes in the SketchUp model named with the `IMG##__` Prefix
          IF scene is found, write the full resolution scene image to the target folder
          IF scene is found, write the thumbnail image to the target folder
            Validate & Push to Cloudflare R2 Bucket
            Validate & Clone to Whitecardopedia Project Folder
              Report Success or Failure

### Practical Example - Update GLB Models:
Acts as a quick way to update the GLB models for the project, it will not update the images, camera data, or project data files.
Pressing "Update GLB Models" in the HTML Dialogue Window should:
  Target : 10__ContentDelivered__Local
    Search if prior files exist in the target folder Example "VisDpt__Whitecard__FirstEdition__24-Jun-2026"
      IF so, archive them by creating a .zip file wrapping all of the previous glb files if they existing in a subfolder named `00__ArchivedModels` and each Zip File created for the collection each time a set is archived is named. `{{ProjectName}}__GLBFileSync__ArchivedModel__{{TodaysDate}}.zip`
      IF no existing glb files are found, Write GLB Files to `{{ProjectPathFromDictionary/SettingsTabOverride}}\10__ContentDelivered__Local\ValeVision__GlbFileSync
      Report Success or Failure


### Practical Example - Update Camera Data:
Acts as a quick way to update the camera data for the project, it will not update the images, GLB models, or project data files.
Pressing "Update Camera Data" in the HTML Dialogue Window should:
  Target : "{{ProjectPathFromDictionary/SettingsTabOverride}}\00__ProjectData\63592__Bressard-Kayode__ProjectData__.json"
    Loop through all scenes in the SketchUp model named with the `IMG##__` Prefix
      IF scene is found, write the camera data to the project data file
        Create a new SketchUp Scene Camera Data Object in my Json Naming Convention.
          Create Child Objects for each SketchUp Scene (Named Page in Ruby API 2026) 
            Add keys and values for the camera data for each SketchUp Scene named with the `IMG##__` Prefix
              - Camera Position
              - Camera Rotation
              - Camera Field of View
            Validate & Push to Cloudflare R2 Bucket
            Validate & Clone to Whitecardopedia Project Folder
              Report Success or Failure


# STAGE 01 BUILD THE ValeVision Cloud Sync Plugin
## LOCAL PRODUCTION PROJECT FOLDERS FOR EACH PROJECT
- This is a typical folder structure used by Vale Employees.
- Files are worked on in this excluded environment before D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Tools__DevUtils\AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__.bat  and D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Tools__DevUtils\AutomationUtil__BuildCloudflareBucket__WhitecardopediaProjects__.bat  but the files and push to web where there is a project specific ValeVision Folder and Data File.


## LOCAL PRODUCTION PROJECT EXAMPLE
C:\01__ValeProjects\ValeProjects__2026\63592__Bressard-Kayode__Whitecard
├───00__ProjectData
│       63592__Bressard-Kayode__ProjectData__.json
│
├───01__ReferenceFiles
│   │   Bressard-Kayode CAD Concept.dwg
│   │
│   └───01__SitePhotos
│           20260617_093818170_iOS.jpg
│           20260617_093911883_iOS.jpg
│           20260617_093913656_iOS.jpg
│
├───02__SketchUp
│   └───01__MainModel
│           Bressard-Kayode__WhiteCardModel__0.1.0__.skp
│           Bressard-Kayode__WhiteCardModel__0.3.0__.skp
│           Bressard-Kayode__WhiteCardModel__1.0.0__.skp
│
├───10__ContentDelivered__Local
│   ├───ValeVision__GlbFileSync
│   │       Bressard-Kayode__01__OrbitHelperCube__MeshModel__.glb
│   │       Bressard-Kayode__TrueVision__LandscapeEnvironment__LineworkModel__.glb
│   │       Bressard-Kayode__TrueVision__LandscapeEnvironment__MeshModel__.glb
│   │       Bressard-Kayode__TrueVision__MainBuildingModel__Existing__LineworkModel__.glb
│   │       Bressard-Kayode__TrueVision__MainBuildingModel__Existing__MeshModel__.glb
│   │       Bressard-Kayode__TrueVision__MainBuildingModel__Proposed__LineworkModel__.glb
│   │       Bressard-Kayode__TrueVision__MainBuildingModel__Proposed__MeshModel__.glb
│   │       Bressard-Kayode__TrueVision__SiteVegetation2D__LineworkModel__.glb
│   │       Bressard-Kayode__TrueVision__SiteVegetation2D__MeshModel__.glb
│   │       GlbBuilder__ExportLog__2026-06-24_181659.txt
│   │
│   └───VisDpt__Whitecard__FirstEdition__24-Jun-2026
│           IMG01__3dView__ViewOption-01____WhitecardImage__24-Jun-2026.png
│
└───60__ValeServerLinks
        Link__ValeServer__Bressard-Kayode63592.url




# STAGE 02 UPDATE THE ValeVision 3D Application & Related Build / Data Loading Systems
## VALEVISION PROJECT 
D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Projects\2026\63592__Bressard-Kayode
**CRITICAL NOTE** CLOUDFLARE R2 BUCKETS MUST BE UTILISED FOR THE VALEVISION PROJECT DATA FILES AND SCENE IMAGES.
- ATTEMPT LOADING THE LIVE R2 DATA FILES AND SCENE IMAGES, IF THEY ARE NOT FOUND THEN FALLBACK TO USING THE Whitecardopedia AND ValeVision 3D GitHub URLs
D:.
    IMG01__3dView__ViewOption-01____WhitecardImage__24-Jun-2026.png
    IMG01__3dView__ViewOption-01____WhitecardImage__24-Jun-2026__Thumbnail__524p__.jpg
    IMG01__3dView__ViewOption-01____WhitecardImage__24-Jun-2026__Thumbnail__524p__.webp
    project.json


## UPDATE DATA HANDLING ON THE BUILD SCRIPT
- Build the GLB's, Data File, Scene Images and push to the Cloudflare R2 Bucket. (Mirror the structure of the ValeVision Project Folder and Data File.)
- We already save camera data and fog data this way so it updates live.
- I need to extend this to also load the thumbnails and images from Cloudflare R2 Bucket so when the new ValeVision Cloud Plugin in SketchUp feels "Instant" I.E. pushing a model from within SketchUp instantly loads into the Web Application.


## UPDATE VALE VISION TO LOAD / CONVERT SKETCHUP SCENE DATA TO VALEVISION ANIMATION SCENE DATA
- This is the codebase for the system utilities that are used to convert SketchUp scene data to ValeVision 3D scenes within the Web Application.
`D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\69__System__SketchUpToValeVision__Utilities`

### Placeholder Files I've Created

#### Na__SketchUp__LoadSceneData__.js
- This is the main file for loading SketchUp scene data from the Whitecardopedia project data files.
- Target the scene data object and load the data into the Web Application.
- Target the data file and load the Scene Images into the Web Application.
`ValeVision3D\02__Src__AppModules\69__System__SketchUpToValeVision__Utilities\Na__SketchUp__LoadSceneData__.js`

#### Na__SketchUp__ConvertSceneData__.js
- This is the main file for converting SketchUp scene data to ValeVision 3D scene data.
- You will need to translate SketchUps Z Axis Up to 3.js's Y Axis Up.
`ValeVision3D\02__Src__AppModules\69__System__SketchUpToValeVision__Utilities\Na__SketchUp__ConvertSceneData__.js`

#### Na__SketchUp__AnimationScene__DataBridge__.js
- Validate package and pass data to the animation system.
`ValeVision3D\02__Src__AppModules\69__System__SketchUpToValeVision__Utilities\Na__SketchUp__ConvertSceneData__.js`


## KEY LOCATIONS 

### THE GLB EXPORTER PLUGIN
- We Aim to utilise modules from this plugin rather than copying code, otherwise I have to manage multiple converter codebases
`C:\Users\adamw\AppData\Roaming\SketchUp\SketchUp 2026\SketchUp\Plugins\Na__TrueVision__GlbBuilderUtility__Modules__`


### THE NOBLE3D MODELLING TOOLS PLUGIN
- The reference codebase for how to structure and build a plugin in my style of coding.
- Shows clear usage of the new modern SketchUp Plugin API HTML Dialogue Method.
`C:\Users\adamw\AppData\Roaming\SketchUp\SketchUp 2026\SketchUp\Plugins\Na__Noble3dModellingTools__Modules__`


### THE VALE DESIGN SUITE PLUGIN
- The legacy tool that we are copying and refactoring specific features from.
`C:\Users\adamw\AppData\Roaming\SketchUp\SketchUp 2026\SketchUp\Plugins\ValeDesignSuite`


### THE VALEVISION 3D SYSTEM UTILITIES
- This is the codebase for the system utilities that are used to convert SketchUp scene data to ValeVision 3D scenes within the Web Application.
`D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\69__System__SketchUpToValeVision__Utilities`


## WHAT YOU ARE NOT DOING
- Reinventing the Na__TrueVision__GlbBuilderUtility logic, it works.
- Copying Na__TrueVision__GlbBuilderUtility modules, instead build and resolve paths and call existing rb modules from that project (This is important) We must always utilise this as the exporter.



## Conclusion:
Upon completion we will have a new plugin to automate the export of a SketchUp Model To ValeVision 3D and the syncing of the data to the Cloudflare R2 Bucket and Whitecardopedia project folder (The GH Sites ones). both Whitecardopedia and ValeVision 3D Will be updated to load primarily from the Cloudflare R2 Bucket and fallback to the Whitecardopedia project folder (The GH Sites ones) if the Cloudflare R2 Buckets are not available. Users inside SketchUp will have a way to be able to manage the export of the SketchUp Model To ValeVision 3D and the syncing of the data to the Cloudflare R2 Bucket and Whitecardopedia project folder (The GH Sites ones) from within SketchUp. this will inteligently take write files to the local production folder on each employees machine and then sync to the Cloudflare R2 Bucket and Whitecardopedia project folder (The GH Sites ones) without needing to manually input the paths each time. From within SketchUp the user will be able to Push new Scenes for ValeVision to load as Animation Scenes in the Web Application and creates the required camera data and thumbnails targetting sketchup scene names such as `IMG##__` Prefix. Our new systyem will automate the creation of ValeVision Animation Scenes by using SketchUp Scene data saved by the plugin and converted to the required format for ValeVision 3D, ValeVision 3D Will then have corresponding scenes mirroring the sketchup scene names and camera position, roation, fov etc, this will cut down a huge amount of time and effort required to create new animation scenes manually, the user only needs to correctly name the sketchup scene and the plugin will take care of the rest once synced. The plugin has the ability to create and manage projects on Whitecardopedia / ValeVision without requiring the use of the current python scripts / cli and will be faster by not looping through absolutely every project and its updates to add new new it only adds the data for the project you working on which is derived from the local production folder. both Whitecardopedia and Whitecardopedia recieve  an update to prefer loading the data for projects from a Cloudflare R2 Bucket failling back to the current system if no data is found, this keeps things fast and instant when synced fixing a current pain point that is slow to share content once its been added, as currently its a 5 minute process to manually expoort the GLBs using the TrueViion GLB Export, and then Manually use ValeDesignSuite to export the scenes to images then use two different python build scripts to build project data and one to scan and push to Cloudflare we will elimate this and have it as a quick reliable sync process that propogates much quicker than requiring constant GH Sites Pushes for minot model or image amendments. We will fallback to GH Sites if the content and data cannot be served by the CDN.


## CLARIFICATION:
You need to write a Plugin for SketchUp 2026
You need to create a robust cdn served system for the project
Always generate and use URLs for the files and data you are working with, because we are using different GH Roots such as Whitecardopedia and ValeVision 3D, this is important to not use relative paths and only URLs.

## Modular File Structure
Before proposing or editing any code, first build a clear file/folder tree from the project root and use it to understand the existing architecture, module boundaries, naming conventions, dependencies, and wiring patterns.

My projects are  always highly modular. Do not assume where code belongs. Trace the existing structure first so the solution avoids duplicate modules, reuses existing functionality, and integrates cleanly with the established file/folder naming, nesting, import/export, and dependency conventions.

When implementing changes, ensure any new or modified files are correctly passed through, wired, exported, imported, and resolved by the existing app structure.



# ======
# USEFUL RUBY API DOCUMENTATION REFERENCES RELATING TO SUPPORTED METHODS FOR SKETCHUP SCENE DATA CAPTURE

## Core API terms

In the SketchUp Ruby API, what the UI calls a “Scene” is a `Sketchup::Page`. The official `Sketchup::Page` docs explicitly state that pages are called “Scenes” inside the SketchUp UI. `Sketchup.active_model.pages` returns a `Sketchup::Pages` collection containing all pages/scenes in the model. ([SketchUp Ruby API Documentation][1])

| Required data           | Ruby API class / method      | Notes                                                         |        |                         |
| ----------------------- | ---------------------------- | ------------------------------------------------------------- | ------ | ----------------------- |
| Model                   | `Sketchup.active_model`      | Main entry point.                                             |        |                         |
| Scenes collection       | `model.pages`                | Returns `Sketchup::Pages`.                                    |        |                         |
| Iterate scenes          | `model.pages.each {          | page                                                          | ... }` | `Sketchup::Pages#each`. |
| Get by name/index       | `model.pages[index_or_name]` | `Sketchup::Pages#[]`.                                         |        |                         |
| Current selected scene  | `model.pages.selected_page`  | Returns the active `Sketchup::Page`.                          |        |                         |
| Scene object            | `Sketchup::Page`             | UI name is “Scene”.                                           |        |                         |
| Scene camera            | `page.camera`                | Returns `Sketchup::Camera`.                                   |        |                         |
| Current viewport camera | `model.active_view.camera`   | Use only if you want the live viewport, not saved scene data. |        |                         |

## Scene / Page data worth exporting

`Sketchup::Page` exposes the scene tab name, label, description, camera, timing, saved-property flags, hidden visibility state, layers, layer folders, active section planes, style, rendering options, shadow info, axes, and environment. For your TrueVision scene JSON, the highest-value fields are `name`, `description`, `include_in_animation?`, camera data, and the `use_*?` flags so the viewer knows what the SketchUp scene actually stores. ([SketchUp Ruby API Documentation][1])

| Data                        | Method                                | Return                                                   |
| --------------------------- | ------------------------------------- | -------------------------------------------------------- |
| Scene name                  | `page.name`                           | `String`                                                 |
| Scene label                 | `page.label`                          | `String`                                                 |
| Scene description           | `page.description`                    | `String`                                                 |
| Camera                      | `page.camera`                         | `Sketchup::Camera`                                       |
| Animation include flag      | `page.include_in_animation?`          | `Boolean`                                                |
| Scene delay                 | `page.delay_time`                     | `Float`, seconds                                         |
| Scene transition            | `page.transition_time`                | `Float`, seconds                                         |
| Stores camera?              | `page.use_camera?`                    | `Boolean`                                                |
| Stores axes?                | `page.use_axes?`                      | `Boolean`                                                |
| Stores hidden layers?       | `page.use_hidden_layers?`             | `Boolean`                                                |
| Stores hidden objects?      | `page.use_hidden_objects?`            | `Boolean`                                                |
| Stores hidden geometry?     | `page.use_hidden_geometry?`           | `Boolean`                                                |
| Stores section planes?      | `page.use_section_planes?`            | `Boolean`                                                |
| Stores style?               | `page.use_style?`                     | `Boolean`                                                |
| Stores rendering options?   | `page.use_rendering_options?`         | `Boolean`                                                |
| Stores shadows?             | `page.use_shadow_info?`               | `Boolean`                                                |
| Stores environment?         | `page.use_environment?`               | `Boolean`, SketchUp 2025+                                |
| Active section planes       | `page.active_section_planes`          | `Array<Sketchup::SectionPlane>` or `nil`, SketchUp 2026+ |
| Hidden entities             | `page.hidden_entities`                | `Array<Sketchup::Drawingelement>` or `nil`               |
| Hidden / non-default layers | `page.layers`                         | `Array<Sketchup::Layer>` or `nil`                        |
| Hidden layer folders        | `page.layer_folders`                  | `Array<Sketchup::LayerFolder>` or `nil`                  |
| Entity IDs                  | `page.entityID`, `page.persistent_id` | Inherited from `Sketchup::Entity`                        |

`page.use_camera?` is important. It tells you whether the scene is storing camera state. For export, still include the camera block if you want, but also include `camera_stored: page.use_camera?` so TrueVision can decide whether to treat it as an intentional saved viewpoint. ([SketchUp Ruby API Documentation][1])

## Camera data available

`Sketchup::Camera` exposes position and orientation as vectors, not as a direct Euler rotation. The reliable export basis is `eye`, `target`, `up`, `direction`, and optionally `xaxis`, `yaxis`, `zaxis`. For TrueVision / Three.js, prefer exporting `eye + target + up`, then reconstruct with `camera.position`, `camera.up`, and `camera.lookAt(target)`. ([SketchUp Ruby API Documentation][2])

| Camera data                  | Method                  | Return / meaning                                           |
| ---------------------------- | ----------------------- | ---------------------------------------------------------- |
| Position                     | `camera.eye`            | `Geom::Point3d`                                            |
| Look target                  | `camera.target`         | `Geom::Point3d`                                            |
| Up vector                    | `camera.up`             | `Geom::Vector3d`                                           |
| Forward direction            | `camera.direction`      | `Geom::Vector3d`                                           |
| Camera X axis                | `camera.xaxis`          | `Geom::Vector3d`                                           |
| Camera Y axis                | `camera.yaxis`          | `Geom::Vector3d`                                           |
| Camera Z axis                | `camera.zaxis`          | `Geom::Vector3d`; documented as same as `Camera.direction` |
| Perspective mode             | `camera.perspective?`   | `Boolean`; false means orthographic / parallel projection  |
| FOV                          | `camera.fov`            | `Float`, degrees                                           |
| FOV orientation              | `camera.fov_is_height?` | `Boolean`; true means vertical FOV                         |
| Aspect ratio                 | `camera.aspect_ratio`   | `Float`; `0.0` means match the View                        |
| Orthographic height          | `camera.height`         | `Float`, inches; valid only when not perspective           |
| Focal length                 | `camera.focal_length`   | `Float`, mm, for perspective camera                        |
| Image width                  | `camera.image_width`    | `Float`, mm; used for focal-length calculation             |
| Two-point / match-photo mode | `camera.is_2d?`         | `Boolean`                                                  |
| Two-point offset             | `camera.center_2d`      | `Geom::Point3d`, normalised device coordinates             |
| Two-point scale              | `camera.scale_2d`       | `Float`                                                    |
| Camera description           | `camera.description`    | `String`                                                   |

