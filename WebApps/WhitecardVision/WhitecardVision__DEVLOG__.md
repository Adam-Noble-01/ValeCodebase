# =============================================================================
# WHITECARDVISION |  DEVELOPMENT LOG
# =============================================================================
- Add latest changes to the top of the file.
- Older changes descend in chronological order.

# -----------------------------------------------------------------------------
## WhitecardVision - v0.2.0 - 22-Apr-2026 - First GH Push

# -----------------------------------------------------------------------------

## WhitecardVision - v0.1.0 - 22-Apr-2026 - Initial Buildout
# -----------------------------------------------------------------------------

### Scope completed
- Full Flask backend on port 8004 with **stdlib-only** server
  (`ThreadingHTTPServer`). No pip dependencies.
- Routes implemented:
  - `GET  /api/health`
  - `GET|POST|PUT|DELETE /api/projects[/:name]`
  - `GET  /api/templates/tree`
  - `GET  /api/templates/read?path=...`
  - `POST /api/images/upload`
  - `POST /api/generate/render`
  - `POST /api/generate/edit`
- Gemini proxy with hard block on any model id matching `flash-image`.
- Year-based project folder creation (`Projects__YYYY/{name}__WcVisData/`
  with the full 7-subfolder tree).
- Server-side aspect-ratio validation (hand-rolled PNG/JPEG header
  parser so we stay zero-dep).
- `.env` loader (stdlib) with `.env.example`, `.gitignore`, and setup
  `README.md` in `06__ExernalApiAndWorkers/01__Secrets/`.
- Launchers: `.py` and `.ps1` (port-busy prompt, health check,
  auto-open).

### Front-end
- Namespace `Wv__` enforced across every module.
- IIFE modules mount onto `window.Wv__<FQ Name>` exactly like ValeSpec.
- `AppCore` boot sequence:
  `ConfigLoader → StateManager → ModeManager → Per-mode Controllers`.
- System-local CSS + per-System Config JSONs (Render / Edit / Filter /
  Final Preview) - all imported by the central
  `WhitecardVision__CoreUi__Styles__Index__.css` hub.
- Prompt Constructor: 4 modules - `LoadMarkdown`, `BuildImageList`
  (Whitecard always at index 0), `BuildStructuredPrompt`,
  `BuildFinalPayload` (`imageConfig.imageSize="2K"` default).

### Render Mode
- ProjectMetaPanel · WhitecardSlot · ReferenceImageList (Material +
  Style, **10 combined cap**) · TemplatesTree · OutputPanel ·
  Controller.
- Generate flow: build-payload → save-project → proxy → persist
  PNG under `20__FinalExport__RenderMode/` → display.

### Edit Mode
- IterationList (New / Duplicate / Delete) — iterations live in
  `Wv__Project__EditIterations[]`, never overwritten.
- BaseSlot — per-iteration base image, aspect re-snapped on upload.
- PromptPanel — Target-Element / Preserve / Avoid fields.
- OutputPanel + Controller with `/api/generate/edit` flow.

### Filter Suite
- Placeholder controller only (no interactive behaviour this build).

### Final Preview
- Minimal viewer: flip between latest render and active edit output.

### Known limitations
- Gemini endpoint may take 30-60s per call; UI is locked during that.
- Filter Suite is intentionally inert - reserved for a later phase.
- No multi-user auth; single-user local workstation only.

### Follow-ups (not in scope for v0.1.0)
- Filter Suite actual tools (colour grade / composite).
- Better error surfacing for Gemini safety-filter rejections.
- Bulk export of all iterations.

# -----------------------------------------------------------------------------
