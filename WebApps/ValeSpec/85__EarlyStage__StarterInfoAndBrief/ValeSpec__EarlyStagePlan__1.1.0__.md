# ValeSpec Early Stage Plan
--------------------------------------

## 1. Key Requirements
- Develop a new Door & Window configurator / specification tool for Vale Garden Houses
- Provide a user friendly interface for the Vale Staff to configure the doors and windows.
- This first permutation of the tool will be a hardware specification tool but will be extended to more complex product assemblies in future versions and full breakdowns of the product assemblies, but in this initial version we will focus on the hardware specification tool.
<br>

### 1.1 |  Core Reasons for Developing the Configuration Tool
- Cut Down on monotonous, repetitive and costly manual work.
- Centralise obscure expert knowledge into a system that can be easily updated and maintained.
- Enforce Product Compatibility and Constraints for the hardware items.
- Reduce human error, oversight and improve accuracy.
- Speed up the ordering process and reduce the time to order the requiredproducts.
- Assist in the creation of Factory Production Sheets.
- Provide Instant Costing and Profit Margins.

<br>

### 1.2 |  Admin Only Features
- Provide a way to easily add new products to the system. 
- Provide a way to easily update the products in the system. 
Note: These features will only be available on the LocalHost Server like with my other projects.

<br>

### 1.3 |  Product Types
All of the above are product types that can be configured and edited.
- Double Door Sets     <-- To be built in version 0.1.0 of the tool. (Initial Feature)
- Bifold Door Sets     <-- To be built in version 0.2.0 of the tool. (Future Feature)
- Single Doors         <-- To be built in version 0.1.0 of the tool. (Initial Feature)
- Windows              <-- To be built in version 0.3.0 of the tool. (Future Feature)
- Roof Lanterns        <-- To be built in version ?.?.? of the tool  (Future Feature)
All of these should be listed from version 0.1.0 but will require their own logic and features to be built for each one.

<br>

--------------------------------------
## 2. Core UI & UX Design & Application Flow

### 2.1 |  Document Management Mode
- The document management mode is the mode that allows the user to manage the document files.
- The user can create a new document, open an existing document, or delete a document.
- This will be a list of all the documents in the system.
  - Early version will load each project file fromt seperated .json files.
  - Json files will be stored in `ValesSpec\??__LocalProjectData`
  - The file will be named `ValeSpec__ProjectFile__{Vgh__ProjectCode}__{Vgh__ProjectName}.json`


| Project Code | Project Name     | Document Name         | Document Status   | Document Created | Last Modified    |
|:-----------:|:----------------|:---------------------|:----------------:|:----------------:|:----------------:|
| **62737**   | The Hill House   | Hill Main Doors       | 🟡 In Progress    | 09 Apr 2026      | 09 Apr 2026      |
| **2906**    | The Lodge        | Lodge Front Bifold    | 🟢 Completed      | 09 Apr 2026      | 09 Apr 2026      |
| **74420**   | The Glebe House  | Retreat Windows Doc   | 📝 Draft          | 09 Apr 2026      | 09 Apr 2026      |

### 2.2 |  Product Assembly Editor Mode
- This is the mode that allows the user to edit the product assemblies.
- This is where all of the controls for each of the Doors, Bifold Doors, Windows, etc are located. 
- The preview will be a 2D SVG Drawing of each product assembly.
- The user is guided through a series of steps to configure the product assembly.
- The length and width of the current assemble is displayed on the preview with red dimensions.
  - The text boxes on these dimensions can be clicked to edit the dimensions.
  - Secondly there should bne a length and width slider with numeric input boxes for the dimensions.
  - The diagram should update in real time as the user changes the dimensions.
  - The diagram is in mm and the user can enter the dimensions in integer numbers.
  - The tool only handles full mm vales such as 1000mm, 1234mm, 2123mm, etc. no decimals.
- The should be a preview panel showing the SVG Drawing of the product assembly. 
- As more options are worked through and configured, the preview should update to show the new product assembly.


### 2.3 |  Document Editor Mode
- This is the mode that allows the user to edit the document.
- This will allow for renaming the section blocks of the document.
- Allows for re-organising the section blocks of the document.
  - If you wanted to move the door set up or down the document, then this will be the place to do it.
