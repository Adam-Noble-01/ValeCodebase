# Objective: Add the other navigation modes from TrueVision 3D to ValeVision 3D.

## Navigation Modes Content:
- TrueVision 3D Has the same style Orbit mode as ValeVision 3D but also has a walk mode and a fly mode.
- ValeVision 3D has only one navigation mode: Orbit mode.
- We need to port the additional navigation modes from TrueVision 3D to ValeVision 3D.

## Default
- By default ValeVision 3D Models should ONLY have Orbit Mode enabled and the Tools & Settings Menu should not show any other navigation modes visible.
- This means all of the old projects will remain in Orbit Mode UNLESS in the developer mode menu, the developer has selected to enable the different navigation modes.

## DevMode Menu
- Add a new UI Config Menu section to the developer mode menu.
- In this menu I can set if the current model should have Orbit Mode, Walk Mode, or Fly Mode enabled. 
- By default only Orbit Mode should be enabled.

## User Facing UI Menu (Tools & Settings Menu)
- When each other others are enables a new user settings and tool menu section appears that allows the user to select their different navigation modes.
- The different navigation modes should be nested in the user menu like with the other tools and should show clearly which mode is currently active when the Navigation mode UI section is unfolded.

## Persistent Data
- Ensure the Json Schema is updated to include the new navigation modes.
- Like with the camera and fog settings ensure the json is saved back to the CDN when the developer has selected a different navigation modes that should be configurable for the model.
- This means each models project data files stores which modes should be available for each model.

## Disambiguations
- This introduces a model data dependant dynamic menu system that is not present in ValeVision 3D currently.
  - The project data json files for each project store the different navigation modes that are available for each model.
- You are not editing TrueVision 3D code, you are porting the functionality to ValeVision 3D.

## Project Context
- My projects are very modular and split up into many children numbered subfolders.
- Have sub agents build a file tree for both TrueVision 3D and ValeVision 3D before you even begin to think about coding.
- Stick to my coding standards and conventions.

## Conclusion
When we are complete, when I use ValeVision in the Local host mode I will have a new section in the developer mode that allows me to toggle which navigation modes are available for the current model users using the web version of ValeVision 3D. The modes have total functionality parity with TrueVision 3D. the data files are saved to the CDN and then when the model is viewed by the users using the web version of ValeVision 3D the navigation modes are available to the users displayed in a new menu section that is only visible if more than one navigation mode is available for the current model. if only orbit mode (the default) is enabled then the section in the menu will not be visible.

## TrueVision 3D
@REFERENCE ONLY!! | Cousin Project - Noble Architecture Apps/na-apps/30__TrueVision__CoreAppCode 