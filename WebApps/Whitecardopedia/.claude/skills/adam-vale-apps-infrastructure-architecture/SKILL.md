---
name: adam-vale-apps-infrastructure-architecture
description: Production architecture for Vale Garden Houses' web apps (ValeVision, ValeSpec, Lantern Designer) after the October 2026 move to a single OVHcloud VPS - one domain (app.valegardenhouses.com), Nginx in front, one localhost-only Flask service per app, and no GitHub Pages hosting, Cloudflare R2, Cloudflare Workers or separate cdn./api. subdomains. Use whenever working on hosting, deployment, URLs, persistence, storage, sync, backups, data paths, uploads or any client-to-server transport code in these apps, and whenever code mentions R2, a Cloudflare worker, VaApps/ keys, cdn. or api. hosts, GitHub Pages or a cloud sync.
---

# Vale Apps - Production Architecture

Agreed by Adam Noble with Shane (Vale Garden Houses' head of IT), October 2026. It replaces the earlier
GitHub Pages + Cloudflare R2 + Cloudflare Workers + `api.` / `cdn.` subdomain design.

## Runtime

`Cloudflare DNS -> app.valegardenhouses.com -> OVH VPS -> Nginx -> static app files / app-specific local Flask service`

- Cloudflare stays for **DNS only**: `app.valegardenhouses.com` points at the VPS's public IP.
- Nginx is the **single public entry point**: HTTPS, serves static application files and assets directly, and
  reverse-proxies dynamic requests to the right Flask service.

## OVH VPS

- Ubuntu Linux. 8 GB RAM, 1 Gbps network.
- The **sole production host and the data authority** (the definitive production source).
- Holds everything the live apps need: JSON data, user data, project data, generated scenes, 3D models (GLB),
  images, videos and other persistent assets.

## URLs and local Flask services

| App | Public path | Flask service (localhost only, never exposed) |
|---|---|---|
| ValeVision | `https://app.valegardenhouses.com/ValeVision/` | `127.0.0.1:8001` |
| ValeSpec | `https://app.valegardenhouses.com/ValeSpec/` | `127.0.0.1:8002` |
| Lantern Designer | `https://app.valegardenhouses.com/LanternDesigner/` | `127.0.0.1:8003` |

Each app has its own Flask server running at all times. Same origin everywhere: browser code calls its own app's
dynamic routes with relative URLs, so there is no CORS and no cross-origin token handling.

## What lives where inside each app root

| Kind | Meaning |
|---|---|
| Source code | The production build of the static application |
| App modules | Modular source files, sorted into feature / system subfolders |
| Project data | Persistent project JSON, in a child folder of the app root |
| User data | Persistent user JSON (accounts, preferences, dictionaries), in a child folder of the app root |
| App assets | App graphics, icons, fonts |
| Project content | Per-project 3D models (GLB), videos, imagery |
| Logs / revisions | Text and markdown: DEVLOG, README, revision history |

Application code is kept separate from persistent user-generated content, so **a deployment can never overwrite live
project or user data**.

## Deployment

`Local development -> push -> private GitHub repo -> pull -> OVH build script -> live app`

- GitHub is **source control only**, never runtime hosting.
- The OVH build script pulls the approved version, runs any build / minification / tree-shaking, and publishes the
  production build.

## Server-side responsibilities (Flask)

JSON read/write, user accounts, revision history, file locking and version checks (optimistic concurrency), atomic
writes (temp file then replace), and the admin tools for monitoring users and changes.

## Backups

- Off-server backups are required. A Python backup script on Adam's side pulls the VPS's user-generated content and
  data down to his PC drive (in addition to the local backup system that already runs).
- OVH's native 24-hour backup window is a known limitation to revisit later.

## Principles

- One domain, one server, same origin.
- OVH is the definitive production source.
- Nginx serves files; Flask handles dynamic read/write.
- Atomic JSON writes, locking / version checks, revision history.
- Never overwrite persistent data during deployment.

## Rules for agents working in these codebases (transition period, from October 2026)

1. **Do not build new Cloudflare R2, Worker, CDN or GitHub-Pages paths.** Existing code that reads or writes R2
   (`VaApps/Projects/...` keys, the `whitecardopedia-editor-api` worker, `cdn.` URLs, the Whitecardopedia cloud
   sync scripts, build-manifest bumps) is legacy and will be removed.
2. Where a ported or planned feature has an R2 / worker / sync step, **leave a clearly marked placeholder** instead
   of implementing it, for example `// TODO(OVH-MIGRATION): persistence via the app's Flask service on the VPS; R2/worker path intentionally not built.`
   and keep the call shape so the Flask implementation can drop in.
3. New persistence goes through the app's own Flask service with **same-origin relative URLs** (no hard-coded
   `localhost`, no hostname tests that assume "localhost means Flask, anything else means the cloud").
4. Keep code, project data, user data and project content in separate folders, as in the table above.
5. Never commit secrets, keys or server credentials; they live on the VPS only.
