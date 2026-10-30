# ValeVision AURA - The Core Engine, Version-Locked

AURA is a wrapper round **PainterlyNPR**, Adam's pen and wash renderer. This folder holds pinned copies of its engine,
one folder per version, each byte for byte as it was at a commit of PainterlyNPR's repository.

| # | Folder | Engine | Version | Commit | Entry AURA uses |
|---|--------|--------|---------|--------|-----------------|
| 01 | `01__CoreLib__PainterlyNPR__v0.5.0` | PainterlyNPR | 0.5.0 | 29bbcf1 | None since AURA 0.2.0: kept until Adam has checked v0.6.0, then removed by hand |
| 01 | `01__CoreLib__PainterlyNPR__v0.6.0` | PainterlyNPR | 0.6.0 | e28fba5 | `02__Src__AppModules/` through the import map's `PainterlyNPR/` prefix |

## Rules

- **Never edit a copy.** The engine's single source of truth is PainterlyNPR's own repository
  (`D:\11_RefLib__StudioRepository__RemoteSystem\Na__PainterlyNPR`; `C:\01_Code\Na__PainterlyNPR` on another machine;
  `PAINTERLYNPR_DIR` overrides). Change it there, by its own rules (its skill: commit only on Adam's word), then sync.
- **Sync:** `python 60__Dev__WebBuildUtils/AuraRender__BuildUtil__SyncCoreEngine__.py` copies the engine at its
  current commit into the version's folder and writes `PainterlyNPR__CoreLib__VersionLock__.json` (version, commit,
  clean tree, a SHA-256 per file, and the hash of the engine's AppCore Init, which AURA's host mirrors). It refuses
  uncommitted engine changes unless `--allow-dirty` (a local test, never pushed).
- **Check:** `... --check` proves each copy against its lock and says whether PainterlyNPR has moved on.
- **A new version is a new folder.** Then: point the import map in `index.html` and its record
  `Vale__CoreEngine__ImportMap__Index__.json` at it; read `02__Src__AppModules/10__System__EngineHost/
  Na__EngineHost__PainterlyNpr__.js` against the new Init (the sync says when Init changed); bump AURA's service
  worker version (`AURA_VERSION` names the engine cache, so a re-sync of the same version needs the bump too, or
  browsers keep the files they cached); remove the old folder once Adam has checked the new one. The script never
  deletes a folder.
- **The other wrapper:** Noble Architecture's TrueVision 3D wrapper will pin the same engine the same way. When it
  does, the boot seam moves into PainterlyNPR as `07__System__LibraryHost` and both wrappers call it.
- The service worker keeps these files on the device (cache first, in a cache named by its `AURA_VERSION`).
