# =============================================================================
# PY_WINUTIL__PYTHONAPPLAUNCHER |  DEVELOPMENT LOG
# =============================================================================
- Add latest changes to the top of the file.
- Older changes descend in chronological order.


# -----------------------------------------------------------------------------
## PythonAppLauncher - v1.2.1 - 09-Jun-2026 - New app: CAD Background Remover

### Summary
Added CAD Background Remover to the 30__Python__ImageTools category. Registered
polished display name and description in `CURATED_APP_METADATA`.

### Changes
1. **New app registered** - `30__Python__ImageTools/Py_ImgUtils__CadBackgroundRemover` added to `CURATED_APP_METADATA` with display name "CAD Background Remover" and description "Batch-strips white and light-grey backgrounds from CAD linework images, saving clean transparent PNGs beside the originals."
2. **Version bump** - `APP_VERSION = "1.2.1"`.

# -----------------------------------------------------------------------------
## PythonAppLauncher - v1.2.0 - 23-Apr-2026 - Branded header banner + rounded cards + per-app order index

### Summary
Polishes the launcher into a properly branded tool. A wide Noble
Architecture banner graphic now sits above the tab notebook (visible on
both tabs). Cards are rendered with real rounded corners via a Canvas
+ smooth-polygon approach, the tab body is a lighter grey so the white
cards stand out, and every app now carries an integer `order` field in
the JSON so the user can re-arrange buttons within a category without
renaming files.

### Changes
1. **Header banner** - new `NOBLE_HEADER_LOGO_PATH` constant pointing at `00__Python__CommonDependencyFiles/Na__CommonBrandAssets/AppHeaderGraphic__NobleArchLogo__.png`. A dedicated `_build_header_banner()` creates a full-width white strip above the notebook; `_load_header_logo()` uses Pillow (already bundled for the tray icon) to load + LANCZOS-resize the PNG to a 68px height and keeps the `PhotoImage` reference on `self._header_photo` so it is not garbage-collected. If Pillow / the file is missing the banner falls back to a plain text title so the app still opens.
2. **Lighter grey theme** - new palette constants (`THEME_BG=#f2f3f5`, `THEME_HEADER_BG=#ffffff`, softer `CARD_BORDER_DEFAULT=#d5d7dc`, brighter hover `CARD_BG_HOVER=#eaf2fb`). `_configure_root` now applies these to the root, ttk `TFrame` / `TLabel` / `TNotebook` / `TCheckbutton` / `TSeparator` styles, the scrollable-body Canvas, and all custom styles.
3. **Rounded cards** - `_build_launcher_card` no longer builds a rectangular `tk.Frame`. It creates a `tk.Canvas` coloured with `THEME_BG`, draws a smooth-cornered polygon (`create_polygon(..., smooth=True, splinesteps=36)`) using `_rounded_rect_points(...)` for the fill + outline, and embeds a child `tk.Frame` holding the Name / Description labels via `canvas.create_window`. A `<Configure>` binding redraws the polygon and rewraps the labels whenever the grid cell resizes, so cards stay responsive.
4. **Order index in JSON** - `AppMetadata` gains `order: int = 0`. On first launch `_seed_missing_order_values()` walks each category alphabetically and auto-assigns 10, 20, 30, ... to every app still at 0 (respects any existing user values so nothing gets stomped). The launcher grid + Settings tab now sort each category via `_sort_apps_by_order()` (order asc, then display name, then key) before rendering.
5. **Settings Spinbox for order** - each Settings row adds a `ttk.Spinbox` (`# 0-9999`) between the checkbox and the Name entry. Autosaves on arrow click, Enter, or focus-out via `_on_order_committed()`; value `0` is treated as "unset" and sorts the row to the end. The Settings list re-sorts itself after every edit so the row layout matches the launcher.
6. **Version bump** - `APP_VERSION = "1.2.0"`.

### JSON schema (still v2, now includes order)
```json
{
  "schema_version": 2,
  "apps": {
    "20__Python__PDFTools/Py_PdfUtils__PdfToTextExtractor/Py_PdfUtils__PdfToTextExtractor__Main__.py": {
      "enabled": true,
      "order": 60,
      "name": "PDF to Text Extractor",
      "description": "Extracts embedded text or OCRs scanned PDFs and saves a structured Markdown file."
    }
  },
  "last_modified": "23-Apr-2026 11:31:01"
}
```

### Files touched
- `Py_WinUtil__PythonAppLauncher__Main__.py` - new theme/header/order constants, `AppMetadata.order`, `_build_header_banner` + `_load_header_logo`, rounded `_build_launcher_card` + `_rounded_rect_points`, `_seed_missing_order_values` + `_sort_apps_by_order` + `_order_of`, Spinbox in `_build_settings_row`, `_on_order_committed` event, light-grey theming throughout `_configure_root` and the scrollable-body canvas.


