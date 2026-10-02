"""W1-02 build: TrueVision's files at b2aa9151, whole, with ValeVision's listed seams re-applied.

Reads TV bytes with git show (LF), VV's seam code from VV HEAD (git show, LF), applies every
seam as an exact replacement whose count is asserted, and writes the three results to
scratch/W1-02/out/ (LF, as a whole-file port is written). Landing is a separate step (land.py).
"""
import os, subprocess, hashlib

SCR   = os.path.dirname(os.path.abspath(__file__))
OUT   = os.path.join(SCR, "out")
NAWEB = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
VCB   = r"D:\10_CoreLib__ValeCodebase"
PIN   = "b2aa9151"
TVAPP = "na-apps/30__TrueVision__CoreAppCode/"
DIR   = "02__Src__AppModules/25__System__3dObject__InteractionSystem/"
DOOR  = "3dObjectIInteraction__Animation__ClickToOpenDoors__.js"
FIND  = "Na__DoorAnimation__FindDoorGroups.js"
READ  = "3dObjectIInteraction__Animation__ClickToOpenDoors__README__.md"


def show(repo, spec):
    raw = subprocess.run(["git", "-C", repo, "show", spec], capture_output=True, check=True).stdout
    assert b"\r\n" not in raw, spec + " is not LF"
    return raw.decode("utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    assert count == 1, "%s: expected 1 match, found %d" % (label, count)
    return text.replace(old, new)


def between(text, start, end, label):
    """The text from start (inclusive) up to end (exclusive); both must be unique."""
    assert text.count(start) == 1, label + ": start marker count %d" % text.count(start)
    i = text.index(start)
    j = text.index(end, i)
    return text[i:j]


RULE = "// -----------------------------------------------------------------------------\n"
FN_RULE = "    // ------------------------------------------------------------\n"

tv_door = show(NAWEB, PIN + ":" + TVAPP + DIR + DOOR)
tv_find = show(NAWEB, PIN + ":" + TVAPP + DIR + FIND)
tv_read = show(NAWEB, PIN + ":" + TVAPP + DIR + READ)
vv_door = show(VCB, "HEAD:WebApps/ValeVision3D/" + DIR + DOOR)

# -----------------------------------------------------------------------------
# 1. The door module: TV 1.9.0 whole, ValeVision's seams re-applied
# -----------------------------------------------------------------------------
door = tv_door

# Seam H1 - banner token
door = replace_once(door,
    "// TRUEVISION3D - CLICK TO OPEN DOORS ANIMATION\n",
    "// VALEVISION3D - CLICK TO OPEN DOORS ANIMATION\n", "banner")

# Seam - NAMESPACE names the running app (every VV twin of a TV file with this line reads ValeVision3D)
door = replace_once(door,
    "// NAMESPACE  : TrueVision3D\n",
    "// NAMESPACE  : ValeVision3D\n", "namespace")

# Seam H5 - the PORT NOTE, between INTEGRATION and TV's DEVELOPMENT LOG
DOOR_PORT_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js\n"
    "// - Source version: 1.9.0 (TrueVision3D v2.42.0, 14-Sep-2026; read at b2aa9151), which carries 1.8.0\n"
    "//                   (TrueVision3D v2.10.0, 30-Aug-2026): left-button clicks and the context-menu exports\n"
    "// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-02}}, over ValeVision's own 1.7.1. Its history:\n"
    "//                   1.7.0 (10-Jul-2026, v2.9.12) took TrueVision's 1.7.0 multi-panel engine; the Video\n"
    "//                   Studio speed scale and base duration came with v2.13.0 (13-Aug-2026) and SnapAllClosed\n"
    "//                   with 1.7.1 (11-Sep-2026, v2.21.19)\n"
    "// - Parity        : adapted (TrueVision's file; ValeVision's Video Studio seam added back)\n"
    "// - Divergences   :\n"
    "//   - Banner and NAMESPACE read ValeVision3D. (The console lines keep TrueVision's [DoorAnimation]\n"
    "//     prefix, which names no app.)\n"
    "//   - Video Studio (ValeVision only): Na__DoorAnimation__SetSpeedScale, GetSpeedScale,\n"
    "//     GetBaseDurationMs and SnapAllClosed are exported; Update advances every door by deltaMs\n"
    "//     times the speed scale (1.0 unless a Video Studio preview or export sets it); SnapAllClosed\n"
    "//     settles every door and independent leaf shut without animating (Na__DoorAnim__SettleClosed).\n"
    "// - Back-port     : none (the four names serve ValeVision's Video Studio, which TrueVision does not have).\n"
    "//\n"
)
door = replace_once(door,
    "// - Call Na__DoorAnimation__Update(deltaMs) every frame in render loop.\n//\n" + RULE + "//\n// DEVELOPMENT LOG:\n",
    "// - Call Na__DoorAnimation__Update(deltaMs) every frame in render loop.\n//\n" + RULE + "//\n"
    + DOOR_PORT_NOTE + RULE + "//\n// DEVELOPMENT LOG:\n", "port note")

