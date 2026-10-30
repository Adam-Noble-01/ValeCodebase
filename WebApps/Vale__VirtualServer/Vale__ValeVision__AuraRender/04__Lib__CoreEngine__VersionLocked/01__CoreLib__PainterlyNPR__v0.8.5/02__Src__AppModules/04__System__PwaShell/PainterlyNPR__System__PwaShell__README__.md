# 04__System__PwaShell

**01-09 · The spine** · real code since v0.5.0

The installable, offline-capable shell of a local-first PWA.

**Files** (v0.5.0, ported from Experiment 01 - engine 0.4.10)

- `PainterlyNPR__Pwa__Manifest__.webmanifest`
- `PainterlyNPR__Pwa__ServiceWorker__Logic__.js` - Keep every file the app needs in a cache of its own, so PainterlyNPR opens and draws with no server and no network
- `PainterlyNPR__Pwa__ServiceWorker__Registrar__.js` - Register the service worker once the page has loaded, on secure origins only, and say quietly when a newer version takes over

**Belongs here**

- The web app manifest and its icons (from `01__AppAssets__PainterlyNPR`).
- The service worker, the offline cache list and the update hand-over between versions.
- Refuses: caching a user's scene packages or projects - those are project data (`20`, `21`), not the application.

**Takes** the built application. **Gives** an installable app that opens offline.

**Manifest:** §13 PWA; Design Thesis ("Live linking, collaboration ... must not distract from proving that result").

## How it works (v0.5.0)

- **The manifest** names the app, its start page (`PainterlyNPR__App__.html`), its scope (the repo root), `standalone` display and the icons in `01__AppAssets__PainterlyNPR/10__Icons__Pwa`. The page links it.
- **The worker** is `Na__Pwa__ServiceWorker__.js` at the root - a worker controls the folder it is served from - and its logic is here. It installs every file on `PainterlyNPR__Pwa__PrecacheList__.json` or none; serves network first on localhost (an edit shows on the next reload) and stale while revalidate elsewhere; never caches `/api/`; deletes only its own older caches.
- **The list** is written by `60__Dev__WebBuildUtils/PainterlyNPR__BuildUtil__PrecacheList__.py`. Run it after adding, renaming or removing a module, config or stylesheet; `PainterlyNPR__Test__AppConfigs__.py` fails while it is out of date.
- **A new version** of the shell: bump `PWA_SW_VERSION_TOKEN` in the logic and note it in its DEVELOPMENT LOG. The registrar never reloads a page for a new version - the sheet may be unsaved work - the next reload uses it. `PainterlyNPR__Pwa__ClearCache()` on the console starts clean.
- **Double-clicked**: from `file://` no module loads, so the registrar (a classic script, which does run) writes on the status line how to open the app.
- **Tested** by `60__Dev__WebBuildUtils/PainterlyNPR__Test__AppPwa__Browser__.py`: no manifest errors, nothing stopping an install, every file cached, and the app drawing the same sheet with the server stopped.