# -----------------------------------------------------------------------------
## PythonAppLauncher - v1.1.0 - 23-Apr-2026 - White card buttons + name/description metadata + category reorder

### Summary
Refines the launcher UI and data model after first-week usage feedback.
Buttons are now white "cards" that pop against the grey tab background,
each showing a **curated human Name** (bold) and a one-sentence
**Description** (grey). Both values are stored in the JSON config and are
editable inline from the Settings tab (autosaves on blur or Enter). The
Hotkey Managers category drops to the bottom of the list because those
tools are launched rarely and were taking visual priority at the top.

### Changes
1. **Category reorder** - `CATEGORY_FOLDERS` now lists WinFileSystemTools -> PDFTools -> ImageTools -> VideoTools -> HotkeyManagers (hotkeys last).
2. **White card buttons** - the ttk.Button grid is replaced by `tk.Frame` cards (`bg=#ffffff`, 1px `#d0d0d0` border). Each card stacks a Segoe UI Semibold name (`#1a1a1a`) and a wrapping Segoe UI 9pt description (`#555555`). Hover swaps to `bg=#eef4fb` with a blue accent border, and `<Button-1>` on every inner label triggers the launch.
3. **Curated metadata registry** - new `CURATED_APP_METADATA` dict hard-codes a polished `(name, description)` pair for all 18 currently-discovered apps. `resolve_default_metadata(app)` consults the registry first and falls back to the heuristic label for apps we have not hand-labelled yet.
4. **JSON schema v2** - the config moves from `{"disabled_app_keys": [...]}` to `{"apps": {"<key>": {"enabled": true, "name": "...", "description": "..."}, ...}}`. v1 configs are auto-migrated on first load (disabled keys carried forward, names/descriptions filled from the curated registry).
5. **Inline Settings editors** - each Settings row now has a checkbox + **Name** `ttk.Entry` + **Description** `ttk.Entry` + `Reset to default` button + a grey path hint. Both entries commit on `<FocusOut>` or `<Return>`; emptying an entry snaps back to the curated default instead of persisting a blank.
6. **Live refresh** - every metadata change rebuilds the launcher grid on the spot so card labels/descriptions update without needing a restart, and the tray tooltip's enabled count refreshes too.
7. **Version bump** - `APP_VERSION = "1.1.0"` (was `1.0.0`) and the title bar reflects the new version.

### JSON schema v2 example
```json
{
  "schema_version": 2,
  "apps": {
    "20__Python__PDFTools/Py_PdfUtils__PdfToTextExtractor/Py_PdfUtils__PdfToTextExtractor__Main__.py": {
      "enabled": true,
      "name": "PDF to Text Extractor",
      "description": "Extracts embedded text or OCRs scanned PDFs and saves a structured Markdown file."
    }
  },
  "last_modified": "23-Apr-2026 15:42:08"
}
```

### Migration
v1 users: on first launch the file is read, any keys in `disabled_app_keys`
are mapped to `{"enabled": false}`, remaining apps default to enabled, and
the file is rewritten in v2 shape with curated names/descriptions filled in.
No manual step needed.

### Files touched
- `Py_WinUtil__PythonAppLauncher__Main__.py` - new constants, `AppMetadata` dataclass, `CURATED_APP_METADATA`, `resolve_default_metadata`, `load_app_metadata` / `save_app_metadata` (with v1 migration), rebuilt launcher cards, new Settings row layout with inline editors, new event handlers (`_on_name_committed`, `_on_description_committed`, `_reset_metadata_to_default`, `_ensure_metadata_for`, `_persist_and_toast`).


# -----------------------------------------------------------------------------
## PythonAppLauncher - v1.0.0 - 23-Apr-2026 - Initial build (launcher + tray + shell:startup)

### Summary
First release of a Tkinter-based launcher that auto-discovers every
`*__Main__.py` tool across the five `02_Python` categories and renders them as
category-grouped buttons. Ships with a Noble-Architecture-logo Windows system
tray icon (Open Menu / Refresh Apps / Exit), close-to-tray behaviour, a silent
`.vbs` launcher for `shell:startup`, and a JSON-persisted Settings tab for
enabling / disabling individual apps between sessions.

### New folder
`Root_GeneralDeveloperTools/02_Python/10__Python__WinFileSystemTools/Py_WinUtil__PythonAppLauncher/`
with the following layout:

