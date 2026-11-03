/* =============================================================================
   PAINTERLYNPR - PAPER | SHEET COMPOSER - GROUND CUT ON THE SHEET
   =============================================================================

   FILE       : PainterlyNPR__GroundCut__Sheet__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Paper - SheetComposer - GroundCut Sheet
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : End a level elevation on the whole sheet as an illustrator does:
                nothing of the drawing below the ground line, its foot lost into
                one swish of wash, painted by the engine's own painter and
                composited with the drawing, so a still and an export carry it
   CREATED    : 03-Nov-2026

   DESCRIPTION:
   - Adam, 03-Nov-2026, with a measured elevation and a stroke drawn in red under
     its fence: "In the NPR Standalone add the same elevation watercolour swooshes
     that the AURA port uses". The painter is the one AURA lays over its viewports
     (PainterlyNPR__GroundCut__Swish__.mjs); nothing of it is repeated here.
   - WHERE: the ground on the sheet (Ground: the higher of the scene's lawn and
     the building's foot, projected by the camera), raised by the drawing's own
     Height of the cut. A level orthographic view only, the truth pass's own test
     of one (22's LEVEL_VIEW); it follows zoom and pan, and leaves the sheet with
     the ground.
   - HOW LONG: AURA's stroke is laid to a viewport's frame; a sheet has none, so
     the frame is where the paint actually reaches at the cut's height, read from
     the art direction field (presence, Cpu.Field). The painted area, its edge
     and a Negative Space point all move it, and the kind's Reach runs on past it.
   - THE PICTURE: 56's compositor reads these parts (SheetUniforms). Below the cut
     the sheet is bare paper; in the band above it the drawing is lost by the
     painter's foot mask; the swish multiplies over paper, pigment and ink alike,
     as AURA's mix-blend-mode does in the sheet's own sRGB.
   - THE PAINT OVERRUNS THE CUT (v0.8.32): the vignette would dissolve the drawing
     above the line and leave a bare gap over the swish, so while it is cut the
     field leaves the foot open (66, SetFootGate, SheetCuts) and the cut decides
     where the paint and the pen stop. The On switch bumps Composition for that.
   - THE SETTINGS: State.Composition.GroundCut is { On, RaiseMm, Settings }, with
     Settings in the painter's kept form (Clean), so it travels in the settings
     object, in saves and in undo, and to SketchUp's NPR windows as part of the
     look. A cut with no Seed takes one from the sheet's seed.
   - WHO HAS IT: a page that asks (SheetEnable: this app's Init, so SketchUp's NPR
     windows too, which run this page). ValeVision AURA boots through its own host,
     never asks, and goes on laying the swish over its own viewports: its stills
     must not carry a second one.
   - HOW IT REPAINTS: only when the painting's own key moves. A camera move that
     keeps the stroke's length only moves the rectangles the compositor samples.

   ============================================================================= */

import GroundConfig from './Na__GroundCut__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Engine__DEG              as  DEG,
    PainterlyNPR__Engine__SHEET_HEIGHT_MM  as  SHEET_HEIGHT_MM,
    PainterlyNPR__Engine__SHEET_WIDTH_MM   as  SHEET_WIDTH_MM,
} from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__ScenePackage__BuildingBounds,
    PainterlyNPR__ScenePackage__Scene  as  Scene,
} from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import {
    PainterlyNPR__GpuResources__Cpu  as  Cpu,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__GeometryBuffers__LEVEL_VIEW as LEVEL_VIEW } from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import { PainterlyNPR__CameraRig__Project } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';
import { PainterlyNPR__GroundCut__Key } from './PainterlyNPR__GroundCut__Settings__.mjs';
import { PainterlyNPR__GroundCut__PaintPixels } from './PainterlyNPR__GroundCut__Swish__.mjs';

