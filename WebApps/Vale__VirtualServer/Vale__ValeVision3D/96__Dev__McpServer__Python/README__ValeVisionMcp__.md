# 96__Dev__McpServer__Python

An MCP server that lets an agent work ValeVision 3D through named tools: open a project in the real app, look at it, measure it, change its planting, and publish it. Adam, 04-Nov-2026: "Create MCP tools to orchestrate and control ValeVision 3D if the tools don't already exist, to allow you to access it."

PC only: `9?__Dev__*/` and `*.py` never sync, so nothing here reaches the server, and a change here needs no app version or service worker bump.

## Starting It

Registered in `~/.claude.json` as `valevision3d`, beside `sketchup`, so a new Claude Code session has its tools as `mcp__valevision3d__*`. A session that was already open when it was registered does not.

```bash
python Na__ValeVisionMcp__Server__Main__.py --check
```

```bash
python Na__ValeVisionMcp__Selftest__.py
```

`--check` lists the tools and what it can see. The self-test runs the protocol and the refusals, and touches no real data and no server.

Python 3.9+ and nothing else for the protocol. Playwright with Edge (`msedge`) to open the app. Node 22 for the plant sums.

## Two Places a Record Can Be

| | What | Who may write |
|---|---|---|
| **sandbox** | This server's own testing server: port 8042, `%LOCALAPPDATA%\ValeVision__TestServer\Agents\port_8042\Sandbox`, fake users, a copy of the record, models falling through to the mirror | Anything, any time |
| **real** | The PC's mirror, which a push sends to the live server | Only with `confirm_real_data`, when the person has asked. Refused if the server's copy is newer |

Agents never sign in on real data. The real record is written with the API's own `Na__Library__WriteJson`: the same lock, the same kept revision (named `__ValeVisionMcp`), the same `_rev`.

## The Tools

| Tool | What |
|---|---|
| `vv3d_status` | Start here: app version, last deploy, testing server, browser, gateway |
| `vv3d_project_list`, `vv3d_project_get` | The library, and a record's keys, sizes and scenes; a value only when named |
| `vv3d_vegetation_library` | Every plant that can be planted, with what it measures |
| `vv3d_vegetation_get` | The planting as the app will draw it: per path, how many of what, measuring what. `include_plants` for each plant |
| `vv3d_vegetation_edit` | Transparency, palettes, paths, new paths, the Linear Tool's defaults. `dry_run` writes nothing. Sandbox by default |
| `vv3d_entourage_library` | Every figure that can be placed, with what it measures and the SketchUp component it came from |
| `vv3d_entourage_import_skp` | Read flat figure components through the running SketchUp into `54__Entourage__AssetLibrary`, then index and validate. The open model is left as it was |
| `vv3d_entourage_get`, `vv3d_entourage_edit` | A project's people as the app will draw them; switch on, place, move, scale, swap, remove, line rules. `dry_run` writes nothing. Sandbox by default |
| `vv3d_entourage_preview` | Show or Transparency for people on the page, saving nothing |
| `vv3d_promote_to_real` | Copy named keys from the sandbox record to the real one |
| `vv3d_sandbox_start`, `_stop`, `_load_project` | The testing server, and a copy of a project in it |
| `vv3d_open`, `vv3d_close` | The real app in headless Edge, as AppAdmin, Management, Employee, Affiliate, Client or Nobody. `gpu: true` opens in seconds; software rendering takes about a minute. `phone: true` for a phone |
| `vv3d_view` | A saved scene by name, or a camera in integer mm |
| `vv3d_screenshot` | A picture, the app's panels hidden unless `hide_ui` is false. `selector` or `clip` takes just that part |
| `vv3d_page_state` | The plants on the page; what is open: Tools & Settings sections unfolded, the Vegetation and Entourage panels with their open section, and the tool on the model; the overlay's lists, script errors and failed requests |
| `vv3d_vegetation_preview` | Show or Transparency on the page, saving nothing |
| `vv3d_probe_surface` | The real surface at plan spots: height and object. How a bed's edges are found |
| `vv3d_eval` | JavaScript in the sandbox page, for anything else |
| `vv3d_mouse`, `vv3d_key` | A real pointer and keyboard. Aim by client pixels or a spot in the model. Move, click, right-click, press, release, drag, wheel, each saying what the pointer ended up over |
| `vv3d_click` | Clicks like a person: refuses, naming what is on top, when something covers it |
| `vv3d_ui_read` | What is really on screen: its words and state, what is clipped or runs past its panel, and any panel scrolling sideways |
| `vv3d_world_to_screen` | A spot in the model as client pixels, and what would really be pressed there |
| `vv3d_run_module` | A scratch `.js` served among the app's modules, so its relative imports reach the app's own instances. No CORS server |
| `vv3d_level_walk` | A project opened afresh at every level: the sections and rows each gets, files fetched, failures. `phone: true` for a phone |
| `vv3d_api_call` | One request to the sandbox's API as any level, a client link or signed out |
| `vv3d_shot_compare`, `vv3d_contact_sheet` | Two pictures with what differs in red and how many pixels, or several on one labelled sheet. No page needed |
| `vv3d_shot_series` | The same views shot one after another (saved scenes or cameras in mm), with a module run before each, for before-and-after sets |
| `vv3d_linework_survey` | With no browser: which line segments of one project, or of the whole library, the ornament fade draws lightly, where they are and which GLB nodes hold them |
| `vv3d_scene_changes` | Who placed what and what waits for an admin. Reads sandbox or real. Approve and revert on the sandbox only |
| `vv3d_consumers` | Every file naming a key, function or event: the app, API, developer tools, Gallery, Server Manager, Cloud Sync, GLB Builder |
| `vv3d_patch_file` | Anchored edits keeping each file's line endings, every anchor checked before anything is written. Refuses client data |
| `vv3d_check` | The skill's static checks and the libraries' validators, in one call |
| `vv3d_reload_tools` | Reads the tool files again, new ones too, and tells the client, so a tool written in a session can be used in it |
| `vv3d_server_compare` | What would move, for a project, the app or its API |
| `vv3d_server_collect_project` | Bring a project's newer files down |
| `vv3d_server_push_project`, `vv3d_server_push_app` | `dry_run` by default. Refuse a delete, and a server copy newer than the PC's |
| `vv3d_live_check` | The public site, signed out, no ssh |

