# PhotoMeasurePro (ValeSpec-Style Rebuild)

PhotoMeasurePro is now rebuilt as a ValeSpec-style modular JavaScript app with a Flask localhost server entrypoint.

## Localhost Run

1. Open terminal in `WebApps/PhotoMeasurePro`.
2. Run:

```bash
python PhotoMeasurePro__FlaskServer__Localhost__.py
```

3. Open:

`http://127.0.0.1:8003/PhotoMeasurePro__App__.html`

## Notes

- Opening `PhotoMeasurePro__App__.html` directly via `file://` is now supported with inline config fallback.
- Full browser-safe behavior is still best via Flask (`http://127.0.0.1:8003/...`) to avoid file-origin security restrictions.

## Architecture

- `PhotoMeasurePro__App__.html` is the script-order shell.
- `02__Src__AppModules` contains app core, data, math, and system modules.
- `03__Style__AppStylesheets` is the CSS hub + split style layers.
- `PhotoMeasurePro__FlaskServer__Localhost__.py` is the local static server.

## Rebuild Notes

- Legacy React/TypeScript/Vite implementation has been replaced.
- Core feature parity target is documented in `PhotoMeasurePro__ParityChecklist__.md`.

- Development history is tracked in `PhotoMeasurePro__DEVLOG__.md`.
