# ValePlanner

Static JavaScript scheduling and analytics app for Vale workflow planning, refactored into the Vale module/style conventions.

---

## Project Structure

```
ValePlanner/
├── index.html
├── ValePlanner__README__.md
├── ValePlanner__DEVLOG__.md
├── server.py
├── Na__ServiceWorker__ValePlanner.js
├── Start__ValePlanner__Localhost__8001__.bat
├── Start__ValePlanner__Localhost__8001__.ps1
├── Start__ValePlanner__WindowsStartUp__Silent__8001__.bat
│
├── 01__AppAssets__ValePlanner/
│
├── 02__Src__AppModules/
│   ├── 01__AppDependencies__VersionLocked/
│   │   ├── chart.umd.4.4.3.min.js
│   │   └── DEPENDENCIES__README__.md
│   ├── 02__AppCore/
│   ├── 03__AppData/
│   ├── 04__AppTypes/
│   ├── 05__AppUtils/
│   ├── 10__Feature__ScheduleBoard/
│   ├── 11__Feature__Analytics/
│   ├── 12__Feature__HeaderAndTabs/
│   ├── 62__Feature__AppInstallability/
│   └── 70__System__DevTools/
│
└── 03__Style__AppStylesheets/
```

---

## Runtime Dependencies (Version Locked)

Only dependencies actually used at runtime are stored locally:

- `Chart.js v4.4.3` -> `02__Src__AppModules/01__AppDependencies__VersionLocked/chart.umd.4.4.3.min.js`

No React/Vite/Tailwind runtime dependency remains in the new app implementation.

---

## Run Localhost Server

Preferred (with proper startup feedback/logging):

### Option A - Python Script

```bash
python server.py --host 127.0.0.1 --port 8001
```

### Option B - Windows Batch

```text
Start__ValePlanner__Localhost__8001__.bat
```
If port `8001` is already in use, the launcher exits with a warning (it does not force-kill other app servers).

### Option C - Windows PowerShell

```text
./Start__ValePlanner__Localhost__8001__.ps1
```
If port `8001` is already in use, the launcher exits with a warning (it does not force-kill other app servers).

### Option D - Windows Startup (Silent Background Launch)

```text
Start__ValePlanner__WindowsStartUp__Silent__8001__.bat
```

Use this script inside `shell:startup` (as a shortcut) to launch the server in the background with no visible console window.

Then open:

```text
http://127.0.0.1:8001/index.html
```

---

## Reliability and PWA Additions

- Server connection monitor + top warning banner now warns when a previously stable API connection is lost.
- Persistence saves still use `api/data/workers` and `api/data/timecard`, and status checks now ping `api/system/health`.
- PWA metadata is enabled via:
  - `index.html` manifest link and ValePlanner-specific icons
  - `02__Src__AppModules/62__Feature__AppInstallability/Na__AppInstallability__Manifest.webmanifest`
  - `Na__ServiceWorker__ValePlanner.js`

---

## Feature Coverage

- Schedule board day/week mode toggle
- Shift create by click-drag on grid
- Shift move, resize, delete
- Shift title edit (double-click prompt)
- Reset workers to seed dataset
- Analytics summary cards + charts (task distribution and hours per day)