```
Py_WinUtil__PythonAppLauncher/
  00__ThirdParty__VersionLockedDependencies/
    00__PyStray__PythonPackage__/          <-- pystray 0.19.5 (+ bundled Pillow)
    01__Pillow__PythonPackage__/           <-- Pillow 10.4.0
  INSTALL_DEPENDENCIES.bat
  Py_WinUtil__PythonAppLauncher__Main__.py
  Py_WinUtil__PythonAppLauncher__DEVLOG__.md
  Py_WinUtil__PythonAppLauncher__README.md
  Start__PythonAppLauncher__.ps1
  Start__PythonAppLauncher__Silent__.vbs
```
A `Py_WinUtil__PythonAppLauncher__AppConfig__.json` file is created next to
the main script the first time the user toggles an app in the Settings tab.
A rolling `Py_WinUtil__PythonAppLauncher.log` is written alongside the script
(DEBUG/INFO/WARN/ERROR).

### Discovery model
- Hard-coded category roots: `05__Python__HotkeyManagers`,
  `10__Python__WinFileSystemTools`, `20__Python__PDFTools`,
  `30__Python__ImageTools`, `50__Python__VideoTools`. Anything outside the list
  (`.cursor`, `.vscode`, `00__Python__CommonDependencyFiles`,
  `02__Python__CommonLocalCodeLibs`, `03__Python__CommonConfigFiles`,
  `01__Python__ReferenceStandardsForToolCreation`,
  `00__Demo__MarkdownExample`) is never scanned.
- Each direct sub-folder is globbed for `*__Main__.py`. **Every match becomes
  a button** - so `Py_FileUtils__SimpleFileLogger__ListItems__InCurrentFolder`
  produces two buttons (one for `ListFilesInCurrentFolder__DumpTxt__Main__.py`,
  one for `ListFoldersAtCurrentDirLevel__DumpTxt__Main__.py`).
- Folders without any `*__Main__.py` are silently skipped (so the three
  `DEV__*` prototype folders under `20__Python__PDFTools`, `30__Python__ImageTools`,
  and `50__Python__VideoTools` stay off the grid until a main is added to them).
- The launcher excludes its own `__Main__.py` from discovery by resolved path.
- Initial audit count (verified manually): 2 Hotkey + 5 WinFileSystem
  (twin SimpleFileLogger mains counted separately) + 7 PDF + 2 Image + 2 Video
  = **18 launchable apps**.

### Label derivation
- File label: strip the `Py_*__` (or `SyPy_*__`) namespace prefix and the
  `__Main__.py` suffix, split on `__`, CamelCase-split each segment, and
  join with `\n` for multi-line buttons.
  - `Py_PdfUtils__PdfToTextExtractor__Main__.py` -> `"Pdf To Text Extractor"`.
  - `Py_FileUtils__SimpleFileLogger__ListFilesInCurrentFolder__DumpTxt__Main__.py`
    -> 3-line label `"Simple File Logger\nList Files In Current Folder\nDump Txt"`.
- Category label: strip the leading `NN__` and `Python__`, then
  CamelCase-split. `20__Python__PDFTools` -> `"PDF Tools"`,
  `10__Python__WinFileSystemTools` -> `"Win File System Tools"`.

### UI layout
- `ttk.Notebook` with two tabs: **App Launcher** (enabled-only button grid,
  categories in numeric-prefix order, 4-wide wrapped grid inside a scrollable
  canvas, ~220 x ~80 px buttons with `wraplength=200`, centered justify) and
  **Settings** (all discovered apps grouped by category with a single-row
  checkbox + greyed relative-path hint, `[Enable all]` / `[Disable all]`
  buttons per category, "Saved HH:MM:SS" indicator top-right of the tab).
- Header bar on the Launcher tab has a `[Refresh]` button that re-runs
  discovery without restarting the GUI.
- Bottom status bar toasts the last-launched app name or the current
  discovery summary.

### Launch mechanism
- Prefers any sibling `Start__*.ps1` launcher via PowerShell with
  `-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass` (only
  `Py_PdfUtils__PdfToTextExtractor` has one today - this path future-proofs any
  later adopter).
- Otherwise spawns `pythonw.exe Py_*__Main__.py` directly.
- Subprocess flags: `CREATE_NO_WINDOW | DETACHED_PROCESS`, `close_fds=True`,
  `cwd=app.app_folder` so each tool's relative `sys.path` bootstrap resolves
  correctly. Closing the launcher does not kill spawned apps.
- `pythonw.exe` is resolved via a small candidate list:
  `%LOCALAPPDATA%\Programs\Python\Python312\pythonw.exe` ->
  `%LOCALAPPDATA%\Programs\Python\Python311\pythonw.exe` ->
  sibling of `sys.executable` -> `sys.executable` as last resort.

### Settings persistence
- `Py_WinUtil__PythonAppLauncher__AppConfig__.json`:
  ```json
  {
    "schema_version": 1,
    "disabled_app_keys": ["20__Python__PDFTools/.../Py_*__Main__.py", "..."],
    "last_modified": "23-Apr-2026 11:04:17"
  }
  ```
