# ValeVision Theia

Vale Garden Houses' own video player, at <https://app.valegardenhouses.com/theia/>. It plays the videos made
in ValeVision 3D's Video Studio (and any MP4 dropped into a project's Theia folder) in full quality, so clients
never watch Vale's work through Google Drive, Dropbox or YouTube compression.

## Who Sees What

| Who | Address | What they get |
|---|---|---|
| **Staff** (Employee and up, the shared Vale sign-in) | `/theia/?project=<library id>[&video=<id>][&t=<seconds>]` | the player and the project's videos, breadcrumbs back to ValeVision Gallery, Share (staff and client links) |
| **Managers and App Admins** | the same | also Edit (title, description; kept in step with ValeVision 3D), order and hide, the below-2K and missing-file flags |
| **Clients** (no account) | `/theia/?project=<library id>&share=<token>` | the player and the shared videos only: no gallery, no sign-in, no editing; a guest bubble at the top right (the shared sign-in's guest state: who shared it, when the link ends, copy a link to this video) |
| Staff, no project | `/theia/` | the projects that have videos |

Affiliates are refused. A client link can be limited to some videos, given an expiry, and switched off.

The header is ValeVision 3D's: the Vale logo, then **ValeVision THEIA** at the right in ValeVision 3D's title
style (24px Open Sans SemiBold, navy) and the user bubble. The project's name and number ("Holt - 64135") sit
over the video's title, under the picture.

## How It Works

| Part | Where |
|---|---|
| The app (static, plain ES modules, no build step) | this folder, served by nginx at `/theia/` |
| The API (Flask) | `Server__Api\Api__ValeVision__TheiaVideoPlayer\wsgi.py`, proxied at `/theia/api/` (systemd `vale@ValeVision__TheiaVideoPlayer`, port 8005) |
| The data model (shared with the Gallery API) | `Server__Api\Api__Shared\ValeShared__TheiaVideo__.py`; MP4s are read by `ValeShared__Mp4Probe__.py` (no ffmpeg) |
| A project's videos | `Vale__Projects__MasterLibrary\ValeProjects__<year>\<id>\ValeVision__TheiaVideo\` (below) |
| Config | `02__Src__AppModules\02__AppData\Na__AppConfig__TheiaVideoPlayer__.json` (read by the page through `api/config` and by the API) |

```
<project>\ValeVision__TheiaVideo\
├── AppData__VideoData\<id>__VideoAppData__.json        the video list, in playing order (project data: both ways)
├── Content__VideoFiles\Videos__Scheme-01\<file>.mp4     one file per video (heavy content: pushed up)
├── Content__VideoThumbnails\<file>.webp                 posters (1920 wide) and thumbnails (524 wide)
├── UserData__ShareLinks\<id>__TheiaShareLinks__.json    the share links (user data: through the API only)
└── UserData__UploadStaging\                            uploads in progress (*.tmp never syncs; cleared after 48 hours)
```

The data file's schema, with an example: `ValeProjects__2026\12345__ExampleProject__Schema\ValeVision__TheiaVideo\
AppData__VideoData\PROJECTNUMBER__PROJECTNAME__VideoAppData__.json.--example`.

## Getting Videos In

- **From ValeVision 3D** (App Admins): Dev Tools → Video Studio → a path's **Publish to Theia**, or **Publish &
  Sync All to Theia**. The path is rendered at its own export settings and uploaded while it renders (16 MB chunks,
  each checked). Theia keeps the file as `Videos__<Scheme>\<id>__TheiaVideo__<path id>__<height>p__.mp4` with its
  poster, and deletes whatever an earlier publish of the path left at another size or in another scheme.
- **By hand:** drop an MP4 of at least 2K into `Content__VideoFiles\Videos__Scheme-01\` (or another scheme folder).
  It appears as a video of its own, titled from its file name; the first time a manager edits it, it is written into
  the data file. Files that differ only by a `__2160p__` / `__1440p__` token are one video: the largest plays.
- **Titles and descriptions** are kept in step with the ValeVision 3D path both ways: the newer edit wins.

## Quality and Playback

- **One file per video, at the size it was made** (Adam, 07-Oct-2026). No second sizes and no quality menu: viewers
  are expected to have a good connection, and Theia's cache and buffering do the rest. The badge on the player says
  what the video is (4K, 2K).
- **The 2K floor:** a file under 1440 pixels tall is never offered to staff or clients. Managers see it flagged.
- **The media cache** (`TheiaVideoPlayer__Pwa__ServiceWorker__.js`): every byte watched is kept on the device in
  4 MB pieces, up to 20 GB or 60% of the browser's quota. The server is asked for up to 16 MB at a time, and each
  4 MB piece is played and kept as soon as it is in.
- **Fetching ahead:** a rolling window of the playing video, 90 seconds ahead of the playhead (60 on mobile data),
  and the first 20 seconds of the next three videos in the list. Whole files are not fetched ahead.
- **The runway:** when the connection is slower than the video, Theia saves ahead first, with the Vale spinner over
  the picture (no card, no countdown). It plays once it has enough to finish without stopping, or after a quarter of
  what is left to watch (4 to 15 seconds), as long as five seconds are in by then, whichever comes first; it never
  waits longer than three times that. The download keeps ahead while it plays; on a slow line it may pause briefly
  to catch up, with the same spinner and the same rule. Pausing while it waits cancels the wait.
- **The start-up spinner** (the one ValeVision 3D shows) stays until the first video has five seconds on the device,
  never longer than eight.
- **Cinema:** while a video is actually playing, the page fades to a mid-dark grey; it fades back when it stops.
  Escape, or a click on the page outside the player, pauses it. A click on the player's card, the list, the header
  or a dialog does its own job.
- Pressing play on the picture goes fullscreen; at the end the next video starts after a countdown.
- **Keys:** Space (or K) pauses and plays, even after clicking a video in the list; **Ctrl+Space** stops and returns
  to the start. Also arrows / J / L to seek, F fullscreen, M sound, Home / End, 0 to 9, Shift+N / P next / previous.

## Run It on This PC

```bat
python ..\Server__DeveloperTools\ValeDev__LocalServer__.py
```

Then open <http://127.0.0.1:8030/theia/?project=64135__Holt>. It serves the mirror exactly as the server does, API
included (videos in byte ranges), and it **writes the real mirror**: test publishing and share links against a
sandbox `VALE_ROOT`.

## History

See `TheiaVideoPlayer__DEVLOG__.md`.
