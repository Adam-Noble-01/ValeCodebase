# ValeVision Gallery: DEVLOG

## Version 1.0.0, 06-Oct-2026: On the App Server

**Why.** The Gallery moves to app.valegardenhouses.com, and GitHub Pages, Cloudflare R2 and the
Workers are retired. It takes its proper name, ValeVision Gallery (the early codename is retired). It
uses the shared Vale sign-in, and reads and writes the Projects Master Library through its own small
Flask API.

**Changes from the last pre-server build (0.2.8):**
- **Data:**
  - `Na__AppData__ProjectLoader.js` reads `api/projects`;
  - images come straight from the library's `Content__` folders;
  - no R2, no GitHub Pages fallback, no master index, no build manifest;
  - same function names, so the rest of the app is unchanged.
- **Sign-in:**
  - the shared Vale sign-in (email and password; a temporary password must be changed at first
    sign-in) replaces the PIN screen and the home page;
  - an initials avatar sits top right, with Change password, Sign out and the user's tools.
- **Permissions** replace the localhost checks:
  - Management and up get the Project Editor and the 3D Production KPI Report, both in the app;
  - App Admins get Developer tools (purge cache);
  - the access-phrase KPI page is retired, and its emailed link now opens `?tool=kpi`.
- **Editor:**
  - saves through the API (Gallery fields only, with the `_rev` check), and visibility likewise;
  - removed: the Cloudflare Worker, R2 writes, the local mirror save, folder rename, permanent
    delete, the R2 info panel;
  - saves no longer purge the cache and reload.
- **PWA:** one manifest and one small service worker, scoped to this route, replace the 13-file
  install stack.
- **Header:** a text title replaces the old title artwork (it carried the retired name).
- **Links:** to ValeVision 3D via `/valevision/?project=<folder id>`; share links use
  `?id=<folder id>`.
- **Paths:** shared assets come from `/AppAssets__CommonApplicationAssets/`. The KPI email uses
  absolute `https://app.valegardenhouses.com/...` URLs.

**Tested** on the Vale dev server against a sandbox copy of the users and the library:
- sign-in and the forced new password;
- App Admin and Employee views;
- the gallery (145 visible projects, no broken images), the viewer, deep links;
- an editor save, a stale save refused, visibility;
- the KPI report (155 projects);
- Employee refusals (403).
