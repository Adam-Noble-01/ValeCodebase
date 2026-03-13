# ValeVision3D v2.1.1 - Grid Lines System
# ---------------------------------------------------------

## Objectives:
Create a new feature that allows the user to add grid lines to the scene.

## The Problem:
- ValeVision3D was primarily designed for concept artists to render Whitecard models and to create 2D images of the scene and layouts etc for later hand-drawing and embelishing with traditional watercolor painting.
- Currently the artists have to manually draw by hand things like patio furniture, trees, shrubs, etc.
- A grid system would allow the artists to quickly and easily understand the scale of the scene and to place objects in the scene in a more accurate way when drawing over the rendered image by hand.

## Overview
- The Grid Lines System is a new feature that allows the user to add grid lines to the scene.
- The grid lines are added to the scene as a set of lines that are parallel to the x and z axes.
  - Three.js uses a right-handed coordinate system with the Y axis pointing up. In this system, the X axis runs left-to-right, the Y axis runs up, and the Z axis runs forward/backward. All grid logic should therefore use Y as "up".

## Control of the parameters for the grid lines:
- A new menu section called "Grid Lines" should be added to the toolbar.
 - Add before the Elevations View menu section.
 - So it will be the second to last menu section in the toolbar.
- Sliders for the following parameters:

    **Slider-01 : Grid Size Adjustment**
    - This is the size of the grid lines in millimeters 
      - *(Translated to Three.js Units using the math helpers in the MathUtils module)*
        - Min      =  100mm
        - Step 01  =  250mm
        - Step 02  =  500mm
        - Step 03  =  1000mm    <-- Default Value
        - Step 04  =  2000mm
        - Step 05  =  2500mm
        - Max      =  5000mm

    **Slider-02 : Grid Height Adjustment**
    - This is the height of the grid lines in millimeters above the y axis origin.
    - This allows the user to control the height of the grid lines above the ground plane.
    - This is useful for projects that have multiple levels such as a patio or a deck that is built on a different level to the ground plane (Ground Plane is at 0mm to represent the building GFFL level).
      - *(Translated to Three.js Units using the math helpers in the MathUtils module)*
        - Min      =  -1000mm
        - Step 01  =  -900mm
        - Step 02  =  -800mm
        - Step 03  =  -700mm
        - Step 03  =  -600mm
        - Step 03  =  -500mm
        - Step 03  =  -400mm
        - Step 04  =  -300mm
        - Step 05  =  -200mm
        - Step 06  =  -100mm
        - Step 07  =   0mm      <-- Default Value 
        - Step 08  =   100mm
        - Step 09  =   200mm
        - Step 10  =   300mm
        - Step 11  =   400mm
        - Step 12  =   500mm
        - Step 13  =   600mm
        - Step 14  =   700mm
        - Step 15  =   800mm
        - Step 16  =   900mm
        - Max      =   1000mm

    **Slider-03 : Grid Style - Dropdown Menu**
    - This dropdown menu will allow the user to select the style of the grid lines.
    - Menu folded by default.
    - This section contains 4 sliders that allows the user to control the style of the grid lines.
    - There are 3 Sliders for the line styles:
        - Slider-03-01 : Line Width Adjustment
            - The line width of the grid lines.
            - Min      =  00.10px
            - Step 01  =  00.25px
            - Step 01  =  00.50px
            - Step 02  =  01.00px  <-- Default Value
            - Step 03  =  01.50px
            - Max      =  03.00px
        - Slider-03-02 : Line Type Adjustment
            - The line styles are:
                - Solid    <-- Default Line Style Selected
                - Dashed
                - Dotted
        - Slider-03-03 : Line Color Adjustment
            - The line color is selected from a dropdown menu of colors.
            - The colors are:
                - #141414  -  Grey    <-- Default Colour Selected
                - #ff0000  -  Red
                - #000000  -  Black
                - #646464  -  Mid Grey
                - #172b3a  -  Vale Blue
        - Slider-03-0? : Line Gap Size Adjustment (Appears ONLY when Line Type is Dashed or Dotted selected)
            - The gap size is the space between the dashes or dots in the grid lines.
            - Use a scaler slider to adjust the gap size. 

    **Slider-04 : Local Host Mode Only For Dev : Grid Position**
    - This is the position of the grid lines on the x and z axes.
    - Has a "Save Position" button that will save the current position of the grid lines the the project Json File.
    - The main app loader needs to load the position of the grid lines from the project Json File and set the position of the grid lines accordingly.
      - This will not be to disimilar to the way the main app loader loads the project Json File and sets the position of the camera accordingly.
    - The aim of this slider is to allow me (the developer) to position the grid lines in the scene so that they are in a more convenient position for the users (Vale Staff) to work with.
    - The slider will be a scaler slider that will allow the user to adjust the position of the grid lines on the x and z axes.
    - The grid should begin at the origin of the scene (0, 0, 0) and extend to the right and forward from the origin.
    - I should have The controls for setting the position of the grid lines on the x and z axes.
    - The Localhost to Data system needs to write the configs of the menu aswell so if i also adjust the y position along with the x and z positions then the data should be saved to the project Json File.
    - Only i should be able to adjust the x and z position of the grid lines (no one else has access to the local host flask version of the app) which i use as a developer to test the grid lines system.

# ---------------------------------------------------------
## New Files & Folders:
- Use this new folder I made to isolate and house this system:
  - Seperate concerns as much as practical from the main app.
   `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules/28__System__GridLineSystem/`

-Add all the configs to a new Json File called "GridLineSystem.json" in the new folder.
  - See the Elevations View Config File for an example of how to structure the Json File. 
  - The Page Layout system is also a good example of how to structure the Json File.
  - We do it this way to avoid hardcoding the values into the app giving me easy adjustment to add and edit the configs as needed later.
 `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules/28__System__GridLineSystem/Na__GridLineSysem__Config.json`

Add the main grid creation logic to this JavaScript File I've made for you:
 `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules/28__System__GridLineSystem/Na__GridLineSysem__GridCreationLogic.js`

Add the UI elements to this JavaScript File I've made for you:
 `D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules/28__System__GridLineSystem/Na__GridLineSystem__UiElement.js`

- If any of these files are above 1000 lines of code then split them into multiple files and think of how to best organize the code to avoid code duplication and to make the code more readable and maintainable.

# ---------------------------------------------------------
## Units System:
- Read your rules file on Units and Conversions Required Global.
- Your MDC File is located at: `ValeVision3D - This Project/.cursor/rules/06-World-Units-And-Conversions-Required-Global-.mdc`

# ---------------------------------------------------------
## Highly Modular Project
- The project is highly modular and should be designed to be easily extensible and maintainable.
- Makes sure you map out other dependencies and how to best integrate them into the project.
- You will need to find the main project index and add these new modules to the project index.
- Keep the UI element as seperate as possible and inject the element into the main app index.html file as to not bloat the main app index.html file with too many elements / inline code / logic etc.
- If any new styles are required make a dedicated stylesheet for the new module.