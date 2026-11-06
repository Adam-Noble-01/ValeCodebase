# Disto Image Mapper: DEVLOG

## Version 1.5.1, 06-Nov-2026: The Clip Is a Section Box, in All Points Too

**Reported by Adam** (a screenshot of 1.5.0 live: Points on All points, the box shown and its Right face dragged in, the sheets,
the tripod and its sight lines all showing round it): "Ourside Of The Box Items Are Still Visible Though?" 1.5.0 cut only in
Inside or Outside, and left the tripod, its sight lines and the survey line whole.

**His choices (asked first):** in All points with the box shown, cut the view and the drawings ("Cut view and drawings"); cut the
tripod and its sight lines too ("Cut them too").

**Changes:**
- **`ClipBox`, `ActingMode()`:** All points acts as Inside while the box shows and Clip the View is ticked. What is kept
  (`IsKept`), the view's planes, the export's points and its note, the export dialog's summary and the count under Points all
  follow it, so the view, the filmstrip and the drawings agree. Showing or hiding the box, and the tick, now refilter.
- **`SurveyLines`:** the survey line, the sight lines, the tripod and the axes are cut by the box itself; each sheet's drop lines
  as that sheet is cut, so a kept point's line still reaches its place on the sheet. Its groups are now named, so a scene
  inspector shows them: Survey Line, Tripod and Sight Lines, Axes, Drop Lines to the Plan, Drop Lines to the Elevation.
- **Outside:** a sheet now loses only what lies in the box itself. 1.5.0 cut the box's shadow out of each sheet, which would have
  taken the places of kept points standing in front of the box or behind it.
- Every plane stands 0.5 mm out on the kept side, so a point lying on a face is never cut by that face.

**Checked (headless, software WebGL, the example survey, port 8034):**
- The 1.5 check, now 27 checks, all passing. New: All points with the box showing cuts exactly as Inside, and the filmstrip
  (33 of 35 after the Right face is dragged in), the count and the export dialog's summary agree; hiding the box, or unticking
  the clip, brings all 35 back uncut; every line group and the tripod carry the box's 6 planes, the drop lines their sheet's 4;
  Outside's sheets carry the box's own planes. Pictures looked at: the tripod and the sight lines stop at the box's face.
- 1.4.0's box and export check and 1.3.0's tripod check still pass.
- **Live (06-Nov-2026 14:07 UTC, push stamp `20261106-140701`, at Adam's "Yes, push"):** 8 files replaced, none added or deleted;
  all 76 app files byte-identical to the PC through Cloudflare; the same 27 checks pass on the live page, with no script error.
- **A correction:** 1.5.0's check had 24 checks, not 25 as first written here and in the server changelog (both fixed).

## Version 1.5.0, 06-Nov-2026: The Menu Moves Right and Folds, One Settings File, and the View Cut to the Box

**Asked by Adam:** "Move menu to right side. Add dropdown nested menus like ValeVision 3D as the menu is too complex and
overwhelming when you first open it, nest complexity. Ensure menu can be dragged left to resize if user needs wider, save a user
config file to the PWA app per user to chart these kinds of user configs, json should be in my style." Then, while it was being
built: "Make the clipping box clip the elements in the viewport too so its a WSIWYG so its clearer what the output will be ... add a
toggle though to retain the current behaviour so you can see all with the clip box, but the default should be removing their
visibility in realtime."

**His choices (asked first):** one section open at a time, as ValeVision 3D's Tools & Settings; a first open shows only the
survey's summary, every section folded; the settings kept in this browser, in one JSON file that every remembered setting moves into.

**Changes:**
- **The menu (`05__UiPanels/DistoImageMapper__Ui__PanelMenu__.mjs` and `DistoImageMapper__UiFeature__Styles__PanelMenu__.css`,
  both new):** the panel is now the stage's right-hand column, and the Panel button moved to the right end of the toolbar beside
  it. Its sections are ValeVision 3D's dropdown rows (icon, label, arrow; an open row's content in a faintly tinted box), one open at
  a time. What is used less is nested: Size and See-Through under Photos; Turn and Snap, and Faces and Their Names, under Clipping
  Box. The footer (version, Install App) stays pinned under the scrolling middle.