# Seam X2 - Video Studio: the speed-scale state (VV 1.7.1's line, verbatim)
VV_SPEED_LINE = "    let Na__DoorAnim__SpeedScale                        = 1.0;                   // <-- Global time scale; 0.5 = half speed\n"
assert vv_door.count(VV_SPEED_LINE) == 1
door = replace_once(door,
    "    let Na__DoorAnim__Config__IndependentPanelAdrNameTokens = ['ExteriorDoubleDoor']; // <-- Explicit ADR tokens allowed to animate independently\n",
    "    let Na__DoorAnim__Config__IndependentPanelAdrNameTokens = ['ExteriorDoubleDoor']; // <-- Explicit ADR tokens allowed to animate independently\n"
    + VV_SPEED_LINE, "speed scale state")

# Seam X2 - Video Studio: Update advances the doors on the scaled clock (VV 1.7.1's comment and line)
VV_SCALE_BLOCK = (
    "        // SPEED SCALE | Slowing the clock rather than the durations keeps every\n"
    "        // per-door relationship intact (a bifold stays three times a single\n"
    "        // leaf) and needs no change to the duration bookkeeping below.\n"
    "        const scaledDeltaMs = deltaMs * Na__DoorAnim__SpeedScale;\n"
)
assert vv_door.count(VV_SCALE_BLOCK) == 1
door = replace_once(door,
    "        if (Na__DoorAnim__DoorRegistry.size === 0) return;                       // <-- No doors to animate\n"
    "\n"
    "        Na__DoorAnim__DoorRegistry.forEach((doorRecord) => {\n"
    "            if (doorRecord.isIndependentPanels === true) {\n"
    "                Na__DoorAnim__UpdateIndependentPanels(doorRecord, deltaMs);\n",
    "        if (Na__DoorAnim__DoorRegistry.size === 0) return;                       // <-- No doors to animate\n"
    "\n"
    + VV_SCALE_BLOCK +
    "\n"
    "        Na__DoorAnim__DoorRegistry.forEach((doorRecord) => {\n"
    "            if (doorRecord.isIndependentPanels === true) {\n"
    "                Na__DoorAnim__UpdateIndependentPanels(doorRecord, scaledDeltaMs);\n", "update scaled clock (independent)")
door = replace_once(door,
    "            const frame = Na__DoorAnim__AdvanceAnimationState(doorRecord, deltaMs);\n"
    "            Na__DoorAnim__ApplyAllPanels(doorRecord, frame.progress);             // <-- Cascade transform across every panel\n",
    "            const frame = Na__DoorAnim__AdvanceAnimationState(doorRecord, scaledDeltaMs);\n"
    "            Na__DoorAnim__ApplyAllPanels(doorRecord, frame.progress);             // <-- Cascade transform across every panel\n",
    "update scaled clock (lockstep)")

# Seam X2 - Video Studio: SetSpeedScale, GetSpeedScale, GetBaseDurationMs (VV 1.7.1's text), ahead of Initialize as in VV
VV_SPEED_FUNCS = between(vv_door,
    "    // FUNCTION | Set the Global Door Animation Speed Scale\n",
    "    // FUNCTION | Initialize Door Animation System\n", "speed funcs")
assert VV_SPEED_FUNCS.endswith(FN_RULE + "\n\n"), repr(VV_SPEED_FUNCS[-120:])
door = replace_once(door,
    "// REGION | Initialization\n" + RULE + "\n    // FUNCTION | Initialize Door Animation System\n",
    "// REGION | Initialization\n" + RULE + "\n" + VV_SPEED_FUNCS + "    // FUNCTION | Initialize Door Animation System\n",
    "speed funcs placement")

# Seam X2 - Video Studio: SettleClosed and SnapAllClosed (VV 1.7.1's text), after RebindModelGroups as in VV
VV_SNAP_FUNCS = between(vv_door,
    "    // HELPER FUNCTION | Settle One Animation Target at Fully Closed\n",
    "\n// endregion -------------------------------------------------------------------\n\n\n"
    "// -----------------------------------------------------------------------------\n"
    "// REGION | Module Exports\n", "snap funcs")
