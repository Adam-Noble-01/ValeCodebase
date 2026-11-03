/* =============================================================================
   PAINTERLYNPR - PASS | DERIVED FIELDS - PROFILE LINES
   =============================================================================

   FILE       : PainterlyNPR__ProfileLines__Pass__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Pass - DerivedFields - ProfileLines
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Where a round thing ends on the sheet, found on the truth buffers:
                the rim of every ball, bowl, stem and downpipe, for the pen to
                trace and the washes to be held by
   CREATED    : 03-Nov-2026 (v0.8.38)

   DESCRIPTION:
   - WHY ON THE BUFFERS: straight things have edge records and draw well. A
     round thing's edges are soft: a model's linework leaves them out, and a
     mesh's own read only as silhouettes when its facets turn gently, in a mesh
     small enough to read. ValeVision 3D draws them with a Sobel over its normal
     buffer (Na__RenderEffect__ProfileLines__.js). This finds them the same way,
     with the truth buffers' depth to say which side is the form.
   - NOT A LINE ON THE PICTURE: nothing here is drawn. R is the band a wash is
     held by (51, 52) and G the rim the pen traces into a real stroke (30), so
     the manifest's objection to Sobel lines (no intent, no vector path) does
     not apply: the path is a vector, its pen comes from what it belongs to.
   - SMOOTH SHADED IS ROUND: the truth buffers' albedo alpha says a surface's
     normals turn across its facet (22, 0.75). That is what SketchUp softens,
     whatever the facet count.
   - ITS OWN PROGRAM, made on first use, so that a wrapper with its own copy of
     Boot (AURA) needs no change for it.

   ============================================================================= */

import ProfileLinesConfig from './Na__ProfileLines__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import {
    PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY  as  MATERIAL_BY_KEY,
    PainterlyNPR__MaterialClasses__MATERIAL_SLOTS   as  MATERIAL_SLOTS,
} from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import {
    PainterlyNPR__GpuResources__Fullscreen,
    PainterlyNPR__GpuResources__PaintPxPerMm,
    PainterlyNPR__GpuResources__Program,
    PainterlyNPR__GpuResources__Use,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__FloatBuilder } from '../21__System__GpuResources/PainterlyNPR__GpuResources__FloatBuilder__.mjs';
