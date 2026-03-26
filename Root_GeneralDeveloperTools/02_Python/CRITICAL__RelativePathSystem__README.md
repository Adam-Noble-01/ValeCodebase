# CRITICAL: Relative Path System

## 🔴 MANDATORY REQUIREMENT

**ALL file references in this codebase MUST use relative paths from the `02_Python/` root directory.**

## Why This Matters

### ✅ **Portability**
- Code works across different devices and environments
- No hardcoded absolute paths that break when moved
- Easy deployment and sharing between team members

### ✅ **Cross-Platform Compatibility**
- Works on Windows, macOS, and Linux
- No drive letter dependencies (C:\, D:\, etc.)
- Consistent behavior regardless of installation location

### ✅ **Repository Structure**
```
02_Python/                    <-- ROOT REFERENCE POINT
├── 00__Python__CommonDependencyFiles/
├── 02__Python__CommonLocalCodeLibs/     <-- You are here
├── 03__Python__CommonConfigFiles/
└── [other directories...]
```

## Correct vs Incorrect Examples

### ❌ **WRONG - Absolute Paths**
```python
# NEVER DO THIS
icon_path = "C:/03_-_Adam-Noble-Tools/02_-_Python/assets/icon.png"
config_path = "D:/Projects/Python/config/settings.json"
```

### ✅ **CORRECT - Relative Paths**
```python
# From 02__Python__CommonLocalCodeLibs/
noble_assets = "../00__Python__CommonDependencyFiles/Na__CommonBrandAssets/"
config_backup = "../03__Python__CommonConfigFiles/"
dependencies = "./SnPy_MasterPipDependencies.txt"
```

## Implementation Standard

All scripts must calculate paths relative to the `02_Python/` root:

```python
# Get current script directory
script_dir = os.path.dirname(os.path.abspath(__file__))

# Navigate relative to 02_Python root
asset_path = os.path.join(script_dir, "..", "00__Python__CommonDependencyFiles", "asset.png")
asset_path = os.path.normpath(asset_path)  # Cross-platform compatibility
```

## 🚨 **ENFORCEMENT**

**Any script using absolute paths will be rejected.** All file references must be relative to maintain portability and cross-device compatibility.

---
*This system ensures the entire `02_Python/` directory can be moved anywhere and continue working without modification.*
