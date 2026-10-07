# ValeVision Gallery

Whitecard and blockout massing-model images for every Vale Garden Houses project, at
<https://app.valegardenhouses.com/project-gallery/>. (Its early codename is retired: never use it.)

## How It Works

| Part | Where |
|---|---|
| The app (static, no build step: React and Babel in the browser) | this folder; the entry page is `index.html` |
| Projects and images | `Vale__Projects__MasterLibrary\ValeProjects__<year>\<folder>\`: `ProjectData__<folder>__.json`, plus `ValeVisionGallery\Content__GalleryImages__FullQuality__VariantImages`, `…__524p__VariantImages` and `…__Thumbnail__VariantImages` |
| The API (list, read, save, visibility) | `Server__Api\Api__ValeVisionGallery\wsgi.py`, reached at `api/…` relative to this page |
| Sign-in | the shared Vale sign-in: `Server__Api\Api__Shared` and `AppAssets__CommonApplicationAssets\Shared__UserLogin` |
| Shared logos and icons | `/AppAssets__CommonApplicationAssets/` |
| Project videos | ValeVision Theia (`/theia/`): the card's video icon reads `videoCount` and the project view's Project Videos section reads `theiaVideos`, both put on the records by the Gallery API |

- **A project's id is its library folder name.** Share links are `?id=64135__Washington`; old
  `?id=<project code>` links still open.
- **Who can do what:**
  - everyone signed in browses;
  - **Management** and up get the Project Editor and the 3D Production KPI Report (hamburger menu
    and avatar menu);
  - **App Admins** also get Developer tools (purge the app cache).
- **The editor saves only the Gallery's fields:** name, code, display alias, production data,
  schedule data and gallery visibility. ValeVision 3D's data in the same record is never touched.
  A save made from an out-of-date copy is refused.
- **Projects are never renamed or deleted here:** a library folder is shared by every app.

## Run It on This PC

```bat
python ..\Server__DeveloperTools\ValeDev__LocalServer__.py
```

Then open <http://127.0.0.1:8030/project-gallery/>. It serves the mirror exactly as the server
does, API included, and it **writes the real mirror**.
