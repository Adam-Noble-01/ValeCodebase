"""W2-12 port script (scratch, not shipped).

  --stage    build the three results into scratch/W2-12/staged/ (nothing live touched)
  --apply    back the two existing files up into scratch/W2-12/backup/, re-check them against the
             hashes this package found, then write the three live files (the new one with 'xb')
  --check    reverse the seams on the LIVE new file and get TrueVision's bytes back; confirm every
             hunk of the two edited files is in place exactly once; compare with landed_sha256.json
  --restore  put the two pre-images back and delete the new file, only if none changed since landing

TrueVision is read only at the pin b2aa9151 (git show). Existing files keep their own line endings
(both are CRLF); the whole-file port is written as git show returns it (LF).
"""
import hashlib, json, os, subprocess, sys

PIN  = "b2aa9151"
TVR  = r"D:\11_RefLib__StudioRepository__RemoteSystem\NaWeb"
TVA  = "na-apps/30__TrueVision__CoreAppCode/"
VV   = "D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/"
HERE = os.path.dirname(os.path.abspath(__file__))

P_FOG = "02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__DepthFog__.js"
P_CFG = "02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__RenderComposites__Config__.json"
P_TR  = "02__Src__AppModules/30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js"

# The bytes this package found (W2-03 / W2-09 landed them; their port records name the same hashes).
FOUND = {
    P_CFG: "b520d0658d6365c6",
    P_TR : "29b3d9ce5efc097c",
}


def tv(rel):
    return subprocess.run(["git", "-C", TVR, "show", f"{PIN}:{TVA}{rel}"], capture_output=True, check=True).stdout


def sha(b):
    return hashlib.sha256(b).hexdigest()


def once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"ANCHOR {label}: found {n} times (want 1)")
    return text.replace(old, new)


# -----------------------------------------------------------------------------
# 1. The new leaf: TrueVision's file whole, banner and PORT NOTE re-applied
# -----------------------------------------------------------------------------
FOG_BANNER_TV = "// TRUEVISION3D - LAYOUT EDITOR - VIEWPORT 2D - DEPTH FOG\n"
FOG_BANNER_VV = "// VALEVISION3D - LAYOUT EDITOR - VIEWPORT 2D - DEPTH FOG\n"
FOG_NOTE_TV = (
    "// PORT NOTE:\n"
    "// - Authored in   : TrueVision3D first (20-Sep-2026)\n"
    "// - ValeVision    : not yet ported.\n"
)
FOG_NOTE_VV = (
    "// PORT NOTE:\n"
    "// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/20__System__Viewports/Na__LayoutEditor__Viewport2d__DepthFog__.js\n"
    "// - Source version: 1.0.0 (TrueVision3D v2.94.0, 20-Sep-2026; read at b2aa9151)\n"
    "// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W2-12}}, with the Render Composites Depth Fog\n"
    "//                   row and the tiled renderer's opt-in frame routine route. TrueVision's own note said\n"
    "//                   \"not yet ported\" and its fog plan still awaits Adam's test; it comes across under\n"
    "//                   DR-01 (c), and v2.94.0 is named as not yet confirmed by Adam in TrueVision.\n"
    "// - Parity        : verbatim\n"
    "// - Divergences   :\n"
    "//   - Banner reads ValeVision3D. The imports are TrueVision's paths unchanged: since the folder renumber\n"
    "//     the elevation data module sits in 45 and the fog modules in 49 in both apps.\n"
    "// - Back-port     : none.\n"
)


def build_fog():
    src = tv(P_FOG)
    assert b"\r\n" not in src
    t = src.decode("utf-8")
    t = once(t, FOG_BANNER_TV, FOG_BANNER_VV, "fog banner")
    t = once(t, FOG_NOTE_TV, FOG_NOTE_VV, "fog port note")
    return src, t.encode("utf-8")


def unbuild_fog(live):
    t = live.decode("utf-8")
    t = once(t, FOG_NOTE_VV, FOG_NOTE_TV, "fog port note (reverse)")
    t = once(t, FOG_BANNER_VV, FOG_BANNER_TV, "fog banner (reverse)")
    return t.encode("utf-8")


# -----------------------------------------------------------------------------
# 2. The composites config: TrueVision's Meta 1.4.0 hunk on this app's bytes (CRLF kept)
# -----------------------------------------------------------------------------
def tv_lines_between(tv_text, start_marker, end_marker):
    i = tv_text.index(start_marker)
    j = tv_text.index(end_marker, i)
    return tv_text[i:j]


