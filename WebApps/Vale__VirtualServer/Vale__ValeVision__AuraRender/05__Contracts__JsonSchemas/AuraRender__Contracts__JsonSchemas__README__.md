# 05__Contracts__JsonSchemas

**AURA's own contracts**, beside PainterlyNPR's (`11__Contracts__JsonSchemas` in the engine's repo, and its pinned
copy). JSON Schema draft 2020-12, each versioned on its own, in PainterlyNPR's form, so one checker reads both.

## Written

- `AuraRender__Schema__AuraScene__1.0.0__.json` (30-Oct-2026): a project's AURA scene,
  `<project>/ValeVision__AuraRender/UserData__AuraScene/<id>__AuraScene__.json`: the model files copied into the
  project, the engine objects made from them, and the library assets stored. The folder, the lanes, the import and the
  re-import: `AuraRender__SCHEMA__AuraScene__.md` at AURA's root. Its example: the schema project's
  `ValeVision__AuraRender/UserData__AuraScene/PROJECTNUMBER__PROJECTNAME__AuraScene__.json.example`. The first real
  scene: Thrower's (`63403__Thrower`, built 30-Oct-2026).

## Used, not owned

- The drawing set's `Settings.Assets` and `Settings.Materials` are PainterlyNPR's `AssetPlacement 1.0.0` and
  `MaterialAssignment 1.0.0`, unchanged.

## Not yet

- Nothing in AURA reads the scene yet: the AURA API (read, save, import), the engine's GLB scene and the page come next.
- The drawing set has no contract of its own yet: its schema is the `.example` in the schema project.

Rules: a new version is a new file (`...__1.1.0__.json`) with the old one kept; the API's checks and any build util read
only these files for their rules.
