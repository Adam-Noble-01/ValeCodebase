# ValeVision AURA - The Core Engine, Version-Locked

AURA is a wrapper round **PainterlyNPR**, Adam's pen and wash renderer. This folder holds pinned copies of its engine,
one folder per version, each byte for byte as it was at a commit of PainterlyNPR's repository.

| # | Folder | Engine | Version | Commit | Entry AURA uses |
|---|--------|--------|---------|--------|-----------------|
| 01 | `01__CoreLib__PainterlyNPR__v0.5.0` | PainterlyNPR | 0.5.0 | 29bbcf1 | None since AURA 0.2.0: kept until Adam has checked a newer one, then removed by hand |
| 01 | `01__CoreLib__PainterlyNPR__v0.6.0` | PainterlyNPR | 0.6.0 | e28fba5 | None since AURA 0.4.0: kept until Adam has checked v0.8.2, then removed by hand |
| 01 | `01__CoreLib__PainterlyNPR__v0.8.2` | PainterlyNPR | 0.8.2 (with v0.8.1) | 70e63eb | None since AURA 0.4.3: kept until Adam has checked v0.8.3, then removed by hand (AURA 0.4.0 to 0.4.2; first synced at 69b2e36, re-synced when v0.8.1 was committed) |
| 01 | `01__CoreLib__PainterlyNPR__v0.8.3` | PainterlyNPR | 0.8.3 (with v0.8.0 and v0.8.1): the A3 sheet | c1917f0 | None since AURA 0.4.6: kept until Adam has checked v0.8.5, then removed by hand (AURA 0.4.3 to 0.4.5) |
| 01 | `01__CoreLib__PainterlyNPR__v0.8.5` | PainterlyNPR | 0.8.5 (with v0.8.4): Page whiteness and the folding panel | aea59fd | `02__Src__AppModules/` through the import map's `PainterlyNPR/` prefix, as v0.8.3 was (AURA 0.4.6 on) |

AURA 0.4.0 was first tested on a working-tree pin (`v0.7.4`, DIRTY), deleted once v0.8.2 was committed and synced
from the commit: it was never pushed.

## What a Pin Holds

- `02__Src__AppModules`, whole: every module, config and stylesheet part.
- Beside it, what the engine reads at run time from outside its modules (since AURA 0.4.0, sync 1.1.0), only these
  file types: `12__Data__AssetLibrary` (the asset library's index, register and DATs, its RND and PXY pictures: .json,
  .webp; since sync 1.2.0 its MOD models, .glb, which AURA's API copies into a project when an asset is placed),
  `07__Data__MaterialRecipes` (the material register and swatches: .json, .webp) and `03__Style__AppStylesheets`
  (.css: the engine's design tokens, which AURA's host links). Never the SketchUp sources (.skp).
- They sit as in PainterlyNPR's repository because the engine finds them from its own files (since PainterlyNPR
  v0.8.2): a pin needs no path of AURA's to read them.

## Rules

- **Never edit a copy, and never copy the engine into AURA's own files** (Adam, 30-Oct-2026: "dont duplicate code the
  npr repo remains definitive source"): no code, config value, data, stylesheet or piece of its interface. The
  engine's single source of truth is PainterlyNPR's own repository
  (`D:\11_RefLib__StudioRepository__RemoteSystem\Na__PainterlyNPR`; `C:\01_Code\Na__PainterlyNPR` on another machine;
  `PAINTERLYNPR_DIR` overrides). Change it there, by its own rules (its skill: commit only on Adam's word), then sync.
  What AURA needs that the engine lacks is added there as a seam.
- **Sync:** `python 60__Dev__WebBuildUtils/AuraRender__BuildUtil__SyncCoreEngine__.py` copies the engine at
  PainterlyNPR's HEAD commit (git archive, the repository's own bytes, whatever else is open in its working tree) into
  the version's folder, and writes `PainterlyNPR__CoreLib__VersionLock__.json` (version, commit, where it was copied
  from, a SHA-256 per file, and the hash of the engine's AppCore Init, which AURA's host mirrors). `--allow-dirty`
  copies the working tree instead: a local test, marked `WorkingTreeClean: false`, never pushed.
- **Check:** `... --check` proves each copy against its lock and says whether PainterlyNPR has moved on.
- **A new version is a new folder.** Then: point the import map in `index.html` and its record
  `Vale__CoreEngine__ImportMap__Index__.json` at it; read `02__Src__AppModules/10__System__EngineHost/
  Na__EngineHost__PainterlyNpr__.js` against the new Init (the sync says when Init changed); bump AURA's service
  worker version (`AURA_VERSION` names the engine cache, so a re-sync of the same version needs the bump too, or
  browsers keep the files they cached); remove the old folder once Adam has checked the new one. The script never
  deletes a folder.
- **Never push a dirty pin.** While the import map points at one, the `aura` lane waits.
- **The other wrapper:** Noble Architecture's TrueVision 3D wrapper will pin the same engine the same way. When it
  does, the boot seam moves into PainterlyNPR as `07__System__LibraryHost` and both wrappers call it.
- The service worker keeps these files on the device (cache first, in a cache named by its `AURA_VERSION`).
