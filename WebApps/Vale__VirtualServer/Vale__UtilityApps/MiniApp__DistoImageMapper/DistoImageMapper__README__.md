# Disto Image Mapper

Turns a Leica DISTO survey folder into an interactive 3D photo atlas. Choose a folder: the 3D CAD file gives the space,
the plan and elevation go on their planes in that space, and every photo loads onto its point. Click a photo to expand it.

An installable app that works offline. No back end and no sign-in: files are only read in the browser and nothing leaves
the device. Installing goes through the shared Vale install card (`Shared__AppInstall`), as in the other apps. In a browser it
comes by itself a second after the page opens (`data-app-show-after-ms`); never in the installed app, or for a while after Not now
(1 hour, then 1 day, 1 week, 30 days). The Install App buttons bring it back sooner.

## Run It on This PC

```bat
Start__DistoImageMapper__TestServer__8033__.bat
```

It opens <http://localhost:8033/DistoImageMapper__AppIndex__.html>. A server is needed because ES modules cannot run from
`file://`. The example survey is in `100__TesttingInput` (git-ignored, because the repository is public).

## What It Reads

| File | Gives |
|---|---|
| `3D_*.dxf` | The 3D space: every point's X, Y, Z and the survey line |
| `2DG_*.dxf` | The plan: laid flat below the model |
| `2DW_*.dxf` | The elevation: stood up behind the model |
| `*.csv` | The shot log: angle and distance per shot, which locate the tripod |
| `IMG_*.jpg` | The photo at each point, with the DISTO's crosshair on the measured point |

- **The photo's file name is the key.** The CSV gives it per row, and in each DXF a TEXT entity sits on each POINT holding
  it. That is what ties the five kinds of file together.
- A missing file never stops the survey. The menu's **Survey Check** says what was missing and what was done instead.
- Choosing the DISTO's parent folder lists the surveys inside it, newest first.

## The Coordinates

| Space | Units | Up | Used by |
|---|---|---|---|
| Model | mm | Z | The DISTO's files. The first point is the origin; the second lies on the X axis, on its negative side |
| World | metres | Y | three.js. `model (X, Y, Z)` becomes `world (X / 1000, Z / 1000, -Y / 1000)`: a quarter turn, so nothing mirrors |
| Sheet | mm | V | A 2D CAD file's `(x, y)` |

`DistoImageMapper__Env3d__Coordinates__.mjs` is the only place these translate.

**Sheets are tested, not assumed.** `SurveyBuilder` compares each 2D file's points with the 3D points on every signed
pairing of axes, and the best fit says how it maps. On the example, 2DG is `(X, Y)` and 2DW is `(X, Z)`, both to 0.00 mm.
Drop lines end where the 2D file says the point is, so a file that disagrees visibly leans.

**The tripod is solved, not given.** The CSV's X, Y and Z are the shots' polar readings in a turned and shifted frame,
so a least squares fit of the two recovers where the tripod stood. Its Hz angle runs clockwise from above.

**A photo's true size:** field of view F at distance D shows a square `2 D tan(F / 2)` across. F is 4.1 degrees, measured
from the example by correlating neighbouring photos against the angle between their shots. At the right value the photos
line up with each other in the Tripod view.

**The Tripod view always shows the photos As Shot**, each facing the tripod, and the Arrangement list says so. Leaving it goes back to
the chosen arrangement: On the Point, unless Atlas was picked. As Shot picked by hand in another view lasts until then, and is not
kept for the next visit.

## The Menu

The right-hand column. It opens on the survey's summary with every section folded (Layers, Photos, Sheets, Clipping Box,
Survey Check), and they unfold one at a time, as ValeVision 3D's Tools & Settings rows do. What is used less waits in a group
nested in its section: Size and See-Through under Photos; Turn and Snap, and Faces and Their Names, under Clipping Box.

