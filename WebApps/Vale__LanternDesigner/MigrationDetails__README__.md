# Lantern Designer (legacy) - RETIRED (Archived 15-Oct-2026)

> **AGENTS AND DEVELOPERS: STOP HERE.**
> This folder is retired. Do not extract, restore, edit or build on anything from it.
> Lantern Designer is actively developed in `WebApps/Vale__VirtualServer/Vale__LanternDesigner` (the app) and
> `WebApps/Vale__VirtualServer/Server__Api/Api__LanternDesigner` (its API). Its designs live in the Vale Projects
> Master Library, one per library project. The `vgh-app-server` skill describes the live system in full.

---

## What is in this folder

| File | Purpose |
|---|---|
| `Archived__LanternDesigner__PreMigration__15-Oct-2026.zip` | Every file this folder held on 15-Oct-2026, verified (see below). Read-only. **Local only: gitignored, never commit or upload it.** |
| `MigrationDetails__README__.md` | This file. |
| `index.html` | Retirement notice for anyone who opens the old app. Self-contained (no other files). |
| `VghLantern__App__.html` | The same notice. Old bookmarks, links and installed copies of the app open `VghLantern__App__.html`. |

The notice tells people to stop using the prototype and to open **https://app.valegardenhouses.com/lantern-designer/**,
signing in with the same Vale account and password as ValeVision and ValeVision 3D. It thanks them for using the
prototype and asks them to contact Adam Noble if they have trouble installing the new app.

---

## Old to new

| | Old (retired) | New (live) |
|---|---|---|
| Code | `WebApps/Vale__LanternDesigner` | `WebApps/Vale__VirtualServer/Vale__LanternDesigner` (v0.6.0) |
| Public URL | `https://adam-noble-01.github.io/ValeCodebase/WebApps/Vale__LanternDesigner/VghLantern__App__.html` (GitHub Pages, a read-only demo) | `https://app.valegardenhouses.com/lantern-designer/` (OVH VPS, nginx) |
| Entry page | `VghLantern__App__.html` | `index.html` |
| Server | `VghLantern__FlaskServer__Localhost__.py` (stdlib, localhost:8006, no sign-in) | `Server__Api/Api__LanternDesigner` (`vale@LanternDesigner`, 127.0.0.1:8003 on the VPS, proxied at `/lantern-designer/api/`) |
| Local development | `Start__VghLantern__Localhost__8006__.bat`, plus a Windows Startup shortcut | `Vale__VirtualServer/Server__DeveloperTools/ValeDev__LocalServer__.py` on port 8030 |
| Sign-in | Prototype gate over test accounts in `Na__UserLogin__UserAccounts__.json` (plain text), a 30-day cookie | The shared Vale sign-in (`Api__Shared`, `Shared__UserLogin`): one account and session for every Vale app |
| Permissions | Everyone could do everything; the Developer role saw Developer Tools | Employee and up create and save; delete is the design's creator or Management; Affiliates view only; Developer Tools for AppAdmin |
| Project data | `07__LocalProjectData/VghLantern__ProjectFile__<code>__<Name>__.json`, mirrored into localStorage | `Vale__Projects__MasterLibrary/ValeProjects__<year>/<project>/LanternDesigner/UserData__LanternDesign/VghLantern__ProjectFile__<project>__.json`, through the API |
| User data | `08__LocalUserData/VghLantern__AppData__UserMenuConfig__<slug>__.json` (every user shared "AdamW") | `Server__UserAccountData/UserData__UserAppConfigs/LanternDesigner/UserConfig__<USR code>__LanternDesigner__.json`, one per person |
| Install | 12-file PWA stack in `62__Feature__AppInstallability` | `VghLantern__Pwa__Manifest__.webmanifest` + `VghLantern__Pwa__ServiceWorker__.js` (scope `/lantern-designer/`) and the shared install card; guide at `/help/install-app/?app=lanterndesigner` |
| Demo mode | `63__Feature__WebDemoMode` (GitHub Pages had no server) | Retired: the app always has its API |
| Shared logo | `../assets__CommonApplicationAssets/` | `/AppAssets__CommonApplicationAssets/` |

**Where the 20 designs went.** Adam's rule (15-Oct-2026): the Master Library is the single source of truth, so each
design became its own lantern-only library project (`ProjectType: "LanternDesign"`, every folder of the schema
project), named `<job number>__<Name>` as the API names new jobs:

`1234__Wong`, `1235__OakVilla`, `1236__TheBrusselsHouse`, `1251__Fergusman`, `1256__TheOldRectory`, `1515__TheManor`,
`1541__Flintstone`, `1542__MouseHouse`, `2001__Test`, `2321__TheGlebeHouse`, `2511__Steve`, `2525__BayManor`,
`2621__Watchorn`, `2654__Thorpeington`, `3010__WalkersPalace`, `3047__DeuceResidence`, `3256__MordorOrangery`,
`3611__McDuck`, `6901__Bergkamp`, `6969__Brent` (all in `ValeProjects__2026`).

Each design's content is unchanged apart from `Metadata__LibraryId` and a server stamp recording where it came from.
The Brussels House and Mordor Orangery files were last saved on 14-Oct-2026 and never committed: their latest
versions are in the library and in this archive, not in git. Adam's saved menu settings (`AdamW`) became
`UserConfig__USR00000001__LanternDesigner__.json`.

