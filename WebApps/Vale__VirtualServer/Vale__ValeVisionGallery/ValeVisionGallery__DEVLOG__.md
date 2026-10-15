# ValeVision Gallery: DEVLOG

## Version 1.5.2, 15-Oct-2026: Lantern-Only Jobs Stay Out Until They Have 3D Work

**For Lantern Designer's move onto the app server.** Lantern Designer now keeps every design in the
Vale Projects Master Library, and can add a job the library does not have yet (Adam: the library is
the single source of truth). Such a project is tagged `ProjectType: "LanternDesign"` and has no
images or model.

**Changes:**
- The Whitecard Models list shows a LanternDesign project only once it has gallery images (a later
  ValeVision Cloud Sync publish); the Max Models and Blockout lists never show it. Until then it was
  already left out of every tab by its type.
- The 3D Production KPI Report leaves LanternDesign projects out unless they have images or a model.
- Files: `Na__Feature__ProjectGallery__Main.jsx` (`filterProjectsByGalleryMode`),
  `Na__AppUtils__KpiProjectSource.js` 2.1.0.

## Version 1.5.1, 15-Oct-2026: My Projects Only Applies Once a Job Is Attributed

**Asked by Adam.** Diane (Concept Artist) takes ad hoc jobs, so no project names her, and My Projects
opened on "None of Dianne's projects are in the gallery yet." with just a View All Projects button.
Adam's rule: someone with no jobs attributed to them always sees every job; My Projects starts once
one or more jobs name them. Done for everyone rather than for Diane alone, so a new starter is
covered the same way.

**Changes:**
- A Designer or Concept Artist gets My Projects (the filter and the button) only when at least one
  project in the library names them as designer or concept artist. With none, they see every
  project and have no button, exactly like everyone else.
- The check covers the whole library (Whitecard, Max and Blockout together), not the open list, so
  the button does not come and go as the tabs change. Hidden projects are not in the list the
  gallery receives, so they do not count.
- The first project that names them turns it on: from their next visit the gallery opens on My
  Projects, with the button, as in 1.5.0.
- While the list is still arriving, a Designer or Concept Artist with nothing of theirs found yet
  sees "Loading projects..." (the API hands over the whole list in one call, so this is instant),
  so neither the empty message nor the wrong list flashes up.
- `?viewAs=<name>` follows the same rule: `?ViewAs=Dianne` opens the gallery as Diane gets it, every
  project and no button.
- Files: `Na__Feature__ProjectGallery__MyProjects.js` 1.1.0 (`getMyProjectsJobState`) and
  `Na__Feature__ProjectGallery__Main.jsx`.

**Who it changes today** (the library on 15-Oct-2026): the three Designer and Concept Artist accounts
no project names, Andy Moth, Sharon and Diane Brittain. Everyone else keeps My Projects.

**To attribute jobs to Diane later:** her name has to be in the Concept Artists list
(`Na__AppData__ValeConceptArtistsList__Main.json`, where she is not yet) and match her account's
first name in the user register, which spells it **Diane**. If the projects will carry another
spelling, list it in the master config's `vale__MyProjects__GalleryNameByUserCode`
(`"USR00000032": "<spelling>"`), as Edward is Ted.

**Checked:**
- The new logic ran against every account in the register and the library's real names: only
  Andy, Sharon and Diane have no jobs.
- Every edited script parses (Babel parser, JSX), and the pushed scripts compile in the live
  page's in-browser Babel with no console errors (pushed 10:24 UTC, stamp `20261015-102457`).

## Version 1.5.0, 13-Oct-2026: My Projects for Designers and Concept Artists; Blockout Models Moves to the Menu

**Asked by Adam.** Designers and Concept Artists should not be bombarded with every project: the
gallery should open on their own jobs, with a toggle to see all of Vale's. Everyone else sees every
project and gets no toggle. To make room for it on phones, the barely used Blockout Models tab (three
blockouts ever) moves into the hamburger menu. Each state gets its own icon, so it is clear which
view is showing.

**Decisions (Adam):**
- The button shows the current view, not the action.
- The choice lasts until the app is closed.
- A person's projects are the ones naming them as designer or concept artist. Dan also gets the 2
  Martin jobs he drew the concept for, Jo the 1.
- App Admins get a preview link.

**Changes:**
- **Who gets it:** the account's Role in the user register: Designer or Concept Artist. The
  permission level does not count, so James (Designer, Management) gets it too. Everyone else is
  unchanged.
- **Their name on the projects:** the account's first name, matched against
  `productionData.designer` and `productionData.conceptArtist` (any case). An account whose
  projects carry another name is listed in the master config,
  `vale__MyProjects__GalleryNameByUserCode`: USR00000015 Edward is "Ted".
- **The button** (`Na__Feature__ProjectGallery__MyProjectsToggle.jsx`), between the search box and
  Project Filters:
  - **My Projects**: one-person icon, white on a dark Vale blue fill, so it is clear a filter is on;
  - **All Projects**: two-person icon on white, like Project Filters;
  - a click flicks between them. The tooltip names the view and what a click does.
  - On phones it sits on the first row beside Whitecard Models and Max Models, in the old Blockout
    tab's place, at the tabs' size.
- **Opening:** the gallery opens on My Projects. It waits for the master config (a few ms), so all
  projects never flash up first.
- **The choice** is kept in sessionStorage per account. Opening a project and coming back keeps
  All Projects; a fresh launch opens on My Projects again.
- **Scope:** My Projects applies in every list (Whitecard, Max, Blockout). Search, the Artist and
  Designer filters and the sort work inside it.
- **Nothing to show:** when My Projects is empty, the grid says why ("None of your projects match
  your search.", "None of your projects are Max Models." ...) and offers **View All Projects (n)**,
  where n is what All Projects would show.
- **Activity ledger:** the toggle logs `view.mode`, "Switched to my projects / all projects".
- **Preview (App Admins):** `?viewAs=Dan` opens the gallery exactly as Dan gets it, button
  included; the tooltip says it is a preview. It is read once at start-up, so it lasts until the
  page is reloaded without it. Ignored for anyone who is not an App Admin.
  - The parameter name works in any case. The first live try, `?ViewAs=Gary`, did nothing,
    because URL parameter names are case-sensitive and the code only read `viewAs`.
- **Blockout Models:**
  - its tab is gone (`GalleryModeToggle` 1.2.0); it is a hamburger menu item, between the
    3D Production KPI Report and Purge App Cache;
  - in the blockout list the item reads **Back to Whitecard Models**, and clicking the Whitecard
    Models tab also works;
  - the hamburger menu now shows for every signed-in user, because Blockout Models is open to all.
    Employees see just that one item.
- **Icons:** `04__Assets__AppGraphics/Na__Icon__MyProjects__.svg` and `Na__Icon__AllProjects__.svg`.
  - They are drawn at the funnel icon's weight (1.2 px at 14 px, 88 per 1024), not the 34 menu
    weight.
  - Round caps, #172b3a; the dark fill turns them white with a CSS filter.
  - Their editable specs are in the vector skill's `01__ProductionFiles`.
  - A three-person group was tried first. At 14 px the back heads read as brackets, "( O )", so
    All Projects shows two people (one in front, one behind).
- No service worker version change: app files are network first.

**Checked:**
- Every edited script parses.
- The icons were rendered at 14, 28, 56 and 112 px beside the funnel, on white and on the blue
  fill. They lint clean apart from the deliberate weight.
- Not run in a browser: Adam tests.

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
