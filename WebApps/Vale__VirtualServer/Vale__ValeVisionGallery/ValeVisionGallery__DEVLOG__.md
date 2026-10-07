# ValeVision Gallery: DEVLOG

## Version 1.4.0, 07-Oct-2026: Max Models in the Main List; Updates Reach Browsers After a Push

**Asked by Adam.**
- **Max models mix in with the whitecard models.** The main list (Whitecard Models) now shows
  Whitecard, MaxModel and untagged projects. The Max Models tab still shows Max models only, and
  blockouts stay in their own tab behind its warning banner. There is no label on the cards (Adam's
  choice). Six projects join the main list: Doous, Mordaunt, Bagot, Bia, Holt and Thorpe (147 → 153
  cards). Change: `filterProjectsByGalleryMode` in `Na__Feature__ProjectGallery__Main.jsx`.
- **Updates after a push** (pushed 15:41 UTC): `index.html` loads the shared
  `ValeShared__AppUpdate__.js` (`data-app-base="/project-gallery/"`). After a source push, it fetches
  the changed files past the browser cache and reloads at start-up, or offers Reload while open.

**Checked** on the sandbox (only Holt, a Max model): Holt is in the main list and the Max Models tab;
the Blockout tab is empty.

## Version 1.3.0, 07-Oct-2026: Card Icons Are Shortcuts Into ValeVision 3D and Theia

**Asked by Adam.** Put the video icon in line with the 3D model icon, and make both access buttons:
the model opens the project in ValeVision 3D and the video opens its videos in ValeVision Theia,
without going through the project page first.

**Changes (ProjectGallery `ContentIndicatorIcons`, App CSS):**
- The card's icons sit in one row (`.project-card__content-icons` is `flex-direction: row`).
- **3D model icon** → `/valevision/?project=<folder id>`, built by the same routing helper as the
  project page's ValeVision 3D button.
- **Video icon** → `/theia/?project=<folder id>`, the project's videos, as the project page's
  "Watch in ValeVision Theia" does.
- Both are real links (Ctrl or middle click opens a tab) and stop the click reaching the card, so the
  project page does not open as well. Clicking anywhere else on the card still opens the project page.
- Tooltips: "Open Holt in ValeVision 3D", "Watch Holt's 2 videos in ValeVision Theia". A hover lifts
  the icon onto a light tile; keyboard focus shows an outline.
- The watercolour icon stays a plain marker.

**Tested** in a harness page rendering the real `ContentIndicatorIcons` in the gallery's card markup
and CSS: three cards (3D and 2 videos; 3D only; watercolour, 3D and 1 video) each showed their icons in
one row; every link went to the right URL; no icon click reached the card; a click on the name still did.

## Version 1.2.0, 07-Oct-2026: Project Videos From ValeVision Theia

**Asked by Adam.** A project with videos should show a video icon on its gallery card, like the 3D model
icon, and its project view should open the project's videos in ValeVision Theia from a new section in the
right panel. Only staff see this: the Gallery is signed-in staff only, and clients reach Theia through share
links that never lead back here.

**Changes:**
- **Card icon:** `hasVideoContent()` (ContentDetector) reads `videoCount`, which the Gallery API puts on every
  record (Server__Api/Api__ValeVisionGallery 1.1.0, from `ValeShared__TheiaVideo__`: the videos staff can
  watch). The icon is `Icon__ProjectGallery__ContentIndicatorIcon__TheiaVideo__512px__.png` in the common
  assets (a placeholder Adam may replace); its tooltip says "3 videos in ValeVision Theia".
- **Project Videos** (ProjectViewer 1.3.0), between Production Data and Project Actions:
  - each video's thumbnail, title, length and quality open it in Theia (`/theia/?project=<id>&video=<id>`);
  - **Watch in ValeVision Theia** opens the project's list;
  - the videos come with the full record (`theiaVideos`), fetched when the card says there are some;
  - Theia's breadcrumbs ("‹ Project Gallery / Holt - 64135 / Videos") come back to `?id=<id>`.
- Service worker version `2026-10-07-2`.

## Version 1.1.0, 07-Oct-2026: Installed as "ValeVision"; the Install Card Is Back

**Asked by Adam.** ValeVision should be the name of the installed app and of bookmarks. People
using the app in a browser should be asked to install it, as the pre-server build did, and be
taken to illustrated steps for their own device on a help page on the new server.

**Changes:**
- **Name:** the manifest `name` / `short_name`, the page `<title>` (bookmarks), the iOS and Android
  home-screen titles and the sign-in card all say **ValeVision**. The in-app header still says
  ValeVision Gallery.
- **Install card:** the shared `AppAssets__CommonApplicationAssets/Shared__AppInstall/` module.
  - It appears after signing in, never over the sign-in card.
  - Chrome, Edge and Samsung Internet: **Install** is always the main button and opens the
    browser's own install box. Only if the browser never offers one does the card show the
    address-bar steps.
  - iPhone and iPad (Safari, other browsers, in-app browsers), Mac Safari and Firefox on Android
    show the steps in the card, with **Got it** (or **Copy link** inside another app).
  - Every card links **Show me how ↗**, which opens `/help/install-app/?app=valevision&device=…`
    in a new tab.
  - "Not now" snoozes it for 1 hour, then 1 day, 1 week, then 30 days.
- **Manifest:**
  - `related_applications` points at itself, so Chrome can tell the page the app is already
    installed.
  - `id` is now an explicit `/` (it was `./`, which resolves to the same thing). ValeVision 3D's
    `./` resolved to `/` too, so Edge took the two apps for one being renamed. ValeVision 3D now
    has `/valevision/`.
  - `scope` is `/`, the whole site, so opening a project in ValeVision 3D stays inside the
    ValeVision window without Edge's grey bar. Edge picks up the change on the app's next launch;
    if the bar stays, uninstall and install again once.
- **Links open in the app:**
  - `open.html` is the target of the manifest's `protocol_handlers` (`web+valevision`). It follows
    only same-site paths, and `launch_handler` `navigate-existing` reuses the open window.
  - The shared module offers "Open in the ValeVision app" (with "Always") in a browser tab on a
    computer where ValeVision is installed.
  - Tested: a real link lands on `/valevision/?project=64135__Holt`. Another site, a `//` path, a
    full URL and a `+` sent as a space are refused or handled, and the bad ones fall back to
    `/project-gallery/`.
- Service worker version `2026-10-07-1`.

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
