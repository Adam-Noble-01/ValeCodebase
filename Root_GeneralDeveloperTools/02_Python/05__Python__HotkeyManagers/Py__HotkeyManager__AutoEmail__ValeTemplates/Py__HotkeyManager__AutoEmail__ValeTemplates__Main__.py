# -----------------------------------------------------------------------------
# REGION | Configuration Data
# -----------------------------------------------------------------------------
r"""
{
    "debug": false,

    "apps": {
        "Cursor": {
            "paths": [
                "%LOCALAPPDATA%\\Programs\\Cursor\\Cursor.exe",
                "C:\\Program Files\\Cursor\\Cursor.exe",
                "C:\\Program Files (x86)\\Cursor\\Cursor.exe",
                "Cursor.exe"
            ]
        }
    },

    "mappings": [
        {
            "id": "open_whitecard_delivery_email",
            "combo": "(Alt Gr  +  E)",
            "action": "open_path",
            "target": "D:\\01_Notebooks\\10__StandardEmails\\EMAIL__StandardDevlieryEmail__WhiteCardDelivery.md",
            "app": "Cursor"
        }
    ]
}
"""
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Imports and Dependencies
# -----------------------------------------------------------------------------
import ctypes
import json
import os
import sys
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional
import threading
import time

base_dir = os.path.dirname(os.path.abspath(__file__))
deps_dir = os.path.join(base_dir, "Dependencies__HotkeyManager__ExternalLibrarys")
sys.path.insert(0, deps_dir)

# Add path for common utilities
common_libs_path = Path(__file__).parent.parent.parent / "02__Python__CommonLocalCodeLibs"
sys.path.insert(0, str(common_libs_path))

_keyboard = None  # <-- Lazy import after debug setup
_pystray = None   # <-- System tray library
_PIL = None       # <-- PIL for icon handling
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Configuration Management
# -----------------------------------------------------------------------------

# FUNCTION | Read Embedded JSON Configuration
# ------------------------------------------------------------
def _read_embedded_json() -> Dict[str, Any]:
        """Extract and parse JSON configuration from file header"""
        file_path = Path(__file__)
        text = file_path.read_text(encoding="utf-8")
        
        start_idx = text.find('r"""')
        offset = 4
        if start_idx == -1:
            start_idx = text.find('"""')
            offset = 3
        if start_idx == -1:
            raise RuntimeError("Embedded JSON block not found at file start.")
            
        start = start_idx + offset
        end = text.find('"""', start)
        if end == -1:
            raise RuntimeError("Embedded JSON block is not properly closed.")
            
        json_str = text[start:end]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Failed to parse embedded JSON: {e}")
# ---------------------------------------------------------------

CFG = _read_embedded_json()
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Console Suppression and Process Management
# -----------------------------------------------------------------------------

# FUNCTION | Check if Using Windowless Python
# ------------------------------------------------------------
def _is_pythonw(exe: str) -> bool:
        exe = exe.lower().replace("/", "\\")
        return exe.endswith("pythonw.exe")
# ---------------------------------------------------------------

# FUNCTION | Find Windowless Python Executable
# ------------------------------------------------------------
def _find_pythonw() -> Optional[str]:
        """Locate pythonw.exe next to current interpreter or on PATH"""
        this = Path(sys.executable)
        cand = this.with_name("pythonw.exe")
        if cand.exists():
            return str(cand)
            
        possible = [
            cand,
            Path(os.__file__).resolve().parents[1] / "pythonw.exe",
        ]
        for p in possible:
            if p and Path(p).exists():
                return str(p)
                
        for pdir in os.environ.get("PATH", "").split(os.pathsep):
            p = Path(pdir) / "pythonw.exe"
            if p.exists():
                return str(p)
        return None
# ---------------------------------------------------------------

# FUNCTION | Relaunch Process Hidden if Needed
# ------------------------------------------------------------
def _relaunch_hidden_if_needed():
        """Relaunch with pythonw.exe if debug=false and not already hidden"""
        debug = bool(CFG.get("debug", False))
        if debug or _is_pythonw(sys.executable):
            return
            
        pythonw = _find_pythonw()
        if pythonw:
            try:
                subprocess.Popen(
                    [pythonw, __file__],
                    cwd=str(Path(__file__).parent),
                    close_fds=True
                )
                sys.exit(0)
            except Exception:
                pass
# ---------------------------------------------------------------

_relaunch_hidden_if_needed()

# Import libraries after process management
try:
    import keyboard  # type: ignore
    _keyboard = keyboard
except ImportError:
    def _message_box(title: str, text: str):
        ctypes.windll.user32.MessageBoxW(0, text, title, 0x00000040)
    _message_box("AltGr Hotkey Launcher", "Missing dependency: 'keyboard'.\nInstall with:\n\npip install keyboard")
    sys.exit(1)