CFG_PORTED_OLD = "(parity package W2-09). Every layer row, weight and number is TrueVision's."
CFG_PORTED_NEW = ("(parity package W2-09); Meta 1.4.0 - the Depth Fog row and Meta__DepthFog, TrueVision3D v2.94.0, "
                  "20-Sep-2026 - ported 02-Oct-2026 (parity package W2-12). Neither release is yet confirmed by Adam in "
                  "TrueVision. Every layer row, weight and number is TrueVision's.")


def cfg_edit(text_lf, tv_text):
    # Meta__DepthFog: TrueVision's line verbatim, after Meta__EnhanceStrength as in TrueVision
    depth_meta = tv_lines_between(tv_text, '        "Meta__DepthFog"', '        "Meta__KeyStability"')
    # The depthFog layer row: TrueVision's block verbatim, first in Layers (Order 5)
    layers_hdr = '    "LayoutEditor__RenderComposites__Layers": [\n'
    row_start  = tv_text.index(layers_hdr) + len(layers_hdr)
    row_end    = tv_text.index('        {\n            "Composite__Key"      : "projectedLinework"', row_start)
    depth_row  = tv_text[row_start:row_end]
    assert '"Composite__Key"      : "depthFog"' in depth_row and depth_row.count('"Composite__Key"') == 1

    t = text_lf
    t = once(t, '"Meta__Version"         : "1.3.0",', '"Meta__Version"         : "1.4.0",', "cfg version")
    t = once(t, CFG_PORTED_OLD, CFG_PORTED_NEW, "cfg ported-from")
    t = once(t, '        "Meta__KeyStability"', depth_meta + '        "Meta__KeyStability"', "cfg Meta__DepthFog")
    t = once(t, layers_hdr, layers_hdr + depth_row, "cfg depthFog row")
    return t, depth_meta, depth_row