// =============================================================================
// REGION | Sheet Composer - Ground Cut on the Sheet
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__GroundCut__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const SHEET    =  PainterlyNPR__ConfigAccess__Section(GroundConfig, 'PainterlyNPR__GroundCut__Config', 'Sheet', ['Identity', 'PaintedFrom', 'SearchStepMm', 'FrameStepMm', 'EdgeSpareMm']);
    const NO_RECT  =  [0, 0, 0, 0];
    // ------------------------------------------------------------


    // MODULE STATE | The Cut the Compositor Draws
    // ------------------------------------------------------------
    const Cut  =  {
        Enabled   :  false,                      // <-- The page asked for it (SheetEnable); a wrapper laying its own swish never does
        Active    :  false,                      // <-- This drawing is cut
        LineMm    :  0,                          // <-- The cut line, mm up from the sheet's foot
        FrameMm   :  0,                          // <-- The frame's left side, mm from the sheet's left
        Key       :  '',                         // <-- What the textures were painted from
        Swish     :  null,                       // <-- [X, Y, WidthMm, HeightMm] in the cut's frame, or null
        Foot      :  null,                       // <-- The same for the foot's mask, whose frame is the sheet, or null
        Textures  :  null,                       // <-- { Swish, Foot, Neutral }: made once, filled again
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Whether and Where
// -----------------------------------------------------------------------------

    // FUNCTION | Ask for the Cut - this page's Init does; a host laying its own swish does not
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__SheetEnable(on) {
        Cut.Enabled  =  !!on;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Drawing's Record - { On, RaiseMm, Settings } (made when a state has none)
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__Record() {
        if (!State.Composition.GroundCut) State.Composition.GroundCut = { On: false, RaiseMm: 0, Settings: null };
        return State.Composition.GroundCut;
    }

    // The sheet's name for the painter: a cut with no Seed of its own follows the sheet's
    function PainterlyNPR__GroundCut__SheetIdentity() {
        return `${SHEET.Identity}:${State.Seed}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Camera an Elevation This Page Cuts? (the truth pass's own test of a level view)
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__OnElevation() {
        const c  =  State.Camera;
        return Cut.Enabled && !!c && c.Mode === 'Ortho' && Math.abs(Math.sin(c.Pitch * DEG)) < LEVEL_VIEW;
    }

    // Is This Drawing Cut? The field asks before it is drawn: a cut drawing's foot runs on past the line for the cut to take back (v0.8.32)
    function PainterlyNPR__GroundCut__SheetCuts() {
        return PainterlyNPR__GroundCut__OnElevation() && !!PainterlyNPR__GroundCut__Record().On;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Ground's Height in the World (m)
    // ------------------------------------------------------------
    // The higher of the lawn and the building's foot. A footing or a box below
    // ground never drags the cut down under the lawn, and a model standing above
    // its origin is still cut at its own foot.
    function PainterlyNPR__GroundCut__GroundY() {
        const lawn    =  Scene && Number.isFinite(Scene.GroundY) ? Scene.GroundY : 0;
        const bounds  =  PainterlyNPR__ScenePackage__BuildingBounds();
        return bounds ? Math.max(lawn, bounds.Min[1]) : lawn;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Where the Paint Reaches, From the Cut Upward - [left, right] in sheet mm, or null
    // ------------------------------------------------------------
    // The field's presence along the cut's row. A row with no paint at all (a small
    // painted area that stops above the ground) looks further up, so the stroke
    // still runs under the drawing there is.
    function PainterlyNPR__GroundCut__PaintedSpan(lineMm) {
        const W      =  Gpu.Width, H = Gpu.Height;
        const pxY    =  H / SHEET_HEIGHT_MM;
        const floor  =  SHEET.PaintedFrom * 255;
        for (let mm = Math.max(0, lineMm); mm < SHEET_HEIGHT_MM; mm += SHEET.SearchStepMm) {
            const row  =  Math.min(H - 1, Math.floor(mm * pxY)) * W * 4;
            let first  =  -1, last = -1;
            for (let x = 0; x < W; x++) {
                if (Cpu.Field[row + x * 4] < floor) continue;
                if (first < 0) first = x;
                last  =  x;
            }
            if (first >= 0) return [first / Gpu.PxPerMm, (last + 1) / Gpu.PxPerMm];
        }
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Pass
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Texture for a Part (linear, clamped: a part may be coarser than the sheet)
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__MakeTexture() {
        const gl       =  Gpu.Gl;
        const texture  =  gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    function PainterlyNPR__GroundCut__SheetTextures() {
        if (!Cut.Textures) Cut.Textures = { Swish: PainterlyNPR__GroundCut__MakeTexture(), Foot: PainterlyNPR__GroundCut__MakeTexture(), Neutral: PainterlyNPR__GroundCut__MakeTexture() };
        return Cut.Textures;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fill a Part's Texture, the Painter's First Row at v = 0
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__Fill(texture, width, height, bytes) {
        const gl  =  Gpu.Gl;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Swish as What It Does to the Sheet (T), so Filtering It Is Right
    // ------------------------------------------------------------
    // The painter's colour and alpha, laid with a multiply blend, do T = 1 - a + a c.
    // Sampling those two apart would darken every edge, where a clear pixel's
    // colour is 0; T is 1 there.
    function PainterlyNPR__GroundCut__Transmittance(rgba) {
        const out  =  new Uint8Array(rgba.length);
        for (let i = 0; i < rgba.length; i += 4) {
            const a  =  rgba[i + 3];
            const k  =  a / 255;
            out[i]     = 255 - a + rgba[i] * k + 0.5;
            out[i + 1] = 255 - a + rgba[i + 1] * k + 0.5;
            out[i + 2] = 255 - a + rgba[i + 2] * k + 0.5;
            out[i + 3] = 255;
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Pass - the Ground Cut: where it falls, and its painting when that has moved
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__SheetRun() {
        Cut.Active  =  false;
        if (!PainterlyNPR__GroundCut__OnElevation()) return;
        const record  =  PainterlyNPR__GroundCut__Record();
        if (!record.On) return;
        const c       =  State.Camera;
        const pxY     =  Gpu.Height / SHEET_HEIGHT_MM;
        const ground  =  PainterlyNPR__CameraRig__Project([c.Target[0], PainterlyNPR__GroundCut__GroundY(), c.Target[2]]).Y / pxY;
        const line    =  ground + (Number(record.RaiseMm) || 0);
        if (!(line > 0) || !(line < SHEET_HEIGHT_MM)) return;                   // <-- The ground is off the sheet: nothing to end here
        const span    =  PainterlyNPR__GroundCut__PaintedSpan(line);
        if (!span) return;

        // Painted again only when the stroke itself has moved; a frame's width is kept to a step, so the field's noise never repaints it
        const width   =  Math.max(SHEET.FrameStepMm, Math.round((span[1] - span[0]) / SHEET.FrameStepMm) * SHEET.FrameStepMm);
        const room    =  (Gpu.MaxSize - 8) / (SHEET_WIDTH_MM + 2 * SHEET.EdgeSpareMm);    // <-- A part never asks for more than the GPU's largest texture
        const density =  Math.min(Gpu.PxPerMm, room);
        const key     =  `${PainterlyNPR__GroundCut__Key(record.Settings, PainterlyNPR__GroundCut__SheetIdentity())}|${width}|${density}|${State.InkFamily}`;
        if (key !== Cut.Key) {
            const painted   =  PainterlyNPR__GroundCut__PaintPixels({ Settings: record.Settings, Identity: PainterlyNPR__GroundCut__SheetIdentity(), WidthMm: width, FootWidthMm: SHEET_WIDTH_MM, PxPerMm: density });
            const textures  =  PainterlyNPR__GroundCut__SheetTextures();
            Cut.Swish  =  null;
            Cut.Foot   =  null;
            if (painted.Swish) {
                PainterlyNPR__GroundCut__Fill(textures.Swish, painted.Swish.Width, painted.Swish.Height, PainterlyNPR__GroundCut__Transmittance(painted.Swish.Rgba));
                Cut.Swish  =  [painted.Swish.X, painted.Swish.Y, painted.Swish.WidthMm, painted.Swish.HeightMm];
            }
            if (painted.Foot) {
                PainterlyNPR__GroundCut__Fill(textures.Foot, painted.Foot.Width, painted.Foot.Height, new Uint8Array(painted.Foot.Rgba.buffer));
                Cut.Foot   =  [painted.Foot.X, painted.Foot.Y, painted.Foot.WidthMm, painted.Foot.HeightMm];
            }
            Cut.Key  =  key;
        }
        Cut.LineMm   =  line;
        Cut.FrameMm  =  span[0];
        Cut.Active   =  true;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Compositor's Uniforms for the Cut
    // ------------------------------------------------------------
    // Every sampler always has its own real texture: a bare sheet and an uncut
    // drawing read the neutral one, so no sampler is ever left on a unit a pass's
    // target happens to be bound to.
    function PainterlyNPR__GroundCut__SheetUniforms(bare) {
        const on        =  !bare && Cut.Active;
        const textures  =  PainterlyNPR__GroundCut__SheetTextures();
        return {
            uGroundCut        :  { i: on ? 1 : 0 },
            uGroundSwish      :  { t: on && Cut.Swish ? textures.Swish : textures.Neutral },
            uGroundFoot       :  { t: on && Cut.Foot ? textures.Foot : textures.Neutral },
            uGroundSwishRect  :  { v4: on && Cut.Swish ? Cut.Swish : NO_RECT },
            uGroundFootRect   :  { v4: on && Cut.Foot ? Cut.Foot : NO_RECT },
            uGroundLine       :  { v2: [Cut.LineMm, Cut.FrameMm] },
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__GroundCut__OnElevation,
        PainterlyNPR__GroundCut__Record,
        PainterlyNPR__GroundCut__SheetCuts,
        PainterlyNPR__GroundCut__SheetEnable,
        PainterlyNPR__GroundCut__SheetIdentity,
        PainterlyNPR__GroundCut__SheetRun,
        PainterlyNPR__GroundCut__SheetUniforms,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
