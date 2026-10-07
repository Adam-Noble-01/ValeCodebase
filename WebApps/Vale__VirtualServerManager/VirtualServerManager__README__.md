# Vale Virtual Server Manager

An installable app (PWA) that keeps the Vale VPS (`app.valegardenhouses.com`) and
`WebApps\Vale__VirtualServer` on this PC in **two-way parity**, folder by folder, and shows the Linux
server live. It is PC-only: it lives next to the mirror, never inside it, and never syncs to the
server.

```
D:\10_CoreLib__ValeCodebase\WebApps\Vale__VirtualServer   ==   valevps:/srv/vale
├── index.html                                                ├── index.html
├── Server__Api\                                              ├── Server__Api/
├── Server__DeveloperTools\                                   ├── Server__DeveloperTools/
├── Server__UserAccountData\                                  ├── Server__UserAccountData/      (users register, tab 04)
├── AppAssets__CommonApplicationAssets\                       ├── AppAssets__CommonApplicationAssets/   (shared logos, icons)
├── Vale__Projects__MasterLibrary\                            ├── Vale__Projects__MasterLibrary/   (every project, every app)
├── Vale__LanternDesigner\                                    ├── Vale__LanternDesigner/
├── Vale__ValeSpec\                                           ├── Vale__ValeSpec/
├── Vale__ValeVision3D\                                       ├── Vale__ValeVision3D/
└── Vale__ValeVisionGallery\                                  └── Vale__ValeVisionGallery/
```

## Install

1. Double-click **`Install__VirtualServerManager__WindowsStartUp__Shortcut__.bat`**. It:
   - puts a shortcut to the silent launcher in your Startup folder, so the local server starts at
     every sign-in, hidden, on port 8020;
   - starts the server now;
   - opens <http://127.0.0.1:8020/>.
2. In Edge or Chrome, click **Install app** in the address bar. *Vale Virtual Server* is then in the
   Start menu, and opens as its own window.
3. To remove the start-up shortcut: `Install__VirtualServerManager__WindowsStartUp__Shortcut__.bat remove`.

| Launcher | Use |
|---|---|
| `Start__VirtualServerManager__WindowsStartUp__Silent__8020__.bat` | Hidden start for the Startup folder. Skips if port 8020 is already running. Logs to `VirtualServerManager__Startup.log` |
| `Start__VirtualServerManager__Localhost__8020__.bat` | Console start with live logs, for debugging. If the manager is already running it only opens the app; `--restart` (or `-r`) replaces the running copy |
| `Restart__VirtualServerManager__8020__.bat` | **After code changes.** Stops the running copy and starts it again silently, then reload the app page |

**Restarting.** `python VirtualServerManager__LocalServer__.py --restart` (or `-r`, `--r`):
- checks that the program on the port really is this manager;
- refuses while a push, collect or users save is running;
- asks it to stop (`POST /api/shutdown`; a copy older than 0.4.0 is ended by PID);
- waits for the port, then starts.

`--stop` stops it and exits. The page's version banner says whether to reload the page or restart
the server.

It needs:
- Python 3.10 or later; nothing else is installed;
- the Windows OpenSSH client;
- the key loaded in the ssh-agent (`ssh-add %USERPROFILE%\.ssh\id_ed25519`);
- the `valevps` alias in `%USERPROFILE%\.ssh\config`.

## Four Lanes: What Moves Which Way

Inside every mapped folder, each sub-folder belongs to one lane. The lane comes from the folder's
name, the mapping's lists, or else the mapping's **default lane**: *Source code* for apps, *Project
data* for the Projects Master Library. Heavy-content and user-data folders keep their lane all the
way down.

