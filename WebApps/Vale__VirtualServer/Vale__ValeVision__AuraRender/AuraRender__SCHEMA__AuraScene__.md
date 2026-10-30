# ValeVision AURA: The AURA Scene (Schema 1.0.0)

**Status:** schema 1.0.0, codified 30-Oct-2026 at Adam's word ("Yes, codify it").
- **The contract:** `05__Contracts__JsonSchemas/AuraRender__Schema__AuraScene__1.0.0__.json` (JSON Schema 2020-12).
- **The template:** the schema project, `12345__ExampleProject__Schema\ValeVision__AuraRender\`, with an annotated
  `UserData__AuraScene\PROJECTNUMBER__PROJECTNAME__AuraScene__.json.example`.
- **The first scene:** Thrower's (`63403__Thrower\ValeVision__AuraRender\`), built 30-Oct-2026 (import 1) and valid
  against the contract; on the PC, not yet on the server (the last section).
- **Built (AURA 0.5.4):** the API makes and reads a project's scene, and AURA draws the project's own model from it (the
  "Built" section near the end); what is still to come is listed after it.

**Asked by Adam:** "update Aura so it can now load the Whitecard model from ValeVision or (SketchUp Eventually) ...
This first method of creating an aura file should copy all GLB files accross and make them avaiblible to Auras tools,
in aura a file can have assets added from the asset browser panel ... and materials adding ... Create a schema for the
file structure required because we will have to store the main asset glb files but user added glb files such as tree
and scene dfressing from our library ... build out a example fsubfolder structure and data file structure and dummy
glbs ect for this project for me to inspect first".

**His answers:** library assets, "save a copy but instance it where possible"; the folder, "each project gets a folder
in the espablished style see ...63403__Thrower look at Vale Visions and look at TrueVision 3D or Na Project Portal
Clients"; a re-import, "They are zipped and archived, keep the last save, deleted each subiquent zip once one is backed
up as a failsage."

---

## In One Screen

- **Each project gets its AURA folder, in the established style:** `<project>\ValeVision__AuraRender\`, beside
  `ValeVision3D\`, `ValeVisionGallery\`, `ValeVision__TheiaVideo\` and `LanternDesigner\`, as TrueVision 3D has
  `30__TrueVision__AppContent\` in each Na Project Portal project: one folder per app per project, the app's data file
  in it, its model set beside it, a replaced set zipped in `00__Archive`.
- **Two files.** The **scene** (`UserData__AuraScene\<id>__AuraScene__.json`, the "aura file") says what the 3D world
  is made of: the model files, the objects made from them, and the library assets stored in the project. The
  **drawing set** (as before) holds everything done with it: placed assets and given materials (AURA 0.4.0), saved
  views and their art direction points, sheets, notes, the engine's style.
- **Two ways to make a scene, one file either way.** Now: copy ValeVision 3D's whitecard GLBs (`Method:
  ValeVision3dWhitecard`). Later: ValeVision Cloud Sync's AURA export from SketchUp, a Painterly Scene Package in the
  reserved `Content__AuraScenePackages` (`Method: SketchUpScenePackage`).
- **Copies, not links.** AURA draws its own copies, so a SketchUp sync (which replaces ValeVision 3D's GLBs and prunes
  the old ones) never changes a finished drawing. Each copy keeps its SHA-256, so AURA can tell when ValeVision 3D has
  a newer whitecard and offer to update.
- **A copy, instanced where possible.** Each library asset is stored once (its MOD `.glb` and DAT `.json`, library
  names), however often it is placed; every placement is an instance of that copy. The whitecard's own instanced
  components stay instanced.
- **The engine's records, unchanged.** The drawing set's `Settings.Assets` and `Settings.Materials` are PainterlyNPR's
  `State.Assets` and `State.Materials` (contracts AssetPlacement 1.0.0 and MaterialAssignment 1.0.0). A material given
  to a model object names it `#<Id>`, and the scene's object table is where those Ids are kept, for good.

---

## The Project Folder

