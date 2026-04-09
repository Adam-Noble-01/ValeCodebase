# ValeSpec Early Stage Plan
--------------------------------------

## 1. Key Requirements
- Develop a new Door & Window configurator / specification tool for Vale Garden Houses
- Provide a user friendly interface for the Vale Staff to configure the doors and windows.
<br>

### 1.1 Core Reasons for Developing the Configuration Tool
- Cut Down on monotonous, repetitive and costly manual work.
- Centralise obscure expert knowledge into a system that can be easily updated and maintained.
- Enforce Product Compatibility and Constraints for the hardware items.
- Reduce human error, oversight and improve accuracy.
- Speed up the ordering process and reduce the time to order the requiredproducts.
- Assist in the creation of Factory Production Sheets.
- Provide Instant Costing and Profit Margins.

<br>

### 1.2 Admin Only Features
- Provide a way to easily add new products to the system. 
- Provide a way to easily update the products in the system. 
Note: These features will only be available on the LocalHost Server like with my other projects.

<br>

--------------------------------------
## 2. Project Naming Ideas
*NF to Approve*
- ValeSpec

--------------------------------------.
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




```JSON
{
  "ValeSpec__Data__HardwareIndex__": {
    "Scroll Lever Handle": {
      "HardwareItem__Name"               : "Scroll Lever Handle",
      "HardwareItem__Code"               : "VG_IRN0001",
      "HardwareItem__Type"               : "Door Handle",
      "HardwareItem__Description"        : "Traditional Lever Handle",
      "HardwareItem__Image"              : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0001.png",
      "HardwareItem__SvgUrl"             : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0001.svg",
      "HardwareItem__IsComplementary"    : true,
      "HardwareItem__Supplier"           : "Croft",
      "HardwareItem__SupplierPrice__GBP" : "NULL"
    },
    "Plan Lever Handle": {
      "HardwareItem__Name"        : "Plain Lever Handle",
      "HardwareItem__Code"        : "VG_IRN0002",
      "HardwareItem__Type"        : "Door Handle",
      "HardwareItem__Description" : "Traditional Lever Handle",
      "HardwareItem__Image"       : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0002.png",
      "HardwareItem__SvgUrl"      : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0002.svg",
      "HardwareItem__IsComplementary"    : true,
      "HardwareItem__Supplier"           : "Croft",
      "HardwareItem__SupplierPrice__GBP" : "NULL"
    },

    "Newton Lever Handle": {
      "HardwareItem__Name"        : "Newton Lever Handle",
      "HardwareItem__Code"        : "VG_IRN0003",
      "HardwareItem__Type"        : "Door Handle",
      "HardwareItem__Description" : "Traditional Lever Handle",
      "HardwareItem__Image"       : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0003.png",
      "HardwareItem__SvgUrl"      : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0003.svg",
      "HardwareItem__IsComplementary"    : true,
      "HardwareItem__Supplier"           : "Croft",
      "HardwareItem__SupplierPrice__GBP" : "NULL"
    },
    "Fitzroy Lever Handle": {
      "HardwareItem__Name"        : "Fitzroy Lever Handle",
      "HardwareItem__Code"        : "VG_IRN0004",
      "HardwareItem__Type"        : "Door Handle",
      "HardwareItem__Description" : "Traditional Lever Handle",
      "HardwareItem__Image"       : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0004.png",
      "HardwareItem__SvgUrl"      : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0004.svg",
      "HardwareItem__IsComplementary" : false
    },
    "Empire Lever Handle": {
      "HardwareItem__Name"        : "Empire Lever Handle",
      "HardwareItem__Code"        : "VG_IRN0005",
      "HardwareItem__Type"        : "Door Handle",
      "HardwareItem__Description" : "Traditional Lever Handle",
      "HardwareItem__Image"       : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0005.png",
      "HardwareItem__SvgUrl"      : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0005.svg",
      "HardwareItem__IsComplementary" : false
    },
    "Lindum Lever Handle": {
      "HardwareItem__Name"        : "Lindum Lever Handle",
      "HardwareItem__Code"        : "VG_IRN0006",
      "HardwareItem__Type"        : "Door Handle",
      "HardwareItem__Description" : "Traditional Lever Handle",
      "HardwareItem__Image"       : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0006.png",
      "HardwareItem__SvgUrl"      : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0006.svg",
      "HardwareItem__IsComplementary" : false
    },
    "Griffin Lever Handle": {
      "HardwareItem__Name"        : "Griffin Lever Handle",
      "HardwareItem__Code"        : "VG_IRN0007",
      "HardwareItem__Type"        : "Door Handle",
      "HardwareItem__Description" : "Traditional Lever Handle",
      "HardwareItem__Image"       : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0007.png",
      "HardwareItem__SvgUrl"      : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0007.svg",
      "HardwareItem__IsComplementary" : false
    },
    "Aspen Lever Handle": {
      "HardwareItem__Name"        : "Aspen Lever Handle",
      "HardwareItem__Code"        : "VG_IRN0008",
      "HardwareItem__Type"        : "Door Handle",
      "HardwareItem__Description" : "Traditional Lever Handle",
      "HardwareItem__Image"       : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0008.png",
      "HardwareItem__SvgUrl"      : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0008.svg",
      "HardwareItem__IsComplementary" : false
    },
    "Lipsham Lever Handle": {
      "HardwareItem__Name"        : "Lipsham Lever Handle",
      "HardwareItem__Code"        : "VG_IRN0009",
      "HardwareItem__Type"        : "Door Handle",
      "HardwareItem__Description" : "Traditional Lever Handle",
      "HardwareItem__Image"       : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0009.png",
      "HardwareItem__SvgUrl"      : "https://www.valegardenhouses.com/Objects/HardwareLibrary/VG_IRN0009.svg",
      "HardwareItem__IsComplementary" : false
    }
  }
}
```

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