- Each assembly created gets a block on a A4 Document portrait page (The page is endless scroll though and the generated final PDF Document will be a endless scroll PDF Document set at A4 Width)
- It has a "Edit Assembly" button that will open the Product Assembly Editor Mode for that item whether it be a door, window, bifold door, roof vent, roof lantern, etc.
- Each assembly is saved as a json group in the document file.
  - An assembly is each induvial door set or window set or bifold door set or roof vent set or roof lantern.
  - Each assembly will have sub data structures in the json group for all its parameters and settings.


### 2.4 |  Document Preview Mode
- This is the mode that allows the user to preview the document.
- This will be a preview of the document in the form of a PDF Document.
- It shows everything as though its a endless scroll A4 Document with the Vale Branding in the header.
- It is a view of what the fully rendered item will look like designed as a final review tool.


--------------------------------------
## 3. Global Data Glossary

### 3.1 |  Project Code
`{Vgh__ProjectCode}`  =  The Variable Name for the Vale Garden Houses Project Code.
`62737`               =  An example of a Project Code.
`2906`                =  An example of a Project Code.
- Codes are an arbitrary numeric code assigned to each project by Vale Garden Houses, they can be anything between 3 & 6 digits long.
- The numeric code for the Vale Project, these will be the unique identifier for the project and correspond to the numeric code Vale Garden Houses assign to each of their projects.
- Vale Garden Houses use a legacy database for their projects so we need to mirror codes for this project to allow for easy integration with their legacy systems and processes separately from this project.

### 3.2 |  Project Name
`{Vgh__ProjectName}`  =  The Variable Name for the Vale Garden Houses Project Name.
`The Hill House`       =  An example of a Project Name.
`The Lodge`            =  An example of a Project Name.
- The project name is the name of the project as it appears in the Vale Garden Houses system.
- The project name is an arbitrary name assigned to each project by Vale Garden Houses, it can be anything between 3 & 60 characters long.
- The project name is used to identify the project in the Vale Garden Houses system.


--------------------------------------
## 4. SVG Drawing Generation System
- A live preview is construction as the user selects products and configurations in the UI.
- The preview is a 2D SVG Drawing of the product assembly.
- The SVG Drawing is generated in real time as the user selects products and configurations in the UI.


### 4.1 |  Door Frame
- A simple line around the outer bounds of the door panels.
- All door panels sit within this rectangle.
- Using this define rectangle is useful as we will set a line width of 2x the standard for the panels to create a profile line.
- Add a drop shadow effect for this rectangle to make the element pop on the page.
- This rectangle has a length and a height dimension which is dynamic and tied to to users selections in the UI.
  - If UI Updates then the dimensions and rectangle update in real time like with the SketchUp 3d Window Configurator tool. 

### 4.2 |  Door Panels
- The door panels are the individual panels that make up the door.
- For now show just a shaded rectangle but the future we will add configuration options for the door panels/glazing/base panel/styles sizes etc.
- Door panels are tied to the users selections in the UI.
- Bifold doors will have more complex options etc and ability to add additional panels and configure handing and stacking options.
- Door panels become a canvas for the ironmongery to be placed on.
- The origin of each door panel is the bottom left corner of the door panel.
- So X0,Y0 is the bottom left corner of the door panel.

### 4.3 |  Handles, Hinges, Locks, Ironmongery, etc.
- Handles are nested within the door panels so use each door panel's origin for calculating the position of different ironmongery items.
- Keeping the ironmongery unique to each door panel is useful as it allows for easy updating and maintenance of the ironmongery items and keeps the dynamic / realtime nature of the SVG Drawing easy to maintain and update as different ironmongery items have different positions and orientations.
- Handles are always modelled with the world origin as the centre point of the handle.
- Handles will always be modelled as a Right Handed Handle.
  - Logic will be required to flip the handle to the left hand side if the user selects a left hand handle.
- By default dual handles are always added to double doors, but there should be a option to make them single if required.
- By default handles are inserted +1000mm up from the base of the door panel. but there should be a option to change the height if required.
- Handles on the right handed door are inset x+32mm from the origin of the door panel.
- Handles on the left handed door are inset  x-64xmm from the origin of the door panel.

Z Indexing For SVG Drawing Elements
Bottom Layer:
1. Door Panels
2. Door Frame
3. Handles, Hinges, Locks, Ironmongery, etc.
4. Dimensions & Labels and other text elements.
Top Layer:


Handles


--------------------------------------
Questions for Nick
- Where can I find the definitive CAD Files for the the door hardware items?
- 