```
ValeProjects__<year>\<id>\
├── ProjectData__<id>__.json                             the project record (unchanged; auraEnabled switches AURA on)
├── ValeVision3D\Content__3dModel__GlbFiles\             the source: Cloud Sync's whitecard GLBs (AURA reads, never writes)
├── ValeVision__AuraRender\                              made on first use
│   ├── Content__AuraScene__AssetFiles\                  library assets stored: each one's MOD .glb and DAT .json, library names
│   ├── Content__AuraScene__ModelFiles\                  the model set: copies of the whitecard GLBs, names unchanged
│   │   └── 00__Archive\                                 the last replaced set, one zip (never synced)
│   ├── Content__AuraScenePackages\                      reserved: SketchUp's Painterly Scene Package (method two)
│   ├── UserData__AuraDrawings\                          <id>__AuraDrawingSet__.json: the drawing set
│   └── UserData__AuraScene\                             <id>__AuraScene__.json: the AURA scene
└── ProjectData__Revisions\ValeVision__AuraRender\
    ├── UserData__AuraDrawings\<id>__AuraDrawingSet__\   the drawing set's previous copies (the library writer)
    └── UserData__AuraScene\<id>__AuraScene__\           the scene's
```

| Folder | Lane (from its name) | Written by | Read by the page through |
|---|---|---|---|
| `Content__AuraScene__ModelFiles` | Heavy content | The AURA API's import, on the server | nginx, behind the library gate |
| `Content__AuraScene__AssetFiles` | Heavy content | The AURA API, when a drawing set is saved with an asset not stored yet | nginx, behind the library gate |
| `UserData__AuraScene` | User data: collected, never pushed | The AURA API: the import, a re-import, an asset stored (with `_rev`) | The API only (nginx denies `UserData__*`) |

- The lanes come from the names (the sync map's LanePatterns), all the way down. Both content folders are written on
  the server, so they are in the sync map's `ServerMadeContent` (since 30-Oct-2026), as Theia's videos are: every
  Collect brings the server's copies to the PC, and a forced push never overwrites them. One gap: a file a re-import
  drops on the server comes back from the PC's copy on the next push (the Server Manager pushes any PC-only content);
  AURA reads only the files its scene lists, so it sits unused until the PC's copy is deleted.
- Git already ignores every library `Content__*` and `UserData__*` folder; the schema project's `UserData__` examples
  stay tracked.
- An example or mock-up for a project is built in that project's own folder, in this style (Adam, 30-Oct-2026).

## Names

- **Folders:** `<Lane>__AuraScene__<What>`, so the scene's buckets sort together and the lane is in the name.
- **The scene:** `<id>__AuraScene__.json`, as the drawing set is `<id>__AuraDrawingSet__.json`.
- **Model files keep ValeVision 3D's names byte for byte** (`Thrower__TrueVision__MainBuildingModel__Proposed__MeshModel__.glb`),
  as TrueVision's model sets keep the GLB builder's: a copy is found by its source's name, and the import reads each
  file's part from it.
- **Asset files keep the library's names byte for byte** (`NPR_07_0021__MOD__VegetationElements__Trees__MatureOak__Var-01__.glb`
  and its `__DAT__` twin), flat in one folder: the Id leads, so an asset's two files sit together.