**Carried into the new folder:** the app source, styles, assets, sky domes, the version-locked vendor libraries, the
component and profile libraries, the asset registry, the dev build and check utilities (`60__Dev__WebBuildUtils`,
repointed at the library's copy of Walkers Palace), the SketchUp asset workshop (`91__Dev__...`), the DEVLOG and PLAN,
`package.json` / `package-lock.json` / `.npmrc`, and the quick notes (now in `85__EarlyStage__StarterInfoAndBrief/`).

**Only in this archive** (not carried into the new app):

| Item | Why |
|---|---|
| `VghLantern__FlaskServer__Localhost__.py`, the three `Start__VghLantern__*` launchers, `Na__VghLanternServer__Startup.log` (11 MB) | Replaced by the API and the Vale dev server |
| `Na__ServiceWorker__VghLantern.js` | Replaced by the route-scoped service worker |
| `02__Src__AppModules/62__Feature__AppInstallability/` (12 files) | Replaced by the shared install card. Its cache purge cleared every Cache Storage bucket and all localStorage of the origin, which on app.valegardenhouses.com would have wiped the other Vale apps' data |
| `02__Src__AppModules/63__Feature__WebDemoMode/` | No server-less build any more |
| `08__System__UserLogin/Na__UserLogin__UserAccounts__.json`, `..._LoginModal__.js`, `..._Styles__Main__.css` | The prototype gate (plain-text test passwords) |
| `03__Style__AppStylesheets/VghLantern__UiFeature__Styles__PwaInstallability__.css` | The prototype install prompt |
| `07__LocalProjectData/` (20 files), `08__LocalUserData/` (1 file) | Moved into the library and the users area (above) |
| `00__Archive/Vale__LanternDesigner__v0.4.0__12-Aug-2026__.zip` (78.9 MB), `node_modules/` (1,355 files), `.claude/settings.local.json`, `__pycache__/` | Old snapshot and tooling; `npm ci` restores `node_modules` from the lockfile |
| The empty folders `04__LocalProjectData`, `92__Dev__CadObjectBuilder`, `02__Src__AppModules/81__System__CadDxfExport`, `01__AppAssets__VghLantern/UiIcons__MenuIcons__ToolsMenu`, `05__Data__LanternComponentLibrary/48_1000__Roof__HipElement__Components` | Empty |

---

## The archive

| | |
|---|---|
| Created | 15-Oct-2026 |
| Files | 2,327, plus 6 empty folders |
| Source size | 274,605,665 bytes (0.27 GB) |
| Zip size | 146,133,088 bytes |
| Zip SHA-256 | `6ebd820dab0b0d92bb299d82a3f05c67b15c07c09f1890458d9397af20a6b2f4` |
| Layout | Every original file sits under `Vale__LanternDesigner/` inside the zip, with its original modified date |
| Manifest | `__ArchiveManifest__.json` at the zip root: every file's path, size, modified date (to the nanosecond) and SHA-256, and the empty folders |

**How it was verified.** Each file was hashed (SHA-256) as it was written into the zip. The finished zip (written as
`.partial` first) was then re-opened and every member read back in full: its CRC was checked and its SHA-256 and size
matched against the manifest. Only then was the zip put in place and made read-only. Before the originals were
removed, the folder was compared again against the manifest (path, size, modified time) and matched exactly. The
originals were sent to the Windows Recycle Bin, not permanently deleted.

**Secrets.** None were found (no `.env`, keys or tokens; `.npmrc` only sets `legacy-peer-deps`). The archive still
stays on this machine: it holds the demo client records, and `.gitignore` excludes `**/Archived__*__PreMigration__*.zip`
because this repository is public.

---

## Restoring something (reference only)

- **One file:** open the zip in Explorer or 7-Zip and copy it out, or
  `python -m zipfile -e Archived__LanternDesigner__PreMigration__15-Oct-2026.zip <empty folder>`.
- **Check a restored file:** compare its SHA-256 (`certutil -hashfile <file> SHA256`) with its entry in
  `__ArchiveManifest__.json`.
- **Tracked files from git:** 969 files were tracked. Commit `d7c331b7` is the last one before the archive:
  `git checkout d7c331b7 -- WebApps/Vale__LanternDesigner`. Untracked and ignored files (`node_modules`, the startup
  log, `08__LocalUserData`, `.claude`) and the uncommitted 14-Oct saves of two projects exist only in the zip.

---

## What changed outside this folder (15-Oct-2026)

- The Windows Startup shortcut `Start__VghLantern__WindowsStartUp__Silent__8006__.bat - Shortcut.lnk` was sent to the
  Recycle Bin, and the old server on port 8006 was stopped.
- The `vale-lantern-designer` entry (port 8006) was removed from `WebApps/.claude/launch.json`.
- `.gitignore` (repository root): every library `LanternDesigner/` folder is ignored (designs name the client and their
  address), except the schema project's `.example`; so are the `.<document>.lock` files the API library writer keeps.
- On the server (`app.valegardenhouses.com`): the app, `vale@LanternDesigner` on 8003, the `/lantern-designer/api/` proxy,
  the 20 library projects, Adam's settings file; the Gallery leaves lantern-only jobs out of its tabs and KPI report
  until they have 3D work; the install guide lists Lantern Designer. Every step is in the skill's
  `references/server-changelog.md`.

## Still pointing at the old app (not changed)

- GitHub Pages still publishes this repository. The notice pages replace the old app online once this change is
  committed and pushed.
- `/t/index.html` at the repository root (the General Drawing Terms page every printed drawing QR code opens) is not part
  of this folder and is unchanged. The new app still prints codes to it (`TermsQrBaseUrl`); moving it to the app server
  belongs with retiring GitHub Pages (the skill's migration notes, Q8).
- Devices that installed the old app keep its service worker until it is removed. It fetched pages network first, so
  online they get the notice page.