## Notes on handles 
There are three complementary handles.
These complimentary handles are included in the initial quote.

So there are six additional handles which are charged as an extra.


Croft and Centaur, the two suppliers of one of the lever handles and one of the bifold door ironmongery, use different finishes but have 

## Notes On UX
Document may contain multiple door sets.
--------------------------
[ VALE LOGO HEADER       ]
[ DATE AUTHORED          ]
[ DATE PUBLISHED ON PDF  ]  
[ REVISION CODE          ]
[ STATUS CARD            ] <- In Progress, Pending Approval, Approved, etc (traffic light system.)
--------------------------
--------------------------
[ DOOR SET 1 SVG PREVIEW ]
[ DOOR SET 1 TITLE       ] <- Standard code by default, but the user can override by double-clicking to give a unique name.
[ DOOR SET 1 SPEC TABLE  ]
--------------------------
[ DOOR SET 2 SVG PREVIEW ]
[ DOOR SET 2 TITLE       ]
[ DOOR SET 2 SPEC TABLE  ]
--------------------------
[   JOB SPECIFIC NOTES   ]
--------------------------

## Notes On Revisions

### Notes On Hinges
- Hinges come in four different projections.
- By default, the turns are toggled on, but we will need two versions of the front prior file of the hinge:
1. The CAD file of the complete hinge as it exists in the standards
2. Another with the urns removed


### Early stage instancing.
- We will have a section after each door set is created and applied to the page. There is a button for each section to edit or duplicate. Pressing duplicate will duplicate the currently selected section, copying all parameters to a new section and naming it as a new door set.

## EMAIL SHARING 
- Create an auto email generator similar to the PlanVision 3D emailer.

### Suppliers Vale Use
- Croft      = for the lever handles.
- Centaur    = for the bifold door ironmongery.
- Simonswerk = For none bifold hinges
- Winkhaus   = For Multi-Point Locking

### IMPORTANT WARNINGS TO FLAG
- So add a flag if somebody tries to use the 8 in hinges, asking them just to confirm they definitely want to use the 8 in.
  - FLAG : must be approved by senior management before proceeding.
- Add a flag that warns the user if the different door sets in the document do not match in height.
 - All outward opening double doors should usually be the same height, but there needs to be a tolerance built in for bi-folding doors and inward opening double doors.
 This is a small tolerance of 15 mm or below, so only values entered over 15 mm should raise the flag and the warning message to the user.


--------------------------------------
### Hardward Data Files
- Each hardware item has a data file that contains the data for the hardware item. 
- This is an example showing where the object data is stored on my local machine and the web URL path to the data file.
- We will need a Json index and a builder tool to build the hardware items from the data files.
  - Scans local system for all data files in the `03__Data__HardwareDataLibrary` folder.
  - Builds a Json index of all the hardware items.
  - This should be a Python Script which is triggered using a .bat file in
    - `ValeSpec\60__Dev__WebBuildUtils\ValeSpec__Build__HardwareDataIndex__.bat`
- The Json index will be stored in the `ValeSpec\03__Data__HardwareDataLibrary\ValeSpec__HardwareDataIndex__.json` file.


