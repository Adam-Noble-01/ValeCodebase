# Whitecardopedia Restructure Scope Guardrail

## Immutable Folder
- `WebApps/Whitecardopedia/Projects/`

## Hard Exclusions
- No rename operations under `Projects/`
- No move operations under `Projects/`
- No delete operations under `Projects/`
- No JSON content edits in any `Projects/**/project.json`
- No image asset edits in any `Projects/**/*.{png,jpg,jpeg,gif,webp,svg}`

## Included Restructure Scope
- `app.html`, `index.html`
- Runtime source layout under `02__Src__AppModules/`
- Stylesheet layout under `03__Style__AppStylesheets/`
- Runtime dependency location under `02__Src__AppModules/01__AppDependencies__VersionLocked/`
- Documentation updates under `README.md` and `04__Docs/`
