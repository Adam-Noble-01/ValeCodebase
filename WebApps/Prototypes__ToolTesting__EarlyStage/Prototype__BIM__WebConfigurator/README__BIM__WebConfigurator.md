#future

Build a HTML CSS JS Web App utilising two panels.
Left panel shows a CAD representation of a window using Maker.js with dxf export and sliders to control window param,eters
Right Panel, shows a 3d reprisentation by infering details from the cad, i.e. cad draws key rectrangles for frame and then 3d traces a profiles along this curve to create shape
Parameters
Window Width
Window Height.
Casements
Glaze bars Horizontally.
Glaze bars vertically.
All controlled with sliders but double clicking any slider allows for itetger input.
all units in mm


## ALWAYS 
- Use ES6 Modules for the project
- Use the latest version of the libraries and frameworks for React, Maker.js and Babylon.js (Use CDN For now will update to local imports later)
- Remember Maker JS needs to have a final process to flip the coordinate space into web coordinates 
  - Research this and build a process script section before the curves are passed downstream to Babylon.js

## IMPORTANT RULE FOR PATHS
Use path aliases instead of deep relative imports by defining a single project-root alias such as @ that maps to the src or project root, and enforce that all cross-module imports use this alias while local sibling imports may remain relative. Configure the alias consistently in tsconfig or jsconfig paths, the bundler or runtime resolver, and the editor language service so import resolution is identical everywhere. In code, prefer imports like `@/core/logger` or `@/utils/math` to avoid fragile `../../` paths, and treat alias imports as architectural boundaries rather than convenience shortcuts. Cursor should assume @ always resolves to the project root and should preserve alias imports when generating, refactoring, or moving files.