## The Usual Jobs

**Change a project's planting, and publish it** (only when the person has asked for it):

1. `vv3d_sandbox_start`, `vv3d_sandbox_load_project`.
2. `vv3d_vegetation_get`, and `vv3d_probe_surface` across a bed if its size matters.
3. `vv3d_vegetation_edit` on the sandbox, `vv3d_open`, `vv3d_view`, `vv3d_screenshot`. Look at the plan from above: a stretched plant runs straight, so one across a corner of a path pokes past the wall. A path's seed decides what lands where.
4. `vv3d_server_collect_project`, then the same edit with `target: real` and `confirm_real_data: true`.
5. `vv3d_server_push_project`: read the list, then `dry_run: false`.

**Test a change as each person would** (Adam tests too, but this finds what a synthetic event hides):

1. `vv3d_check`, and `vv3d_consumers` for any key or function that changed.
2. `vv3d_open` with `gpu: true` and `as_level`, `vv3d_click` to the panel, `vv3d_mouse` on the model, `vv3d_ui_read` for what shows.
3. `vv3d_level_walk`: who gets what, and did a client fetch anything they should not.
4. `vv3d_screenshot` before and after, then `vv3d_shot_compare`.

## Rules That Bite

- **Staff's changes wait; the record is what is approved.** `vv3d_vegetation_edit` and `vv3d_entourage_edit` write the record directly, as a SketchUp sync does, and are noted in the changes file under this server's name. They do not wait for an admin, so on a real project they are only for when the person has asked.
- **Tools run one at a time, on one thread.** Playwright's sync API belongs to the thread that started it, and only one job may ever talk to the server.
- **The server is reached only through the Server Manager's engine,** never ssh. A gateway refusal is final for now: say so, do not retry.
- **Nothing here deletes on the server or forces a push.** Those take the person's own word, through the `vgh-app-server` skill. An API push is not here: it needs a service restart.
- **Every viewer opens a project at its saved Show and Transparency** (v2.98.4). `transparency_percent` and `show_by_default` on `vv3d_vegetation_edit` and `vv3d_entourage_edit` set them, as a staff member does by moving the slider or tick and saving. Devices no longer remember a choice.
- **The plant sums are the app's own modules, in Node.** `Na__ValeVisionMcp__VegetationSums__.mjs` imports them. There is no copy to keep in step.
- **`Na__ValeVisionMcp__PageHelpers__.js` goes on an agent's page only.** Nothing in the app loads it. It reaches the app by importing the same module URLs, which gives the same instances.
- **The 404 for `/ValeApps__DeployStamp__.json` on the testing server is expected:** only the live server has that file.

## Files

| File | What |
|---|---|
| `Na__ValeVisionMcp__Server__Main__.py` | The entry point, on stdio |
| `Na__ValeVisionMcp__Server__Protocol__.py` | MCP over JSON-RPC, both protocol eras, as the Na SketchUp MCP does |
| `Na__ValeVisionMcp__Server__Core__.py` | Paths, the tool registry, results, the record, the engine |
| `Na__ValeVisionMcp__Tools__Project__.py` | Status and reading records |
| `Na__ValeVisionMcp__Tools__Vegetation__.py` | Reading and changing planting |
| `Na__ValeVisionMcp__Tools__Entourage__.py` | The people's library, reading and changing a project's figures, bringing new figures in from SketchUp |
| `Na__ValeVisionMcp__EntourageSkpReader__.rb` | Run inside SketchUp: reads a folder of `.skp` components as JSON, changing nothing |
| `Na__ValeVisionMcp__Tools__LiveApp__.py` | The testing server and the browser |
| `Na__ValeVisionMcp__Tools__Server__.py` | Compare, collect, push |
| `Na__ValeVisionMcp__Tools__Testing__.py` | A real mouse and keyboard, what is on screen, every level, the API as any level, comparing pictures |
| `Na__ValeVisionMcp__Tools__SceneAssets__.py` | Who placed what |
| `Na__ValeVisionMcp__Tools__Workshop__.py` | Consumers of a name, anchored edits, the checks, reloading the tools |
| `Na__ValeVisionMcp__Tools__Series__.py` | Shot series |
| `Na__ValeVisionMcp__Tools__Linework__.py` | The linework survey tool |
| `Na__ValeVisionMcp__LineworkSurvey__.mjs` | The ornament fade's own sums (`Na__RenderEffect__OrnamentFade__Core__.js`) over linework GLBs, in Node |
| `Na__ValeVisionMcp__PageHelpers__.js` | What runs on the page |
| `Na__ValeVisionMcp__VegetationSums__.mjs` | The app's plant sums, in Node |
| `Na__ValeVisionMcp__EntourageSums__.mjs` | The app's figure sums, in Node |
| `Na__ValeVisionMcp__Selftest__.py` | The protocol and the refusals |

A new tool is one `@Na__Tool` function in the file for its subject, or a new `Na__ValeVisionMcp__Tools__*.py`, and then `vv3d_reload_tools`. Add a new file to the imports in `Server__Main` too, so the next start has it. Its description is what an agent reads to choose it, so say what it does and what it refuses.