- **The archive:** `<id>__AuraArchivedModelFiles__Import-NN__DD-Mon-YYYY__.zip` (Cloud Sync's form, plus the import
  it came from, so the new zip never has the old one's name while both exist).
- **JSON keys:** root blocks `AuraScene__<Block>`, record fields `<Record>__<Field>` (`ModelFile__Use`, `Object__Role`),
  as the drawing set's `Sheet__Id` and `Viewport__Kind`.

---

## The AURA Scene File

| Block | Holds |
|---|---|
| `AuraScene__Meta` | `SchemaVersion` and `Schema` (the contract), the project, created and updated (when, by whom), a description and a note |
| `AuraScene__Source` | How the scene was made: `Method`, the source folder and record key, the SketchUp model's name, the import number, and every import in `History` |
| `AuraScene__ModelPlacement` | One transform for every model file into AURA's world: `OffsetM`, `RotationDeg`, `FrontFacing`, `CentredOn` |
| `AuraScene__ModelFiles` | Each model file: its part, kind, use, role, size and SHA-256 |
| `AuraScene__Objects` | The engine objects made from the model files, with Ids that never move |
| `AuraScene__AssetFiles` | Each library asset stored in the project |
| `_rev` | Added by the library writer on every save (the "someone else saved first" check) |

### A model file

| Key | Thrower | Meaning |
|---|---|---|
| `ModelFile__Id` | `MainBuildingModel__Proposed__MeshModel` | The name without the project and `TrueVision`: the same after a re-import, so objects keep their file |
| `ModelFile__FileName` | `Thrower__TrueVision__MainBuildingModel__Proposed__MeshModel__.glb` | The copy, named as its source |
| `ModelFile__Group` / `Variant` / `Kind` | `MainBuildingModel` / `Proposed` / `Mesh` | Read from the name |
| `ModelFile__Use` | `Draw` | `Draw`: its nodes become objects. `SourceLinework`: SketchUp's edges, kept for the engine's source linework (not built). `Ignore`: the orbit helper cube |
| `ModelFile__Twin` | `MainBuildingModel__Proposed__LineworkModel` | Its mesh or linework partner |
| `ModelFile__Role` / `ShowByDefault` | `Focal` / `true` | Its objects' starting role; drawn unless a view hides it |
| `ModelFile__Bytes` / `Sha256` / `SourceModifiedIso` | `1077684` / ... | The copy, which is the source byte for byte: a different hash in ValeVision 3D means a newer whitecard |
| `ModelFile__Generator` / `Nodes` / `BoundsM` | `TrueVision3D GLB Builder v2.0.0` / `15` / Min, Max | What the file is, in its own metres |

### An object

| Key | Thrower | Meaning |
|---|---|---|
| `Object__Id` | `3` | The engine's object Id, from 1 as the engine counts: what `#3` means in a material assignment. Never renumbered (below) |
| `Object__Name` | `Proposed building` | Shown on hover and in lists |
| `Object__ModelFile` / `Node` | `MainBuildingModel__Proposed__MeshModel` / `20__ProposedBuilding::Default` | Where it comes from: how a re-import finds it again |
| `Object__Mesh` | `1` (three of the columns) | The GLB mesh it draws: objects of one file with the same mesh are one shape, instanced |
| `Object__PersistentId` | `32059153` (a column) | SketchUp's persistent id, from an instanced component's node name (`..._ID32059153`): the second way to find it |
| `Object__Category` / `Material` / `Role` | `Wall` / `Joinery` / `Focal` | The engine's own three, as its demo cottage's `addObject` gives them. The material is the import's starting class (never `Sky`); a material the user gives is an assignment in the drawing set |
| `Object__Missing` | (only after a re-import) | `true` when its node has gone: the object stays, so its Id is never reused |

A whitecard GLB carries one material ("Default"), one node per SketchUp tag (`20__ProposedBuilding::Default`) and one
node per instanced component (`10_2001__Column__StopChamfer__...___ID32059153`). So the import gives each object a
starting class, and the user paints the rest, a whole object or one face of it at a time.

### A stored asset

| Key | Example (the schema project) |
|---|---|
| `AssetFile__AssetId` / `Name` | `NPR_25_0001` / `Garden bench` |
| `AssetFile__GlbFile` / `DatFile` | The library's MOD and DAT file names |
| `AssetFile__LibraryFolder` / `LibraryVersion` | `25__GardenFurniture/NPR_25_0001__Seating__GardenBench__Var-01__` / `PainterlyNPR v0.6.0` |
| `AssetFile__Instanced` | `true`: every placement draws this one shape. `false`: each placement grows its own shape from its seed, from the same copy (the asset's DAT, `NewShapeEachPlop`) |
| `AssetFile__GlbBytes` / `GlbSha256` / `CopiedIso` / `CopiedBy` | The copy, and when and by whom |

## A Copy, Instanced Where Possible

- **Library assets:** one stored copy per asset, never one per placement; every placement refers to it by `AssetId`.
  Where the asset keeps one shape (the bench) every placement is an instance of the same geometry; where it grows a new
  shape each time (trees, the planter: their DATs say so) each placement draws its own, still from the one copy.
- **The whitecard:** the GLB builder already instances repeated components, and the scene keeps it: Thrower's fourteen
  stop-chamfered columns are five shapes (`Object__Mesh` 1 to 5), each drawn three, three, four, two and two times.

### Placed assets and materials (the drawing set, as AURA 0.4.0 keeps them)

In `AuraDrawingSet__Engine.Settings`, saved and undone with the drawing set. Thrower's drawing set has none yet; this is
the example edit the schema project's two stored assets come from:

```json
"Assets": [ { "Uid": "A0004", "AssetId": "NPR_25_0001", "Name": "Garden bench", "Position": [2.4, 0.0, 7.5],
              "RotationDeg": 0.0, "Scale": 1.0, "Seed": 2241852184, "Recipe": { "Generator": "Bench", "Params": {},
              "Kind": null, "Material": "Timber", "Role": "Furniture", "Flowers": null } },
            ... two oaks (A0001, A0002), an apple tree (A0003), two planters (A0005, A0006) ],
"Materials": [ { "Uid": "M0001", "Target": "Object", "Object": "#2",      "Face": null, "Material": "Render" },
               { "Uid": "M0002", "Target": "Face",   "Object": "#3",      "Face": 4812, "Material": "Slate" },
               { "Uid": "M0003", "Target": "Object", "Object": "A0004.0", "Face": null, "Material": "WhitePaint" } ]
```

A model object (`#2`, the scene's `Object__Id`), one face of one (`Face`), or a placed asset's part (`A0004.0`).
Positions are AURA's world metres (+Y up, the building's front facing +Z), after the model placement.

---

## Making a Scene From ValeVision 3D (Method One)

It runs in the AURA API, on the server, and writes into the project's own `ValeVision__AuraRender` folder, as every Vale
app writes its own; a Collect brings it to the PC.

1. **List** the files: `valeVision_ModelUrls` in the project record, checked against the `.glb` files in
   `ValeVision3D\Content__3dModel__GlbFiles` (`00__Archive` left out). A file in one but not the other is named in
   `Unlisted` or `Missing`.
2. **Copy** each, byte for byte, into `Content__AuraScene__ModelFiles`, keeping its name; record its size, SHA-256 and
   date.
3. **Read** each file's part from its name and apply the import rules below.
4. **Make the objects:** every mesh node of every `Draw` file, in file order then node order, numbered from 1, each
   with its mesh. TrueVision's drawing notes (`90_9901__Note__...`) are never objects.
5. **Place the model:** the `Focal` files' footprint centre at the origin (the engine's camera presets look there), the
   ground level unchanged, no turn: SketchUp's Front (-green) is already the engine's +Z.
6. **Write** `<id>__AuraScene__.json` (rev 1).

**The import rules** (to become a table in AURA's config, `AuraConfig__SceneImport__Rules`, when the import is built):

| File, by its name | Use | Role | Category | Material |
|---|---|---|---|---|
| `01__OrbitHelperCube` | Ignore | | | |
| any `LineworkModel` | SourceLinework | | | |
| `LandscapeEnvironment` | Draw | Ground | Ground | Lawn |
| `MainBuildingModel__Existing...` | Draw | Architecture | Wall (Roof for `ExistingRoofs`) | Brick (ClayTile) |
| `MainBuildingModel__Proposed` | Draw | Focal | Wall | Joinery |
| `...ProposedRoofs` / `Windows` / `Doors` / `Furniture` / `Walls` | Draw | Focal | Roof / Opening / Opening / Furniture / Wall | Slate / Glass / Joinery / Timber / Brick |
| `SceneEntourageSilhouette` | Draw | Context | Context | Render |
| anything else | Draw | Architecture | Wall | Render |
| a component node `<code>__Column__...` | (its file's) | Focal | Porch | Timber |

**Thrower:** seven files: three drawn (the landscape, the existing house, the proposed orangery), three linework files
kept, the helper cube ignored. Seventeen objects: the landscape, the existing house, the orangery and its fourteen
stop-chamfered columns. The orangery's footprint centre (x 14.131, z -13.015 in the whitecard's metres) goes to the
origin.

## Updating From a Newer Whitecard

- AURA compares each copy's SHA-256 with ValeVision 3D's file now. Any difference, or a file added or gone, offers
  "ValeVision 3D has a newer whitecard: update the scene?".
- **The archive keeps the last save, one zip** (Adam's rule):
  1. zip the current model files into `00__Archive\<id>__AuraArchivedModelFiles__Import-NN__DD-Mon-YYYY__.zip`;
  2. check the new zip: every file in it, each one's SHA-256 matching the scene's record;
  3. only then delete the older zip, so a failed or half-written zip never costs the last good one;
  4. copy the new set, add a `History` entry (`Import__ArchivedAs` names the zip) and raise `ImportNumber`.
- **Objects keep their Ids** (the engine's rule: new content is appended, so nothing already drawn reshuffles). A node
  is found again by its file and name, then by its SketchUp persistent id; a new node takes the next free Id; an
  object whose node has gone stays in the table, marked `Object__Missing`, so its Id is never reused.
- Placed assets, whole-object materials and the model placement carry over. A face material on a changed file may land
  on another face (a face is known by its triangles' order), so the update lists those to check.

## How AURA's Tools Use It

- **The 3D Environment and every viewport** load the scene once: the `Draw` model files under the model placement,
  instanced shapes drawn once each, and the object table; the drawing set's settings (placed assets, materials, style)
  go on top, as now.
- **The Assets drawer** (AURA 0.4.0): placing an asset writes the drawing set's `Settings.Assets`, unchanged. When a
  drawing set is saved with an asset the project has not stored yet, the API copies its MOD and DAT into
  `Content__AuraScene__AssetFiles` and adds its `AuraScene__AssetFiles` record.
- **The Materials tab** (AURA 0.4.0): writes `Settings.Materials`, unchanged; `#Id` means a scene object.
- **The engine:** PainterlyNPR builds its scene from these GLBs since v0.8.7 (`10__Import__ScenePackage`'s Glb
  module, handed the scene by Build's `SetBase`); a project with no whitecard still draws the demo cottage. The work
  lives in PainterlyNPR and reaches AURA as a pinned version: nothing in AURA edits the engine.

---

## Codified (30-Oct-2026)

- The contract, `05__Contracts__JsonSchemas/AuraRender__Schema__AuraScene__1.0.0__.json`, and its README.
- The schema project: `Content__AuraScene__ModelFiles\` (a GoHere placeholder, and `00__Archive\` with the zip's name),
  `Content__AuraScene__AssetFiles\` (a GoHere placeholder), `UserData__AuraScene\PROJECTNUMBER__PROJECTNAME__AuraScene__.json.example`
  (abridged from Thrower, valid against the contract), and the package example's note.
- Thrower's scene at 1.0.0, valid against the contract.
- This doc, AURA's README and DEVLOG, and the skills that describe the library and the wrapper.

## Built (AURA 0.5.4, 30-Oct-2026)

- **The API** (`Server__Api/Api__ValeVision__AuraRender/AuraRender__Api__Scene__.py`): `GET api/projects/<id>/scene`
  (the scene, its _rev, where its model files are served, and whether ValeVision 3D's whitecard is there and newer) and
  `POST api/projects/<id>/scene/import` (method one, as "Making a Scene" and "Updating From a Newer Whitecard" above,
  with the archive's read-back failsafe); the import rules in AURA's config (`AuraConfig__SceneImport__*`).
- **The engine** (PainterlyNPR v0.8.7, a915620, pinned): `10__Import__ScenePackage`'s Glb module and Build's `SetBase`.
- **AURA** (`10__System__EngineHost/Na__EngineHost__Scene__.js`, called by AuraApp before anything is drawn): reads the
  scene, makes it the first time a project with a whitecard opens, fetches its files and hands the engine its base; a
  note offers **Update the scene** when ValeVision 3D's whitecard is newer.
- **The sync map:** `Content__AuraScene__ModelFiles` and `Content__AuraScene__AssetFiles` in `ServerMadeContent`, so
  every Collect brings the server's copies to the PC (see The Project Folder).

## To Build Next

1. **Storing an asset** when a drawing set is saved with one the project has not stored (its MOD and DAT into
   `Content__AuraScene__AssetFiles`); the pin carries the library's `.json` and `.webp` but no `.glb`, so the 26 MOD
   `.glb` files (3.0 MB) are pinned first.
2. **The library gate, AURA's own:** live since 30-Oct-2026 16:18 UTC through the `valevision` route (signed-in staff,
   nginx `607291531112`). Once AURA's API answers `library-access` (Managers and App Admins, project switched on), the
   three folders move to the `aura` route.
3. **Saving the scene from the page** (`PUT api/projects/<id>/scene`), once the page edits it (the model placement, an
   object's class).

---

## Thrower, Built (30-Oct-2026)

- **Built on the PC** at Adam's word ("Yes, build Thrower"), before AURA's API import exists, by the import's own rules:
  the 7 whitecard GLBs copied byte for byte into `Content__AuraScene__ModelFiles\` (2,307,120 bytes, each SHA-256 equal to
  its source, dated today so they are newer than any example dummy that may have reached the server), and
  `UserData__AuraScene\63403__Thrower__AuraScene__.json` written as import 1 (rev 1): 7 model files, 17 objects, no
  stored assets (nothing is placed in Thrower's drawing set yet). `Content__AuraScene__AssetFiles\`,
  `Content__AuraScenePackages\` and `00__Archive\` wait empty.
- **First it was an example** for Adam to inspect: dummy GLBs, four example stored assets (two oaks, an apple tree, a
  bench, two planters) and two placeholders. Those are gone; the schema project keeps the abridged example.
- **Untouched:** Adam's drawing set in `UserData__AuraDrawings\` (rev 55; its SHA-256 the same before and after) and
  every revision.
- **On the server:** the 7 GLBs, behind the library gate (401 signed out, as their ValeVision 3D originals). They went
  up at 16:08:43 UTC in another session's `projects` push, ten minutes before the gate covered the folder (16:18:29);
  nginx's access log shows no request for them in that window. The example's 8 asset files, pushed the same way at
  15:57:36, are deleted (backed up). The scene file is user data, so it goes up only by `engine seed`, which has no
  scope (it would upload every PC-only user-data file in the library): it waits for AURA's API, which writes scenes on
  the server.