try:
    import pystray  # type: ignore
    from PIL import Image  # type: ignore
    _pystray = pystray
    _PIL = Image
except ImportError:
    def _message_box(title: str, text: str):
        ctypes.windll.user32.MessageBoxW(0, text, title, 0x00000040)
    _message_box("AltGr Hotkey Launcher", "Missing dependencies: 'pystray' and 'Pillow'.\nInstall with:\n\npip install pystray Pillow")
    sys.exit(1)

# Import icon loader utility (optional - fallback if not available)
try:
    from Py_CoreCommonUtils__IconLoaderAndHandling import set_noble_icon
    _icon_loader_available = True
except ImportError:
    _icon_loader_available = False
    if CFG.get("debug", False):
        print("[WARN] Icon loader utility not available, using local icon loading only")
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Hotkey Combo Parsing
# -----------------------------------------------------------------------------
_MOD_MAP = {
    "ctrl": "ctrl",
    "control": "ctrl",
    "cntl": "ctrl",
    "ctl": "ctrl",
    "shift": "shift",
    "alt": "alt",
    "alt gr": "alt gr",
    "altgr": "alt gr",
    "ralt": "alt gr",
    "right alt": "alt gr"
}

# FUNCTION | Normalize Token
# ------------------------------------------------------------
def _normalise_token(tok: str) -> str:
        t = tok.strip().lower()
        t = " ".join(t.split())  # <-- Collapse internal spaces
        return t
# ---------------------------------------------------------------

# FUNCTION | Parse Combo String to Keyboard Format
# ------------------------------------------------------------
def _parse_combo_to_keyboard(combo: str) -> str:
        """Convert human string like '(Alt Gr + E)' to 'alt gr+e'"""
        c = combo.strip()
        if c.startswith("(") and c.endswith(")"):
            c = c[1:-1].strip()

        parts = [p.strip() for p in c.split("+")]
        norm: List[str] = []
        for p in parts:
            p_norm = _normalise_token(p)
            if p_norm in _MOD_MAP:
                norm.append(_MOD_MAP[p_norm])
            else:
                norm.append(p_norm)
        return "+".join(norm)
# ---------------------------------------------------------------
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Application Resolution and File Opening
# -----------------------------------------------------------------------------

# FUNCTION | Expand Environment Variables
# ------------------------------------------------------------
def _expand_env(p: str) -> str:
        return os.path.expandvars(p)
# ---------------------------------------------------------------

# FUNCTION | Find Application Executable
# ------------------------------------------------------------
def _find_app_exec(app_name: str) -> Optional[str]:
        """Find app executable using configured paths or PATH"""
        apps = CFG.get("apps", {})
        entry = apps.get(app_name)
        if not entry:
            return None
            
        paths = entry.get("paths", [])
        for raw in paths:
            candidate = _expand_env(raw)
            if os.path.sep not in candidate and candidate.lower().endswith(".exe"):
                from shutil import which
                found = which(candidate)
                if found:
                    return found
            if Path(candidate).exists():
                return candidate
                
        from shutil import which
        bare = app_name if app_name.lower().endswith(".exe") else f"{app_name}.exe"
        return which(bare)
# ---------------------------------------------------------------

# FUNCTION | Open File with Specified Application
# ------------------------------------------------------------
def _open_with_app(app: Optional[str], target_path: str) -> None:
        """Open target with specified app or default system handler"""
        p = Path(target_path)
        if not p.exists():
            raise FileNotFoundError(f"Target not found: {p}")

        if app:
            exe = _find_app_exec(app)
            if exe:
                subprocess.Popen([exe, str(p)], close_fds=True)
                return
            from shutil import which
            fallback = which(app) or which(f"{app}.exe")
            if fallback:
                subprocess.Popen([fallback, str(p)], close_fds=True)
                return
        os.startfile(str(p))  # type: ignore[attr-defined]
# ---------------------------------------------------------------
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Action Handlers
# -----------------------------------------------------------------------------

# FUNCTION | Open Path Action
# ------------------------------------------------------------
def action_open_path(target: str, app: Optional[str]) -> None:
        try:
            _open_with_app(app, target)
        except Exception as e:
            if CFG.get("debug", False):
                print(f"[ERROR] open_path failed: {e}")
# ---------------------------------------------------------------

_ACTIONS = {
    "open_path": action_open_path
}
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Hotkey Binding Management
# -----------------------------------------------------------------------------

