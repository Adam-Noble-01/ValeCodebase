# ValeVision 3D (legacy) - RETIRED (Archived 08-Oct-2026)

> **AGENTS AND DEVELOPERS: STOP HERE.**
> This folder is retired. Do not extract, restore, edit or build on anything from it.
> ValeVision 3D is actively developed in `WebApps/Vale__VirtualServer/Vale__ValeVision3D` (the app) and
> `WebApps/Vale__VirtualServer/Server__Api/Api__ValeVision3D` (its API).
> The `vgh-app-server` skill describes the live system in full.

---

## What is in this folder

| File | Purpose |
|---|---|
| `Archived__ValeVision__PreMigration__08-Oct-2026.zip` | Every file this folder held on 08-Oct-2026, verified (see below). Read-only. **Local only: gitignored, never commit or upload it.** |
| `MigrationDetails__README__.md` | This file. |
| `index.html` | Retirement notice for anyone who opens the old app (old links were `index.html?project=...`). Self-contained (no other files). |

The notice tells people to stop using the prototype and to open **https://app.valegardenhouses.com**.
It thanks them for using the prototypes and asks them to contact Adam Noble if they have
trouble installing the new apps.

---

## Old to new

| | Old (retired) | New (live) |
|---|---|---|
| Code | `WebApps/ValeVision3D` | `WebApps/Vale__VirtualServer/Vale__ValeVision3D` |
| Public URL | `https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/index.html?project=...` (GitHub Pages) | `https://app.valegardenhouses.com/valevision/?project=<library folder id>` (OVH VPS, nginx) |
| Server | Shared with Whitecardopedia: `WebApps/Whitecardopedia/server.py` + `Server__ValeVision*__Api__.py` (Flask on localhost:8000) | `Server__Api/Api__ValeVision3D` (127.0.0.1:8002 on the VPS) |
| Local development | Whitecardopedia's `start_server.bat` on port 8000 | `Vale__VirtualServer/Server__DeveloperTools/ValeDev__LocalServer__.py` on port 8030 |
| Project data and GLBs | Whitecardopedia `Projects/`, Cloudflare R2 | `Vale__VirtualServer/Vale__Projects__MasterLibrary` (`<project>/ValeVision3D/...`) |
| Spelling dictionary | `50__ValeVision__UserConfig` | `50__UserData__SpellCheckDictionary` |
| Layout Editor scrapbook | `51__LayoutEditor__UserScrapbookContent` | `51__UserData__LayoutEditorScrapbook` |
| Install guide | `install-guide.html` | `https://app.valegardenhouses.com/help/` |
| PWA install modules | Loaded from `../Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/` | `Vale__VirtualServer/AppAssets__CommonApplicationAssets/Shared__AppInstall/` |

The app source, libraries, styles, assets, hatch patterns and planning documents (DEVLOG, README, PLAN,
PARITY, WORKING_MEMORY, NOTES) were carried into the new folder.
`WebApps/Whitecardopedia` was retired at the same time; see its `MigrationDetails__README__.md`.

**Only in this archive** (not carried into the new app):

| Item | Files | Size |
|---|---|---|
| `ValeVision__AUDIT__TrueVisionParity__Evidence__/` | 8,739 | 383.5 MB |
| `ValeVision__AUDIT__TrueVisionParity__DrawingSystems__.md` | 1 | 1.0 MB |
| `00__Archive/` | 2 | 43.7 MB |
| `80__Testing__PrototypeEnvironment/` | 147 | 12.8 MB |
| `79__Testing__GenerateObjects/`, `95__SketchUpSisterTools__ToolsAndUtils/` | 5 | under 0.1 MB |
| `.claude/` (launch.json, settings, the superseded `adam-vale-apps-infrastructure-architecture` skill) | 3 | under 0.1 MB |
| `.cursorrules`, `.cursorignore`, two `.code-workspace` files | 4 | under 0.1 MB |

---

## The archive

| | |
|---|---|
| Created | 08-Oct-2026 |
| Files | 12,208, plus 3 empty folders, plus 5 extras (below) |
| Source size | 716,288,134 bytes (0.72 GB) |
| Zip size | 360,702,490 bytes |
| Zip SHA-256 | `4f14d1c04bb90f88eedd873f97339ff1dba3ec0ca87099b01aee1b44509352ec` |
| Layout | Every original file sits under `ValeVision3D/` inside the zip, with its original modified date |
| Manifest | `__ArchiveManifest__.json` at the zip root: every file's path, size, modified date and SHA-256 |