#### Hardware Data Files Path Local
`D:\10_CoreLib__ValeCodebase\WebApps\ValeSpec\03__Data__HardwareDataLibrary\VG_IRN0000__Ironmongery__DoorHandles\`

#### Hardware Data File Example
`VG_IRN0001__DoorHandle__ScrollLeverHandle__.json`

#### Web URL Path Example
`https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeSpec/03__Data__HardwareDataLibrary/VG_IRN0000__Ironmongery__DoorHandles/VG_IRN0001__DoorHandle__ScrollLeverHandle__.json`

--------------------------------------
## 3. Project Technologies

**Pageless Web Application**
- The project will be a pageless web application.
- The project will be built using the following technologies:

#### HTML
- HTML will be used to structure the web application.
- The DOM will be used to manipulate the web application.
- Only basic HTML scaffolding will be used, no complex HTML structures will be used.
- JavaScript will be used extensively to manipulate the DOM and the web application.

#### CSS
- CSS will be used to style the web application.
- Required Stylesheets

```StylesheetsForProject
ValeSpec__AppStyles__Global__.css                =  Global Styles for the web application.
ValeSpec__FeatureStyles__2dSvgDrawing__.css      =  Styles for the 2D SVG Drawing / Preview feature.
ValeSpec__FeatureStyles__HardwareSchedule__.css  =  Styles for the Hardware Schedule feature.
```

#### JavaScript
- JavaScript will be used to manipulate the DOM and the web application.
- Javascript files should be grouped subfolders by feature like with my other projects.
- Javascript will be used to handle the logic for the web application and compute the necessary graphics etc.

#### JSON
- Json will be used extensively to store the data for the web application.
```DataFilesForProject
ValeSpec__Data__MainAppConfig__.json  =  The Main Application Configuration File with global settings.
ValeSpec__Data__HardwareIndex__.json  =  The Hardware Index File with all Hardware Objects data used throughout the application.
```

#### SVG
- SVG will be used to generate the SVGs for the doors.
- SVG will be used to generate the SVGs for the Windows.
- The project will generate SVGs for the doors and windows based on the user's selections.
- We will reuse the SVG Generator from here:
    ```FilePathForSVGGenerator
    C:\Users\adamw\AppData\Roaming\SketchUp\SketchUp 2026\SketchUp\Plugins\Na__ArchTools__3dWindowConfigTool__Modules__
    ```
- The exact implementation will differ from the original implementation, but the core functionality will be the same, that SVG Generator works perfectly for generating scale accurate Vector linework drawings of doors and windows.


#### DXF 
- DXF Will be used to generate the DXFs for the doors.
- DXF Will be used to generate the DXFs for the Windows.
- We can utilise the same DXF Export Library from here:
    ```FilePathForDXFExportLibrary
    C:\Users\adamw\AppData\Roaming\SketchUp\SketchUp 2026\SketchUp\Plugins\Na__ArchTools__3dWindowConfigTool__Modules__
    ``` 

--------------------------------------
## 5.Coding Specifics
`ValeSpec__`  =  The Global Namespace for the project. **!IMPORTANT!**

--------------------------------------



--------------------------------------
## 6. Helper Functions & Libraries

`HelperFunctions__Global__DateFormatter__.js`  =  A global helper function for formatting dates, use Formats such as `09 Apr 2026` & `Wed 09 Apr 2026` & `Wednesday 09th Apr 2026` (Superscript th) etc. 



--------------------------------------
## 7. Ironmongery Configurator - UI Logic

### 7.0 |  Global Settings & Initialisation
- These settings apply globally across the full Ironmongery Schedule and order logic.
- Consider locking these settings behind admin rights, requiring a boolean/permissions check on the user session.

#### Ironmongery Finish
- UI Component: Global dropdown, positioned at the top of the configurator.
- Options: `Unlacquered Brass`, `Satin Nickel`, `Bronze`, `Other` (free text input field if Other is selected).
- This selection cascades down and automatically sets the finish for all subsequent hardware items, including Banham hook locks on bi-folds.


--------------------------------------
### 7.1 |  Doors Configurator
- Each row represents one door configuration.
- Rows are added by dragging down or clicking to generate a new row.

#### Column 1 |  Door Type
- UI Component: Dropdown.
- Options: `None`, `Outward Opening Double Doors`, `Inward Opening Double Doors`, `Outward Opening Single Doors`, `Inward Opening Single Doors`, `Bi Fold Doors`, `Other`.
  - Selecting `Bi Fold Doors` triggers and opens a new tab/instance for the Bi-Fold Configurator (See Section 7.3).
  - Selecting `Other` generates a custom input tab.

#### Column 2 |  Quantity
- UI Component: Numeric dropdown / input.
- Label: `No. of Instances`

#### Column 3 |  Dimensions
- UI Component: Two separate inputs for `Width` and `Height` (integer mm values only).
- Hinge Calculation Engine:
  - IF Door height < 2200mm AND width < 940mm (Single) OR < 1800mm (Double): Assign 3 hinges per leaf.
  - IF Door height > 2200mm AND width < 940mm (Single) OR < 1800mm (Double): Assign 4 hinges per leaf.
  - IF Door width > 950mm (regardless of height): Assign 4 hinges, hanging as Double Top.
    - Note: Subject to review. May become Double Top & Bottom = 5 hinges total per panel.
- Locking Calculation Engine:
  - IF Double Door: Generate 5-Point Locking. Requires height-dependent extension pieces.
  - IF Single Door: Generate 3-Point Multi-Point Locking.
    - Note: Taller single doors may trigger an additional top bolt.

#### Column 4 |  Hinge Projection
- UI Component: Dropdown.
- Options: `4`, `5`, `6`, `8`.
- FLAG: If the user selects `8`, prompt a confirmation warning. Must be approved by senior management before proceeding.

#### Column 5 |  Lever Specifications
- UI Component 5A (Lever Type): Dropdown - `Plan`, `Scroll`, `Newton`, `Fitzroy`, `Empire`, `Lindum`, `Griffin`, `Aspen`, `Lipsham`.
  - One dropdown selection applies to ALL rows in the document.
- UI Component 5B (Lever Height): Dropdown / input.
  - Default: `1000mm` from the base of the door panel.
  - Option for manual height input override.
  - IF a Single Door is selected in Column 1: trigger an Additional Handing Prompt for Left / Right hand selection.

#### Column 6 |  Cabin Hooks
- UI Component: Dropdown and numeric inputs.
- Size Options: `4"`, `6"`, `10"`, `12"`, `18"`.
- Inputs: Number of Hooks, Number of Eyes.

