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