Based on the provided logic diagram for the **Vale Garden Houses Ironmongery Configurator**, here is a step-by-step logic and dynamic UI specification document. 

This document maps out the conditional rules, dependencies, and dynamic visual triggers required to build the frontend interface.

---

# UI / UX Logic Map: Ironmongery Configurator

## 0. GLOBAL SETTINGS & INITIALIZATION
These settings apply globally to the generated Bill of Materials (BOM) and overall order logic.

*   **System Prompt:** `SHOULD THIS BE LOCKABLE WITH ADMINISTRATOR RIGHTS?` (Requires boolean / permissions logic for the user session).
*   **Global Variable: Ironmongery Finish**
    *   **UI Component:** Dropdown menu.
    *   **Options:** Unlacquered Brass, Satin Nickel, Bronze, Other (Dynamic text input field).
    *   **Behavior:** This selection cascades down and automatically sets the finish for all subsequent hardware (e.g., Banham hook locks on bi-folds).

---

## SECTION 1: DOORS CONFIGURATOR
**UI Behavior:** The user adds a door by dragging down or clicking to generate a new row ("1X CELL PER ROW"). Each row represents a specific door configuration.

### **Column 1: Door Type**
*   **UI Component:** Dropdown
*   **Options:** 
    *   `None`
    *   `Outward Opening Double Doors`
    *   `Inward Opening Double Doors`
    *   `Outward Opening Single Doors`
    *   `Inward Opening Single Doors`
    *   `Bi Fold Doors` -> **TRIGGER:** Generates and opens a custom tab/instance for the "BI FOLD CONFIGURATOR" (See Section 3).
    *   `Other` -> **TRIGGER:** Generates custom input tab.

### **Column 2: Quantity**
*   **UI Component:** Numeric Dropdown/Input
*   **Label:** `No. of Instances`