- **The grip:** the menu's left edge widens it by the distance dragged, 248 to 640 px and never past 60% of the window (the config's
  new `Panel` block); the arrow keys step 16 px; a double-click or Home gives back 292 px. A phone always starts with the menu folded.
- **The settings file (`01__AppCore/DistoImageMapper__AppCore__UserConfig__.mjs`, new):** one local storage document,
  `DistoImageMapper__UserConfig`, in the house config style, with Meta, Panel, Viewer, ClipBox and Export blocks; written 400 ms
  after the last change and at once when the page goes. State's preferences, the box's snap and each survey's box, and the export
  ticks now live in it. On the first open the four kinds of key 1.4.0 kept are gathered in, then removed once it is written.
- **Clip the View to the Box (on by default):** while the box keeps Inside or Outside, three.js clipping planes cut the sheets and
  axes to it, following a dragged face live: the plan to the box's footprint, the elevation to its extent along the sheet and its
  height, the axes to the box. Outside uses the same planes facing out, cutting only what lies inside all of them. Off gives
  1.4.0's view; the points the box leaves out stay hidden either way. The tripod and its sight lines to the kept points stay,
  because the 3D drawing holds them.

**Checked (headless, software WebGL, on the example survey, on a private server on port 8034):**
- 24 checks for 1.5.0, all passing: the menu stands right of the view at 292 px; a first open has every section folded; one
  section opens at a time; a nested group opens on its own and is kept; the grip widens by exactly the distance dragged and stops
  at 640 and 248 px; the arrows step 16 px and a double-click gives 292; Inside cuts the plan and the elevation with 4 planes each
  and the axes with 6, Outside uses the same planes facing out, and All or Off cut nothing; the cut moves while a face is dragged
  and is back on the sheets redrawn after it; folded, width, open section, groups, the clip and the box all come back after a
  reload; the file parses, holds its five blocks in order and has every short key's colon in one column; 1.4.0's keys (viewer,
  snap, export ticks, a survey's box) are carried over and removed; a phone starts folded and does not keep its opening. No
  script errors.
- 1.4.0's box and export check, 1.3.0's tripod check and the install card check all still pass.
- **Live (06-Nov-2026 13:44 UTC, push stamp `20261106-134410`, at Adam's "Yes, push"):** 3 files added, 12 replaced, none deleted;
  all 76 app files byte-identical to the PC through Cloudflare; the same 24 checks pass on the live page.
- **Not checked:** a real device, dragging the grip by touch, and how it looks to Adam.

## Version 1.4.0, 06-Nov-2026: The Clipping Box and the DXF Export

**Asked by Adam:** "Add a clipping box feature that allows you to filter points either inside or outside, use the type of box we
used on AURA for defining elevations. Then each of those box faces also becomes a projection face front / left / right / top and
can be exported as a DXF file. Create a robust DXF Exporter so the points can be exported to AutoCAD and bundle the images in a
format that they are embedded or linked within the file (whichever is safest and most reliable, research this online)."

**His choices (asked first):** all six faces, with a tick for each at export time and a name for each face ("add the ability to
name a elevational view to make this easier"); photos on their points in the faces' drawings; the points left out hidden in the
app; Square to Points to turn the box, with a slider to fine-tune.

**The research: linked, not embedded.** A DXF cannot hold a picture: the IMAGE entity points at an IMAGEDEF that only names the
file (ezdxf: "The raster image is NOT embedded in the DXF file!"). AutoCAD's only way to carry one inside is OLE, which needs a
binary OLE object written by hand, is not read by most other programs, and is known to fail on large images. AutoCAD looks for a
linked image first by its saved path, then in the folder of the drawing itself (Autodesk help, About Changing the Path to Raster
Images). So each drawing names its photos by bare file name and the zip puts them beside it.

**Changes:**
- **`04__Env3d/DistoImageMapper__Env3d__ClipBox__.mjs` (new):** the box in the survey's frame turned by its yaw, held as Min and Max
  per local axis; its six faces drawn as AURA's drawing planes on an SVG layer over the canvas (never in Save Image), dragged along
  their normals with TrueVision's closest-point-on-axis maths, snapped on the absolute grid of the axis, Escape to put back; each
  face's view frame, shared with the export; Square to Points; remembered per survey.
- **The filter reaches every layer:** photo cards, the survey line and its dots, sight and drop lines, the numbers and dots on both
  sheets (redrawn when a drag ends, not while it moves), the filmstrip, and the lightbox's Previous, Next and locator dots.
- **Face views:** each face's View flies straight on to it in parallel, framing the box; Top and Bottom turn with the box so its
  Front stays at the foot of the screen; from the Bottom the controls may pass below level. In a face view the sheets, drop lines,
  sight lines and axes step aside, as on the drawing.
- **`07__Export` (new):** `DxfWriter` (R2000 DXF modelled on ezdxf's R2000 output: classes, tables, both spaces and their layouts,
  the image dictionary), `ZipWriter` (stored, one flat folder) and `SurveyDxf` (the 3D drawing, one per face, `Points.csv`, a README).
- **Panel and dialog:** a Clipping Box section (points, show, Square to Points, Fit to Points, Turn, Faces Snap To, six named faces
  with View buttons, Export DXF) and an Export DXF dialog that remembers its ticks. Three new icons from the vector skill's
  generator (Clip Box, Export Dxf, Square To Points), saved in the app and in the skill's 20-Series folder.
- **Keys:** B shows or hides the box. Escape cancels a drag or Square to Points.

**Checked:**
- **The writer:** ezdxf reads every drawing with 0 errors and 0 fixes; the ODA File Converter turns every one into DWG with its
  audit on and no error file. A rendered face, drawn from its DXF by ezdxf, has every photo upright on its point, the point marker
  on the DISTO's crosshair.
- **The app, headless (software WebGL), on the example survey:** Inside and Outside split the 35 points exactly; Square to Points
  through points 20 and 31 turned the box 103.2 degrees and refitted it; dragging the Right face in the Front view left 10 points
  out and landed on the 50 mm grid; Escape put a dragged face back; every face name stays on the screen; the Bottom view looks
  straight up; the dialog's export saved a zip of 7 drawings, 25 points and 25 photos (607 KB); after a reload the survey had its
  box, mode and names back. No script errors.
- **Not checked:** AutoCAD itself (not on this PC; DWG TrueView's console opens neither a file nor a script), a real device, and
  dragging by touch.

## Version 1.3.0, 05-Nov-2026: The Install Card Comes by Itself, and the Tripod View Sets the Arrangement

**Asked by Adam, of the card:** "Make this appear if the user is using a browser and not the PWA. I had to press the button to get
it to appear, it should appear without needing the press the install button."

**And of the Tripod view:** "When in tripod mode always change the images to always face tripod but then change back to on the point
when switching to the other views again."

**What was happening:** the card did come by itself, but only 4 s after the page opened, 13.5 s if the browser's install offer was
late, and not at all for an hour after Not now. On a page with nothing else to wait for, that looks like no card.

**Changes:**
- The page sets `data-app-show-after-ms="1000"`, a new option of the shared card (`ValeShared__AppInstall__.js` 1.4.0): a second after
  the page opens, whether or not the browser has made its offer yet. Other apps keep their timing.
- Unchanged: never in the installed app or where the app is already installed, and Not now still snoozes it. The Install App
  buttons stay, as the way back, and now hide where the app is already installed: they led nowhere there.
- **Tripod view:** the photos already faced the tripod there, but the Arrangement list kept showing the saved choice, and As Shot picked
  by hand was saved, so it stayed on in the other views. Now the list shows As Shot in the Tripod view, and leaving it goes back to On
  the Point (or Atlas, if that was picked). A saved As Shot from an earlier visit is forgotten when the app opens.
- With no tripod in the survey, As Shot falls back to On the Point rather than Atlas, which has not been the default since 1.1.0.

## Version 1.2.0, 05-Nov-2026: Live at /disto-app/

**Asked by Adam:** "Make a proxy for this so this URL loads the app: https://app.valegardenhouses.com/disto-app. Then push the
app to the Vale Server so it's live."

**Changes:**
- **Route and mapping:** `disto-app` and `distoimagemapper` in the Server Manager, which needed version 0.16.0 to point a route
  into a folder of apps. `100__TesttingInput` is in the mapping's `Exclude`, so the site photos never reach the server.
- **Updates:** the page loads the shared `ValeShared__AppUpdate__.js`, so a push reaches every browser at once. With no survey open
  it reloads by itself; with one open the shared bar asks first, because a reload would close it.
- **Manifest:** its `id` is now `/disto-app/`, and it names itself in `related_applications` and takes `handle_links`, as Lantern
  Designer does. An install made from the test server is a separate app.
- **Service worker:** version `2026-11-05-3`. It keeps the shared update script, and `/disto-app/` opens offline even if the app was
  only ever opened under the page's own name.
- **Install guide:** `/help/install-app/?app=distoimagemapper` now links to the live route and its icon.

**Checked on the live site, signed out:** `/disto-app` forwards with its query kept; all 63 files match the PC byte for byte;
`100__TesttingInput`, `.md`, `.py` and `.bat` answer 404. Headless Chromium (software WebGL): no script error, the example survey,
read from the PC, draws its 35 photos, and Chromium reports no installability errors. Launched again with the host unreachable,
`/disto-app/` opened from the cache and drew the survey. Not tried on a real device, and not actually installed.

## Version 1.1.0, 05-Nov-2026: Tripod, See-Through Photos, Proper Icons and the Install Card

**Asked by Adam, after his first look:** "Make the images slightly smaller and transparent. Make Image on the point the
default. Change Instrument to Tripod and make instrument sightline on by default. Load graphic designer skill: make proper
icon svgs, make a better graphic for the app itself, create a svg just of a disto ldm device. Add a proper install app
modal like my other apps." And, of the expanded photo's details card: "make this bigger too".

**Changes:**
- **Photos:** smaller (world size 1300 to 1050 mm, smallest on screen 56 to 46 px, largest 340 to 280 px) and see-through
  (80%, on a new Opacity slider). A focused photo goes solid. Photos As Shot stay solid: see-through planes would not line up
  as a panorama.
- **On the Point** is the default arrangement and first in the list. The saved settings' key moved to v2, so the new defaults
  reach a browser that has used the app (its saved sliders start over once).
- **Instrument is now Tripod** everywhere: the view, the sheets, the panel, the check, the details, and the code and config
  names. Where the word meant the device it became DISTO ("as the DISTO saved it"). Tripod sight lines are on by default.
- **Details card:** about a third of the window wide and the photo's full height, with larger text. A wide card sets its
  figures in two columns, and the small plan and elevation take the height left over.
- **Icons:** 20 new house icons in `01__AppAssets/UiIcons__MenuIcons__DistoMapper` on the toolbar, the panel headings and the
  buttons, at the 60 weight of the Image Viewer toolbar and the 3D Navigation Menu Gold Standards.
- **The DISTO device:** a new graphic of a laser distance meter from the front (`DistoImageMapper__AppGraphic__DistoDevice__.svg`),
  on the landing screen, and on the Vale navy as the new app icon (SVG, 192 and 512 px, inside the maskable safe circle).
- **Install:** the shared Vale card (`Shared__AppInstall`) replaces this app's own prompt, avoiding the filmstrip. The Install
  App buttons reopen it after Not now. Its guide at `/help/install-app/` now knows `distoimagemapper`, words only, with no
  pictures until `50__Help__InstallSnippets` is run for it. The test server maps `/AppAssets__CommonApplicationAssets/` and
  `/help/` from the mirror, so restart it to pick that up.

**Checked (headless Chromium, software WebGL, 2000 x 1000 and a phone):** defaults, icons all load, no "instrument" left on
screen, the card and guide name the app, the loop still stops in each view, the details card at both sizes. Offline in the
in-app browser with the server stopped, shared card and icons included.

**Not checked:** the real install box, which needs a person to accept it.

## Version 1.0.0, 05-Nov-2026: First Build

**Asked by Adam:** "Build a simple utility app here in my style ... Build a PWA ... Use 3JS ... Align the points and images
in 3D Space ... one CAD File has a 3D coordinate space, one labelled 2DG is plan view, one labelled 2DW is a elevational
view. Align the plan and elevation views on plains in the 3d view, then load the images at each point and if user clicks
the image it expands the image. Create the ultimate tool that creates a interactive visual atlas automatically loading
the images to points and arranging in a 3d space." Example folder: `2026-07-21 14-29-05`.

**What the example showed, from its files:**
- The three DXFs are one survey: 3D is `(X, Y, Z)`, 2DG is `(X, Y)`, 2DW is `(X, Z)`, each to 0.00 mm over 35 points.
- The elevation is a plain projection on the X axis, not an unrolled wall. The DISTO sets X along the first two points.
- The CSV's angles and distances locate the tripod at X 1689, Y -531, Z 551 mm, to 0.00 mm RMS, with Hz running
  clockwise from above (anticlockwise fits only to 3689 mm).
- Shot 35 repeats shot 1 to 0.75 mm: the survey's closing check.
- The photos are 240 x 240 px with the crosshair burnt in at the centre, so the centre of a photo is the measured point.
- Correlating neighbouring photos against the angle between their shots gives 58.6 px per degree: a 4.1 degree camera.

**Built:**
- **Folder intake:** folder picker, file input fallbacks, drag and drop, Reopen for the last folder, and a chooser when a
  folder holds several surveys.
- **Alignment:** the plan flat below the model and the elevation behind it, as a corner of a glass box, each placed on the
  far side from whoever reads it. Dashed drop lines from every point to both drawings. Sliders move the sheets.
- **Three arrangements:** Atlas (photos face you and push apart in screen space, every frame), On the Point (crosshair on
  the point), As Shot (true size, facing the tripod).
- **Four views:** 3D View, Plan, Elevation (true parallel, reached by a dolly zoom so the switch cannot be seen), and
  Tripod, which stands where the DISTO stood. There the photos line up into a panorama of the site.
- **Expanded photo:** grows from its card, with coordinates, shot data, distances to its neighbours, and a small plan and
  elevation with the point ringed. Arrow keys or a swipe step through.
- **Filmstrip** linked both ways to the 3D view, **Measure** between any two points, **Save Image**, and a plain words
  **Survey Check**.
- **PWA:** installable, and every app file cached on install so it runs with no connection from the first visit. Fonts and
  three.js are local copies for the same reason.

**Checked (headless Chromium over CDP, software WebGL, on the example folder):** all views and arrangements by eye; hover,
expand, step, close, measure and sliders through real input; the draw loop stops once settled in every view (0 frames in
3 s); missing CSV, missing sheets, missing 3D CAD, missing photos and photos alone; a second survey over the first; the
chooser and its Cancel; phone width. Offline: with the server stopped, the app booted from its cache and opened the survey.

**Not checked:** the real folder picker, drag and drop, and Reopen, which need a person; orbit feel and frame rate on a
real graphics card; Safari and iPad; a survey from another DISTO model or at another zoom.