import { PainterlyNPR__Shaders__VS_FULLSCREEN as VS_FULLSCREEN } from '../21__System__GpuResources/PainterlyNPR__GpuResources__SharedShaders__.mjs';
import { PainterlyNPR__LineCandidates__Visibility } from '../31__Line__Visibility/PainterlyNPR__LineCandidates__Visibility__.mjs';
import { PainterlyNPR__CameraRig__Camera as Camera } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Derived Fields - Profile Lines
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__ProfileLines__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const ROOT       =  'PainterlyNPR__ProfileLines__Config';
    const DETECTION  =  PainterlyNPR__ConfigAccess__Section(ProfileLinesConfig, ROOT, 'Detection', ['EdgeMin', 'StepM', 'ContactM', 'ContactShare', 'LimbFacing', 'CornerDot', 'TurnMin', 'ProbeMm', 'ProbeMinPx']);
    const CLASSES    =  PainterlyNPR__ConfigAccess__Section(ProfileLinesConfig, ROOT, 'Classes', ['Always', 'Never']);
    const TRACE      =  PainterlyNPR__ConfigAccess__Section(ProfileLinesConfig, ROOT, 'Trace', ['GapMm', 'SmoothMm', 'StraightMm', 'MinMm', 'CoverMm', 'MaxPen', 'NoLineCategories', 'NoLineRoles']);
    const WASH       =  PainterlyNPR__ConfigAccess__Section(ProfileLinesConfig, ROOT, 'Wash', ['LooseMm', 'FeatherMm', 'FeatherMinPx', 'PoolKept', 'PaperMm', 'ReachPx', 'EdgeSeekMm', 'FleckMm', 'FleckMinPx', 'FootFacing', 'FootStepPx', 'FootLevel']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shader Sources
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fragment Shader - a round form's rim
    // ------------------------------------------------------------
    // R: the band, the rim and the pixels just outside it, a gap-free barrier two
    // pixels thick that a wash is held by. G: the rim alone, one pixel thick and
    // eight-connected, on the form's own side, for the pen to trace.
    const FS_PROFILE = `#version 300 es
        precision highp float;
        precision highp sampler2D;
        uniform sampler2D uAlbedo; uniform sampler2D uNormal; uniform sampler2D uData; uniform sampler2D uWorld;
        uniform mat3 uViewRot; uniform vec3 uCameraPos; uniform vec3 uViewDir; uniform int uOrtho;
        uniform float uEdgeMin; uniform float uStepM; uniform float uContactM; uniform float uContactShare;
        uniform float uLimbFacing; uniform float uCornerDot; uniform float uTurnMin; uniform vec2 uProbe;
        uniform float uClass[${MATERIAL_SLOTS}];
        out vec4 oProfile;
        const ivec2 RING[8] = ivec2[8](ivec2(1, 0), ivec2(1, 1), ivec2(0, 1), ivec2(-1, 1), ivec2(-1, 0), ivec2(-1, -1), ivec2(0, -1), ivec2(1, -1));
        ivec2 gSize;
        ivec2 inSheet(ivec2 p) { return clamp(p, ivec2(0), gSize - ivec2(1)); }
        vec4 dataAt(ivec2 p) { return texelFetch(uData, inSheet(p), 0); }
        vec3 normalAt(ivec2 p) { return texelFetch(uNormal, inSheet(p), 0).xyz * 2.0 - 1.0; }
        bool softAt(ivec2 p) { return texelFetch(uAlbedo, inSheet(p), 0).a < 0.9; }
        float classOf(vec4 d) { return uClass[int(d.z + 0.5)]; }
        bool sameObject(vec4 a, vec4 b) { return abs(a.y - b.y) < 0.5; }
        bool softIn(ivec2 p, vec4 d) { return sameObject(dataAt(p), d) && softAt(p); }
        // The Sobel over the normals, as ValeVision 3D's profile lines read them:
        // how much the unit normal changes across this pixel, by its strongest direction
        float sobelNormals(ivec2 p) {
            vec3 a = normalAt(p + ivec2(-1, -1)), b = normalAt(p + ivec2(0, -1)), c = normalAt(p + ivec2(1, -1));
            vec3 d = normalAt(p + ivec2(-1, 0)), f = normalAt(p + ivec2(1, 0));
            vec3 g = normalAt(p + ivec2(-1, 1)), h = normalAt(p + ivec2(0, 1)), i = normalAt(p + ivec2(1, 1));
            vec3 gx = (c + 2.0 * f + i - a - 2.0 * d - g) * 0.25;
            vec3 gy = (g + 2.0 * h + i - a - 2.0 * b - c) * 0.25;
            float xx = dot(gx, gx), yy = dot(gy, gy), xy = dot(gx, gy);
            return sqrt(0.5 * (xx + yy + sqrt((xx - yy) * (xx - yy) + 4.0 * xy * xy)));
        }
        // How squarely a surface faces the eye: 1 square on, 0 edge on
        float facing(ivec2 p) {
            vec3 n = normalize(transpose(uViewRot) * normalAt(p));
            vec3 toEye = uOrtho == 1 ? -uViewDir : normalize(uCameraPos - texelFetch(uWorld, inSheet(p), 0).xyz);
            return abs(dot(n, toEye));
        }
        // A form's rim against its neighbour? Across another object a round thing is
        // the form even where the flat one is a little nearer (a bowl's foot on the
        // ground, seen from above); within one object it takes a step in depth beyond
        // the surface's own slope (across: the depth one pixel the other way)
        bool standsOut(ivec2 p, vec4 d) { float c = classOf(d); return c > -0.5 && (c > 0.5 || softAt(p)); }
        bool rimAgainst(vec4 a, ivec2 pa, vec4 b, ivec2 pb, float across) {
            if (a.y < -0.5 || classOf(a) < -0.5) return false;
            if (b.y < -0.5) return true;
            if (!sameObject(a, b)) {
                bool oa = standsOut(pa, a), ob = standsOut(pb, b);
                if (oa && !ob) return a.x < b.x + uContactM + a.x * uContactShare;
                if (ob && !oa) return false;
                return a.x < b.x;
            }
            return b.x - a.x > uStepM + 2.0 * abs(a.x - across);
        }
        // Is this rim a round thing's? inward: from the rim into the form
        bool rounded(ivec2 f, vec2 inward) {
            vec4 d = dataAt(f);
            if (classOf(d) > 0.5) return true;                                // <-- A plant: always
            ivec2 a = f + ivec2(round(inward * uProbe.x)), b = f + ivec2(round(inward * uProbe.y));
            bool inA = sameObject(dataAt(a), d), inB = sameObject(dataAt(b), d);
            // Smooth shaded all the way in: a softened arris on a square post is smooth at
            // its rim and flat a little further in. Asked in four places, further in and
            // either way along the rim. A form too thin to look so far in answers at its rim
            ivec2 c = b + ivec2(round(inward * uProbe.y));
            vec2 along = vec2(-inward.y, inward.x) * uProbe.y;
            if (inB ? softAt(b) || softIn(c, d) || softIn(b + ivec2(round(along)), d) || softIn(b - ivec2(round(along)), d) : softAt(f) || (inA && softAt(a))) return true;
            if (sobelNormals(f) < uEdgeMin) return false;                     // <-- Flat either side of the edge, and alike: a straight thing's edge
            float ff = facing(f);
            if (ff > uLimbFacing || !inB) return false;                       // <-- Square on, or too thin to look inside: a picket, a glazing bar
            if (dot(normalAt(f), normalAt(b)) < uCornerDot) return false;     // <-- A square corner on the way in is a box, not a round thing's facet
            if (facing(b) - ff <= uTurnMin) return false;                     // <-- A flat wall seen at any angle turns not at all
            return sameObject(dataAt(c), d) && dot(normalAt(b), normalAt(c)) < 0.9995;   // <-- A chamfer turns once and is flat; a round thing's facets go on turning
        }
        void main() {
            gSize = textureSize(uData, 0);
            ivec2 p = ivec2(gl_FragCoord.xy);
            vec4 own = dataAt(p);
            vec4 ring[8];
            for (int k = 0; k < 8; k++) ring[k] = dataAt(p + RING[k]);
            vec2 outward = vec2(0.0);
            bool rim8 = false, rim4 = false, beside = false;
            ivec2 form = p;
            float nearest = 1e9;
            for (int k = 0; k < 8; k++) {
                ivec2 q = p + RING[k];
                if (rimAgainst(own, p, ring[k], q, ring[(k + 4) % 8].x)) {
                    outward += vec2(RING[k]);
                    rim8 = true;
                    if (k % 2 == 0) rim4 = true;
                } else if (ring[k].x < nearest && rimAgainst(ring[k], q, own, p, dataAt(q + RING[k]).x)) {
                    nearest = ring[k].x;
                    form = q;
                    beside = true;
                }
            }
            float band = 0.0, line = 0.0;
            if (rim8) {
                if (rounded(p, length(outward) > 0.0 ? -normalize(outward) : vec2(0.0))) { band = 1.0; line = rim4 ? 1.0 : 0.0; }
            } else if (beside) {
                if (rounded(form, normalize(vec2(form - p)))) band = 1.0;
            }
            oProfile = vec4(band, line, 0.0, 1.0);
        }`;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Profile Lines
// -----------------------------------------------------------------------------

    // MODULE STATE | The Rim Read Back, and the Classes for the Shader
    // ------------------------------------------------------------
    const Rim  =  { Pixels: null, Fresh: false, Classes: null, Quads: null };
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Material Classes the Geometry Need Not Be Asked About: 1 always, -1 never, 0 ask it
    // ------------------------------------------------------------
    function PainterlyNPR__ProfileLines__Classes() {
        if (Rim.Classes) return Rim.Classes;
        const classes  =  new Float32Array(MATERIAL_SLOTS);
        for (const key of CLASSES.Always) classes[MATERIAL_BY_KEY[key].Id] = 1;
        for (const key of CLASSES.Never) classes[MATERIAL_BY_KEY[key].Id] = -1;
        Rim.Classes  =  classes;
        return classes;
    }
    // ------------------------------------------------------------


    // FUNCTION | Pass - a Round Form's Rim
    // ------------------------------------------------------------
    function PainterlyNPR__ProfileLines__Run() {
        const T        =  Gpu.Targets;
        const program  =  Gpu.Programs.Profile || (Gpu.Programs.Profile = PainterlyNPR__GpuResources__Program('Profile lines', VS_FULLSCREEN, FS_PROFILE));
        const paint    =  PainterlyNPR__GpuResources__PaintPxPerMm();
        PainterlyNPR__GpuResources__Fullscreen(T.Profile, program, {
            uAlbedo       :  { t: T.GBuffer.Textures[0] },
            uNormal       :  { t: T.GBuffer.Textures[1] },
            uData         :  { t: T.GBuffer.Textures[2] },
            uWorld        :  { t: T.GBuffer.Textures[3] },
            uViewRot      :  { m3: Camera.ViewRot },
            uCameraPos    :  { v3: Camera.Eye },
            uViewDir      :  { v3: Camera.Forward },
            uOrtho        :  { i: Camera.Ortho ? 1 : 0 },
            uEdgeMin      :  { f: DETECTION.EdgeMin },
            uStepM        :  { f: DETECTION.StepM },
            uContactM     :  { f: DETECTION.ContactM },
            uContactShare :  { f: DETECTION.ContactShare },
            uLimbFacing   :  { f: DETECTION.LimbFacing },
            uCornerDot    :  { f: DETECTION.CornerDot },
            uTurnMin      :  { f: DETECTION.TurnMin },
            uProbe        :  { v2: DETECTION.ProbeMm.map((mm, i) => Math.max(DETECTION.ProbeMinPx[i], mm * paint)) },
            uClass        :  { fa: PainterlyNPR__ProfileLines__Classes() },
        });
        PainterlyNPR__ProfileLines__RoundRims(T.Profile);
        Rim.Fresh  =  false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Round Rims the Records Know, Into the Band
    // ------------------------------------------------------------
    // Seen square on, a chimney pot's top is flat and nothing in the buffers says
    // it is round; its edge record does (Round, from the scene: a line along a
    // smooth shaded surface). Each visible stretch goes into R alone, as a quad
    // RIM_WIDTH_PX wide, so a walking warp cannot step over it. Reads the truth back.
    const RIM_WIDTH_PX  =  3;

    function PainterlyNPR__ProfileLines__RoundRims(target) {
        const out   =  Rim.Quads || (Rim.Quads = new PainterlyNPR__FloatBuilder(1 << 14));
        const half  =  RIM_WIDTH_PX / 2;
        out.Clear();
        const quad  =  (a, b) => {
            const len  =  Math.hypot(b.X - a.X, b.Y - a.Y);
            if (len < 0.5) return;
            const nx = -(b.Y - a.Y) / len * half, ny = (b.X - a.X) / len * half;
            const corners  =  [[a.X + nx, a.Y + ny], [b.X + nx, b.Y + ny], [b.X - nx, b.Y - ny], [a.X + nx, a.Y + ny], [b.X - nx, b.Y - ny], [a.X - nx, a.Y - ny]];
            out.Reserve(36);
            for (const c of corners) { out.Data.set([c[0], c[1], 1, 0, 0, 1], out.Length); out.Length += 6; }
        };
        for (const edge of Scene.Edges) {
            if (!edge.Round || edge.Retired) continue;
            const tested  =  PainterlyNPR__LineCandidates__Visibility(edge);
            if (!tested) continue;
            let from  =  null, last = null;
            for (const sample of tested.Samples) {
                if (sample.Visible) { from = from || sample; last = sample; }
                else { if (from) quad(from, last); from = null; }
            }
            if (from) quad(from, last);
        }
        if (!out.Length) return;
        const gl  =  Gpu.Gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.Fbo);
        gl.viewport(0, 0, target.Width, target.Height);
        gl.colorMask(true, false, false, false);
        gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.Buffers.Debug);
        gl.bufferData(gl.ARRAY_BUFFER, out.Data.subarray(0, out.Length), gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        PainterlyNPR__GpuResources__Use(Gpu.Programs.Lines, { uSize: { v2: [target.Width, target.Height] } });
        gl.bindVertexArray(Gpu.Vaos.Debug);
        gl.drawArrays(gl.TRIANGLES, 0, out.Length / 6);
        gl.bindVertexArray(null);
        gl.colorMask(true, true, true, true);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Rim on the CPU: RGBA bytes of the sheet, G the rim; read once per camera, and only if asked
    // ------------------------------------------------------------
    function PainterlyNPR__ProfileLines__Read() {
        const T  =  Gpu.Targets.Profile;
        if (Rim.Fresh && Rim.Pixels && Rim.Pixels.length === T.Width * T.Height * 4) return Rim.Pixels;
        if (!Rim.Pixels || Rim.Pixels.length !== T.Width * T.Height * 4) Rim.Pixels = new Uint8Array(T.Width * T.Height * 4);
        const gl  =  Gpu.Gl;
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, T.Fbo);
        gl.readPixels(0, 0, T.Width, T.Height, gl.RGBA, gl.UNSIGNED_BYTE, Rim.Pixels);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        Rim.Fresh  =  true;
        return Rim.Pixels;
    }
    // ------------------------------------------------------------


    // FUNCTION | What the Wash Passes Need: the Looseness Past a Rim, the Feather at It, and How Far an Edge Looks for It
    // ------------------------------------------------------------
    function PainterlyNPR__ProfileLines__WashUniforms() {
        const paint  =  PainterlyNPR__GpuResources__PaintPxPerMm();
        return { LoosePx: WASH.LooseMm * paint, FeatherMm: Math.max(WASH.FeatherMm, WASH.FeatherMinPx / paint), PoolKept: WASH.PoolKept, PaperMm: WASH.PaperMm, ReachPx: WASH.LooseMm * paint + WASH.ReachPx, SeekMm: WASH.EdgeSeekMm, FleckPx: Math.max(WASH.FleckMinPx, Math.round(WASH.FleckMm * paint)), Foot: [WASH.FootFacing, WASH.FootStepPx, WASH.FootLevel] };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__ProfileLines__Read,
        PainterlyNPR__ProfileLines__Run,
        PainterlyNPR__ProfileLines__WashUniforms,
        TRACE  as  PainterlyNPR__ProfileLines__TRACE,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
