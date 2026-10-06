# Vale Virtual Server: The Mirror

**This folder IS the Linux server root** (`valevps:/srv/vale`, served by nginx at
`https://app.valegardenhouses.com/`). Keep its layout identical on both sides. Sync it with the Vale
Virtual Server Manager (`..\Vale__VirtualServerManager\`, also in the Start menu once installed).
This README never syncs, because `.md` files stay on the PC.

| Folder | On the server | Served to the web? |
|---|---|---|
| `index.html` | Landing page (`/`) | Yes |
| `Server__Api\` | Internal APIs: one Flask service per app (`Api__<App>\wsgi.py`), behind nginx; `Api__Shared\` holds the shared sign-in, accounts and library code | **Never** (404) |
| `Server__DeveloperTools\` | Server scripts and config; `40__Config__Nginx\` holds a record of the generated nginx routes; `ValeDev__LocalServer__.py` runs this whole folder on <http://127.0.0.1:8030> like the server | **Never** (404) |
| `Server__UserAccountData\` | **Vale user accounts** (below): the users register and per-app user configs. Git-ignored | **Never** (404) |
| `AppAssets__CommonApplicationAssets\` | Logos, icons and shared graphics used by every app (from the old `WebApps\assets__CommonApplicationAssets`). Design sources (`.psd`), `NOTUSED__*` files and mock-ups stay on the PC | Yes |
| `Vale__Projects__MasterLibrary\` | **Every project, shared by every app** (below) | `Content__*` and project JSON yes; `UserData__*` never |
| `Vale__ValeVision3D\` | ValeVision 3D (public route `/valevision/`) | Yes |
| `Vale__ValeVisionGallery\` | ValeVision Gallery (route `/project-gallery/`). Its early codename is retired: never use it | Yes |
| `Vale__ValeSpec\` | ValeSpec (route `/valespec/`) | Yes |
| `Vale__LanternDesigner\` | Lantern Designer (route `/lantern-designer/`) | Yes |

Public routes (short URLs, QR short links) are set in the manager's tab 03, *URL configurator*.

## The Projects Master Library

```
Vale__Projects__MasterLibrary\ValeProjects__<year>\<code>__<Name>\
├── ProjectData__<code>__<Name>__.json     the project record: one per project, unique name (never project.json)
├── ValeVision3D\        Content__3dModel__GlbFiles\  Content__3dModel__AppGenerated\  Content__AnimationScenes__Thumbnails\
│                        UserData__UserAppConfigs\  UserData__UserGeneratedContent__Drawings\  UserData__UserGeneratedContent__Images\
├── ValeVisionGallery\   Content__GalleryImages__FullQuality__VariantImages\  …__524p__VariantImages\  …__Thumbnail__VariantImages\
└── LanternDesigner\
```

- Copy `ValeProjects__2026\12345__ExampleProject__Schema\` for a new project. Its JSON should be
  renamed `ProjectData__12345__ExampleProject__Schema__.json`.
- A new app adds its own sub-folder in each project, with `Content__` and `UserData__` buckets.
- `.example` files describe the schema here and never sync.

## User Accounts

```
Server__UserAccountData\
├── UserAccountData__ValeUsers__Register__.json                          one record per person
└── UserData__UserAppConfigs\<App>\UserConfig__<USR code>__<App>__.json  per-app settings per user
```

- Every person has a permanent **`ValeUser__UniqueCode`**: `USR` + 8 digits (Adam is
  `USR00000001`). Per-app user configs and user-generated content are keyed by it.
- **Permission levels:**
  1. AppAdmin: everything, plus dev-mode menus;
  2. Management: edit projects and clients;
  3. Employee: entry-level tools;
  4. Affiliate: read and view only;
  5. Client: no account, a generated view URL instead.
- **Edit only in the manager's tab 04, *User accounts*.** It issues codes, dates and password
  hashes (Werkzeug `pbkdf2:sha256`; never plain text).
  - New users and resets start on the temporary password made by the register's rule (the rule lives only in the git-ignored register).
  - **Reset** and **Sign out** (every device) act on the live server at once, after a confirm.
  - Users are never deleted: untick Active.
- Sign-ins last until signed out: the session cookie is renewed on every visit.
- The register syncs both ways (newer wins), but a push always keeps the server's password and
  sign-out fields; `UserData__UserAppConfigs` is user data (collected).
- **This folder is git-ignored** (ValeCodebase `.gitignore`), so names, emails and hashes never
  reach GitHub.

## Four Lanes

| Lane | Folder names | Moves |
|---|---|---|
| Source code | anything in an app folder that is not named below | PC → server, exact mirror |
| Heavy content | `Content__*` (also `NN__ProjectContent`, `NN__HeavyContent`, `NN__Content`) | PC → server, newer wins, never deleted |
| User data | `UserData__*` (also `NN__UserData`, `NN__UserConfig`, `NN__Revisions` …) | server → PC (Collect), newer wins, never pushed |
| Project data | everything else in the project library: `ProjectData__*.json` | both ways, newer wins |

## Rules

1. **Apps move in one at a time.** Copy the app's code in, move its projects into the library,
   point it at the library, then push. The copy is the moment to give the app its new name (the
   Gallery's early codename is retired). Run it first on this PC with
   `Server__DeveloperTools\ValeDev__LocalServer__.py`.
2. **The server is the master for user data.** Collect brings it here; this PC's copy is for
   development.
3. **No secrets in this folder.** `.env` files never sync, and the repo is public.
4. **Paths inside apps are relative or same-origin.** Then the same files work on localhost and on
   the server.
