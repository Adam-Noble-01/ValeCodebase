# ValePlanner

Static JavaScript scheduling and analytics app for Vale workflow planning, refactored into the Vale module/style conventions.

---

## Project Structure

```
ValePlanner/
├── index.html
├── ValePlanner__README__.md
├── ValeVision__DEVLOG__.md
├── server.py
├── Start__ValePlanner__Localhost__8000__.bat
├── Start__ValePlanner__Localhost__8000__.ps1
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
python server.py --host 127.0.0.1 --port 8000
```

### Option B - Windows Batch

```text
Start__ValePlanner__Localhost__8000__.bat
```

### Option C - Windows PowerShell

```text
./Start__ValePlanner__Localhost__8000__.ps1
```

Then open:

```text
http://127.0.0.1:8000/index.html
```

---

## Feature Coverage

- Schedule board day/week mode toggle
- Shift create by click-drag on grid
- Shift move, resize, delete
- Shift title edit (double-click prompt)
- Reset workers to seed dataset
- Analytics summary cards + charts (task distribution and hours per day)