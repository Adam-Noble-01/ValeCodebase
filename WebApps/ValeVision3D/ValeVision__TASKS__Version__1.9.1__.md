# ValeVision3D v1.9.1 Tasks

## THE PROBLEM
- User complain they cant navigate their space in a "Human" scale.
- Viewing 3D Models is currently done using a "God" scale using an Orbit mode system.

## WALK MODE NAVIGATION SYSTEM 

### Objective 
- Add new First Person view.
- Defaults driven by new section in App config <SECTION_AND_FILE>
- Build a robust navigation system suited for users to be able to walk around their architectural schemes. 

It's critically important everything is scaled to the universal units system that we use based here `src__MathUtils/Na__Math__Units.js` as stated in `.cursor/rules/06-World-Units-And-Conversions-Required-Global-.mdc`

So the invisible character capsule should be whatever method 3js uses to achieve the pill-shaped character etc to ensure accurate collisions work so people can't walk through walls in their architectural models.

The eye height should be set at a 1620mm (1.62 m) which serves as a good neutral height which should reflect the broadest height of a typical user in the future I may add a future to make this adjustable so make sure it's not buried in a script and that it's a variable at the top of its respective module for easy manipulation in the future.

With the same logic of trying to create the most typical catch all for most users, Set capsule height around 1800mm (1.8 m) and Set radius 280mm (0.28 m)

For Horizontal FOV Use 75 Degrees which is close to a very natural feeling view width 

### UI implementation
- For now the UI elements to toggle between the current orbit mode and the new walk navigation mode should be added to a new UI element in the TESTING ENVIRONMENT

### INITIAL IMPLEMENTATION CLARIFICATIONS
- All new files and logic for the new walk mode navigation system must be added here 
    `src__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js`
    - This file contains the logic for controlling the walk mode system on desktop.
- however the UI element and actual calls should be kept in the test environment as I'm not wishing to implement it into the full application just yet but I want the files and all of the driving logic for the feature itself to be in the main project but just for now keep all of the new buttons etc to toggle between orbit and walking navigation in the test environment until I'm ready to implement it into the main app. 

### NEW SYSTEM CLARIFICATIONS
- The new navigation mode is completely separate from the existing orbit mode and the orbit mode subsystems such as the helper cube etc.
- Use the same global units helpers and math helpers etc but note this whole system will be separated from the orbit mode system as they both serve completely different purposes so should both have their own clearly defined classes methods functions etc properly namespaced in my three section style to make it clear for debugging in the future. 
- This will probably involve tracing through the orbit mode system exists already and looking at the function names and identifying any early stage classes. 

### CLARIFICATION ON RENDER LOOPS
- Ensure The render loop script for both the main application and the test environment are set up to handle the new mode, The UI elements should only be added to the test environment for now but to allow me to test in the main environment without adding any new UI elements (as I need to fully design a good UI for this for the live web version) for now add a hotkey (Alt + Shift + W) To allow me to toggle the walk mode in both versions, this also things discreet. 
- Add a new global hotkeys object in the app config in my style, I will build upon this over time but for now we can just put a hotkey in to toggle between walk mode and orbit mode and then use this config downstream in the controls scripts for the new system. 

### FILE : PC CONTROLS 
`src__NavigationAndCameras/Na__Navmode__WalkMode__DesktopControls.js`
  - This new file contains all of the logic for controlling the walk mode system on desktop 
- use typical first person game controls 
- WASD and Arrow keys move directionally, 
- Mouse moves "Head" And then once it goes past a certain threshold rotates the body like with games. 

### FILE: TOUCH SCREEN CONTROLS 
`src__NavigationAndCameras/Na__Navmode__WalkMode__TouchScreenControls.js`
    - This file contains the logic for controlling the walk mode system on touch screen devices.
- Single finger press moving forwards and backwards and left and right controls directional movement. 
- Double finger press and drag controls head movement and rotation. 
- Pinching and zooming can also be used for movement. 
- Ensure correct acceleration is implemented so finger movements scale naturally.

### EXPECTED BEHAVIOUR
- When switching from the default orbit mode into the new walk mode the camera is constrained to the invisible pill-shaped constraints and you will fall to whatever ground plane or mesh is beneath you as collision will be enabled along with gravity so you will essentially fall down to the next collision. 
- When in the new walk mode users should not be able to ghost through walls and other architectural objects it should be realistic. 
- it should be able to handle things like staircases so allow you to ascend up a mesh that has steps up to around 350 mm in height but then disallow any height over that to stop people walking up and over furniture but allow for staircases where generally a staircase step should not exceed 250 mm, but it's important again to respect the established unit system which operates in millimeters albeit then converts that into native 3js meters / model units.

### IMPORTANT CODING RULES
- Separate concerns as much as possible within new files. 
- use the established three-stage name spacing system. 
- Carefully check all of the systems and build out a mental picture of the structures of dependencies between scripts. 
- Strictly use the existing units and Mass helper scripts already set up don't reinvent the wheel. 
- Use the app config file as much as possible for defaults driving downstream variables and constants in the modules. 

### DOOR ANIMATION SCRIPT TRIGGER
`src__3dObject__InteractionsSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js`
    - This file contains the logic for triggering the door animation system when in walk mode.
- when walk mode is enabled the doors that in orbit mode have to be triggered with a mouse click, are also triggered by proximity. 
- if the capsule constraint is within 2000mm (2m) proximity of a door then the door animation will animate to its open position and then once the capsule is 2000mm (2m) away from the door, then the door will shut back to its initial unimated position. 
- Use the same animations but just add the proximity as a trigger. 
- See `3dObjectIInteraction__Animation__ClickToOpenDoors__.js` This was the original script for the click to open doors system.
- The aim is to create fluid movement for a building that may have several doors so the doors will naturally open as you approach them and close as you move away from them through the scene.

### FINAL CONCLUSION
Our aim is to introduce a robust and user-friendly intuitive walking navigation system for both users on PC/ desktop  and touch screen devices. The application is an architectural model viewer so this feature is essential to assist with clients being able to understand their space in the most natural way as the current orbit view whilst extremely useful for creating dolls house views etc, is not as useful as giving a boots on the ground perspective of the project. Therefore upon completion of this objective we will have a working walking navigation mode that in both the live version and the testing environment can be enabled and toggled on and off using a new hotkey, or in the testing environment toggled on a new UI element. The system also builds upon previously constructed systems such as the door animation system allowing for intuitive fluid movement through an architectural scene.

### MAP THE PROJECT FIRST BEFORE CODING
- The project is HIGHLY modular thus you need to build a picture of the existing systems to see how to wire up the new system to the existing systems.