### **Column 3: Dimensions (Width & Height)**
*   **UI Component:** Two separate Dropdowns/Inputs (`Width`, `Height`)
*   **Dynamic Logic (Hinge Calculation Engine):**
    *   *IF* Door < 2200mm Tall AND < 940mm Wide (Single) OR < 1800mm Wide (Double): **Assign 3 hinges per leaf.**
    *   *IF* Door > 2200mm Tall AND < 940mm Wide (Single) OR < 1800mm Wide (Double): **Assign 4 hinges per leaf.**
    *   *IF* Door > 950mm Wide (Regardless of height): **Assign 4 hinges (Hanging as Double Top).** *(Note: Subject to review, may become Double Top & Bottom = 5 in total per panel).*
*   **Dynamic Logic (Locking Calculation Engine):**
    *   *IF* Double Door: **Generate 5-Point Locking.** (Requires height-dependent extension pieces).
    *   *IF* Single Door: **Generate 3-Point Multi-Point Locking.** *(Note: Taller single doors may trigger a further top bolt).*

### **Column 4: Hinge Projection**
*   **UI Component:** Dropdown
*   **Options:** `4`, `5`, `6`, `8`

### **Column 5: Lever Specifications**
*   **UI Component 5A (Lever Type):** Dropdown (`Plan`, `Scroll`, `Newton`, `Fitzroy`, `Empire`, `Lindum`, `Griffin`, `Aspen`, `Lipsham`). 
    *   *Behavior:* 1x Dropdown selection applies to ALL rows.
*   **UI Component 5B (Lever Height):** Dropdown/Input. 
    *   *Default:* Standard + 1000mm.
    *   *Behavior:* Option for manual input.
    *   **TRIGGER:** If a single door is selected in Column 1, prompt an `ADDITIONAL HANDING PROMPT` (Left/Right hand).

### **Column 6: Cabin Hooks**
*   **UI Component:** Dropdown & Numeric Inputs
*   **Options:** Sizes `4"`, `6"`, `10"`, `12"`, `18"`
*   **Inputs:** Number of Hooks, Number of Eyes.

### **Column 7: Miscellaneous**
*   **UI Component:** Dropdown/Checkboxes
*   **Options:** `N/A`, `Overhead Restrictors`, `Letter Plate`, `Cat Flap`.

---

## SECTION 2: WINDOWS CONFIGURATOR
**UI Behavior:** Similar to doors, users drag down/click to generate new rows. Complex conditional logic dictates which columns are visible based on the "Opener Type".

### **Column 1: Opener Type**
*   **UI Component:** Dropdown
*   **Options:** `None`, `Top Hung Casement`, `Side Hung Casement`, `Weighted Sash Window`, `Weighted Sash Window (Top Fixed)`, `Spiral Sash Window`, `Spiral Sash Window (Top Fixed)`.
*   **TRIGGER:** If ANY "Sash Window" is selected, trigger sub-prompt: *"Does window have a Central Vertical Glazing Bar (GB)? Yes/No"*.
    *   *Logic:* Affects fastener numbers (a singular central fastener is impossible with a central vertical GB).

### **Column 2: Quantity**
*   **UI Component:** Numeric Dropdown/Input
*   **Label:** `No. of Instances`

### **Column 3: Dimensions (Width & Height)**
*   **UI Component:** Two separate Dropdowns/Inputs (`Width`, `Height`)
*   **Global Trigger Prompt:** Before calculating hardware, trigger prompt: *"Is window isolated? (e.g., Bathroom, Porch, Masonry over worktops)"*. 
    *   *Logic:* If YES, this **overrides/removes** the inclusion of fasteners throughout.
*   **Dynamic Logic (Hinge/Hardware Engine):**
    *   *IF* Top Hung < 849mm: **Assign 2 hinges.**
    *   *IF* Top Hung > 850mm: **Assign 3 hinges.**
    *   *IF* Side Hung < 1299mm: **Assign 2 hinges.**
    *   *IF* Side Hung > 1300mm: **Assign 3 hinges.**
    *   *Height/Width* directly dictates if Column 4 becomes accessible.

