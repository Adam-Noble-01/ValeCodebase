# Lantern Designer

Vale Garden Houses' parametric roof lantern configurator and specification workspace, at
<https://app.valegardenhouses.com/lantern-designer/>. Sign in with your Vale account: the same email and password as
ValeVision and ValeVision 3D.

## How It Works

| Part | Where |
|---|---|
| The app (no build step: classic scripts sharing one global scope, plus two ES module bootstraps for the 3D pipeline) | this folder; the entry page is `index.html` |
| Designs | the Vale Projects Master Library, one per library project: `Vale__Projects__MasterLibrary\ValeProjects__<year>\<project>\LanternDesigner\UserData__LanternDesign\VghLantern__ProjectFile__<project>__.json` |
| The API (designs, library search, per-user settings, the library indexes) | `Server__Api\Api__LanternDesigner\wsgi.py` (`vale@LanternDesigner`, port 8003), reached at `api/...` relative to this page |
| Sign-in | the shared Vale sign-in: `Server__Api\Api__Shared` and `AppAssets__CommonApplicationAssets\Shared__UserLogin` |
| Per-user settings | `Server__UserAccountData\UserData__UserAppConfigs\LanternDesigner\UserConfig__<USR code>__LanternDesigner__.json` |
| Component and profile libraries | `05__Data__LanternComponentLibrary`, `06__Data__LanternProfileLibrary`, `VghLantern__AssetRegistry__.json` (rebuilt with the utilities in `60__Dev__WebBuildUtils`) |
| Install, updates, activity | `VghLantern__Pwa__Manifest__.webmanifest` and `VghLantern__Pwa__ServiceWorker__.js` (scope `/lantern-designer/`), and the shared `Shared__AppInstall`, `Shared__AppUpdate` and `Shared__ActivityLog` scripts in `index.html` |

- **The Master Library is the single source of truth** (Adam, 15-Oct-2026). A project may have a ValeVision model and
  no lanterns, lanterns and no model, or both. A design's key is its library project id (`Metadata__LibraryId`, e.g.
  `57079__Mordaunt`); `Metadata__ProjectCode` stays the job number printed on drawings and letters, because schemes of
  one job share it.
- **A design names the client and their address**, so it lives in a `UserData__` bucket: nginx never serves it, only
  the API does, to signed-in people. The Server Manager collects designs to the PC and never pushes them. They are
  git-ignored.
- **New design:** type the Vale job number. The job's projects in the library are offered; pick one that has no design
  yet, or add the job to the library as a new project (`<job number>__<Name>`, every folder of the schema project,
  `ProjectType: "LanternDesign"`, which the Gallery leaves out until it has 3D work). The client's details come from the
  Vale database placeholder (`12__System__ValeDatabaseApi`) when it has the job. "Not in the Database? Click Here"
  takes the job number, name and client by hand.
- **Who can do what:** everyone signed in opens designs; Employee and up create and save; a design is deleted by the
  person who started it, or by Management and up (the library project and its other work stay); Affiliates view only;
  AppAdmins get Developer Tools (SketchUp and CAD export) in the avatar menu.
- **Saves:** autosave sends the whole design with the version it was loaded at. If someone saved it in the meantime,
  the app asks whose version wins. Revisions are kept in the project's `ProjectData__Revisions` (one per 10 minutes of
  editing, the last 20).
- **Printed drawing QR codes** still open the General Drawing Terms page at `/t/` on GitHub Pages
  (`Na__Terms__Config.json`, `TermsQrBaseUrl`); it moves when GitHub Pages is retired.

## Run It on This PC

```bat
python ..\Server__DeveloperTools\ValeDev__LocalServer__.py
```

Then open <http://127.0.0.1:8030/lantern-designer/>. It serves the mirror exactly as the server does, API included,
and it **writes the real mirror**: test sign-ins and saves against a sandbox `VALE_ROOT` (see the `vgh-app-server`
skill, operations section 15).

The dev checks in `60__Dev__WebBuildUtils` need `npm ci` once (lockfile committed), and read the library's copy of
`3010__WalkersPalace`.

## History

The prototype lived in `WebApps\Vale__LanternDesigner` (localhost server on port 8006, GitHub Pages demo). It was moved
here on 15-Oct-2026 and that folder retired; see its `MigrationDetails__README__.md` and `VghLantern__DEVLOG__.md`
(v0.6.0).
