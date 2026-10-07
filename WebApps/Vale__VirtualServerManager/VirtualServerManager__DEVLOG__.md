# Vale Virtual Server Manager: DEVLOG

## Version 0.9.0, 07-Oct-2026: Every Source Push Purges the Changed Files in Every Browser

**Asked by Adam** ("update all apps to have an auto cache purge pushed after the server logs a source
push"). Cloudflare gives every script and stylesheet a 4-hour browser cache (`max-age=14400`, its
Browser Cache TTL, over nginx's `no-cache`). So after a push, browsers, and above all an installed app
on an iPad, kept the old files for up to 4 hours: Theia's iPad header stayed clipped after its fix
went live.

**Changes:**
- **The deploy stamp.** After every push and every undo that changes web-served source, the agent
  writes `/srv/vale/ValeApps__DeployStamp__.json` in the same session, and logs `deploy-stamp` to
  sync.log. The file lists the URLs each push changed, newest last (7 days, at most 60 pushes);
  `ValeDeploy__Stamp__Latest` only ever increases. It covers code-lane files only, never `Server__`,
  content or user data. Each file is named by the URL browsers load it from: an app's route from the
  URL routes (sent as `deploy_routes`, e.g. `/theia/...`), otherwise `/<path>` (e.g.
  `/AppAssets__CommonApplicationAssets/...`).
  - Agent: `deploy_note()` / `deploy_note_safe()`, called by `mode_apply` after the journal and
    by `mode_undo`. A failure is logged and never fails the push.
  - Engine: `NA__ENGINE__DEPLOY_STAMP`; `Na__Engine__DeployRoutes()`; `Na__Agent__Head` sends
    both.
  - Sync map: `ValeApps__DeployStamp__.json` is in NeverSync, so it never shows in a compare and is
    never pushed, collected or deleted.
- **The apps read it:** `AppAssets__CommonApplicationAssets/Shared__AppUpdate/ValeShared__AppUpdate__.js`
  1.0.0, in ValeVision 3D, ValeVision Gallery, ValeVision Theia and ValeVision Help.
  - At start-up: if a push changed the app's files, or the shared assets, since this browser last
    looked, it fetches each one again past the cache (`cache: 'reload'`), then reloads once.
  - While open (back on screen after 30 s, back online, every 10 min): it purges at once, then
    reloads if the app says it is safe (`window.ValeAppUpdate__CanReload`; Theia: no video playing,
    no dialog or edit open). Otherwise a bar offers "Reload" or "Later".
  - It does nothing on a first visit, with no stamp, or offline.
- `NA__SERVER__VERSION`, `Vsm.PageVersion` and the service worker cache are 0.9.0. **Restart the
  app** (`Restart__VirtualServerManager__8020__.bat`) so pushes from it write the stamp too. The CLI
  uses the new engine at once.

**Tested in a sandbox** (the fake ssh running the agent on this PC, isolated sync map, routes, state
and ledger; the VPS never contacted), 22 checks:
- a first push writes the stamp at the root: Theia files under `/theia/`, shared assets and the root
  page by path; no `Server__`, `Content__` or excluded (`.md`) files; sync.log has the line;
- a compare after it is clean (the stamp is never a server-only file);
- a second push: a later stamp listing only its one CSS file, and both pushes kept;
- content-only and `Server__`-only pushes leave the stamp alone;
- an undo of a content push leaves it alone, and an undo of the CSS push adds an `undo` entry;
- a damaged stamp file is replaced and the push still succeeds.

The browser side was tested on the dev server with a stamp in the mirror root:
- start-up purge and one reload;
- a push while open reloading Theia by itself, or showing the bar when a video plays;
- no repeat once current;
- another app's push only noted;
- Gallery and 3D still load.

**Live 07-Oct-2026 15:41 UTC:** the first stamp was written by the push that delivered the apps' script
(commonassets, theia, valevision3d, valevisiongallery, help). A compare afterwards was clean.

## Version 0.8.0, 07-Oct-2026: Collect Brings Theia's Videos (Content Made on the Server)

**Asked by Adam.** "Why is the collect save feature of server manager app not collecting the video
files and saving them here" (64135 Holt). ValeVision Theia writes each published video and its
posters into `ValeVision__TheiaVideo/Content__VideoFiles` and `Content__VideoThumbnails` on the
server. `Content__` is the heavy-content lane (PC → server), so Collect skipped them unless *Collect
with content* was ticked. For Holt that tick would also have brought back 64 superseded gallery and
thumbnail images (02-Oct and 06-Oct) left on the server. The two collects at 14:32 and 14:48 moved
7 files each; the two videos (2.07 GB) stayed on the server. They were brought down that afternoon
with a scoped `collect projects --scope ValeProjects__2026/64135__Holt/ValeVision__TheiaVideo
--with-content`.

**Changes:**
- **Sync map:** `ServerMadeContent`, a list of folder-name patterns (or path patterns with `/`),
  first `["ValeVision__TheiaVideo"]`. `_About` explains it.
- **Engine:**
  - `Na__Walk__IsServerMade(rel, rules, is_dir)`: inside such a folder?
  - `Na__Parity__Verdict(..., made)`: for made content, server-only and server-newer are
    `collect`; PC-newer and PC-only still `push`; ties go to the server, as before;
  - Compare lists them in the plan's new `content_collect`, counted in `collect_bytes`;
  - Collect always takes `content_collect`; `--with-content` still adds the other server content;
  - a forced push (`--force-content`) only overwrites `content_server_newer`, so it can never
    overwrite a newer video Theia published;
  - `--prune` refuses a made folder: the PC copy is not the master;
  - the Annotator's `label()` returns `(id, lane, excluded, made)`;
  - the agent is unchanged (it never reads `server_made`).
- **Local server:** `content_collect` joins the plan lists sent to the page (`_count` too); the live
  explorer passes `made` to the verdict.
- **Page:** the card's content row shows "↓N made on the server: collect", which counts towards the
  Collect button; the file lists have "Content made on the server: collect"; the Collect dialog has a
  **Made on the server** column and says Theia's videos and posters come down; the explorer explains
  the file.
- `NA__SERVER__VERSION`, `Vsm.PageVersion` and the service worker cache are 0.8.0.

**Tested in a sandbox** (the fake ssh running the agent on this PC; isolated sync map, state, ledger
and lock; the VPS was never contacted), 36 engine checks:
- compare: a server-only video and a server-newer poster are `content_collect`; a PC-newer poster
  still pushes; an ordinary server-only gallery image stays server-only; no made file is a conflict;
  user data still collects; `collect_bytes` counts the made files; the CLI prints the new list;
- collect without `--with-content`: the video and the newer poster arrive (mtime kept, the older PC
  poster kept in the backup), the PC-newer poster is untouched, the share links arrive, the gallery
  image does not; a second compare has nothing made left;
- `--prune` of a made folder is refused, of the GLB folder still allowed;
- a forced push leaves a republished poster on the server and pushes the PC-newer one;
- `--with-content` still brings the gallery image;
- verdict and label unit checks.

Then the page, on a sandboxed copy on port 8021: the card read "1 server only · ↓2 made on the
server: collect · collect 9 B"; the Collect dialog showed 2 under Made on the server and offered the
heavy-content tick for the 1 other file; Collect now brought the 2 and left the other; the live
explorer marked a new server video `collect` and the gallery image `server-only`. The only console
error was the service worker registration in the embedded browser (the file serves 200 on 8020 and
8021).

Then the real server (one session): Holt compares with its 6 Theia files unchanged, nothing to
collect, and the 64 old gallery images still server-only.

## Version 0.7.0, 07-Oct-2026: Delete Files From the Server, With a Confirm Modal

**Asked by Adam.** "Make it so in the server manager app I can delete files; add a confirm modal
for safety." The trigger was Holt's `Content__3dModel__GlbFiles`, which held 21 `Washington__…`
GLBs left behind on the server (server only). Content is additive, so nothing ever removed them.

**Changes:**
- **Tab 01, tick boxes:**
  - every row has one, in its own column, before the tree indent;
  - a folder's box ticks every deletable file inside it that the search and filters show. Search
    `Washington` and tick the folder, and only the Washington files are ticked; the box shows
    part-ticked when only some are;
  - Shift ticks a range of files;
  - ticked rows are tinted red, and the toolbar shows "N ticked · size", **Delete from server…**
    and **Clear**;
  - the detail panel has **Delete this file / N files inside from the server…** for the selected
    row.
- **Cannot be ticked** (box disabled, the reason on hover): files the server does not have,
  unmapped files, files the mapping leaves out of sync (secrets such as `*.env`, docs, scripts),
  and the users register (users are never deleted: untick Active).
- **The confirm modal:**
  - lists every file with its lane, status, size and modified time, and gives the count, total
    size and mappings;
  - **user data or project records** need an extra tick ("I have checked they can go"); without
    it the button only says so;
  - files also on this PC can be moved to `90__ServerBackups\deleted__<time>\` with one tick. The
    modal says how many a push would otherwise send back;
  - it says how to undo.
- **Engine:**
  - agent mode `delete`: named files only, each checked against the size and time the explorer
    showed. Any difference refuses the whole job, as does a refused file (the register, a file
    left out of sync, a symlink, an unsafe path);
  - each file is copied to `/srv/vale-sync/backups/<stamp>/` and the job is journaled like a push
    (`kind: delete`, `after: null`), so **Undo last push** on that mapping restores them, and
    refuses if one was re-created meanwhile;
  - folders are kept, even when emptied (an app may expect its bucket folder);
  - a stop part way (a permission error) journals what was done and says so;
  - the sync ledger drops the deleted files;
  - `AllowDeletes` is not consulted: it governs Push's automatic code deletes, not a delete
    Adam names;
  - at most 5,000 files a job;
  - the journal trimming is now `trim_journals()`, shared by push and delete.
- **CLI:** `delete ID REL [REL ...] [--yes] [--pc]`. It looks first (one session) and lists what
  it found; `--yes` deletes those exact files (a second session); a path that is missing or left
  out of sync stops it.
- **Local server:** job `delete` (`POST /api/op/delete {files: {id: {root path: [size, mtime]}}, pc}`);
  it clears that mapping's compared plan and sets its last action to "deleted N file(s)".
- `NA__SERVER__VERSION`, `Vsm.PageVersion` and the service worker cache are 0.7.0.

**Tested in a sandbox** (a fake ssh that runs the agent on this PC, a sandbox server and PC
mirror, isolated state, ledger and lock; the VPS was never contacted), 29 engine checks:
- delete, backup, journal, log line, PC copy moved, the other files and the folder untouched;
- undo restores size and time;
- refused with nothing deleted: a changed file, the register, a secret in a mixed batch, `..`,
  a path outside its mapping, an unknown mapping, an empty job;
- user data deletes and comes back;
- a stop part way is journaled and undone;
- the ledger entry goes;
- journals and their backups are trimmed to `KeepBackups`;
- push still works after the refactor;
- the CLI: the dry run, a missing path stopping it, `--yes`.

Then the page, on a sandboxed copy of the manager on port 8021:
- ticking the folder under a `Washington` search ticked only the two Washington files;
- the folder showed part-ticked once the search was cleared;
- the modal listed both, with the PC-copy option;
- confirming deleted them, moved the PC copy, and the last action read "deleted 2 file(s)";
- user data stayed put without the extra tick;
- the register's and the secret's boxes were disabled;
- no console errors.

## Version 0.6.2, 07-Oct-2026: `--prune` Keeps One Project's GLB Folder an Exact Copy

**Asked by Adam.** Resyncing GLB models from SketchUp never purged the previous ones on the
server, so duplicate models and models of deleted SketchUp tags piled up. After each sync the
GLB folder must hold only that sync's GLBs, plus `00__Archive/` with one zip of the previous set.

**Why the engine had to change:** content is additive by design (Push never deletes it), so
a file the PC library drops stays on the server for ever.

**Changes (engine only; the app's behaviour is unchanged):**
- `compare` / `push` take `--prune <folder>` (repeatable) beside `--scope`:
  - the folder must be inside the scope and in the content lane (a `Content__*` folder);
  - its server-only files go to a new plan list, `content_prune` (printed `x`, "server only:
    deleted (--prune)"), instead of `content_server_only`;
  - a push deletes them like code deletes: each is backed up to
    `/srv/vale-sync/backups/<stamp>/` first, journaled as `deleted`, so `undo projects`
    puts them back. The conflict check covers them too;
  - the agent refuses a prune path that is not inside a named folder or not in the content
    lane, whatever the plan says.
- **Refused:** `--prune` without `--scope`, a folder outside the scope or not in the content
  lane, and a folder that is empty or missing on the PC (that would empty the server copy).
- `--report-file` carries `prune` and the `content_prune` counts and files.
- This is the **only** way content is ever deleted. `AllowDeletes` still governs code deletes
  only, and the app never passes `--prune`.
- Caller: the SketchUp ValeVision Cloud Sync plugin (0.5.1), which runs
  `push projects --scope ValeProjects__<yyyy>/<id> --prune ValeProjects__<yyyy>/<id>/ValeVision3D/Content__3dModel__GlbFiles --yes`
  after publishing a GLB sync.
- `NA__SERVER__VERSION`, `Vsm.PageVersion` and the PWA cache name are 0.6.2.

**Tested in a sandbox** (fake ssh running the agent against a folder, an isolated state folder
and ledger, a copied sync map; the plugin's publisher driving the engine end to end), 38 checks:
- **Run 1:** stale GLBs and an older archive on the server are pruned, and backed up. The
  server's GLB folder equals the PC's, zip included, byte for byte. Another project's
  server-only GLB and the user data are untouched.
- **Run 2:** an unchanged set prunes nothing.
- **Run 3:** a dropped model is pruned.
- **Undo:** `undo projects` restores it.
- **Refused with no session:** no scope, the scope itself, a shared or user-data folder, outside
  the scope, `..`, an empty PC folder.
- **The agent alone** refuses crafted plans that prune a record, another project's GLB or a
  user-data file.
- **After 0.7.0:** run again on the merged engine (0.7.0's `trim_journals` / `mode_delete`), and
  still 38 / 38.

## Version 0.6.1, 07-Oct-2026: Adding an App Route Picks a Real App; Clear Route Errors

**Asked by Adam.** "+ App route" made a row pointing at `AppAssets__CommonApplicationAssets` with an
empty path, and Save answered "app99263: the path is empty". Then: route the new
`Vale__ValeVision__TheiaVideoPlayer` at `/theia/` with API port 8005, and follow the rename of
`Vale__Help` to `Vale__ValeVision__Help`.

**Changes:**
- **+ App route:**
  - re-reads the mirror's folders first, so a folder made a moment ago is offered;
  - picks the first `Vale__` app folder without a route, never `AppAssets__` or the project
    library;
  - suggests the path from the folder name (`Vale__ValeVision__TheiaVideoPlayer` →
    `theia-video-player`), so Save is never blocked by a blank path;
  - takes the lowest free API port;
  - puts the cursor in the path, selected, ready to type over.
- **Route errors name the route as people see it:** `/help/: …`, or "The new app route to
  Vale__X: type its short path (lowercase, e.g. theia) or remove the row". Never the internal Id.
  A clash reads "two routes use this path".
- **Routes and mappings:**
  - `/theia/` → `Vale__ValeVision__TheiaVideoPlayer`, port 8005, API proxy off until the app has an
    API; new sync mapping `theia`;
  - `/help/` and the `help` mapping → `Vale__ValeVision__Help`.

  Saved, not applied: Test, then Apply in tab 03.

## Version 0.6.0, 06-Oct-2026: One-Project Syncs (`--scope`) for the SketchUp Cloud Sync

**Asked by Adam.** The SketchUp ValeVision Cloud Sync plugin drops Cloudflare R2. It should
collect its exports into the Project Library locally, check them, then run "a version of the
sync script from Vale Virtual Server, just for the ValeVision project being pushed".

**Changes (engine only; the app's behaviour is unchanged):**
- `Na__Engine__Compare(cfg, ids, deep, scope="")`: `scope` is one folder inside the single
  chosen mapping, e.g. `projects` + `ValeProjects__2026/64135__Washington`.
  - Both scans are filtered to it, so the plan, and so the push or collect built from it,
    holds only that folder's files.
  - The server agent is unchanged.
  - Paths stay relative to the mapping: `undo projects`, the journal and the ledger work as
    for any push of `projects`.
  - Refused: `..` or absolute scopes, scopes with two mappings, a files-only mapping.
  - The plan carries `scope`.
- CLI:
  - `compare` / `push` / `collect` take `--scope` and `--report-file <json>`;
  - the report holds the plan counts, the file lists (500 a list at most), the result and
    any error, gateway refusals included;
  - the printed plan names the scope.
- `NA__SERVER__VERSION` and `Vsm.PageVersion` are 0.6.0.

**Tested in a sandbox** (fake ssh that runs the agent locally, a copied sync map, an isolated
state folder and ledger), 19 checks:
- a scoped compare lists only that project's files;
- a scoped collect brings that project's newer record and user data, and leaves the other
  project's PC files alone;
- a scoped push sends that project's GLB, and **not** the other project's newer record or
  new image;
- the ledger is keyed by the full server path;
- a second push has nothing to do (no session);
- `undo projects` reverses the scoped push;
- the refusals above;
- an unscoped compare still sees both projects.

The plugin's own end-to-end sandbox (30 checks, through this engine) is in its DEVLOG.

## Version 0.5.0, 06-Oct-2026: Reset and Sign Out on the Server; Pushes Keep Users' Passwords

**Asked by Adam.** Sign-ins used to last a month. Keep devices signed in for good, and let him sign
people out or reset a forgotten password from tab 04: a button and an "are you sure" dialog. He
must never be able to see anyone's password. Then: line the Reset buttons up on the right.

**Changes:**
- **Tab 04:**
  - **Reset** (Password column, now flush right so the buttons line up) and **Sign out** (new
    Sessions column) open a dialog: "Are you sure you want to reset Steve Burkin's password?" (it
    names the temporary password), or "...sign Steve Burkin out everywhere?". Confirming runs a job
    on the server at once. The toast reports the result.
  - The old "Reset, then Save, then push" is gone.
  - Sessions shows the last forced sign-out. Reloading keeps unsaved edits but refreshes the
    password and sign-out fields.
- **Engine:**
  - `Na__Users__ServerAction(cfg, code, "reset" | "signout")`: the hash is made on the PC. Agent
    mode `users` changes only that person's password and `ValeUser__Session__SignedOutDate` in the
    live register, under the sign-in API's lock file (`.UserAccountData__Register.lock`), and
    keeps the old register in `/srv/vale-sync/users/`. The PC copy then takes the server's file
    exactly, with its time ("in step"), or merges the server's fields into unpushed edits
    ("merged").
  - **Pushes of the register merge:** the agent keeps the server's password and sign-out fields
    (`kept_server` in the result), except a temporary password the PC re-made for a new first name.
    Before this, pushing an older PC copy silently put back passwords people had changed on the
    server.
  - CLI: `user-reset USR… --yes`, `user-signout USR… --yes`.
  - `Na__Users__Commit(cfg, users)` no longer takes `resets`. New records carry the sign-out field.
- **Local server:** jobs `/api/op/user-reset` and `/api/op/user-signout` (`{code}`), serialised
  with saves.
- **Sign-in (`Server__Api/Api__Shared`, 1.1.0; push `server-api` and restart the APIs):**
  - no server-side age limit;
  - the cookie asks for 400 days (Chrome's ceiling) and `/api/accounts/me` renews it on every
    visit;
  - the sign-out stamp is in the session fingerprint. It is empty for most users, so sessions
    issued before 1.1.0 stay valid;
  - password changes write the register 0660.
- **Login card** (`ValeShared__UserLogin__.js` 1.1.1; push `commonassets`): "You stay signed in on
  this device until you sign out."

**Tested in a sandbox** (synthetic users, fake ssh that runs the agent locally, the real Flask
blueprint), 43 checks:
- Sessions: a 400-day cookie; `/me` renews it; a session issued 100 days ago is still accepted.
- Sign out: ends that person's device sessions and nobody else's; their password still works. The
  PC copy ends byte-identical to the server's, with its time, and Compare shows nothing to move.
- Reset: ends every session, the old password fails, and the temporary password signs in and must
  be changed.
- Push merge: a PC edit and a rename reach the server; Bob's own password set on the server
  survives; a forced sign-out survives; the note stays the last field; collect then brings the
  merged copy back.
- Unpushed PC edits survive an action (merged).
- Refused: a user not on the server yet, an unknown action, an unknown code.
- No hash in the action result or the tab 04 payload.

**In the browser (sandbox manager on 8021, 1900 px wide):**
- all five Reset buttons end at the same x;
- both dialogs read as above;
- Reset turned Bob's row to `Vale1982Bob temporary` with a sign-out time;
- Sign out showed "Alice Tester is signed out on every device";
- resetting an unpushed user showed "USR00000005 is not on the server yet: push useraccounts
  first".

## Engine Fix (No UI Change), 06-Oct-2026: The X-Accel Location Wins Over the Deny Rules

**Found at the ValeVision 3D go-live.** The internal location was `location ~ ^/_internal/(.+)$`, a
regex placed after the `UserData` deny regex. nginx tries regexes in order, so every private file
an API streamed (X-Accel-Redirect) matched the deny rule first and came back 404. The PC dev
server doesn't apply the deny rules to internal redirects, so local tests passed.

**Change:** `location ^~ /_internal/ { internal; alias /srv/vale/; }`. The `^~` prefix stops the
regex search, so the deny rules never see it, and `internal` keeps it unreachable from outside.
Applied 15:57 UTC, hash `6be3e167b035`.

## Engine Fix (No UI Change), 06-Oct-2026: nginx File Types for .mjs and Friends

**Found by Adam:** the Gallery → ValeVision 3D click-through failed. nginx 1.24's `mime.types`
has no `mjs`, so `clipper2-js.mjs` came back as `application/octet-stream`, and browsers refuse
to run a module served that way.

**Change:** the generated site body now has `include /etc/nginx/mime.types;` followed by
`types { application/javascript mjs; application/manifest+json webmanifest; model/gltf-binary glb;
model/gltf+json gltf; }`. A `types` block replaces the inherited table, so the full table comes first.
Applied 14:28 UTC, hash `8c7a7ce339c7`.

## Engine Fix (No UI Change), 06-Oct-2026: Server Agent Umask 002

**Found while pushing the users register.** The server agent unpacks with tar `filter="data"`,
which strips group-write: the register arrived as 640 instead of the planned 660. The APIs (user
`valeapp`, group `vale`) save by writing a temporary file and renaming it, so they need a
group-writable **folder**, not file. Every folder in the library and `Server__UserAccountData` was
already 2775 group `vale`, so nothing was broken.

**Change:** the agent now sets `os.umask(0o002)` at start, so any folder a push, seed or collect
creates on the server is 775 and inherits group `vale` from its setgid parent. File modes are
unchanged.

## Version 0.4.5, 06-Oct-2026: Route Card Actions, Remove Confirmation, Action Icons

**Asked by Adam.** Place the Open button better, confirm before deleting, and use SVG icons for
the simple actions.

**Changes:**
- **Icons** in `01__AppAssets/Icons/` (Lucide shapes, ISC licence): `Delete__Trash`, `Open__Website`
  (globe), `Add__Plus`, `ShortLink__Chain`. They are drawn as CSS masks (`.Vsm__Ico.is-*`), so they
  take the button's text colour.
- **Route cards:** Open (globe) now sits beside Remove (trash) at the right of each card's top line,
  out of the example row; its tooltip shows the full URL. Remove turns red on hover.
- **Remove asks first:** a dialog shows the public URL and where it goes, explains that nothing
  changes until Save and Apply (and that Revert undoes it), with Cancel / Remove.
- The toolbar's App route and Short link buttons use the plus and chain icons.

**Tested on the real manager:** Cancel keeps all 5 routes and the page stays "Live on nginx";
Remove takes the list to 4 and marks it unsaved; Revert brings back 5, still live. Icons load
(200, image/svg+xml) at 14 × 14 px.

## Version 0.4.4, 06-Oct-2026: Created and Last Synced Columns; Routes in Port Order

**Asked by Adam.** Add a latest sync time column and a date created column to the explorer, and make
the table fill its card. List the URL routes in port order (8001 first), moving when a port changes.

**Changes:**
- **Explorer columns:** Name / Status / Size / **Created** / Modified / **Last synced**, all sortable.
  - *Created* is the PC copy's creation time (Windows keeps it). Server-only items show blank:
    Linux Python 3.12 does not expose a creation time.
  - *Last synced* is when the manager last pushed (↑) or collected (↓) the file. A folder shows
    the latest file inside it. The detail panel shows both.
  - The Name column stretches (`minmax(max-content, 1fr)`), so the rows fill the card.
- **Sync ledger** `01__AppData/VirtualServerManager__SyncLedger__.json`: written by the engine after
  every successful push (added, replaced; deleted entries are dropped) and collect, so the CLI
  records it too. Keyed by server-root path: `{path: [epoch, "push" | "collect"]}`. It starts empty:
  files pushed before 0.4.4 show no time until their next push or collect.
- **URL configurator:** app routes are listed by API port, then the short links. Changing a port moves
  its card when you leave the field. Display only: the routes file and the generated nginx keep
  their order, so a reorder never makes the routes look "not live".

**Tested on the real manager (1700 wide):** header and rows 888 px in an 888 px card; a test ledger
showed `index.html` pushed and a folder rolling up a collected file, both sorted; the gallery route
(8001) listed first, and moved to the end when its port was set to 8009 (reverted, never saved).

## Version 0.4.3, 06-Oct-2026: Content-Sized, Centred Tabs; One Sort System

**Asked by Adam.** The tables were far larger than their content: the explorer was a full-screen
box with three short rows. Tabs should be only as wide as they need to be and grow with their rows,
except the users table. They should be centred. Every table should sort the same way.

**Changes:**
- **Layout:**
  - each tab is one centred column, as wide as its widest part, so the toolbar spans the content
    below it;
  - tab 04 keeps the full width (`.Vsm__Panel.is-wide`);
  - the bodies of tabs 01 to 03, and the tab 02 cards, are sized by `max-content`;
  - long file lists scroll inside their card instead of widening it;
  - no minimum heights: tables grow with their rows up to the screen height, then scroll.
- **Explorer:**
  - rows became subgrid rows, so Name / Status / Size / Modified are real columns sized to their
    widest entry;
  - on screens 1300px and wider the tree is at least 860px wide, so opening a folder does not
    re-centre the page.
- **Text boxes** (route paths, notes, server paths, user names and emails) use
  `field-sizing: content` in Edge and Chrome, so nothing is truncated.
- **One sort system** in `Ui__Core__`:
  - `SortState` / `SortToggle` (remembered per table), `SortHead` (header attributes),
    `SortValue` (numbers, sizes such as "1.2 MB", dates such as "06-Oct-2026", text) and
    `SortCompare` (blanks last in both directions);
  - one header style, `.Vsm__SortTh` with ↕ / ▲ / ▼;
  - used by the explorer (folders stay above files; Status sorts most urgent first), the users
    table, and every `.Vsm__Table` in a dialog (push, collect, nginx apply, server status). The
    server status lane table gained a header row, and now lists the project-data lane too.

**Also (06-Oct, later):**
- The activity panel heading is now just "Server connections". The UI never names the assistant;
  the shared connection log and lock are unchanged.
- New mapping `commonassets` (`AppAssets__CommonApplicationAssets`, web, code lane). It leaves out
  `NOTUSED__*`, `*.graphite`, `RawIcons__DoNotUse/` and `01__MockUps/`; `.psd` and `.zip` are left
  out by the web rules.

**Tested at 2000 × 1100 on the real manager:**
- explorer 860 × 305 (was about 1640 × 870);
- matrix cards 901 wide; route cards 1124 wide;
- tabs 01 to 03 centred (equal margins, toolbar aligned with the content), tab 04 full width;
- a long email now fits its box;
- sorting in the explorer (every column), the users table and a dialog table: sizes by unit,
  numbers by value, blanks last.

## Version 0.4.2, 06-Oct-2026: Departments, Technical Managers

**Asked by Adam:** add the technical managers (Nick as Management, at number 5), and a department
for everyone.

**Changes:**
- **New field `ValeUser__Employee__Department`** (stored after the email). Its options are the
  register's new `DepartmentOptions`: Sales, Concept, Technical, Production, Directors, IT and 3D
  Visualisation.
  - The value must come from that list, or be blank.
  - Older records without it load as blank.
  - In tab 04, Department is a select column (sortable and searchable), and `engine users` prints it.
- **Register** (renumbered a second time, still before any push or use):
  - Nick Ferguson is `USR00000005`, and everyone from the old 05 moved up one.
  - Richard Bainborrow, Craig Mitchell and Stephen Eastman are 29 to 31 (Technical Manager,
    Employee).
- **Departments:**
  - Sales: the designers, Valerie Fedorson and Alicia Harman;
  - Concept: the concept artists;
  - Technical: the technical managers and the office administrators;
  - Production: Ollie Brendon;
  - Directors: the directors;
  - IT: Shane;
  - 3D Visualisation: Adam.

  George Lucas (Marketing) is left blank, with a note: Marketing is not in the list.

  31 users in all. Every temporary password was checked against Werkzeug.

**Tested:**
- in a sandbox copy: saving with a department change and a new user (no department key) works, the
  field order is right, and an unknown department is refused;
- on the real manager (no save): the column, its options and sorting.

## Version 0.4.1, 06-Oct-2026: Sortable Users Table, 27 Users

**Asked by Adam:** sortable columns in tab 04, codes renumbered, and the rest of the office added.

**Changes:**
- **Sorting.** Click a column header to sort ascending, again for descending (▲ / ▼):
  - Permission sorts by rank, and Created by date;
  - blanks sort last both ways;
  - the choice is remembered on this PC;
  - only the display is sorted. The engine now always saves the register in code order.
- **Register:**
  - **Renumbered once:** James Watchorn is `USR00000003` and Jamie Taylor `USR00000004`, then the
    directors, then everyone else in their previous order, then the new people in Adam's order.
    This was safe only because nothing had been pushed and no config or content carried a code.
    From now on, codes are permanent.
  - **New roles:** Manager and Marketing.
  - **New users:**
    - directors Jamie Taylor, Simon Morton and Lisa Morton (Management);
    - George Lucas (Marketing);
    - managers Ollie Brendon and Valerie Fedorson (Management);
    - administrators Angela Spong, Laura Watchorn, Evie English, Grace Frisby and Alicia Harman
      (Employee).

    27 users in all. Every temporary password was checked against Werkzeug.

**Tested on the real manager (sorting only, nothing saved):** every column both ways, blanks last,
rows still tied to the right person, and the restart into 0.4.1 through the endpoint.

## Version 0.4.0, 06-Oct-2026: User Accounts, Server__ Hidden, Restart Flag

**Why.** The apps are moving to the server, and user-generated content and per-app user configs need
one register of people to hang off. Adam asked for:
- a user accounts JSON in his naming style;
- the designers and concept artists from the legacy Gallery and the ValeVision 3D email tool;
- a permanent `USR` + 8-digit code per person (`USR00000001` = Adam);
- roles and five permission levels;
- an active flag;
- a temporary password built from the first name (the rule is kept only in the git-ignored
  register).

He also wanted `--restart` so code changes are picked up without hunting for the old process.

**Changes:**
- **Register:** `Vale__VirtualServer\Server__UserAccountData\UserAccountData__ValeUsers__Register__.json`.
  - Header keys `UserAccountData__ValeUsers__*`: roles, permission levels, temporary-password rule,
    last issued code. Records use `ValeUser__*` fields.
  - Written by the engine in Adam's aligned JSON style.
  - Passwords are stored only as Werkzeug-compatible `pbkdf2:sha256` hashes, verified with
    `werkzeug.security.check_password_hash`, plus `IsTemporary` / `SetDate`.
- **Per-app user configs:**
  `Server__UserAccountData\UserData__UserAppConfigs\<App>\UserConfig__<USR code>__<App>__.json`.
  Folders were created for ValeVision3D, ValeVisionGallery, ValeSpec and LanternDesigner. They are in
  the user-data lane.
- **Engine `Na__Users__*`:**
  - Load, Validate, Save (atomic; the last 30 previous copies are kept in
    `90__ServerBackups\UserAccounts__History`);
  - Commit issues codes, dates and hashes, never deletes users, and re-hashes on reset or when a
    temporary user is renamed;
  - AppConfigs and Payload (no hashes);
  - the `users` CLI command.
- **Tab 04 User accounts** (`Ui__Users__.js`): an editable table, Reset, search, the inactive
  filter, permission levels, file paths and server state. It uses the tab 03 pattern: no rebuild
  while typing, Save always resolves, Enter saves.
- **nginx:** one `location ^~ /Server__` rule replaces the two named denies, so every `Server__`
  folder is hidden. Apply also checks `/Server__UserAccountData/` returns 404.
- **Push guard:** a private `Server__` folder (anything other than Api and DeveloperTools) is never
  pushed or seeded until the applied nginx record carries that rule. Account files are uploaded
  `0660`.
- **Sync map:** new mapping `useraccounts` (kind server, default lane shared, never deletes,
  `*.example` excluded).
- **ValeCodebase `.gitignore`:** `WebApps/Vale__VirtualServer/Server__UserAccountData/`.
- **Restart:**
  - `-r` / `--r` / `--restart` and `--stop` on the local server, plus `POST /api/shutdown`
    (localhost, header-guarded, refused while busy);
  - an older copy is ended by PID;
  - a new `Restart__VirtualServerManager__8020__.bat`, and `--restart` on the console launcher;
  - the version banner now says whether to reload the page or restart the server.

**Seeded users (16):**
- Adam and Shane: AppAdmin.
- Designers (Employee): Andy Moth, Dan Featherstone, Gary Hood, James Watchorn, Martin Stevens,
  Steve Burkin, Tom Ramsden, and Sharon and Ted (inactive: no surname or email in the address book).
- Concept artists (Employee): Amy Everest, Anna Lacey, Jo Millward, Rachael Ellis, Steph Jameson.
- Each role is the one credited most often in the Gallery projects. Open questions sit in each
  record's Note.

**Tested:**
- **On this PC:** every temporary password verifies with Werkzeug, and the wrong case is rejected.
- **In a sandbox on port 8023:**
  - the page never receives hashes;
  - add user (code `USR00000017` issued, email lower-cased);
  - reset and rename re-hash only those users;
  - errors are listed for a blank name and a duplicate email;
  - remove (new rows only), the filters and revert work;
  - the history copy is written;
  - lanes: the register is shared, configs are user data;
  - the push guard holds before the nginx rule is applied and clears after;
  - restart works three ways: an older copy ended by PID, the new copy shut down cleanly, and a
    foreign program on the port left alone.
- **On the real manager:** `Restart__VirtualServerManager__8020__.bat` brought up 0.4.0.

## Version 0.3.1, 06-Oct-2026: URL Configurator Fixes, One Server Only

**Reported by Adam.** In tab 03, changing `gallery` to `project-gallery` and `lanterndesigner` to
`lantern-designer`: the page looked frozen and Save never resolved.

**Causes found:**
- **The cards did not redraw while typing.** The example URL and API path kept the old path, so the
  edit looked stuck. A blur or change also rebuilt every card, which could swap a field out from
  under the cursor.
- **Save failed silently.** Any reply that was not clean JSON (an older server, a dropped
  connection) rejected the promise with no message, leaving the button doing nothing.
- **The server reported "0.2.0" while running 0.3 code**, so a stale server could not be detected.
- **Two copies on port 8020.** On Windows, Python's `HTTPServer` sets `SO_REUSEADDR`, so a second
  launch (the console .bat while the silent one ran) bound the same port and requests went to
  either copy at random.

**Fixes:**
- Typing updates each card's derived text (example URL, length, Open link, API path, entry check)
  without rebuilding fields. Cards are rebuilt only on load, save, revert, add and remove.
- **Save:** shows "Saving…", is blocked while running, always ends with a toast and the error
  list, and Enter saves.
- **`Vsm.Post` always resolves**, with `{ok:false, error}` for HTTP errors, non-JSON replies and
  network failures. Every caller now reports problems.
- **Versions:** the page carries `Vsm.PageVersion`, and the server reports `NA__SERVER__VERSION`
  (both 0.3.1). A banner asks for a restart when they differ.
- **Exclusive port bind** (`SO_EXCLUSIVEADDRUSE`, no reuse on Windows): a second copy exits with
  "Port 8020 is busy".
- **The console launcher** checks the port first and only opens the app if the manager is already
  running.

**Tested:**
- in a sandbox: live redraw while typing, Enter-to-save, the stale banner, the "cannot reach the
  manager" error, and a second copy refused;
- Adam's two route changes saved on the real manager (not applied).

## Version 0.3.0, 06-Oct-2026: Projects Master Library, Two-Way Project Data, URL Configurator, Live

**Why.** Adam set a new project schema: one `Vale__Projects__MasterLibrary`, with one folder per
project shared by every app.
- `ProjectData__<code>__<Name>__.json` replaces the hundreds of identical `project.json` files.
- Per-app `Content__*` and `UserData__*` buckets sit inside each project.

He also wanted short public URLs, with queries per project and tiny QR short links, managed in the
app.

**Changes:**
- **Fourth lane, *Project data* (`shared`):** two-way, newer wins, never deleted.
  - Mappings gain `DefaultLane` (`code` or `shared`).
  - New mapping `projects` (`Vale__Projects__MasterLibrary`, default `shared`, `*.example` excluded).
  - `Content__*` and `UserData__*` were added to the lane patterns.
  - Data lanes keep their lane all the way down; inside code or shared folders, a lane-named folder
    switches lane.
  - Snapshot now includes project data.
  - `*.lock` added to NeverSync.
- **Tab 03, URL configurator** (`Ui__Urls__.js`), with routes in
  `01__AppData/VirtualServerManager__UrlRoutes__.json`:
  - **app routes** (path → app folder / entry; queries pass through; optional API proxy);
  - **short links** (`{placeholders}` → redirect);
  - validation, URL length shown, and a generated-nginx preview.
- **nginx from the engine:**
  - `routes` renders the site body: root `/srv/vale`, denies, `/_internal/` X-Accel, routes, short
    links;
  - `nginx-test` runs `nginx -t` on a full copy of `/etc/nginx`;
  - `nginx-apply` backs up, installs `/etc/nginx/snippets/vale-site.conf`, wires the site file once,
    reloads, verifies (`/` = 200, `Server__*` = 404), and restores on any failure;
  - `nginx-status` reports the live state.
- **The UI** shows the project-data lane in the matrix and explorer, and the default lane in Edit
  mapping.

**Live, 06-Oct-2026 (approved by Adam):**
1. `prepare-root` created `/srv/vale` and `/srv/vale-sync`.
2. The landing page ("edit 2 - 06-Oct-2026") was pushed.
3. nginx-test, then nginx-apply (hash `a7054f37ef23`):
   - `/` 200 through Cloudflare, with `no-cache`;
   - `/Server__Api/` and `.md` files 404;
   - routes `/valevision/`, `/valespec/`, `/lanterndesigner/`, `/gallery/` live (404 until the apps
     are pushed).

Five connections, all clean.

**Tested on this PC first:**
- the two-way lane on a copy of the library: server edit collected, later PC edit pushed, full
  parity;
- route validation, and the site-file wiring against Shane's live config (idempotent);
- the tab 03 UI.

## Version 0.2.0, 06-Oct-2026: Lanes, Live Explorer, Installable App

**Why.** Apps now hold three kinds of files that must move different ways:
- source code, which Adam pushes;
- heavy content (for example SketchUp / ValeVision exports per project), also pushed from the PC;
- user content and configs made by other people on the server, which must be collected back to the
  PC.

Adam also wanted to see the Linux side live, and to launch the tool from the Start menu with its
server already running.

**Changes:**
- **Three lanes** (code / content / userdata) replace v0.1's "protected" folders:
  - lanes come from folder-name patterns (`LanePatterns`) or each mapping's *Content* and
    *UserData* lists, and are inherited by sub-folders;
  - **Push** sends code (as a mirror) and content (newer wins);
  - **Collect** brings user data down (newer wins). The PC copies it replaces are kept in
    `90__ServerBackups\collect__<date>`. With *with content* it also brings server-only and
    server-newer content;
  - conflicts (a newer copy on the "wrong" side) are listed and skipped unless forced;
  - Seed and Snapshot now work on the user-data lane.
- **One parity rule** (`Na__Parity__Verdict`) drives Compare and the explorer.
- **Live explorer** (Tab 01):
  - the agent's `watch` mode streams the server tree over ONE held ssh connection;
  - the gateway lock is held only for the login;
  - the PC mirror is rescanned every 10 s;
  - `Na__Engine__Annotator` labels about 20k paths in 0.2 s;
  - it hangs up after 90 s unwatched, backs off on drops, and stops on failed logins.
- **PWA:**
  - manifest, service worker and icons (PNG, maskable, ICO, drawn in the Vale palette);
  - a silent start-up launcher (`pythonw`, `--silent --log-file`);
  - a Startup-shortcut installer.
- **UI** split into Core / Explorer / Matrix modules. The CLI's `sync` became `push` and `collect`.

**Testing.** Everything was tested on this PC against a fake server:
- every lane, both directions, conflicts, force options, seed, snapshot;
- live updates (a file created on the "server" appeared as ↓ collect within 5 s);
- every UI dialog.

The service worker did not register inside Claude's embedded browser, where the script loads fine
but registration fails. Check the install in Edge or Chrome.

## Version 0.1.0, 06-Oct-2026: First Build

**Why it exists.** Deploying through GitHub meant pushing everything, then pulling and building on
the server. Adam wants to choose exactly which folders go to the VPS, and to see each PC folder
beside its Linux path. `WebApps\Vale__VirtualServer` becomes the server root itself, so Windows and
Linux keep the same layout. Apps move into it one at a time.

**What was built:**
- the sync engine: mappings, compare, sync with server-side backup, undo, seed, backup, status,
  prepare-root;
- the shared one-connection gateway;
- the local UI on `127.0.0.1:8020`.