### **Column 4: Fasteners (CONDITIONAL VISIBILITY)**
*   **Visibility Condition:** ONLY appears if `Side Hung Casements` OR `Top Hung Casements > 1800mm High` are selected.
*   **UI Components:** 
    *   Dropdown: `Fastener Type` (Traditional or Multi Point)
    *   Dropdown: `Fastener Pattern` (Defaults to "Standard" for traditional; blank field for multi-point).
*   **Dynamic Logic:** *IF* Side Hung Casement > 1200mm High AND uses Traditional Fasteners: **Assign 2x Fasteners per sash.**

### **Column 5: Stays (CONDITIONAL VISIBILITY)**
*   **Visibility Condition:** ONLY appears for `Casement Windows`.
*   **UI Component:** Dropdown `Stay Type` (`Peg Stay`, `Sliding Stay`).
*   **Dynamic Logic:** 
    *   Side Hung: **1x Stay per window.**
    *   Top Hung > 650mm Wide: **2x Stays per window.**
    *   Top Hung < 650mm Wide AND > 850mm Tall: **Needs 2x Fasteners.** (Triggers fastener continuity rules).

### **Column 6: Miscellaneous**
*   **UI Component:** Dropdown/Checkboxes
*   **Options:** `Motorised - with ETR or Rocker Switch`, `Additional Security`.
*   **Dynamic Logic:** Selection of "Motorised" **OVERRIDES** standard stays and locking hardware.

---

## SECTION 3: BI-FOLD CONFIGURATOR (Dynamic SVG & Logic Tab)
**UI Behavior:** This section opens dynamically per instance when "Bi Fold Doors" is selected in the Door Configurator. It acts as a visual 2D builder.

### **Core UI Controls:**
1.  **Dimensions:** Dropdown for `Width` & `Height`.
2.  **Visual Layout:** Options to flip/mirror the configuration visually.
3.  **Dynamic Warning:** 
    *   **TRIGGER:** *IF* Door Leaf Width > 1000mm, trigger prompt: *"ARE YOU SURE?"*.
4.  **Locking Mechanism:**
    *   Single/Double toggle specifically for external twinpoint (Internal twinpoint is the default status).
    *   Generates a Banham Hook Lock in the corresponding finish selected in Global Settings.
5.  **Lever logic:** Generates handed lever. This is *not optional* and references the global lever selection at the top of the page.

### **Visual Generation (Dynamic 2D SVG Engine):**
The UI will visually map out the door based on the number of panes selected (as shown in the blue grid diagrams). 
*   Displays fold directions (chevrons/arrows indicating inward/outward folding).
*   Displays which panels are active doors (marked with levers/locks).
*   **BOM Output:** Visually mapped SVG directly calculates and pushes the programmatic hinge, guide, and pull requirements to the final order.


--------------------------------------

## OUTPUT / BILL OF MATERIALS (BOM) GENERATION
At the bottom of the configurator, the tool compiles all logic into a manufacturing spec sheet.

**General Flag:** Prompt to distinguish "FROM STOCK" orders vs "BESPOKE ORDERS".

### **Doors BOM Output:**
*   **Multi-Point Requirement:** Height + Distinction for Master / Slave / Single Door.
*   **Hinge Requirement:** Calculates type and size (e.g., Internal doors require 4x4 Butts).
*   **Lever Type & Number:** Aggregated list.
*   **Cylinder Requirement:** 1x per Multi-Point Track.
*   **Miscellaneous Requirements:** Aggregated list.

### **Windows BOM Output:**
*   **Hinge Types, Size & Quantity:** Defaults to `2 x 2 1/2" Hinges for Top Hung` and `4 x 4" Hinges for Side Hung`.
*   **Casement Fastener Type, Handing & Quantity.**
*   **Multi-Point No. & Details.**
*   **Sash Lifting Hooks:** Fixed at 2x per window instance.
*   **Sash Pulleys:** Fixed at 2x per opener.