#### Column 7 |  Miscellaneous
- UI Component: Dropdown / checkboxes.
- Options: `N/A`, `Overhead Restrictors`, `Letter Plate`, `Cat Flap`.


--------------------------------------
### 7.2 |  Windows Configurator
- Similar row-based layout to the Doors Configurator.
- Complex conditional logic dictates which columns are visible based on the selected Opener Type.

#### Column 1 |  Opener Type
- UI Component: Dropdown.
- Options: `None`, `Top Hung Casement`, `Side Hung Casement`, `Weighted Sash Window`, `Weighted Sash Window (Top Fixed)`, `Spiral Sash Window`, `Spiral Sash Window (Top Fixed)`.
- IF any Sash Window type is selected: trigger sub-prompt - "Does the window have a Central Vertical Glazing Bar? Yes / No".
  - A singular central fastener is not possible if a central vertical glazing bar is present.

#### Column 2 |  Quantity
- UI Component: Numeric dropdown / input.
- Label: `No. of Instances`

#### Column 3 |  Dimensions
- UI Component: Two separate inputs for `Width` and `Height` (integer mm values only).
- Before calculating hardware, trigger global prompt: "Is this window isolated? (e.g. Bathroom, Porch, Masonry over worktops)".
  - IF Yes: override and remove fasteners throughout for this row.
- Hinge Calculation Engine:
  - IF Top Hung AND width < 849mm: Assign 2 hinges.
  - IF Top Hung AND width > 850mm: Assign 3 hinges.
  - IF Side Hung AND height < 1299mm: Assign 2 hinges.
  - IF Side Hung AND height > 1300mm: Assign 3 hinges.
  - Height and Width values directly dictate whether Column 4 becomes accessible.

#### Column 4 |  Fasteners  ← Conditional Visibility
- Only visible if `Side Hung Casements` or `Top Hung Casements > 1800mm High` are selected.
- Fastener Type: Dropdown - `Traditional` or `Multi Point`.
- Fastener Pattern: Dropdown - defaults to `Standard` for Traditional. Blank for Multi-Point.
- IF Side Hung Casement AND height > 1200mm AND uses Traditional Fasteners: Assign 2x Fasteners per sash.

#### Column 5 |  Stays  ← Conditional Visibility
- Only visible for Casement Windows.
- Stay Type: Dropdown - `Peg Stay`, `Sliding Stay`.
- IF Side Hung: 1x Stay per window.
- IF Top Hung AND width > 650mm: 2x Stays per window.
- IF Top Hung AND width < 650mm AND height > 850mm: 2x Fasteners required. Triggers fastener continuity rules.

#### Column 6 |  Miscellaneous
- UI Component: Dropdown / checkboxes.
- Options: `Motorised - with ETR or Rocker Switch`, `Additional Security`.
- IF Motorised is selected: override and remove standard stays and locking hardware for this row.


--------------------------------------
### 7.3 |  Bi-Fold Configurator
- This section opens dynamically as its own tab/instance when `Bi Fold Doors` is selected in Column 1 of the Doors Configurator.
- Operates as a visual 2D builder for the bi-fold layout and configuration.

#### Core Controls
- Dimensions: Separate inputs for `Width` and `Height`.
- Visual Layout: Option to flip / mirror the bi-fold configuration visually.
- IF any individual door leaf width > 1000mm: trigger a warning prompt "ARE YOU SURE?".