assert VV_SNAP_FUNCS.endswith(FN_RULE), repr(VV_SNAP_FUNCS[-120:])
REBIND_TAIL = (
    "        console.log(`[DoorAnimation] Rebound model groups (${Na__DoorAnim__ModelGroupsMesh.length} mesh, ${Na__DoorAnim__ModelGroupsLinework.length} linework)`);\n"
    "        return true;\n"
    "    }\n"
    + FN_RULE +
    "\n// endregion -------------------------------------------------------------------\n"
)
door = replace_once(door, REBIND_TAIL,
    REBIND_TAIL[:-len("\n// endregion -------------------------------------------------------------------\n")]
    + "\n\n" + VV_SNAP_FUNCS
    + "\n// endregion -------------------------------------------------------------------\n",
    "snap funcs placement")

# Seam X2 - the four Video Studio exports, at the places VV 1.7.1 listed them
door = replace_once(door,
    "        Na__DoorAnimation__Update,                                               // <-- Per-frame update\n",
    "        Na__DoorAnimation__Update,                                               // <-- Per-frame update\n"
    "        Na__DoorAnimation__SetSpeedScale,                                        // <-- Global time scale (Video Studio)\n"
    "        Na__DoorAnimation__GetSpeedScale,                                        // <-- Read current time scale\n"
    "        Na__DoorAnimation__GetBaseDurationMs,                                    // <-- Authored single-leaf swing time\n",
    "exports speed")
door = replace_once(door,
    "        Na__DoorAnimation__HasActiveAnimations,                                  // <-- True while any door animation is running\n",
    "        Na__DoorAnimation__HasActiveAnimations,                                  // <-- True while any door animation is running\n"
    "        Na__DoorAnimation__SnapAllClosed,                                        // <-- Every door shut at once (Video Studio start frame)\n",
    "exports snap")

for line in ("        Na__DoorAnimation__SetSpeedScale,", "        Na__DoorAnimation__GetSpeedScale,",
             "        Na__DoorAnimation__GetBaseDurationMs,", "        Na__DoorAnimation__SnapAllClosed,"):
    assert vv_door.count(line) == 1 and door.count(line) == 1, line

# -----------------------------------------------------------------------------
# 2. FindDoorGroups: TV 1.1.0 whole (new in VV), banner and PORT NOTE
# -----------------------------------------------------------------------------
find = tv_find
find = replace_once(find,
    "// TRUEVISION3D - DOOR GROUP FINDER UTILITY\n",
    "// VALEVISION3D - DOOR GROUP FINDER UTILITY\n", "find banner")
FIND_PORT_NOTE = (
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 02__Src__AppModules/25__System__3dObject__InteractionSystem/Na__DoorAnimation__FindDoorGroups.js\n"
    "// - Source version: 1.1.0 (TrueVision3D v2.3.6, 06-Jun-2026; read at b2aa9151)\n"
    "// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-02}} (new in ValeVision: the door pose of\n"
    "//                   50__System__ProjectedLinework imports it)\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. (No console output in this file.)\n"
    "// - Back-port     : none.\n"
    "//\n"
)
find = replace_once(find,
    "//   flat-export and storey-export scene structures without assumptions about\n"
    "//   node naming or child ordering.\n"
    "//\n"
    "// -----\n"
    "//\n"
    "// DEVELOPMENT LOG:\n",
    "//   flat-export and storey-export scene structures without assumptions about\n"
    "//   node naming or child ordering.\n"
    "//\n"
    "// -----\n"
    "//\n"
    + FIND_PORT_NOTE +
    "// -----\n"
    "//\n"
    "// DEVELOPMENT LOG:\n", "find port note")

# -----------------------------------------------------------------------------
# 3. The README: TV's whole, ValeVision's seams (app name, integration, Video Studio API, files)
# -----------------------------------------------------------------------------
read = tv_read
read = replace_once(read,
    "**Feature:** Click-to-Open Door Animation for TrueVision3D  \n",
    "**Feature:** Click-to-Open Door Animation for ValeVision3D  \n", "readme feature")
read = replace_once(read,
    "**Module Version:** 1.9.0 (14-Sep-2026 \u2014 door poses readable without animating, for Layout Editor plans)\n\n---\n",
    "**Module Version:** 1.9.0 (14-Sep-2026 \u2014 door poses readable without animating, for Layout Editor plans)\n"
    "\n"
    "> **ValeVision port note:** taken whole from TrueVision3D's README at b2aa9151 (door module 1.9.0,\n"
    "> TrueVision3D v2.42.0) by parity package W1-02 on 01-Oct-2026. ValeVision's differences: the app name,\n"
    "> the Main App Integration section (ValeVision's loading sequence), the Video Studio API (ValeVision only)\n"
    "> and the ValeVision files under Related Files.\n"
    "\n---\n", "readme port note")
