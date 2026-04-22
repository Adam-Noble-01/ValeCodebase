# WhitecardVision

**Professional Image Editing Platform** - Whitecard-driven image rendering
& editing environment powered by Google's `gemini-3-pro-image-preview`
(Nano Banana Pro) model.

## Prerequisites

- **Python 3.9+** on PATH (no third-party pip packages required).
- A **Google Gemini API key** from <https://aistudio.google.com/apikey>.

## First-time Setup

1. Open `06__ExernalApiAndWorkers/01__Secrets/.env` and paste your key
   after `GEMINI_API_KEY=`.
2. Launch:

   ```powershell
   .\WhitecardVision__LaunchFlaskServer__Localhost__.ps1
   ```

   or

   ```bash
   python .\WhitecardVision__LaunchFlaskServer__Localhost__.py
   ```

3. The browser auto-opens to
   <http://127.0.0.1:8004/WhitecardVision__App__.html> once the server is
   healthy. If port 8004 is busy the launcher will prompt to Restart/Open/Exit.

## Navigation

Top bar: **Render Image / Editor Mode / Filter Suite / Final Preview**

Hotkeys:

- `Ctrl+1..4` - switch mode
- `Ctrl+S`    - save the active project JSON

## Render Mode - quick tour

1. **Project Meta** - type a name, hit **New**. A full project tree is
   created under `04__LocalProjectData/Projects__YYYY/{name}__WcVisData/`.
2. **Whitecard** - upload your structural wireframe + write a prompt.
   The aspect ratio is read from the image and locked into the request.
3. **Material / Style references** - up to 10 combined, each with its
   own prompt field. Matches the spec's strict post-Whitecard ordering.
4. **Avoid** - free-text list; concatenated after the standard
   "Avoid The Following" markdown.
5. **Templates sidebar** - markdown files from `10__Local__PromptTemplates`
   click-to-insert at the cursor of whichever prompt field you last focused.
6. **Generate** - builds the strict payload, pipes through Flask to the
   Gemini endpoint, writes the PNG to `20__FinalExport__RenderMode/`, and
   displays it.

## Editor Mode

- Iteration list on the left (New / Duplicate / Delete).
- Each iteration stores its own base image, Target / Preserve / Avoid
  prompts, and last output under
  `30__FinalExport__EditMode/{iterationId}/`.
- Multiple iterations coexist in the project JSON without overwriting.

## Filter Suite / Final Preview

Filter Suite is a UI placeholder for later builds. Final Preview is a
minimal viewer to flip between the most recent render and the active
edit.

## Security model

The Gemini API key **NEVER** reaches the browser:

- `.env` lives in `06__ExernalApiAndWorkers/01__Secrets/` (gitignored).
- The Flask server proxies `POST /api/generate/render` and
  `POST /api/generate/edit` to Gemini and strips / injects headers
  server-side.
- A hard block rejects any model id containing `flash-image` per spec.

## Aspect ratio enforcement

Every Whitecard upload is parsed in the browser AND re-parsed on the
server (stdlib PNG/JPEG header readers - no Pillow). The width/height is
snapped to the nearest Gemini-supported ratio (log-distance metric) and
that ratio is attached to every generation request. The server refuses
to forward a request whose declared `aspectRatio` doesn't match the
first image in `contents[0].parts`.

## Folder layout

```
WhitecardVision/
├── WhitecardVision__App__.html                        ← entry
├── WhitecardVision__LaunchFlaskServer__Localhost__.ps1
├── WhitecardVision__LaunchFlaskServer__Localhost__.py
├── 02__Src__AppModules/
│   ├── 01__AppCore/               StateManager, ConfigLoader, ModeManager, Init
│   ├── 02__AppData/                AppConfig JSON, ProjectFileManager, Validator
│   ├── 03__AppUtils/               Toast, Clipboard, ImageUpload, DateFormat, Hotkeys
│   ├── 04__MathUtils/              AspectRatio snap
│   ├── 10__System__RenderImageMode/  ← own CSS + Config JSON + modules
│   ├── 20__System__EditImageMode/    ← own CSS + Config JSON + modules
│   ├── 30__System__FilterSuite/      ← placeholder
│   └── 40__System__FinalPreview/
├── 03__Style__AppStylesheets/     core UI hub (imports per-System sheets)
├── 04__LocalProjectData/          Projects__YYYY/{name}__WcVisData/
├── 05__FlaskServerScripts/        Main, AspectRatio, EnvLoader
├── 06__ExernalApiAndWorkers/
│   ├── 01__Secrets/               .env, .env.example, .gitignore, README
│   └── 02__GoogleApis/            GeminiClient wrapper
├── 07__PromptConstructor/         LoadMarkdown, BuildImageList, BuildStructuredPrompt, BuildFinalPayload
└── 10__Local__PromptTemplates/    markdown templates (front-loaded + Vale standards)
```