#### Locking Mechanism
- Single/Double toggle for the external twinpoint lock. Internal twinpoint is the default state.
- Generates a Banham Hook Lock automatically in the finish set by the Global Ironmongery Finish setting.

#### Lever Logic
- Generates a handed lever for the bi-fold. This is not optional.
- References the global lever type selection set at the top of the page.

#### SVG Visual Generation
- The UI visually maps out the door layout based on the number of panels selected.
- Displays fold directions using chevron arrows indicating inward / outward folding.
- Displays which panels are active door leafs with levers and locks shown.
- The visually mapped SVG directly calculates and outputs the hinge, guide, and pull handle requirements to the Ironmongery Schedule.


--------------------------------------
### 7.4 |  Document Preview Mode
- This mode shows the final document as it will be produced.
- Gives the option to configure the document display settings prior to export.
  - Sometimes summaries might only be required (Collates everything into a single section for easy reading)
  - Sometimes a table only export is required (removes the preview images)
- All configuration data files fpr the assemblies are loaded.
- Logic then builds a series of document sections broken down and detailed below. 
- A standardised company branded manufacturing specification sheet is generated.
- The Tool contains clearly defined sections and subsections for each assembly with clear tables and diagrams.
- Features a PDF Export Button to export the document as a PDF.
- Must Use a single point of truth for the document preview mode and the PDF export styling to prevent any inconsistencies or errors in the styling of the document.

### Aim Of The Document Preview Mode
- To allow the end user to preview the end document and easily switch the level of detail and information displayed in the document.
- For Technical department auditing its usefull to have all the detail but the factory buying department often only need just a summary table of all hardware required their combined quantities for all assemblies, suppliers and all critical warnings and job specific notes.
- The aim is to create a simple intuitive pipeline for creating different standardised manufacturing specification sheets for different departments and roles.
- Templates may be added in the future to allow the user to toggle the view states even faster, but this is a future idea.
-

#### Preview Image Size Options
- Small Diagrams = Displays the images inline with the tables. (On By Default)
- Large Diagrams = Stacks the images over the tables like currently.
- No Diagrams    = Removes the preview images completely, only tables are displayed.
- Use a toggle switch similar to the one used in the assembly editor to toggle between the two options.

#### Document Sections Toggles
- Toggle to show or hide the full ironmongery schedule.
1. Full Ironmongery Schedule      =  Default On if off, does not render Section 01 | Full Ironmongery Schedule.
2. Ironmongery Schedule Summary   =  Default On if off, does not render Section 02 | Ironmongery Schedule Summary.
3. Warnings Section               =  ALWAYS ON - Most jobs wont have warnings, butut if they do, they MUST be displayed 
4. Special Job Notes Section      =  Default On if off, does not render Section 04 | Special Job Notes Section.

#### Warnings Section Styling
- The warnings must be collated and rendered and the warning per {{Assembly__Identity__Config__Title}} listed and its respective warning messages listed in a table.
- This section styled to make them stand out clearly like we already did with the document editor and assembly system.
- on the PDF they should be in a red box just like with the document editor and assembly system.
- This is conditional on the warning data and system already in use, If no warnings exist, this section is not rendered.
- But its critical it is if warning exists to help other members of staff to understand the job and the potential issues and reduce errors when ordering the the required hardware and manufacturing.

#### Auto Emailing System
**!MAKE A PLACEHOLDER BUTTON FOR NOW!**
- In the future i will use the system already created for ValeVision 3D Which uses a Microsoft Graph API to send emails to the user.
- Our previous email system loaded and auto-filled email address etc for inter company email alerts etc.


--------------------------------------
### 7.5 |  Document Preview Mode - Example Outputs
- Depending which assemblies exist in the document, the following outputs will be generated.
- The are to be in this order if all types exist in the document.
    1. Bi-Fold Door Set
    2. Double Doors 
    3. Single Doors
    4. Windows
- Examples shown below are indicative of the output and layout when in Small Diagrams Mode (Default)

