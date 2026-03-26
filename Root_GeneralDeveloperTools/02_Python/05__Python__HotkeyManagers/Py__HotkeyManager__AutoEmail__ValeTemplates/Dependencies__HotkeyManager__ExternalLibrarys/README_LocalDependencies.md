# Local Dependencies for Hotkey Manager

This folder contains all required Python packages installed locally to make the hotkey manager fully portable and self-contained.

## Installed Packages

### Core Dependencies
- **keyboard** (v0.13.5) - Global hotkey detection and handling
- **pystray** (v0.19.5) - System tray icon functionality  
- **Pillow/PIL** (v11.3.0) - Image processing for icon loading
- **six** (v1.17.0) - Python 2/3 compatibility utilities (dependency of pystray)

## Installation Command Used
```powershell
pip install --target . pystray
```

This command automatically installed:
- pystray (main package)
- Pillow (dependency for image handling)  
- six (dependency for compatibility)

The `keyboard` package was already present from previous installation.

## Benefits of Local Installation
- **Portable**: App runs without requiring pip install on target machines
- **Self-contained**: All dependencies packaged with the application
- **Version-locked**: Prevents conflicts with system-wide package updates
- **Deployment-ready**: Can be packaged and distributed as-is

## Usage in Script
The main script automatically adds this folder to Python path:
```python
deps_dir = os.path.join(base_dir, "Dependencies__HotkeyManager__ExternalLibrarys")
sys.path.insert(0, deps_dir)
```

This ensures all local dependencies are loaded before attempting system-wide imports.