read = replace_once(read,
    "**3. TrueVision3D loads automatically:**\n",
    "**3. ValeVision3D loads automatically:**\n", "readme loads")

TV_INTEGRATION = between(read,
    "### Main App Integration\n",
    "---\n\n## Naming Conventions\n", "readme integration")
VV_INTEGRATION = (
    "### Main App Integration\n"
    "**File:** `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js`\n"
    "\n"
    "ValeVision keeps its existing token-based category collection and passes arrays\n"
    "of mesh/linework roots into `Na__DoorAnimation__Initialize`. The render loop\n"
    "continues to call `Na__DoorAnimation__Update` and routes ValeVision's existing\n"
    "Walk/Fly positions through `Na__DoorProximity__Update`. Production Walk/Fly\n"
    "thresholds remain `6500` mm. The prototype Refresh Models action uses\n"
    "`Na__DoorAnimation__RebindModelGroups`, avoiding duplicate pointer listeners.\n"
    "\n"
)
read = replace_once(read, TV_INTEGRATION, VV_INTEGRATION, "readme integration swap")

read = replace_once(read,
    "TrueVision3D uses separate mesh and linework GLB files:\n",
    "ValeVision3D uses separate mesh and linework GLB files:\n", "readme dual model")

VV_VIDEO_STUDIO_API = (
    "---\n"
    "\n"
    "### Video Studio (ValeVision only)\n"
    "\n"
    "`31__System__VideoStudio` drives the doors along a walkthrough. These four are\n"
    "ValeVision's own and are added back after every whole-file port from TrueVision.\n"
    "\n"
    "- `Na__DoorAnimation__SetSpeedScale(scale)` - a global time scale on the\n"
    "  per-frame clock (1.0 is the authored speed, 0.5 half speed); a preview or an\n"
    "  export sets it and restores it afterwards. Bad values fall back to 1.0.\n"
    "- `Na__DoorAnimation__GetSpeedScale()` - the current time scale.\n"
    "- `Na__DoorAnimation__GetBaseDurationMs()` - the authored single-leaf swing time\n"
    "  after the app config is applied (a bifold takes it times the bifold multiplier).\n"
    "- `Na__DoorAnimation__SnapAllClosed()` - every door and independent leaf back to\n"
    "  fully closed in one step, without animating, so an export or a preview from the\n"
    "  top starts with every door shut. Returns how many doors or leaves moved.\n"
    "\n"
)
read = replace_once(read,
    "leaves, the door's otherwise, and 0 for a record built outside the registry.\n\n---\n\n## Troubleshooting\n",
    "leaves, the door's otherwise, and 0 for a record built outside the registry.\n\n"
    + VV_VIDEO_STUDIO_API +
    "---\n\n## Troubleshooting\n", "readme video studio api")

read = replace_once(read,
    "**TrueVision3D Application (JavaScript):**\n"
    "- `25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` - Door animation module\n"
    "- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` - Configuration\n"
    "- `index.html` - Main application bootstrap\n",
    "**ValeVision3D Application (JavaScript):**\n"
    "- `25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js` - Door animation module\n"
    "- `02__Src__AppModules/02__AppData/Na__AppConfig__Main.json` - Configuration\n"
    "- `index.html` - Main application bootstrap\n"
    "- `02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js` - Door model collection, Initialize and the per-frame Update\n"
    "- `02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js` - Walk/Fly proximity\n"
    "- `02__Src__AppModules/31__System__VideoStudio/Na__VideoStudio__Playback__SceneAnimations.js` and `Na__VideoStudio__Export__FrameRenderer.js` - Video Studio (ValeVision only)\n",
    "readme related files")

# -----------------------------------------------------------------------------
# Identity checks on the results (K2 H1, C1, K3, K4, V2)
# -----------------------------------------------------------------------------
for name, text in (("door", door), ("find", find)):
    assert "TRUEVISION3D" not in text, name
    assert "[TrueVision3D" not in text, name
    assert "window.TrueVision__" not in text, name
    for marker in ("NaProjectPortal", "30__TrueVision__AppContent", "/na-apps/", "Noble Architecture Ltd"):
        assert marker not in text, (name, marker)
assert "TrueVision3D Application" not in read and "for TrueVision3D" not in read

os.makedirs(OUT, exist_ok=True)
for fname, text in ((DOOR, door), (FIND, find), (READ, read)):
    data = text.encode("utf-8")
    assert b"\r\n" not in data
    open(os.path.join(OUT, fname), "wb").write(data)
    print("wrote out/%s  %d bytes  %d lines  sha1 %s" % (fname, len(data), text.count("\n"), hashlib.sha1(data).hexdigest()[:12]))
