# ValeVision3D v1.9.0 Tasks

## The Problem
- I need to manually copy the Json from the menu into the config file each time i load a new model and want to set the camera settings at my current position.
- This takes time and is error prone 
- I need to manually copy the Json from the menu into the config file each time i load a new model and want to set the camera settings at my current position.
- The Menu is bloated with effectively a dev tool for end user which is not ideal.

## Solution
- Build a button in the menu that loads conditional only when I run the Local Host Flask Server.
  - See the Whitecardopedia project as we previously built two conditional systems one for editing the project Json using a web UI and another for a time tracking tool, this means the web version which is static loads without these features shown, but the local host version loads with these features shown.
- Having a "Save Camera Settings" button in the menu that saves the camera settings to the job specific project.json config file for the current model.
- This would eliminate the need to manually copy the Json from the menu into the config file each time i load a new model and want to set the camera settings at my current position.

## Tasks
1. Review the Whitecardopedia project and understand the conditional system we built for the time tracking tool and the project Json editing tool.
2. Review the ValeVision3D project and understand the current camera settings system and UI.
3. Build a button in the menu that loads conditional only when I run the Local Host Flask Server.
4. Build a "Save Camera Settings" button in the menu that saves the camera settings to the job specific project.json config file for the current model.
5. Ensure a message is displayed to the user that the camera settings have been saved.
    - Have it also report errors if the project.json config file is not found or is invalid.
6. Ensure the camera settings are saved to the project.json config file for the current model.
7. Remove the Old Camera Settings UI from the menu simplifying the UI for the end user.

## Usage Example
- When I load a new model and want to set the camera settings at my current position.
- I click the "Save Camera Settings" button in the menu.
- The camera settings are saved to the job specific project.json config file for the current model.
- The next time the model is loaded the camera settings will be loaded from the project.json config file for the current model.