- **Drag its left edge to widen it:** 248 to 640 px, never past 60% of the window (the config's `Panel` block). Double-click the
  edge, or press Home on it, for the usual 292 px; the arrow keys move it 16 px at a time.
- The Panel button, at the right end of the toolbar, folds it away. A phone always starts with it folded, and it slides in over the view.

## The Settings File

Everything the app remembers is one JSON document kept in this browser, the local storage key `DistoImageMapper__UserConfig`
(`01__AppCore/DistoImageMapper__AppCore__UserConfig__.mjs`). It is written in the house config style, as `Na__AppConfig__Main.json`
is: a root key, a description, then one block per part of the app with the colons in a column.

| Block | Holds |
|---|---|
| `DistoImageMapper__UserConfig__Meta` | The schema version, the app version that last wrote it, and when |
| `DistoImageMapper__UserConfig__Panel` | The menu's width, whether it is folded, the open section and the open groups |
| `DistoImageMapper__UserConfig__Viewer` | The arrangement, photo size, see-through, lift, field of view, sheet offsets and layers |
| `DistoImageMapper__UserConfig__ClipBox` | The faces' snap, Clip the View to the Box, and each survey's box by its name |
| `DistoImageMapper__UserConfig__Export` | The export dialog's ticks |

- Nothing is sent anywhere: each browser, and each installed copy, keeps its own. It is written a moment after a change, and at
  once when the page closes.
- The first open of 1.5.0 gathers the separate keys 1.4.0 kept into it, then removes them.
- To read it: DevTools, Application, Local storage, or `localStorage.getItem('DistoImageMapper__UserConfig')` in the console.

## The Clipping Box

A box round the survey that keeps the points inside it, or those outside (the menu's Clipping Box: Points). The points it
leaves out hide everywhere: photos, survey line, drop and sight lines, the numbers on the sheets, the filmstrip and the
lightbox, and no export holds them. B shows or hides it.

- **Its faces are AURA's drawing planes** (ValeVision AURA's `Na__Environment3d__DrawingPlanes__`, after TrueVision 3D's): a faint
  face in its own colour, its name on a tab, grips in the corners. Drag a name or a grip and the face moves along its own direction,
  snapped to the panel's grid; Escape puts it back. A face turned away from you is faint and has no handles: orbit round to it.
- **Square to Points** turns the box square to a wall: click two photos on it. Its Front runs from the first to the second and
  faces the tripod, and the box refits round every point. Turn fine-tunes it; Fit to Points refits it as it is turned.
- **Each face is a view and a drawing.** Its View button looks straight on at it, from outside, in parallel. Name a face (a
  Garden Elevation, say) and the name goes on its tab, its drawing and its file. At Turn 0 the Front reads X across, Z up (the
  DISTO's own 2DW) and the Top X, Y (its 2DG). The Top and Bottom views keep the box's Front at the foot of the screen.
- **Clip the View to the Box** (on unless turned off) makes the box a section box: what it leaves out is gone from the view,
  following a face live as it is dragged. The survey line, the tripod, its sight lines and the axes are cut by the box itself.
  Inside, the plan is cut to the box's footprint and the elevation to its extent along it and its height, so every kept point's
  place on them stays; Outside, a sheet loses only what lies in the box. Photos go whole, with their points. Off, everything
  shows round the box; the points it leaves out stay hidden either way.
- **All points, with the box shown and the clip on, keeps the inside**, in the view, the filmstrip and the drawings alike, and
  the count under Points says so. Hide the box (B) or untick the clip to see and export every point.
- Remembered per survey, by its name, in the settings file.

## The DXF Export

Export DXF saves one zip: a 3D drawing and one drawing per chosen face (the dialog has a tick for each, by name), the photos,
`Points.csv` and a README. All in millimetres, R2000 DXF (`DistoImageMapper__Export__DxfWriter__.mjs`), which AutoCAD, BricsCAD,
DraftSight and DWG TrueView read.

- **The photos are linked, not inside the DXF.** No DXF can hold a picture: an IMAGEDEF only names its file, and AutoCAD's only way
  to carry one inside is an OLE object, fragile and not read by most other programs. Each drawing names its photos by bare file
  name, and they sit beside it in the zip, which is where AutoCAD looks once the saved path fails (Autodesk: the folder of the
  current drawing is its second place to look). So the zip must be extracted before a drawing is opened, and the folder kept
  together.
- **3D:** every kept point at the DISTO's own X, Y, Z, so it lies over the DISTO's 3D_ file; each photo stood up at true size facing
  the tripod, as shot.
- **A face:** the kept points as seen from outside that face, looking in, with each photo centred on its point at true size,
  furthest first, behind the points and numbers.
- A photo's true size is the README's rule above: 2 D tan(F / 2), with F the Field of View slider.
- Layers: `DISTO_PHOTOS`, `DISTO_POINTS`, `DISTO_LABELS`, `DISTO_SURVEY_LINE`, `DISTO_TRIPOD`, `DISTO_SIGHT_LINES`, `DISTO_BOX`,
  `DISTO_TITLE`.
- **Checking a change to the writer:** ezdxf (installed on this PC) must read every drawing with no errors or fixes
  (`ezdxf.recover.readfile`, then `audit()`), and the ODA File Converter (`C:\Program Files\ODA\ODAFileConverter 27.1.0`) must turn
  them into DWG with its audit on and write no `.err` file. DWG TrueView's console cannot check them: it opens neither a file nor
  a script.

## The Modules

| Folder | Holds |
|---|---|
| `01__AppCore` | Boot and wiring, config access, shared state, the settings file, number formats |
| `02__AppData` | `Na__AppConfig__Main.json`: every tunable number, with its reason |
| `03__DataIntake` | The folder reader, the DXF and CSV parsers, and `SurveyBuilder`, which joins and checks them |
| `04__Env3d` | The scene and on-demand draw loop, camera and flights, sheets, survey lines, photo cards, the clipping box |
| `05__UiPanels` | Landing screen, the menu and its controls, filmstrip, lightbox, measure tool, the clipping box's section, the export dialog |
| `06__Style__AppStylesheets` | Vale Design Suite tokens and this app's styles |
| `07__Export` | The DXF writer, the zip writer, and `SurveyDxf`, which turns the kept points into the drawings and the zip |

three.js r184 is in `03__VersionLocked__VenderedDependencies`, the same version as Lantern Designer. A new app file also
goes on the list in `DistoImageMapper__Pwa__ServiceWorker__.js`, or it is missing offline.

## The Graphics

`01__AppAssets` holds the DISTO device (`DistoImageMapper__AppGraphic__DistoDevice__.svg`), the app icon drawn from it, and the
UI icons in `UiIcons__MenuIcons__DistoMapper`, at the 60 weight of the Image Viewer toolbar. They are made by the vector skill's
generator, `01__ProductionFiles/Icon__DistoMapper__.generator/gen.py`, with copies in its 20-Series folder
`2026-11-05__DistoImageMapper__UiIconsAndDevice`. The icons are navy image files: on a navy button a CSS filter turns them white.

## Putting It on the Server

Live at <https://app.valegardenhouses.com/disto-app/>. Public, with no sign-in: the page holds no data, and a survey is only read
in the browser of whoever opens it.

| | |
|---|---|
| Route | `disto-app` in the Server Manager's URL configurator, opening `DistoImageMapper__AppIndex__.html` (there is no `index.html`) |
| Push | The mapping `distoimagemapper`. A push never carries `100__TesttingInput` (the mapping's `Exclude`), nor `.md`, `.py` or `.bat` |
| After a push | `ValeShared__AppUpdate__.js` takes the new files at once. With a survey open it asks first, because a reload would close it |

The shared card and guide come from `/AppAssets__CommonApplicationAssets/` and `/help/` as on every app; the test server maps both
from the mirror. Moving the route means changing `data-app-base` in the page, the two URLs in the manifest, and this app's `url`
and `icon` in `Vale__ValeVision__Help/install-app/index.html`.

## Testing Without a Folder Picker

`window.DistoImageMapper__App.LoadFiles(files, name)` opens a list of `File` objects as if a folder had been chosen, and
`LoadEntries([{ Path, File }], name)` does the same with sub-folders.
