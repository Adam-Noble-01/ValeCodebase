Blockoutopedia

## THE PROBLEM
Our current Whitecardopedia system works perfectly but the models displayed are of a high level of detail than required.

## THE SOLUTION
- We need to add a second gallery screen accessed by switching the "Blockout Models" button shown on the image labelled "Main Gallery View Ui  -  DESIRED"
- We need a way to switch to this new "Blockoutopedia" which functions identically the Whitecardopedia but loads only the cards for projects that have the blockout value in the  project.json 

## DATA FILES
- Every current project will have a data file so we will need to write a one time python script to add Whitecard status to all projects in 2025 and 2026 files to date
- We need to add a new data field in the fist section of project data files.

#### CURRENT PROJECT.JSON FILE
```json
{
    "basePath": "Projects/2026/63086__Matharu",
    "images": [
        "IMG01__3dView__ViewOption-01____WhitecardImage__02-Apr-2026.png"
    ],
    "productionData": {
        "additionalNotes": "A typical hand-drawn to Whitecard conversion job, tiny scheme, but had no site reference photos so had to use mapping data and street-view etc to figure out roof pitches etc which took extra time",
        "conceptArtist": "Steph",
        "input": "Early Stage Sketch"
    },
    "projectCode": "63086",
    "projectName": "Matharu",
    "scheduleData": {
        "dateFulfilled": "02-Apr-2026",
        "dateReceived": "31-Mar-2026",
        "timeAllocated": 3,
        "timeTaken": 3
    },
    "sketchUpModel": {
        "url": "Nil"
    },
}
```

**If the build script had "Blockout" selected then the project.json file would be as follows:**
#### NEW PROJECT.JSON FILE - IF BLOCKOUT SELECTED IN BUILD SCRIPT DROP DOWN LIST
```json
{
    "basePath": "Projects/2026/63086__Matharu",
    "images": [
        "IMG01__3dView__ViewOption-01____WhitecardImage__02-Apr-2026.png"
    ],
    "productionData": {
        "additionalNotes": "A typical hand-drawn to Whitecard conversion job, tiny scheme, but had no site reference photos so had to use mapping data and street-view etc to figure out roof pitches etc which took extra time",
        "conceptArtist": "Steph",
        "input": "Early Stage Sketch"
    },
    "projectCode": "63086",
    "projectName": "Matharu",
    "ProjectType": "Blockout",
    "scheduleData": {
        "dateFulfilled": "02-Apr-2026",
        "dateReceived": "31-Mar-2026",
        "timeAllocated": 3,
        "timeTaken": 3
    },
    "sketchUpModel": {
        "url": "Nil"
    },
}
```

OR 

**If the build script had "Whitecard" selected then the project.json file would be as follows:**
#### NEW PROJECT.JSON FILE - IF BLOCKOUT SELECTED IN BUILD SCRIPT DROP DOWN LIST
```json
{
    "basePath": "Projects/2026/63086__Matharu",
    "images": [
        "IMG01__3dView__ViewOption-01____WhitecardImage__02-Apr-2026.png"
    ],
    "productionData": {
        "additionalNotes": "A typical hand-drawn to Whitecard conversion job, tiny scheme, but had no site reference photos so had to use mapping data and street-view etc to figure out roof pitches etc which took extra time",
        "conceptArtist": "Steph",
        "input": "Early Stage Sketch"
    },
    "projectCode": "63086",
    "projectName": "Matharu",
    "ProjectType": "Whitecard",
    "scheduleData": {
        "dateFulfilled": "02-Apr-2026",
        "dateReceived": "31-Mar-2026",
        "timeAllocated": 3,
        "timeTaken": 3
    },
    "sketchUpModel": {
        "url": "Nil"
    },
}
```


### BUILD SCRIPT
- The build script will need its data updated so the dropdown list shown in my image has "Blockout" 2nd in the list after the default "Whitecard" option.
- The build script will then add the new "Blockout" data files to the project.json files in the Projects folder.
- This is critical for Blockoutopedia to function correctly and load only the blockout models.
#### Build Script Paths
D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Tools__DevUtils
D:\10_CoreLib__ValeCodebase\WebApps\Whitecardopedia\Tools__DevUtils\AutomationUtil__FetchLocalProjects__BuildWhitecardopediaProject__.bat