**How it was verified.** Each file was hashed (SHA-256) as it was written into the zip. The finished zip
was then re-opened and every member read back in full: its CRC was checked and its SHA-256 and size
matched against the manifest. Only then was the zip finalised. Before the originals were removed, the
folder was compared again against the manifest (path, size, modified time) and matched exactly.
The originals were sent to the Windows Recycle Bin, not permanently deleted.

**It contains secrets.** The archive holds files that git never tracked, including the email worker's
Cloudflare credentials (`02__Src__AppModules/62__Feature__EmailWorkers/CloudflareWorker/.dev.vars`) and
the hidden address book sources and encryption tool (`*.--HIDDEN`). This repository is public, so the
zip is excluded by `.gitignore` (`**/Archived__*__PreMigration__*.zip`) and must stay on this machine.

### Git worktrees (removed, kept in `__ArchiveExtras__/GitWorktrees/`)

`.claude/worktrees/` held two git worktrees, each a full checkout of the whole repository (7.1 GB).
They were not zipped. What they held that git does not already have was saved, and the worktrees were
sent to the Recycle Bin and pruned from git:

| Worktree | HEAD | Saved in the zip |
|---|---|---|
| `drawing-layout-editor-controls-6ecdac` | `bb290544` (on `main` and branch `claude/drawing-layout-editor-controls-6ecdac`), clean | `WorktreeInfo__.txt`, `.claude/settings.local.json` |
| `valevision-config-timeout-c1cffd` | `dde6935a`, branch `claude/valevision-config-timeout-c1cffd` (kept in git) | `Uncommitted__Changes__.patch` (3 files, +261 / -31: `Na__AppConfig__Loader.js`, legacy `index.html`, the legacy service worker logic), `WorktreeInfo__.txt`, `.claude/settings.local.json` |

To look at the uncommitted work: `git checkout claude/valevision-config-timeout-c1cffd` and
`git apply Uncommitted__Changes__.patch`. It edits legacy paths only.

---

## Restoring something (reference only)

- **One file:** open the zip in Explorer or 7-Zip and copy it out, or
  `python -m zipfile -e Archived__ValeVision__PreMigration__08-Oct-2026.zip <empty folder>`.
- **Check a restored file:** compare its SHA-256 (`certutil -hashfile <file> SHA256`) with its entry in
  `__ArchiveManifest__.json`.
- **Tracked files from git:** 12,169 of the 12,208 files are also in git history. Commit `03137e56` is
  the last one before the archive: `git checkout 03137e56 -- WebApps/ValeVision3D`. Untracked and ignored
  files (credentials, the `*.--HIDDEN` files, `.wrangler`, `node_modules`, PSDs, audit scratch output)
  exist only in the zip.

---

## What changed outside this folder (08-Oct-2026)

- The Cursor rules moved to `Vale__VirtualServer/Vale__ValeVision3D/.cursor/rules/`, checked against the
  live system:
  - `00`, `01`, `02`, `04`, `05` and `06` were copied unchanged;
  - `03-AppConfig`: the R2 index note was replaced with where project data really comes from (the
    ValeVision 3D API and the Projects Master Library);
  - `07-RenderEngine`: `project.json` became the project record (`api/projects/<id>`), and the
    DistanceCulling path was corrected (it now sits in the shared `05__RenderPipeline/` folder);
  - `08-R2IndexArchitecture` was dropped: it described the retired R2 / Cloudflare / GitHub Pages pipeline.
- `.cursor/` was added to `NeverSync` in `Vale__VirtualServerManager/01__AppData/VirtualServerManager__SyncMap__.json`,
  so the rules are never pushed to the public server.
- The `adam-vale-apps-infrastructure-architecture` skill was not carried over. Its URL, port and
  deployment details no longer match the live server, and the `vgh-app-server` skill covers the same ground.
- The old port 8000 server was stopped, its Windows Startup shortcut sent to the Recycle Bin, and its
  `whitecardopedia-flask` entry removed from `WebApps/.claude/launch.json`.

## Still pointing at the old apps (not changed)

- `WebApps/Na__Pwa__ServiceWorker__.js`: the old service worker stub at the WebApps root. Its logic lived
  in `WebApps/Whitecardopedia` and is gone. Devices that installed the old app keep their existing worker
  until it is removed, but it fetched pages network-first, so online they get the notice page.
- The email Cloudflare Worker and the R2 buckets from the old design run in Cloudflare, not here.
  Archiving this folder does not switch them off.
- GitHub Pages still publishes this repository. The notice page replaces the old app online once this
  change is committed and pushed.