--------------------------------------
# DOCUMENT HEADER SECTION WITH LOGO AND KEY DETAILS ETC
--------------------------------------
## Section 01 |  Full Ironmongery Schedule
### Bifold Door Set {{##}} |  {{Assembly__Identity__Config__Title}}
-----------------           | Specification Item                 | Detail                            |
| Preview Image | <Padding> | ---------------------------------- | --------------------------------- |
----------------            | {{Keys Specific To The Assembly}}  | {{Keys Specific To The Assembly}} |
                            | {{Keys Specific To The Assembly}}  | {{Keys Specific To The Assembly}} |
                            | {{Keys Specific To The Assembly}}  | {{Keys Specific To The Assembly}} |
                            
<HR>

### Double Door Set {{##}} |  {{Assembly__Identity__Config__Title}}
-----------------           | Specification Item                 | Detail                            |
| Preview Image | <Padding> | ---------------------------------- | --------------------------------- |
----------------            | {{Keys Specific To The Assembly}}  | {{Keys Specific To The Assembly}} |
                            | {{Keys Specific To The Assembly}}  | {{Keys Specific To The Assembly}} |
                            | {{Keys Specific To The Assembly}}  | {{Keys Specific To The Assembly}} |

<HR>

### Single Door {{##}} |  {{Assembly__Identity__Config__Title}}
-----------------           | Specification Item                 | Detail                            |
| Preview Image | <Padding> | ---------------------------------- | --------------------------------- |
----------------            | {{Keys Specific To The Assembly}}  | {{Keys Specific To The Assembly}} |
                            | {{Keys Specific To The Assembly}}  | {{Keys Specific To The Assembly}} |
                            | {{Keys Specific To The Assembly}}  | {{Keys Specific To The Assembly}} |
<HR>

### Window {{##}} |  {{Assembly__Identity__Config__Title}}
-----------------           | Specification Item                 | Detail                            |
| Preview Image | <Padding> | ---------------------------------- | --------------------------------- |
----------------            | {{Keys Specific To The Assembly}}  | {{Keys Specific To The Assembly}} |
                            | {{Keys Specific To The Assembly}}  | {{Keys Specific To The Assembly}} |
                            | {{Keys Specific To The Assembly}}  | {{Keys Specific To The Assembly}} |

<HR>

## Section 02 |  Ironmongery Schedule Summary
| Specification Item                 | Detail                            | Supplier       | Total Quantity      |
| ---------------------------------- | --------------------------------- | ------------------------------------ |
| {{Keys Specific To The Assembly}}  | {{Keys Specific To The Assembly}} | {{{Supplier}}} | {{Total Quantity}}  |
| {{Keys Specific To The Assembly}}  | {{Keys Specific To The Assembly}} | {{{Supplier}}} | {{Total Quantity}}  |
| {{Keys Specific To The Assembly}}  | {{Keys Specific To The Assembly}} | {{{Supplier}}} | {{Total Quantity}}  |

<HR>

## Section 03 |  Warnings Section
{{IF ANY : Collates and presents all warnings - See Warning System in place and the json data for the warnings}}.

<HR>

## Section 04 |  Special Job Notes Section
{{IF ANY : Collates and presents all special job notes - See Special Job Notes System in place and the json data for the  job notes}}.

<HR>

End Of Document

--------------------------------------

- Hinge Requirement: Calculated type and size. Note: Internal doors require 4x4 Butts.
- Lever Type & Quantity: Aggregated list across all door rows.
- Cylinder Requirement: 1x per Multi-Point Track.
- Miscellaneous: Aggregated list of all miscellaneous items selected.

#### Doors Schedule Output
- Multi-Point Requirement: Height value, plus distinction for Master / Slave / Single Door.
- Hinge Requirement: Calculated type and size. Note: Internal doors require 4x4 Butts.
- Lever Type & Quantity: Aggregated list across all door rows.
- Cylinder Requirement: 1x per Multi-Point Track.

### Single Door Schedule Output
- IF Single Doors Exist in the document THEN.
  - A Assembly By Assembly Schedule Output is generated for each single door.
  - This features a snapshot image of the final door assembly with all the hardware installed.
  - 

#### Windows Schedule Output
- Hinge Types, Size & Quantity: Defaults to `2 x 2½" Hinges` for Top Hung and `4 x 4" Hinges` for Side Hung.
- Casement Fastener Type, Handing & Quantity.
- Multi-Point Number & Details.
- Sash Lifting Hooks: Fixed at 2x per window instance.
- Sash Pulleys: Fixed at 2x per opener.


--------------------------------------
- A flag prompt should distinguish FROM STOCK orders vs BESPOKE ORDERS.