# FUNCTION | Bind Single Mapping
# ------------------------------------------------------------
def _bind_mapping(mp: Dict[str, Any]) -> None:
        combo_raw = mp.get("combo", "")
        action = mp.get("action")
        target = mp.get("target")
        app = mp.get("app")

        if not combo_raw or not action:
            if CFG.get("debug", False):
                print(f"[WARN] Invalid mapping skipped: {mp}")
            return

        combo = _parse_combo_to_keyboard(combo_raw)
        func = _ACTIONS.get(action)
        if not func:
            if CFG.get("debug", False):
                print(f"[WARN] Unknown action '{action}'")
            return

        def _callback():
            if CFG.get("debug", False):
                print(f"[INFO] Hotkey fired: {combo_raw} -> {action}")
            func(target, app)

        try:
            _keyboard.add_hotkey(combo, _callback, suppress=False)
            if CFG.get("debug", False):
                print(f"[OK] Bound {combo_raw} -> {action}")
        except Exception as e:
            if CFG.get("debug", False):
                print(f"[ERROR] Failed to bind {combo_raw}: {e}")
# ---------------------------------------------------------------
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | System Tray Icon Management
# -----------------------------------------------------------------------------

# FUNCTION | Load Noble Architecture Icon for Tray
# ------------------------------------------------------------
def _load_tray_icon() -> _PIL.Image:
        """Load Noble Architecture icon for system tray display"""
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Define icon paths using same logic as icon loader utility
        icon_url = "https://www.noble-architecture.com/assets/AD05_-_LIBR_-_Common_-_Icons-and-favicons/AD05_05_-_NA_Favicon_-_PNG-h192px.png"
        cached_icon_path = os.path.join(script_dir, "..", "..", "02__Python__CommonLocalCodeLibs", "custom_icon.png")
        noble_asset_path = os.path.join(script_dir, "..", "..", "00__Python__CommonDependencyFiles", "Na__CommonBrandAssets", "CustomAppIcon__NobleArchLogo.png")
        
        # Normalize paths
        cached_icon_path = os.path.normpath(cached_icon_path)
        noble_asset_path = os.path.normpath(noble_asset_path)
        
        # Try to load icon with fallback hierarchy
        for icon_path in [cached_icon_path, noble_asset_path]:
            try:
                if os.path.exists(icon_path):
                    img = _PIL.open(icon_path)
                    # Resize to standard tray icon size
                    img = img.resize((32, 32), _PIL.LANCZOS)
                    return img
            except Exception:
                continue
        
        # Create a simple fallback icon if none found
        img = _PIL.new('RGBA', (32, 32), (0, 100, 200, 255))  # <-- Blue square fallback
        return img
# ---------------------------------------------------------------

# FUNCTION | Create System Tray Icon
# ------------------------------------------------------------
def _create_tray_icon():
        """Create and manage system tray icon"""
        icon_image = _load_tray_icon()
        
        def on_exit(icon, item):
            icon.stop()
            os._exit(0)  # <-- Force exit to ensure clean shutdown
        
        def on_about(icon, item):
            def _message_box(title: str, text: str):
                ctypes.windll.user32.MessageBoxW(0, text, title, 0x00000040)
            _message_box("AltGr Hotkey Launcher", "Noble Architecture Hotkey Manager\nPress Alt Gr + E to open email templates")
        
        menu = _pystray.Menu(
            _pystray.MenuItem("About", on_about),
            _pystray.MenuItem("Exit", on_exit)
        )
        
        tray_icon = _pystray.Icon(
            "noble_hotkey_manager",
            icon_image,
            "Noble Architecture Hotkey Manager",
            menu
        )
        
        return tray_icon
# ---------------------------------------------------------------
# endregion -------------------------------------------------------------------

# -----------------------------------------------------------------------------
# REGION | Main Execution
# -----------------------------------------------------------------------------

# FUNCTION | Main Entry Point
# ------------------------------------------------------------
def main():
        if CFG.get("debug", False):
            print("[INFO] AltGr Hotkey Launcher starting...")
            
        # Bind hotkey mappings
        maps = CFG.get("mappings", [])
        for mp in maps:
            _bind_mapping(mp)

        if CFG.get("debug", False):
            print("[INFO] Hotkeys bound. Creating system tray icon...")
        
        # Create and start system tray icon in a separate thread
        tray_icon = _create_tray_icon()
        
        def run_tray():
            try:
                tray_icon.run()
            except Exception as e:
                if CFG.get("debug", False):
                    print(f"[ERROR] Tray icon failed: {e}")
        
        tray_thread = threading.Thread(target=run_tray, daemon=True)
        tray_thread.start()
        
        if CFG.get("debug", False):
            print("[INFO] System tray icon active. Ready for hotkeys. Press Ctrl+C to exit.")
        
        try:
            # Keep the main thread alive for keyboard listener
            _keyboard.wait()
        except KeyboardInterrupt:
            if CFG.get("debug", False):
                print("[INFO] Shutting down...")
            tray_icon.stop()
# ---------------------------------------------------------------

if __name__ == "__main__":
    main()
# endregion -------------------------------------------------------------------