# -----------------------------------------------------------------------------
# 3. The tiled renderer: the opt-in frame routine route (VV module 1.5.0 -> 1.6.0)
# -----------------------------------------------------------------------------
TR_HUNKS = [
    ("description",
     "//   does on screen.\n"
     "// - All mutated renderer / composer / camera state is restored in finally.\n",
     "//   does on screen.\n"
     "// - AN OPTIONAL FRAME ROUTINE (1.6.0), renderFrame(camera), draws each tile\n"
     "//   in place of the composer: TrueVision's callback route, here for one\n"
     "//   caller only - a sheet viewport's depth fog image, the fog alone on a\n"
     "//   transparent ground (Na__ElevFog__RenderLayerFrame), which has to\n"
     "//   register with the composer-drawn picture pixel for pixel. Every buffer\n"
     "//   is still sized and every scale still set as for the picture; only the\n"
     "//   drawing step changes, and the routine owns the whole frame (no depth\n"
     "//   fog call, no section overlay). Without the option every call renders\n"
     "//   exactly as before: the underlay and every image export stay on the\n"
     "//   composer route (DIV-1).\n"
     "// - All mutated renderer / composer / camera state is restored in finally.\n"),

    ("port note parity",
     "// - Parity        : diverged (the same tile plan, gutter, sub-frustum and restore discipline; every tile here\n"
     "//                   goes through the live EffectComposer, DIV-1)\n",
     "// - Parity        : diverged (the same tile plan, gutter, sub-frustum and restore discipline; every tile of a\n"
     "//                   picture here goes through the live EffectComposer, DIV-1)\n"),

    ("port note divergence",
     "//   - A 2D drawing brings its camera, profile normals, frustum and (1.5.0) depth fog in the render preset's\n"
     "//     export overrides; TrueVision's renderFrame callback route is not here (W2-12 adds it, opt-in, for the\n"
     "//     sheet's fog image).\n",
     "//   - A 2D drawing brings its camera, profile normals, frustum and (1.5.0) depth fog in the render preset's\n"
     "//     export overrides, and its picture goes through the composer. TrueVision's renderFrame callback route\n"
     "//     is here from 1.6.0 as an opt-in for a sheet viewport's fog image only (DR-15 sheets (a), D-S04a-05 (a)),\n"
     "//     knowingly reversing TrueVision's note that the route is not worth carrying back. On it the composer\n"
     "//     draws nothing but is still sized as for the picture (TrueVision drops it on that route), the frame\n"
     "//     routine draws the whole frame, and with several samples it draws into the supersampler's own sample\n"
     "//     target, as TrueVision's does.\n"),

    ("log 1.6.0",
     "//   Na__StaticExport__ wrappers nothing imported (R6 F.8 C26, K2 X1).\n"
     "//\n"
     "// =============================================================================\n",
     "//   Na__StaticExport__ wrappers nothing imported (R6 F.8 C26, K2 X1).\n"
     "//\n"
     "// 02-Oct-2026 - Version 1.6.0 ({{VVREL:W2-12}})\n"
     "// - THE FRAME ROUTINE ROUTE, OPT-IN. renderFrame(camera), when given, draws\n"
     "//   each tile in place of the composer: TrueVision's callback route, which\n"
     "//   its own note called not worth carrying back before a sheet had a fog\n"
     "//   image. Here it serves that image alone - the fog on a transparent\n"
     "//   ground through the same tiles, sizes and jitter as the picture, so the\n"
     "//   two register pixel for pixel (DR-15 sheets (a), D-S04a-05 (a)). The\n"
     "//   routine owns the frame: no depth fog call and no section overlay are\n"
     "//   added on this route, and with several samples it draws into the\n"
     "//   supersampler's own sample target, encoded to sRGB on present. Without\n"
     "//   renderFrame every call renders exactly as before.\n"
     "//\n"
     "// =============================================================================\n"),

    ("options doc",
     "    //   elevationOverrides     {object|null}  2D ortho export overrides, or null for 3D mode\n",
     "    //   elevationOverrides     {object|null}  2D ortho export overrides, or null for 3D mode\n"
     "    //   renderFrame            {Function|null}  Optional (1.6.0): draws ONE frame through the tile camera it\n"
     "    //                          is handed (the overrides' camera for a 2D drawing), in place of the composer -\n"
     "    //                          TrueVision's callback route, used only for a sheet viewport's depth fog image.\n"
     "    //                          Given, the routine owns the frame: no depth fog call and no section overlay\n"
     "    //                          are added. Omitted, the composer route, exactly as before\n"),

    ("destructure",
     "            elevationOverrides = null,\n"
     "            targetWidth, targetHeight,\n",
     "            elevationOverrides = null,\n"
     "            renderFrame = null,\n"
     "            targetWidth, targetHeight,\n"),

    ("useCallback",
     "        const progress = (typeof onProgress === 'function') ? onProgress : () => {};\n",
     "        const progress = (typeof onProgress === 'function') ? onProgress : () => {};\n"
     "        const useCallback = (typeof renderFrame === 'function');      // <-- Opt-in (1.6.0): the caller's frame routine draws each tile\n"),

    ("supersampler",
     "        const supersampler = composer\n"
     "            ? Na__Supersampler__Create({\n",
     "        // THE FRAME ROUTINE ROUTE (1.6.0) needs a sample target of its own to\n"
     "        // draw each sample into - the composer's read buffer is not in play -\n"
     "        // and the sRGB transfer applied on the way out, because three never\n"
     "        // applies it to a render target. TrueVision's TARGET ROUTE exactly.\n"
     "        // ------------------------------------------------------------\n"
     "        const supersampler = useCallback\n"
     "            ? Na__Supersampler__Create({\n"
     "                renderer,\n"
     "                width        : fbW,\n"
     "                height       : fbH,\n"
     "                samples      : Na__Supersampler__ResolveSampleCount(antiAliasSamples),\n"
     "                sampleTarget : true,                                 // <-- The frame routine's canvas stand-in, per sample\n"
     "                encodeSrgb   : true                                  // <-- Applied on present, as the canvas would have it\n"
     "            })\n"
     "            : composer\n"
     "            ? Na__Supersampler__Create({\n"),

    ("supersampling setup",
     "            if (supersampler) {\n"
     "                composer.renderToScreen = false;\n",
     "            if (supersampler && !useCallback) {                      // <-- The frame routine route leaves both alone: neither draws on it\n"
     "                composer.renderToScreen = false;\n"),

    ("callback helper",
     "                supersampler.present();                              // <-- The averaged tile onto the canvas\n"
     "            }\n"
     "            // ------------------------------------------------------------\n"
     "\n"
     "            // TILE LOOP | Render each sub-frustum and composite into output\n",
     "                supersampler.present();                              // <-- The averaged tile onto the canvas\n"
     "            }\n"
     "            // ------------------------------------------------------------\n"
     "\n"
     "            // HELPER FUNCTION | Draw One Tile Through the Caller's Frame Routine\n"
     "            // ------------------------------------------------------------\n"
     "            // TrueVision's callback route (its DrawTile), opt-in (1.6.0). The\n"
     "            // routine draws the whole frame into whatever target is bound: the\n"
     "            // canvas for one sample, the supersampler's sample target for each\n"
     "            // of several, averaged and presented onto the canvas as the\n"
     "            // composer route's are. Jitter, shadow-map reuse and the projection\n"
     "            // restore are the composer route's exactly, so the image registers\n"
     "            // with the picture drawn through the same tiles. The canvas is bound\n"
     "            // again before the present, and on the error path too (TrueVision\n"
     "            // unbinds in its finally, which this file's restore does not).\n"
     "            // ------------------------------------------------------------\n"
     "            function renderCallbackTile() {\n"
     "                if (!supersampler) {\n"
     "                    renderer.setRenderTarget(null);                  // <-- The canvas\n"
     "                    renderFrame(activeCamera);\n"
     "                    return;\n"
     "                }\n"
     "\n"
     "                supersampler.captureBaseProjection(activeCamera);\n"
     "\n"
     "                try {\n"
     "                    for (let i = 0; i < supersampler.sampleCount; i++) {\n"
     "                        if (i === 1) shadowMap.autoUpdate = false;   // <-- Keep the maps the first sample drew\n"
     "\n"
     "                        supersampler.applyJitter(activeCamera, i);\n"
     "                        supersampler.beginSample();                  // <-- The frame's canvas stand-in\n"
     "                        renderFrame(activeCamera);\n"
     "                        supersampler.accumulateSample(i);\n"
     "                    }\n"
     "                } finally {\n"
     "                    shadowMap.autoUpdate = savedShadowAuto;\n"
     "                    supersampler.restoreProjection(activeCamera);    // <-- Unjittered for the next tile\n"
     "                    renderer.setRenderTarget(null);                  // <-- Never leave the sample target bound: it is freed with the supersampler\n"
     "                }\n"
     "\n"
     "                supersampler.present();                              // <-- The averaged tile onto the canvas\n"
     "            }\n"
     "            // ------------------------------------------------------------\n"
     "\n"
     "            // TILE LOOP | Render each sub-frustum and composite into output\n"),

    ("tile route",
     "                    if (composer) {\n"
     "                        if (supersampler) {\n"
     "                            renderSupersampledTile();\n",
     "                    if (useCallback) {\n"
     "                        renderCallbackTile();                        // <-- The caller's frame routine (1.6.0); the composer draws nothing\n"
     "                    } else if (composer) {\n"
     "                        if (supersampler) {\n"
     "                            renderSupersampledTile();\n"),

    ("fog guard",
     "                    if (isElevationMode && typeof elevationOverrides.renderDepthFog === 'function') {\n",
     "                    // Never on the frame routine route: that routine owns the frame.\n"
     "                    if (!useCallback && isElevationMode && typeof elevationOverrides.renderDepthFog === 'function') {\n"),

    ("overlay guard",
     "                    // them after the composer.\n"
     "                    if (sectionOverlayRenderer) {\n",
     "                    // them after the composer. Never on the frame routine route:\n"
     "                    // a sheet's fog image is the fog alone, and a poche printed on\n"
     "                    // it would cover the vectors it is laid over.\n"
     "                    if (sectionOverlayRenderer && !useCallback) {\n"),
]