- `key` is the forward-slashed path relative to `02_Python/` so renames of the
  category folder show up cleanly as "new app appears + orphan entry gets
  garbage-collected on next save".
- Toggling a checkbox autosaves (no Save button).
- Writes are atomic (`.json.tmp` then `os.replace`).
- Any key whose app no longer exists on disk is silently dropped on load.

### System tray integration (Noble Arch logo)
- Uses `pystray.Icon` + `PIL.Image` from the bundled deps folder.
- Icon source: `00__Python__CommonDependencyFiles/Na__CommonBrandAssets/CustomAppIcon__NobleArchLogo.png`
  (the same Na logo set on the window title bar via `set_noble_icon(root)`).
  A neutral grey `(64x64)` fallback is drawn if the file is missing so the app
  still starts.
- Tray menu:
  - **Open Menu** - default left-click handler; brings the main window to the
    front via `root.after(0, _show_window)` so Tk mutations stay on the Tk
    thread. `_show_window` calls `deiconify() + lift() + focus_force()` and
    flashes `-topmost` for 150 ms so the window always comes forward (even
    from another virtual desktop).
  - **Refresh Apps** - reruns discovery and rebuilds both tabs.
  - **Exit** - `icon.stop()` then `root.destroy()` plus lock-file release.
- Tooltip: "Python App Launcher - N app(s) enabled" - updates on Refresh.
- Tray runs on a dedicated daemon thread.

### Close-to-tray behaviour
- `root.protocol("WM_DELETE_WINDOW", _hide_to_tray)` so clicking the X button
  hides the window (`root.withdraw()`) instead of quitting - tray icon stays
  live and the user reopens via Open Menu.
- If the tray libs failed to import, X falls back to a real quit so the user
  is never stuck with a hidden-but-running process.

### Silent startup for shell:startup
- `Start__PythonAppLauncher__Silent__.vbs` fires `pythonw.exe` with
  `oShell.Run cmd, 0, False` (hidden window, non-blocking) so there is no
  console or PowerShell flash at all on login. The user links this file from
  `shell:startup`.
- `Start__PythonAppLauncher__.ps1` is the dev launcher - uses regular
  `python.exe` so console logs are visible while debugging.
- The `.vbs` probes `%LOCALAPPDATA%\Programs\Python\Python312\pythonw.exe`
  first, then 3.11, then falls back to `pythonw.exe` on `%PATH%`.

### Single-instance guard
- `msvcrt.locking` on `%LOCALAPPDATA%\ValeArch\PythonAppLauncher\PythonAppLauncher.lock`
  - the first launch holds an exclusive lock for the whole process lifetime.
- A secondary launch fails to acquire the lock, writes a `show.flag` file in
  the same directory with the current timestamp, and exits.
- The running instance polls that flag every 800 ms; a mtime change means
  "someone double-clicked the shortcut - raise me to the foreground". This
  gives `shell:startup + Start menu double-click = foreground existing window`
  behaviour for free without any inter-process messaging plumbing.

### Dependencies
- Standard library only: `tkinter`, `pathlib`, `subprocess`, `json`, `os`,
  `sys`, `logging`, `threading`, `dataclasses`, `datetime`, `msvcrt`, `re`.
- Bundled, version-locked in `00__ThirdParty__VersionLockedDependencies/`:
  - `pystray==0.19.5` - Windows tray icon + menu (same library used by
    `Py__HotkeyManager__ValeTypingShorthand`).
  - `Pillow==10.4.0` - PIL.Image for the tray bitmap.
- Populated via `INSTALL_DEPENDENCIES.bat` -> `pip install --target` into
  per-package subfolders; the main script prepends each subfolder to
  `sys.path` at startup so the system Python install stays untouched.

### Smoke-test results (23-Apr-2026)
- Install script populated both dep subfolders cleanly.
- Main window opened at 1100x720 with the Noble Arch title-bar icon.
- Tray icon appeared in the system tray with the Noble logo and the tooltip
  `"Python App Launcher - 18 app(s) enabled"`.
- Left-clicking the tray icon raised the main window; right-clicking showed
  the Open Menu / Refresh Apps / Exit menu as expected.
- Closing the window via the X hid it to tray (process alive). Open Menu
  restored it.
- Launched `Pdf To Text Extractor` from the grid -> detached subprocess,
  no console flash.
- Disabled that app via the Settings tab, confirmed it vanished from the
  Launcher grid, used tray **Exit**, relaunched via the `.ps1`, confirmed the
  Settings JSON persisted (app still disabled). Re-enabled, confirmed it
  reappeared on the grid and the JSON was rewritten with an empty
  `disabled_app_keys` list.
- Double-launched via the `.vbs` while the app was already running - the
  existing window was raised to the foreground and no second tray icon
  appeared (single-instance guard works).
# -----------------------------------------------------------------------------
