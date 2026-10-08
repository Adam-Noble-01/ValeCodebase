# Whitecardopedia - RETIRED (Archived 08-Oct-2026)

> **AGENTS AND DEVELOPERS: STOP HERE.**
> This folder is retired. Do not extract, restore, edit or build on anything from it.
> Whitecardopedia is now **ValeVision Gallery**, and all work happens in
> `WebApps/Vale__VirtualServer/Vale__ValeVisionGallery` (the app) and
> `WebApps/Vale__VirtualServer/Server__Api/Api__ValeVisionGallery` (its API).
> The `vgh-app-server` skill describes the live system in full.

---

## What is in this folder

| File | Purpose |
|---|---|
| `Archived__Whitecardopedia__PreMigration__08-Oct-2026.zip` | Every file this folder held on 08-Oct-2026, verified (see below). Read-only. **Local only: gitignored, never commit or upload it.** |
| `MigrationDetails__README__.md` | This file. |
| `index.html` | Retirement notice for anyone who opens the old app. Self-contained (no other files). |
| `app.html` | The same notice. Old bookmarks, emailed links and installed copies of the app open `app.html`. |

The notice tells people to stop using the prototype and to open **https://app.valegardenhouses.com**.
It thanks them for using the prototypes and asks them to contact Adam Noble if they have
trouble installing the new apps.

---

## Old to new

| | Old (retired) | New (live) |
|---|---|---|
| App name | Whitecardopedia | ValeVision Gallery (installed and bookmarked as "ValeVision") |
| Code | `WebApps/Whitecardopedia` | `WebApps/Vale__VirtualServer/Vale__ValeVisionGallery` |
| Public URL | `https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/app.html` (GitHub Pages) | `https://app.valegardenhouses.com/project-gallery/` (OVH VPS, nginx) |
| Server | `server.py` + `Server__ValeVision*__Api__.py` (Flask on localhost:8000) | `Server__Api/Api__ValeVisionGallery` (127.0.0.1:8001 on the VPS) |
| Local development | `start_server.bat` on port 8000 | `Vale__VirtualServer/Server__DeveloperTools/ValeDev__LocalServer__.py` on port 8030 |
| Project data | `Whitecardopedia/Projects` | `Vale__VirtualServer/Vale__Projects__MasterLibrary` |
| Storage / transport | Cloudflare R2, Cloudflare Workers, GitHub Pages | The VPS only; Cloudflare keeps the DNS |

This folder also held the PWA install modules that the old `WebApps/ValeVision3D` loaded through
`../Whitecardopedia/...`. Both legacy folders were retired together; see
`WebApps/ValeVision3D/MigrationDetails__README__.md`.

---

## The archive

| | |
|---|---|
| Created | 08-Oct-2026 |
| Files | 3,462, plus 4 empty folders |
| Source size | 1,160,531,181 bytes (1.16 GB) |
| Zip size | 996,985,692 bytes |
| Zip SHA-256 | `f16a113c2131d5885e4c09ec35b23bf07a652857636b34196b48a13d1ceecbcc` |
| Layout | Every original file sits under `Whitecardopedia/` inside the zip, with its original modified date |
| Manifest | `__ArchiveManifest__.json` at the zip root: every file's path, size, modified date and SHA-256 |

**How it was verified.** Each file was hashed (SHA-256) as it was written into the zip. The finished zip
was then re-opened and every member read back in full: its CRC was checked and its SHA-256 and size
matched against the manifest. Only then was the zip finalised. Before the originals were removed, the
folder was compared again against the manifest (path, size, modified time) and matched exactly.
The originals were sent to the Windows Recycle Bin, not permanently deleted.

**It contains secrets.** The archive holds files that git never tracked, including Cloudflare
credentials and tools (`Tools__DevUtils/API__Cloudflare/`, `CloudflareWorker/`). This repository is
public, so the zip is excluded by `.gitignore` (`**/Archived__*__PreMigration__*.zip`) and must stay
on this machine.

---

## Restoring something (reference only)

- **One file:** open the zip in Explorer or 7-Zip and copy it out, or
  `python -m zipfile -e Archived__Whitecardopedia__PreMigration__08-Oct-2026.zip <empty folder>`.
- **Check a restored file:** compare its SHA-256 (`certutil -hashfile <file> SHA256`) with its entry in
  `__ArchiveManifest__.json`.
- **Tracked files from git:** 3,452 of the 3,462 files are also in git history. Commit `03137e56` is the
  last one before the archive: `git checkout 03137e56 -- WebApps/Whitecardopedia`. Untracked and
  ignored files (credentials, `node_modules`, the vendored Flask `bin`) exist only in the zip.

---

## What changed outside this folder (08-Oct-2026)

- The Windows Startup shortcut `Start__Whitecardopedia__WindowsStartUp__Silent__8000__.bat - Shortcut.lnk`
  was sent to the Recycle Bin, and the old server on port 8000 was stopped.
- The `whitecardopedia-flask` entry was removed from `WebApps/.claude/launch.json`.
- `.gitignore` (repository root) gained the archive rule above.

## Still pointing at the old apps (not changed)

- `WebApps/Na__Pwa__ServiceWorker__.js`: the old service worker stub at the WebApps root. Its logic
  (`02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js`)
  lived in this folder and is gone. Devices that installed the old app keep their existing worker until it
  is removed, but it fetched pages network-first, so online they get the notice page, not the old app.
- Cloudflare Workers and R2 buckets from the old design run in Cloudflare, not here. Archiving this
  folder does not switch them off.
- GitHub Pages still publishes this repository. The notice pages replace the old app online once this
  change is committed and pushed.