### USER INTERFACE
- By Default normal Whitecardopedia gallery loads showing the Whitecard models.
- Add two new buttons shown in the position on my attached imaged.
- Move the search bar to the right of the buttons as shown in my attached image.
- The buttons are toggles in the sense that the one active has a slight darker background than the other.
  - This indicates which mode is active.
- When in Blockout mode the gallery loads showing only the blockout models.
- When in blockout mode use this new logo in the top right swapping the Whitecardopedia logo for it when blockout mode is active.
 - Main Whitecardopedia logo = `D:\10_CoreLib__ValeCodebase\WebApps\assets__CommonApplicationAssets\AppLogo__Whitecardopedia__TopBar__TitleText__.png`
 - Blockoutopedia logo = `D:\10_CoreLib__ValeCodebase\WebApps\assets__CommonApplicationAssets\AppLogo__Whitecardopedia__TopBar__TitleText__Blockoutopedia__.png` 
 NOTE: Use the URLised versions though as they are outside of the Whitecardopedia root 
    `https://adam-noble-01.github.io/ValeCodebase/WebApps/assets__CommonApplicationAssets/AppLogo__Whitecardopedia__TopBar__TitleText__.png`
    `https://adam-noble-01.github.io/ValeCodebase/WebApps/assets__CommonApplicationAssets/AppLogo__Whitecardopedia__TopBar__TitleText__Blockoutopedia__.png`
- Include a warning message section before the cards warning that the models are blockout models and not the full detail models.
  - Add a request button (for the future) to request a full whitecard model.
- Add some notes explaining blockout models are not validated in the same way as whitecard models and are not as accurate.
- Explain they must not under any circtance be shown to clients or other deparments apart fromn the concept artists.
- Explain they are only for internal use for productionb of concept design paintings and should not be used for any other purpose.

**Note:**
A blockout model is purely about shape, scale, proportion It is the rough massing pass only. it is moddelled at very low detail, simple blocks and boxes with the artists CAD Mapped to faces only, with little or no concern to profiles, projections etc such as guttering or columns etc. it is a completely flat and stripped back model and has no depth or details applied. secondly these models are not validated in the same way as whitecard models and are not as accurate, the 3D Modeling Technician will not fill in any details such as missing windows or elevations or architectural details, only what is in the CAD File will be used to model the blockout and areas not provided will be left blank or the fog effect applied to unkown areas of the building excluding them to create more of a mquettesque effect showiung only the requested area of the building

A whitecard model is usually a more presentation-ready development of a design. The geometry may still be simplified, but the scene is intentionally rendered with neutral white so the focus stays on form, composition, and architectural detaiils without the distraction of final finishes. Whitecards are used to judge the design more cleanly, especially for reviews, client previews etc, they are a more polished and refined model than a blockout and are used to judge the design as they offer the full level of details just without materials applied.

So the difference is mostly purpose and refinement. A blockout is a working rough model for solving fundamentals. A whitecard model is a clean more deliberate review model used to evaluate the design visually in a controlled way. In simple terms: blockout is “does the space and massing work?” while whitecard is “how does the design read once stripped of material noise?”


  ### For Testing just show one test card in blockoutopedia for now as i havent completed a proper model for this yet. 

## CONCLUSION
- After we are done Whitecardopedia will have a new second gallery screen that loads only the blockout models and a new logo in the top right swapping the Whitecardopedia logo for it when blockout mode is active. 
- Whitecardopedia will now have two gallery screens, one for whitecards and one for blockouts with a toggle button to switch between them which also indicates which mode is active.
- The build script embed the project type in the project.json file so the correct gallery screen is loaded based on the project type.
- Users have an intuitive way of differentiating between the two modes types.
- The main top right logo swaps to the Blockoutopedia logo when blockout mode is active.
- The main top rright logo swaps to the Whitecardopedia logo when whitecard mode is active.
- Whitecardopedia is the default when the app loads.
- The Blockoutopedia mode has a robust warnings and notes section before the cards to explain the difference between the two modes and the purpose of each.