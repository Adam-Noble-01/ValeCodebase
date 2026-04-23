# Python App Launcher

A small Tkinter launcher + Windows system tray menu for every Python tool
inside `Root_GeneralDeveloperTools/02_Python`. Click a button, the tool
fires in a detached, windowless subprocess. Disable anything you don't use
from the **Settings** tab and it'll disappear from the grid.

The launcher is designed to live in your Windows system tray: click the X
button and the window hides; the tray icon stays alive so you can reopen the
menu with a single left-click. A silent `.vbs` launcher is provided for
`shell:startup` so it boots with Windows with zero visible console.

---

## 1. First-time install

```cmd
cd Py_WinUtil__PythonAppLauncher
INSTALL_DEPENDENCIES.bat
```

This pip-installs `pystray==0.19.5` and `Pillow==10.4.0` into isolated
sub-folders inside `00__ThirdParty__VersionLockedDependencies/`. Your system
site-packages are not touched.

Everything else the launcher needs (tkinter, pathlib, subprocess, json,
logging, threading, dataclasses, msvcrt) is standard library.

---

## 2. Launching

### Dev launch (console visible)

```powershell
.\Start__PythonAppLauncher__.ps1
```

Uses `python.exe` so you see log output and any exceptions.

### Silent launch (no console, for daily use)

Double-click `Start__PythonAppLauncher__Silent__.vbs`.

Uses `pythonw.exe` with a hidden window so absolutely no console / PowerShell
flash appears. This is the file you want to link from `shell:startup`
(see section 3).

---

## 3. Put me in `shell:startup`

1. Press `Win+R`, type `shell:startup`, press Enter.
2. Right-click inside the opened folder -> **New** -> **Shortcut**.
3. Target: the full path to `Start__PythonAppLauncher__Silent__.vbs`.
4. Name it `Python App Launcher`.
5. Sign out and back in. The Noble Arch tray icon appears silently - no
   window, no console - ready for you to left-click whenever you need the
   launcher.

---

## 4. Tray menu

| Item          | Action                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| Open Menu     | Default left-click action. Brings the main window to the foreground.   |
| Refresh Apps  | Re-scans the `02_Python` category folders for new `*__Main__.py` tools.|
| Exit          | Stops the tray icon and quits the launcher.                            |

Closing the main window via the X button does **not** quit - it hides to tray.
Only the tray **Exit** menu item actually quits.

---

## 5. Settings tab

Every discovered tool gets a checkbox grouped by category. Untick a box to
hide that app from the Launcher grid. State is saved immediately to
`Py_WinUtil__PythonAppLauncher__AppConfig__.json` (you never need a Save
button), atomically, and persists across sessions.

Each category has `[Enable all]` / `[Disable all]` buttons for bulk toggles.

If you rename or delete a tool folder, its orphan key is silently pruned from
the JSON the next time you toggle anything.

---

## 6. Single-instance guard

Launching the app twice (e.g. `shell:startup` plus a manual double-click)
doesn't spawn two tray icons. The second launch writes a `show.flag` file
to `%LOCALAPPDATA%\ValeArch\PythonAppLauncher\` and exits; the already-running
instance polls that flag and raises the existing window to the foreground.

---

## 7. Files in this folder

| File                                              | Purpose                                                    |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `Py_WinUtil__PythonAppLauncher__Main__.py`        | The entire Tk + tray + discovery app.                      |
| `Start__PythonAppLauncher__Silent__.vbs`          | Zero-window launcher (link this from `shell:startup`).     |
| `Start__PythonAppLauncher__.ps1`                  | Dev launcher with console output visible.                  |
| `INSTALL_DEPENDENCIES.bat`                        | Populates the bundled deps folders.                        |
| `Py_WinUtil__PythonAppLauncher__DEVLOG__.md`      | Version history.                                           |
| `Py_WinUtil__PythonAppLauncher__AppConfig__.json` | Disabled-app keys (auto-created on first toggle).          |
| `Py_WinUtil__PythonAppLauncher.log`               | Rolling log (auto-created on first run).                   |
| `00__ThirdParty__VersionLockedDependencies/`      | `pystray` + `Pillow` isolated from system site-packages.   |