def tr_edit(text_lf):
    for label, old, new in TR_HUNKS:
        text_lf = once(text_lf, old, new, "tr " + label)
    return text_lf


# -----------------------------------------------------------------------------
# Plumbing
# -----------------------------------------------------------------------------
def read_live(rel):
    with open(VV + rel, "rb") as fh:
        return fh.read()


def to_lf(b):
    t = b.decode("utf-8")
    crlf = t.count("\r\n")
    lf = t.count("\n")
    if crlf not in (0, lf):
        raise SystemExit("mixed line endings")
    return t.replace("\r\n", "\n"), crlf == lf and lf > 0


def from_lf(t, crlf):
    return (t.replace("\n", "\r\n") if crlf else t).encode("utf-8")


def build_all():
    fog_tv, fog_new = build_fog()
    cfg_old = read_live(P_CFG)
    tr_old = read_live(P_TR)
    for rel, b in ((P_CFG, cfg_old), (P_TR, tr_old)):
        if sha(b)[:16] != FOUND[rel]:
            raise SystemExit(f"CHANGED UNDER ME: {rel} is {sha(b)[:16]}, expected {FOUND[rel]}")
    tv_cfg = tv(P_CFG).decode("utf-8")
    cfg_lf, crlf_c = to_lf(cfg_old)
    cfg_new_lf, _, _ = cfg_edit(cfg_lf, tv_cfg)
    json.loads(cfg_new_lf)
    tr_lf, crlf_t = to_lf(tr_old)
    tr_new_lf = tr_edit(tr_lf)
    return {
        P_FOG: (None, fog_new),
        P_CFG: (cfg_old, from_lf(cfg_new_lf, crlf_c)),
        P_TR : (tr_old, from_lf(tr_new_lf, crlf_t)),
    }