| Lane | Direction | Rule | Typical folders |
|---|---|---|---|
| **Source code** | PC → server (**Push**) | Exact mirror: adds, replaces, and deletes files removed from the PC (the delete needs a tick) | Everything not in a data lane |
| **Heavy content** | PC → server (**Push**) | Additive, **newer wins**. A newer server copy is a conflict and is skipped unless you tick *overwrite*. Server-only files can be brought down with *Collect with content* | `Content__*` (the project library's buckets), `*__ProjectContent*`, `*__HeavyContent*`, `*__Content`; the mapping's *Heavy content* box. For example, SketchUp / ValeVision exports per project |
| **User data** | server → PC (**Collect**) | Additive, **newer wins**. Never pushed and never deleted. A newer PC copy is a conflict and is skipped unless you tick *overwrite*. PC-only files can be added once with **Seed** | `UserData__*` (the project library's buckets), `*__UserData*`, `*__UserConfig*`, `*__User*Content*`, `*__ProjectData*`, `*__ServerData*`, `*__Revisions*`, `*LocalUserData*`, `*LocalProjectData*`; the mapping's *User data* box |
| **Project data** | **both ways** | **Newer wins either way.** Push sends the PC's newer copy; Collect brings the server's. Never deleted | The project library's default: `ProjectData__<code>__<Name>__.json`, written by both the PC tools and the apps |

**Content made on the server** (`ServerMadeContent` in the sync map, folder names; since 0.8.0
`ValeVision__TheiaVideo`): ValeVision Theia writes its videos and posters into `Content__` folders on
the server, so the PC never has them first. Content under such a folder stays in the heavy-content
lane (a newer PC copy still pushes), but a server-only or server-newer file is **collected by every
Collect**, with no *Collect with content* tick. It shows as ↓ "made on the server: collect" on the
card, in the explorer and in the Collect dialog. A forced push never overwrites it, and `--prune`
refuses such a folder. Other server-only content (for example superseded gallery images) still
waits for the tick.

So:
- source code and heavy content go **up**;
- user content and user configs made by other people on the server come **down**, and so do
  Theia's videos and posters;
- the project record goes whichever way is newer;
- nothing outside the code lane is ever deleted by a sync (only by a delete you name in tab 01,
  or the SketchUp sync's `--prune`);
- every file replaced on either side is kept first. On the server it goes to
  `/srv/vale-sync/backups/<stamp>/` (used by *Undo last push*); on the PC it goes to
  `90__ServerBackups\collect__<date>\`.

## The Four Tabs

**Layout and sorting.**
- **Tabs 01 to 03** are centred, and only as wide as their content. Columns fit their widest entry
  and text boxes fit their text.
- **Tab 04** (the users table) uses the full width.
- **Every table grows with its rows**, and scrolls only past the screen height.
- **Every table sorts the same way:** click a column header to sort, again to reverse (▲ / ▼). Blanks
  stay last. The explorer and users tables remember your choice; the dialog tables (push, collect,
  apply, server status) sort while open.

**01 Live server explorer:**
- the server's `/srv/vale` tree, live (it updates every few seconds over one held connection);
- every file and folder marked against this PC: ✓ in sync, ↑ push, ↓ collect, ! conflict,
  × delete, server only, PC only, not synced;
- lane badges, with folders rolling up what is inside them;
- search, *Differences only* and lane filters;
- sort by Name, Status (most urgent first), Size or Modified; folders stay above files;
- a detail panel with both paths;
- **Pause live** hangs up. Leaving the tab hangs up after 90 seconds.
- **Delete from the server** (0.7.0):
  - tick files in the first column. A folder's box ticks every deletable file inside it that the
    search and filters show (search `Washington`, tick the folder: only the Washington files);
    Shift ticks a range;
  - then **Delete from server…** in the toolbar, or the detail panel's button for the selected
    file or folder;
  - a modal lists every file (lane, status, size, modified) and asks first. User data and project
    records need an extra tick. Files also on this PC can be moved to
    `90__ServerBackups\deleted__<time>\` with one tick, or a push would send them back;
  - each file is backed up on the server and the delete is journaled: **Undo last push** on that
    mapping (tab 02) restores them. Folders are kept;
  - the users register, files left out of sync (secrets, docs, scripts) and unmapped files cannot
    be ticked, and the server refuses them too. If any file changed since the explorer showed it,
    nothing is deleted.

**02 Parity matrix:**
- one card per mapping, showing the PC path beside the server path (editable) and three lane rows;
- **Compare** (one connection) fills the lanes; **↑ Push** and **↓ Collect** apply exactly what you
  just compared;
- also *Undo last push*, *Seed user data* and *Snapshot user data* (a dated copy of the server's
  user data);
- mirror folders with no mapping are listed with a **+** to add them.

**03 URL configurator:**
- **App routes:** a short public path (`/valevision/`) serves an app folder's entry page. Queries
  pass straight through (`?project=64135`). An API proxy and port can be added per route.
- **Short links:** a tiny path with `{placeholders}` (`/p/{project}`) redirects to a full app URL
  (302 by default, so printed QR codes can be re-targeted). Each card shows the full URL and its
  length, because shorter means a smaller QR code.
- **Save** writes `01__AppData\VirtualServerManager__UrlRoutes__.json`.
- **Test on server** runs `nginx -t` on a copy of the live configuration and changes nothing.
- **Apply to nginx** backs up, installs `/etc/nginx/snippets/vale-site.conf`, reloads, checks
  `/` = 200 and `Server__*` = 404, and restores the previous files on any failure.
- The always-on rules (web root, denied paths) and the generated nginx are shown beside the routes.

**04 User accounts** (`Vale__VirtualServer\Server__UserAccountData\UserAccountData__ValeUsers__Register__.json`):
- **One row per person:** USR code, first name, surname, email, department, role, permission level,
  active, created date, password state, sessions (last forced sign-out), the per-app configs found
  for them, and a note.
  Departments and roles come from the register's own `DepartmentOptions` and `RoleOptions` lists.
- **Click any column header to sort** by it; click again to reverse. Blanks always sort last, the
  choice is remembered on this PC, and the file itself always stays in code order.
- **+ User** adds a row. **Save** (or Enter):
  - issues the next `USR` + 8-digit code and today's date;
  - hashes the temporary password from the register's rule (shown on the row so it can be handed
    over; the rule itself lives only in the git-ignored register).
- **Reset** (Password column) and **Sign out** (Sessions column) each ask "are you sure?", then
  change the **live server at once** (one engine job, no push):
  - Reset puts the person back on the temporary password and signs them out on every device;
  - Sign out ends every session on every device and keeps the password;
  - only that person's password and `ValeUser__Session__SignedOutDate` change, in the server's
    register, under the sign-in API's own lock. The server keeps the previous register in
    `/srv/vale-sync/users/` (the last 30);
  - the PC copy takes the same change. With no unpushed edits it becomes byte for byte the
    server's file, so Compare shows nothing to move. Unpushed edits are kept, with the server's
    password fields merged in;
  - Reset needs no unsaved edits (the temporary password follows the saved first name), and a
    user saved on the PC but not pushed yet cannot be reset or signed out.
- Renaming a user who is still on a temporary password re-hashes it to match the new name.
- **A push of the register keeps the server's password and sign-out fields** for each person:
  passwords people set themselves, resets and sign-outs. The only exception is a temporary
  password the PC re-made because the first name changed. After such a merge the server's copy is
  newer: collect it.
- **Sessions last until signed out.** The apps' cookie is renewed on every visit; Sign out, Reset,
  a new password or unticking Active end it.
- **Users are never deleted:** untick Active. Only an unsaved new row can be removed.
- **Save validates the whole register:**
  - unique codes and emails;
  - names;
  - roles and levels from the register's own lists;
  - at least one active AppAdmin.

  It then writes the register atomically, keeping the previous copy in
  `90__ServerBackups\UserAccounts__History\` (the last 30).
- **Password hashes never reach the page.** They use Werkzeug's `pbkdf2:sha256` format, so the
  Flask APIs check them with `check_password_hash`.
- The side panel shows the permission levels, the file paths, and whether the folder can be pushed
  yet: never before the applied nginx hides every `Server__` folder.

Header: connection state (key loaded, cooldown, logins in the last 10 minutes) and live server
stats (load, memory, disk, nginx, uptime). *Server status* gives the full report.

## The Rules It Enforces

- **One connection at a time, paced, with a cooldown after a failed login.** The lock and the log
  are shared with Claude's `vps.py`, so the app and Claude never collide or trip fail2ban. The live
  explorer holds a single connection rather than reconnecting.
- **Only mapped folders sync.** Each mapping's server path stays inside the server root. A path that
  no longer matches the PC layout shows a *custom path* badge.
- **Secrets never sync** in either direction: `*.env`, `.dev.vars`, `*.--HIDDEN`, keys, `.git`,
  workspace files. A secret placed on the server by hand is invisible to sync.
- **Web folders leave out** `.md`, `.py`, scripts, archives and `6x__Dev`, `8x__Testing`, `9x__Dev`
  folders from the code lane, so they are never public. `Server__Api`, `Server__DeveloperTools` and
  `Server__UserAccountData` are *server only*: nginx hides every `Server__` folder
  (`location ^~ /Server__`).
- **A private `Server__` folder is never pushed** (and never seeded) until the last applied nginx
  carries that rule. Account files are never world-readable (the engine asks for `0660`; the server's umask makes it
  `0640`).
- **A push or collect refuses** if the files changed since Compare: compare again.

## Files

| File | Purpose |
|---|---|
| `VirtualServerManager__App__.html` | The PWA shell (four tabs) |
| `02__Src__AppModules/VirtualServerManager__Ui__Core__.js` | API, header, modals, settings, status, tabs, service-worker registration |
| `02__Src__AppModules/VirtualServerManager__Ui__Explorer__.js` | Tab 01: the live server explorer |
| `02__Src__AppModules/VirtualServerManager__Ui__Matrix__.js` | Tab 02: the parity matrix, push / collect / undo / seed |
| `02__Src__AppModules/VirtualServerManager__Ui__Urls__.js` | Tab 03: the URL configurator |
| `02__Src__AppModules/VirtualServerManager__Ui__Users__.js` | Tab 04: user accounts |
| `03__Style__AppStylesheets/VirtualServerManager__Styles__Main__.css` | Styles (Vale palette) |
| `01__AppAssets/` | App icons (PNG, maskable, ICO) |
| `VirtualServerManager__Pwa__Manifest__.webmanifest`, `VirtualServerManager__Pwa__ServiceWorker__.js` | Installable app; the shell opens even before the server is up |
| `VirtualServerManager__LocalServer__.py` | Local server on `127.0.0.1:8020`, plus the live-session manager. It refuses other hosts, and POSTs need `X-Vale-Manager: 1` |
| `VirtualServerManager__SyncEngine__.py` | The engine and command line (Claude uses this). It carries the server agent, sent over stdin, so nothing is installed on the server |
| `01__AppData/VirtualServerManager__SyncMap__.json` | The sync map: server, paths, mappings, default lanes, excludes, lane patterns |
| `01__AppData/VirtualServerManager__UrlRoutes__.json` | Public routes and short links, plus the last apply (hash, time, checks) |
| `90__ServerBackups/` | PC copies replaced by Collect, snapshots, and `UserAccounts__History/`. **Git-ignored**: never commit live data |

## Command Line

```bat
python VirtualServerManager__SyncEngine__.py check
python VirtualServerManager__SyncEngine__.py mappings
python VirtualServerManager__SyncEngine__.py compare lanterndesigner
python VirtualServerManager__SyncEngine__.py push lanterndesigner --yes [--allow-deletes] [--force-content]
python VirtualServerManager__SyncEngine__.py collect lanterndesigner --yes [--with-content] [--force-userdata]
python VirtualServerManager__SyncEngine__.py undo lanterndesigner
python VirtualServerManager__SyncEngine__.py delete projects ValeProjects__2026/64135__Holt/ValeVision3D/Content__3dModel__GlbFiles/Old.glb [--yes] [--pc]
python VirtualServerManager__SyncEngine__.py seed lanterndesigner
python VirtualServerManager__SyncEngine__.py backup
python VirtualServerManager__SyncEngine__.py status
python VirtualServerManager__SyncEngine__.py prepare-root
python VirtualServerManager__SyncEngine__.py routes          # validate + print the generated nginx body (no connection)
python VirtualServerManager__SyncEngine__.py nginx-test      # dry run on the server
python VirtualServerManager__SyncEngine__.py nginx-apply     # install, reload, verify, auto-restore
python VirtualServerManager__SyncEngine__.py nginx-status
python VirtualServerManager__SyncEngine__.py users           # list + validate the users register; says if it may be pushed yet
python VirtualServerManager__SyncEngine__.py push projects --scope ValeProjects__2026/64135__Washington --yes --report-file r.json
```

`push` and `collect` without `--yes` only print the plan.

**One folder only (`--scope`, 0.6.0).**
- `compare`, `push` and `collect` take `--scope <folder>`: one folder inside the single
  mapping given. The plan then holds only files under it, so nothing else moves.
- Paths stay relative to the mapping, so `undo projects`, the server journal and the ledger
  treat a scoped push like any other push of that mapping.
- `--report-file <json>` writes the plan (counts and file lists) and the result, gateway
  refusals included, for other tools.
- The SketchUp **ValeVision Cloud Sync** plugin (0.5.0) uses both. For one project it runs
  `collect projects --scope ValeProjects__<yyyy>/<id> --yes` before it touches the record,
  and the same `push` after publishing. The app need not be running: the engine shares its
  lock, cooldown and session log.

**One content folder kept exact (`--prune`, 0.6.2).**
- `compare` and `push` with `--scope` also take `--prune <folder>`: a `Content__*` folder
  inside the scope.
- Server files in it that the PC does not have are listed as `content_prune` and deleted by
  the push. Each is backed up on the server first, so `undo` restores them.
- It is the only way content is ever deleted. It is refused without `--scope`, outside the
  scope or the content lane, and when the PC folder is empty.
- The SketchUp plugin (0.5.1) prunes `<project>/ValeVision3D/Content__3dModel__GlbFiles` on
  every GLB sync, so the server holds only the latest GLBs and one `00__Archive` zip.

## On the Server

| Path | Purpose |
|---|---|
| `/srv/vale/` | The mirror |
| `/srv/vale-sync/staging/` | Uploads land here, then move into place |
| `/srv/vale-sync/nginx-backups/<stamp>/`, `nginx-applied.json` | The previous nginx files from each apply; the last apply's hash and checks |
| `/etc/nginx/snippets/vale-site.conf` | The generated routes (never edit on the server) |
| `/srv/vale-sync/backups/<stamp>/` | Files replaced or deleted by each push or explorer delete (the last 30 are kept) |
| `/srv/vale-sync/journal/<stamp>.json` | What each push or delete did (used by Undo) |
| `/srv/vale-sync/sync.log` | One line per push, undo, seed and collect |