def stage():
    res = build_all()
    for rel, (_, new) in res.items():
        dst = os.path.join(HERE, "staged", rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, "wb") as fh:
            fh.write(new)
        print(f"staged {len(new):>7} B  {sha(new)[:16]}  {rel}")


def apply():
    if os.path.exists(VV + P_FOG):
        raise SystemExit("new file already exists: " + P_FOG)
    res = build_all()
    os.makedirs(os.path.join(HERE, "backup"), exist_ok=True)
    for rel, (old, _) in res.items():
        if old is not None:
            with open(os.path.join(HERE, "backup", rel.replace("/", "__")), "wb") as fh:
                fh.write(old)
    landed = {}
    for rel, (old, new) in res.items():
        if old is not None:
            now = read_live(rel)                                   # re-read immediately before the write
            if now != old:
                raise SystemExit("CHANGED UNDER ME (just before write): " + rel)
            with open(VV + rel, "wb") as fh:
                fh.write(new)
        else:
            with open(VV + rel, "xb") as fh:
                fh.write(new)
        landed[rel] = sha(new)
        print(f"landed {len(new):>7} B  {sha(new)[:16]}  {rel}")
    with open(os.path.join(HERE, "landed_sha256.json"), "w", encoding="utf-8") as fh:
        json.dump(landed, fh, indent=2)


def check():
    problems = []
    landed = json.load(open(os.path.join(HERE, "landed_sha256.json"), encoding="utf-8"))
    for rel, h in landed.items():
        if sha(read_live(rel)) != h:
            problems.append("changed since landing: " + rel)
    fog_live = read_live(P_FOG)
    if unbuild_fog(fog_live) != tv(P_FOG):
        problems.append("fog leaf: seams reversed != TrueVision's bytes")
    tr_lf, _ = to_lf(read_live(P_TR))
    for label, old, new in TR_HUNKS:
        if tr_lf.count(new) != 1:
            problems.append("tr hunk not in place once: " + label)
    tr_pre, _ = to_lf(open(os.path.join(HERE, "backup", P_TR.replace("/", "__")), "rb").read())
    if tr_edit(tr_pre) != tr_lf:
        problems.append("tr: live != pre-image + hunks")
    cfg_live_lf, _ = to_lf(read_live(P_CFG))
    cfg_pre, _ = to_lf(open(os.path.join(HERE, "backup", P_CFG.replace("/", "__")), "rb").read())
    if cfg_edit(cfg_pre, tv(P_CFG).decode("utf-8"))[0] != cfg_live_lf:
        problems.append("cfg: live != pre-image + hunk")
    # Config against TrueVision, key by key
    vcfg = json.loads(cfg_live_lf)
    tcfg = json.loads(tv(P_CFG).decode("utf-8"))
    if vcfg["LayoutEditor__RenderComposites__Layers"] != tcfg["LayoutEditor__RenderComposites__Layers"]:
        problems.append("cfg: layer rows differ from TrueVision's")
    vm, tm = vcfg["LayoutEditor__RenderComposites__Meta"], tcfg["LayoutEditor__RenderComposites__Meta"]
    own = {"Meta__PortedFrom", "Meta__WhyWeightsHere", "Meta__BaseImageWeight"}
    for k in set(vm) | set(tm):
        if k in own:
            continue
        if vm.get(k) != tm.get(k):
            problems.append("cfg Meta differs from TrueVision: " + k)
    if list(k for k in vm if k != "Meta__PortedFrom") != list(tm):
        problems.append("cfg Meta key order differs from TrueVision's")
    print("CHECK " + ("PASS" if not problems else "FAIL"))
    for p in problems:
        print("  - " + p)
    return not problems


def restore():
    landed = json.load(open(os.path.join(HERE, "landed_sha256.json"), encoding="utf-8"))
    for rel, h in landed.items():
        if sha(read_live(rel)) != h:
            raise SystemExit("refusing: changed since landing: " + rel)
    for rel in (P_CFG, P_TR):
        with open(os.path.join(HERE, "backup", rel.replace("/", "__")), "rb") as fh:
            old = fh.read()
        with open(VV + rel, "wb") as fh:
            fh.write(old)
        print("restored " + rel)
    os.remove(VV + P_FOG)
    print("removed " + P_FOG)


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "--stage"
    {"--stage": stage, "--apply": apply, "--check": check, "--restore": restore}[arg]()
