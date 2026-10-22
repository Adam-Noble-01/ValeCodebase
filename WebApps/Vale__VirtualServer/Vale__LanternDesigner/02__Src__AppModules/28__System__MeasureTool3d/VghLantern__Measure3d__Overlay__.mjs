/* =============================================================================
   VGHLANTERN - 3D MEASURE TOOL | OVERLAY
   =============================================================================

   FILE       : VghLantern__Measure3d__Overlay__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Measure3d - Overlay
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Draw the measurements, the one being made and the snap under the cursor over the 3D View
   CREATED    : 21-Oct-2026

   DESCRIPTION:
   - ONE SVG OVER THE CANVAS, IN SCREEN PIXELS. Every world point is projected
     through the camera as last drawn, so a dimension sits on the corner it was
     taken from at every orbit, and lines, ticks, glyphs and text stay one size on
     screen whatever the zoom.
   - NEVER IN THE SCENE. The Drawing Editor photographs this very surface for its
     sheet 3D views; a dimension drawn into the three.js scene would be issued on
     a drawing. A DOM layer over the canvas cannot be.
   - ON TOP OF THE MODEL. A dimension is never hidden by what it measures, as in
     Polycam and every CAD package.
   - THE DRAFT, AS POLYCAM DRAWS IT. From the first point the red, green and blue
     axes run dashed across the view (and square to the first face, magenta, in
     Face to Face); the free line is purple; snapped, the line and its whole axis
     go solid in the axis colour. A snapped end that is not the picked point (the
     axis part of a vertex to vertex, the plane meeting of a face to face) keeps a
     faint dashed witness to it, so it is plain what the dimension refers to.
   - THE FINISHED DIMENSION, AS TRUEVISION DRAWS IT (Adam, 21-Oct-2026: the
     TrueVision look): the line in the colour it snapped to (purple if free), the
     value along it in Vale blue with a white edge, grips and a red delete chip on
     the selected one. Its ends follow the Vale convention for size diagrams: a
     face is dimensioned with the 45 degree tick, a vertex with a solid dot.
   - THE MARKERS. Face to Face wears Polycam's reticle, a ring lying in the face
     under the cursor with the axes crossing at its centre; Vertex to Vertex
     AutoCAD's endpoint box (Measure3d__Glyphs). Both carry the part's name.
   - IT TAKES NO INPUT: pointer events are off. BuildMarkup reports where each
     label and the delete chip landed, and SystemLogic hit-tests those.

   ============================================================================= */

import * as THREE from 'three';

import { VghLantern__Env3d__ConfigAccess__MmToWorld } from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__ConfigAccess__.mjs';

import {
    VghLantern__Measure3d__ConfigAccess__RequireNumber,
    VghLantern__Measure3d__ConfigAccess__RequireArray
} from './VghLantern__Measure3d__ConfigAccess__.mjs';

import {
    VghLantern__Measure3d__Axis,
    VghLantern__Measure3d__SnapSolver__AxisWorld,
    VghLantern__Measure3d__SnapSolver__ToScreen,
    VghLantern__Measure3d__SnapSolver__WorldPerPixel,
    VghLantern__Measure3d__SnapSolver__FormatMm
} from './VghLantern__Measure3d__SnapSolver__.mjs';

import { VghLantern__Measure3d__Glyphs__Markup } from './VghLantern__Measure3d__Glyphs__.mjs';

// =============================================================================
// REGION | Measure Tool Overlay Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Classes and Layout Factors
    // ------------------------------------------------------------
    const CSS_OVERLAY          =  'VghLantern__Measure3d__Overlay';
    const CSS_INK_PREFIX       =  'VghLantern__Measure3d__Ink--';           // <-- + x | y | z | square | free: the stylesheet colours each
    const SVG_NS               =  'http://www.w3.org/2000/svg';

    const TEXT_WIDTH_PER_EM    =  0.58;                                     // <-- TrueVision's estimate: Open Sans semibold digits run about 0.58 em
    const LABEL_HEIGHT_PER_EM  =  1.25;
    const NAME_PAD_PX          =  6;                                        // <-- TrueVision's name tag: text inset and corner
    const NAME_CORNER_PX       =  3;
    const NAME_HEIGHT_PER_EM   =  1.55;                                     // <-- The tag's words sit centred in it (the stylesheet sets the baseline)
    const CASING_EXTRA_PX      =  2.4;                                      // <-- The white casing under a dimension line runs this much wider
    const SELECTED_LINE_FACTOR =  1.45;                                     // <-- A selected (or hovered) dimension's line, against the others
    const START_RETICLE_FACTOR =  0.55;                                     // <-- The first face's ring is smaller than the cursor's
    const MIN_WITNESS_PX       =  2;                                        // <-- A snapped end this close to the picked point needs no witness
    const NEAR_CLIP_FACTOR     =  1.0001;                                   // <-- Clip a shade inside the near plane, so w never reaches zero
    const MODEL_AXIS_KEYS      =  ['x', 'y', 'z'];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Number for SVG Markup (two decimals of a pixel)
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Overlay__N(value) {
        const n  =  Math.round(Number(value) * 100) / 100;
        return isFinite(n) ? String(n) : '0';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Text Made Safe for Markup
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Overlay__Esc(text) {
        return String(text === undefined || text === null ? '' : text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Every Overlay Size, Read Once per Draw
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Overlay__Sizes() {
        const Num  =  VghLantern__Measure3d__ConfigAccess__RequireNumber;
        const Arr  =  VghLantern__Measure3d__ConfigAccess__RequireArray;

        return {
            Line        : Num('Overlay', 'LinePx'),
            Tick        : Num('Overlay', 'TickPx'),
            Dot         : Num('Overlay', 'DotPx'),
            Grip        : Num('Overlay', 'GripPx'),
            Label       : Num('Overlay', 'LabelPx'),
            Halo        : Num('Overlay', 'HaloPx'),
            Gap         : Num('Overlay', 'LabelGapPx'),
            Chip        : Num('Overlay', 'ChipPx'),
            Guide       : Num('Overlay', 'GuidePx'),
            GuideDash   : Arr('Overlay', 'GuideDashPx').join(' '),
            Ray         : Num('Overlay', 'RayPx'),
            WitnessDash : Arr('Overlay', 'WitnessDashPx').join(' '),
            Glyph       : Num('Overlay', 'GlyphPx'),
            Name        : Num('Overlay', 'NamePx'),
            Reticle     : Num('Overlay', 'ReticleRadiusPx'),
            Segments    : Math.max(12, Math.round(Num('Overlay', 'ReticleSegments'))),
            ReticleTick : Num('Overlay', 'ReticleTickPx'),
            GuideWorld  : VghLantern__Env3d__ConfigAccess__MmToWorld(Num('Overlay', 'GuideLengthMm'))
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Project One World Point (null when behind the eye)
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Overlay__Point(point, ctx) {
        return VghLantern__Measure3d__SnapSolver__ToScreen(point, ctx.Camera, ctx.View, { X : 0, Y : 0 });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Project a World Segment, Clipped at the Near Plane
    // ------------------------------------------------------------
    // A guide running forty metres either way always has one end behind the eye
    // somewhere in an orbit, and a point behind the eye projects to the wrong side
    // of the screen. Each end is taken into camera space and the part behind the
    // near plane cut away before the perspective divide. Null when none of it is
    // in front.
    function VghLantern__Measure3d__Overlay__Segment(a, b, ctx) {
        const camera  =  ctx.Camera;
        const pa      =  a.clone().applyMatrix4(camera.matrixWorldInverse);
        const pb      =  b.clone().applyMatrix4(camera.matrixWorldInverse);
        const limit   =  -camera.near * NEAR_CLIP_FACTOR;

        if (pa.z > limit && pb.z > limit) return null;
        if (pa.z > limit) pa.lerp(pb, (limit - pa.z) / (pb.z - pa.z));
        else if (pb.z > limit) pb.lerp(pa, (limit - pb.z) / (pa.z - pb.z));

        pa.applyMatrix4(camera.projectionMatrix);
        pb.applyMatrix4(camera.projectionMatrix);

        return {
            X1 : (pa.x + 1) / 2 * ctx.View.Width,  Y1 : (1 - pa.y) / 2 * ctx.View.Height,
            X2 : (pb.x + 1) / 2 * ctx.View.Width,  Y2 : (1 - pb.y) / 2 * ctx.View.Height
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Segment's Path Data
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Overlay__PathOf(seg) {
        const N  =  VghLantern__Measure3d__Overlay__N;
        return 'M' + N(seg.X1) + ' ' + N(seg.Y1) + 'L' + N(seg.X2) + ' ' + N(seg.Y2);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Unit Direction Along a Screen Segment (left to right when it has none)
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Overlay__Along(seg) {
        const dx   =  seg.X2 - seg.X1;
        const dy   =  seg.Y2 - seg.Y1;
        const len  =  Math.hypot(dx, dy);
        return len < 1e-6 ? { X : 1, Y : 0, Length : 0 } : { X : dx / len, Y : dy / len, Length : len };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An Angle That Keeps Text Upright (degrees, -90 to 90)
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Overlay__Upright(dx, dy) {
        let deg  =  Math.atan2(dy, dx) * 180 / Math.PI;
        if (deg > 90)   deg -= 180;
        if (deg <= -90) deg += 180;
        return deg;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Labels, Ends and Chips
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Where a Length's Label Sits: Beside Its Line, Above It
    // ------------------------------------------------------------
    // TrueVision's placement: along the line, upright, clear of it by the gap. A
    // line seen end on has no direction, so its label sits level above its middle.
    function VghLantern__Measure3d__Overlay__LabelBox(text, seg, sizes) {
        const along  =  VghLantern__Measure3d__Overlay__Along(seg);
        let nx = 0, ny = -1, deg = 0;

        if (along.Length >= 1) {
            nx   =  -along.Y;
            ny   =   along.X;
            if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }       // <-- Above the line (or to its left when it is upright)
            deg  =  VghLantern__Measure3d__Overlay__Upright(seg.X2 - seg.X1, seg.Y2 - seg.Y1);
        }

        const off  =  sizes.Gap + sizes.Label * 0.5;
        return {
            X   : (seg.X1 + seg.X2) / 2 + nx * off,
            Y   : (seg.Y1 + seg.Y2) / 2 + ny * off,
            W   : String(text).length * sizes.Label * TEXT_WIDTH_PER_EM,
            H   : sizes.Label * LABEL_HEIGHT_PER_EM,
            Deg : deg
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Label: Text With a White Edge, Turned Along Its Line
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Overlay__LabelMarkup(text, box, sizes, extraClass) {
        const N     =  VghLantern__Measure3d__Overlay__N;
        const turn  =  box.Deg ? ' transform="rotate(' + N(box.Deg) + ' ' + N(box.X) + ' ' + N(box.Y) + ')"' : '';

        return '<text class="VghLantern__Measure3d__Label' + (extraClass ? ' ' + extraClass : '') + '"' +
               ' x="' + N(box.X) + '" y="' + N(box.Y) + '" font-size="' + N(sizes.Label) + '"' +
               ' stroke-width="' + N(sizes.Halo) + '"' + turn + '>' +
               VghLantern__Measure3d__Overlay__Esc(text) + '</text>';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Vale 45 Degree Tick Across One End of a Face Dimension
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Overlay__Tick(x, y, along, sizes) {
        const N   =  VghLantern__Measure3d__Overlay__N;
        const dx  =  (along.X - along.Y) * Math.SQRT1_2 * sizes.Tick;        // <-- Halfway between the line and its square: 45 degrees
        const dy  =  (along.Y + along.X) * Math.SQRT1_2 * sizes.Tick;

        return 'M' + N(x - dx) + ' ' + N(y - dy) + 'L' + N(x + dx) + ' ' + N(y + dy);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Grip on a Selected Dimension's End
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Overlay__Grip(x, y, sizes) {
        const N  =  VghLantern__Measure3d__Overlay__N;
        return '<circle class="VghLantern__Measure3d__Grip" cx="' + N(x) + '" cy="' + N(y) + '" r="' + N(sizes.Grip) + '" stroke-width="1.5"/>';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Delete Chip Beside a Selected Dimension's Label
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Overlay__Chip(box, sizes) {
        const N      =  VghLantern__Measure3d__Overlay__N;
        const r      =  sizes.Chip;
        const turn   =  (box.Deg || 0) * Math.PI / 180;
        const reach  =  box.W / 2 + r + 4;
        const x      =  box.X + Math.cos(turn) * reach;
        const y      =  box.Y + Math.sin(turn) * reach;
        const arm    =  r * 0.42;

        return {
            Markup : '<g class="VghLantern__Measure3d__Chip"><circle cx="' + N(x) + '" cy="' + N(y) + '" r="' + N(r) + '" stroke-width="1.2"/>' +
                     '<path d="M' + N(x - arm) + ' ' + N(y - arm) + 'L' + N(x + arm) + ' ' + N(y + arm) +
                     'M' + N(x + arm) + ' ' + N(y - arm) + 'L' + N(x - arm) + ' ' + N(y + arm) + '" stroke-width="1.6"/></g>',
            Hit    : { X : x, Y : y, R : r }
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Name Tag Beside a Marker (TrueVision's: dark, rounded, white words)
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Overlay__NameTag(text, x, y, sizes) {
        if (!text) return '';
        const N       =  VghLantern__Measure3d__Overlay__N;
        const width   =  String(text).length * sizes.Name * TEXT_WIDTH_PER_EM + NAME_PAD_PX * 2;
        const height  =  sizes.Name * NAME_HEIGHT_PER_EM;

        return '<g class="VghLantern__Measure3d__Name">' +
               '<rect x="' + N(x) + '" y="' + N(y) + '" width="' + N(width) + '" height="' + N(height) + '" rx="' + NAME_CORNER_PX + '"/>' +
               '<text x="' + N(x + NAME_PAD_PX) + '" y="' + N(y + height / 2) + '" font-size="' + N(sizes.Name) + '">' +
               VghLantern__Measure3d__Overlay__Esc(text) + '</text></g>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Markers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Polycam's Reticle: a Ring Lying in the Face, the Axes at Its Centre
    // ------------------------------------------------------------
    // The ring is a circle in the face's own plane, a constant size on screen, so
    // in perspective it reads as an ellipse lying on the face - which is what tells
    // the reader which face they are on. factor shrinks it (the first face's ring);
    // withAxes adds the short red, green and blue crossing at the centre.
    function VghLantern__Measure3d__Overlay__Reticle(point, normal, ctx, factor, withAxes) {
        const N       =  VghLantern__Measure3d__Overlay__N;
        const sizes   =  ctx.Sizes;
        const centre  =  VghLantern__Measure3d__Overlay__Point(point, ctx);
        if (!centre || !normal) return '';

        const perPixel  =  VghLantern__Measure3d__SnapSolver__WorldPerPixel(point, ctx.Camera, ctx.View);
        const radius    =  sizes.Reticle * factor * perPixel;
        const helper    =  Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const u         =  new THREE.Vector3().crossVectors(normal, helper).normalize();
        const v         =  new THREE.Vector3().crossVectors(normal, u).normalize();
        const corner    =  new THREE.Vector3();

        let d  =  '';
        for (let i = 0; i < sizes.Segments; i++) {
            const angle  =  (i / sizes.Segments) * Math.PI * 2;
            corner.copy(point).addScaledVector(u, Math.cos(angle) * radius).addScaledVector(v, Math.sin(angle) * radius);
            const p  =  VghLantern__Measure3d__Overlay__Point(corner, ctx);
            if (!p) return '';                                               // <-- Ring partly behind the eye: leave it off rather than tear it
            d  +=  (i === 0 ? 'M' : 'L') + N(p.X) + ' ' + N(p.Y);
        }
        d  +=  'Z';

        let markup  =  '<g class="VghLantern__Measure3d__Reticle">' +
                       '<path class="VghLantern__Measure3d__ReticleFill" d="' + d + '"/>' +
                       '<path class="VghLantern__Measure3d__ReticleCasing" d="' + d + '" stroke-width="5"/>' +
                       '<path class="VghLantern__Measure3d__ReticleRing" d="' + d + '" stroke-width="1.8"/>';

        if (withAxes) {
            const reach  =  sizes.ReticleTick * 0.5 * perPixel;
            for (let i = 0; i < MODEL_AXIS_KEYS.length; i++) {
                const axis  =  VghLantern__Measure3d__SnapSolver__AxisWorld(MODEL_AXIS_KEYS[i]);
                const seg   =  VghLantern__Measure3d__Overlay__Segment(
                    point.clone().addScaledVector(axis, -reach), point.clone().addScaledVector(axis, reach), ctx);
                if (!seg) continue;

                markup  +=  '<path class="VghLantern__Measure3d__ReticleAxisCasing" d="' + VghLantern__Measure3d__Overlay__PathOf(seg) + '" stroke-width="4"/>' +
                            '<path class="VghLantern__Measure3d__ReticleAxis ' + CSS_INK_PREFIX + MODEL_AXIS_KEYS[i] + '" d="' +
                            VghLantern__Measure3d__Overlay__PathOf(seg) + '" stroke-width="2"/>';
            }
        }

        markup  +=  '<circle class="VghLantern__Measure3d__ReticleDot" cx="' + N(centre.X) + '" cy="' + N(centre.Y) + '" r="2.2"/></g>';
        return markup;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | AutoCAD's Endpoint Box Round a Corner
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Overlay__VertexBox(point, ctx) {
        const p  =  VghLantern__Measure3d__Overlay__Point(point, ctx);
        if (!p) return null;
        return { Markup : VghLantern__Measure3d__Glyphs__Markup('end', p.X, p.Y, ctx.Sizes.Glyph, 'VghLantern__Measure3d__Snap'), X : p.X, Y : p.Y };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Marker Under the Cursor, With the Part's Name
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Overlay__HoverMarker(hover, ctx) {
        if (!hover || !hover.Point) return '';
        const sizes  =  ctx.Sizes;

        if (hover.Kind === 'vertex') {
            const box  =  VghLantern__Measure3d__Overlay__VertexBox(hover.Point, ctx);
            if (!box) return '';
            const clear  =  sizes.Glyph / 2 + 3;                             // <-- Below and right of the box, clear of it
            return box.Markup + VghLantern__Measure3d__Overlay__NameTag(hover.Name, box.X + clear, box.Y + clear, sizes);
        }

        const ring  =  VghLantern__Measure3d__Overlay__Reticle(hover.Point, hover.Normal, ctx, 1, true);
        const at    =  VghLantern__Measure3d__Overlay__Point(hover.Point, ctx);
        if (!ring || !at) return ring;
        const clear  =  sizes.Reticle + 4;
        return ring + VghLantern__Measure3d__Overlay__NameTag(hover.Name, at.X + clear * 0.7, at.Y + clear * 0.7, sizes);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Dimensions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Faint Dashed Witness From a Snapped End to the Point Picked
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Overlay__Witness(fromWorld, toWorld, ctx) {
        if (!fromWorld || !toWorld) return '';
        const seg  =  VghLantern__Measure3d__Overlay__Segment(fromWorld, toWorld, ctx);
        if (!seg || VghLantern__Measure3d__Overlay__Along(seg).Length < MIN_WITNESS_PX) return '';

        return '<path class="VghLantern__Measure3d__Witness" d="' + VghLantern__Measure3d__Overlay__PathOf(seg) + '"' +
               ' stroke-width="1.2" stroke-dasharray="' + ctx.Sizes.WitnessDash + '"/>';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Finished Dimension
    // ------------------------------------------------------------
    // Returns { Markup, Box, Chip } or null when none of it is in front of the eye.
    // showChip is false while no tool is on: a dimension picked from the menu's list
    // still shows its grips, but a chip nobody could click is left off.
    function VghLantern__Measure3d__Overlay__Measurement(measure, ctx, isSelected, isHover, showChip) {
        const N      =  VghLantern__Measure3d__Overlay__N;
        const sizes  =  ctx.Sizes;
        const seg    =  VghLantern__Measure3d__Overlay__Segment(measure.Start, measure.End, ctx);
        if (!seg) return null;

        const along   =  VghLantern__Measure3d__Overlay__Along(seg);
        const path    =  VghLantern__Measure3d__Overlay__PathOf(seg);
        const weight  =  sizes.Line * ((isSelected || isHover) ? SELECTED_LINE_FACTOR : 1);
        const text    =  VghLantern__Measure3d__SnapSolver__FormatMm(measure.LengthMm, ctx.Decimals);
        const box     =  VghLantern__Measure3d__Overlay__LabelBox(text, seg, sizes);

        let markup  =  (measure.AxisKey !== VghLantern__Measure3d__Axis.Free)
            ? VghLantern__Measure3d__Overlay__Witness(measure.End, measure.Target, ctx)
            : '';

        markup  +=  '<path class="VghLantern__Measure3d__LineCasing" d="' + path + '" stroke-width="' + N(weight + CASING_EXTRA_PX) + '"/>' +
                    '<path class="VghLantern__Measure3d__Line" d="' + path + '" stroke-width="' + N(weight) + '"/>';

        if (measure.Tool === 'face') {
            markup  +=  '<path class="VghLantern__Measure3d__Tick" d="' +
                        VghLantern__Measure3d__Overlay__Tick(seg.X1, seg.Y1, along, sizes) +
                        VghLantern__Measure3d__Overlay__Tick(seg.X2, seg.Y2, along, sizes) + '" stroke-width="' + N(sizes.Line) + '"/>';
        } else {
            markup  +=  '<circle class="VghLantern__Measure3d__Dot" cx="' + N(seg.X1) + '" cy="' + N(seg.Y1) + '" r="' + N(sizes.Dot) + '"/>' +
                        '<circle class="VghLantern__Measure3d__Dot" cx="' + N(seg.X2) + '" cy="' + N(seg.Y2) + '" r="' + N(sizes.Dot) + '"/>';
        }

        markup  +=  VghLantern__Measure3d__Overlay__LabelMarkup(text, box, sizes, '');

        let chip  =  null;
        if (isSelected) {
            markup  +=  VghLantern__Measure3d__Overlay__Grip(seg.X1, seg.Y1, sizes) + VghLantern__Measure3d__Overlay__Grip(seg.X2, seg.Y2, sizes);
            if (showChip) {
                chip     =  VghLantern__Measure3d__Overlay__Chip(box, sizes);
                markup  +=  chip.Markup;
            }
        }

        const cls  =  'VghLantern__Measure3d__Measure ' + CSS_INK_PREFIX + measure.AxisKey +
                      (isSelected ? ' VghLantern__Measure3d__Measure--selected' : '') +
                      (isHover    ? ' VghLantern__Measure3d__Measure--hover'    : '');

        return { Markup : '<g class="' + cls + '">' + markup + '</g>', Box : box, Chip : chip ? chip.Hit : null };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Axis Guides Through the First Point
    // ------------------------------------------------------------
    // Polycam's axis system: each axis dashed across the view in its colour, and
    // the one the line has snapped to drawn solid, so how far off the line runs is
    // read against all three at once.
    function VghLantern__Measure3d__Overlay__Guides(draft, ctx) {
        const sizes    =  ctx.Sizes;
        const snapped  =  draft.Live ? draft.Live.AxisKey : VghLantern__Measure3d__Axis.Free;
        const lines    =  [];

        for (let i = 0; i < MODEL_AXIS_KEYS.length; i++) {
            lines.push({ Key : MODEL_AXIS_KEYS[i], Vector : VghLantern__Measure3d__SnapSolver__AxisWorld(MODEL_AXIS_KEYS[i]) });
        }
        if (draft.SquareDirection) lines.push({ Key : VghLantern__Measure3d__Axis.Square, Vector : draft.SquareDirection });

        let markup  =  '';
        for (let i = 0; i < lines.length; i++) {
            const seg  =  VghLantern__Measure3d__Overlay__Segment(
                draft.Start.clone().addScaledVector(lines[i].Vector, -sizes.GuideWorld),
                draft.Start.clone().addScaledVector(lines[i].Vector,  sizes.GuideWorld), ctx);
            if (!seg) continue;

            const isSnapped  =  lines[i].Key === snapped;
            markup  +=  '<path class="VghLantern__Measure3d__Guide ' + CSS_INK_PREFIX + lines[i].Key +
                        (isSnapped ? ' VghLantern__Measure3d__Guide--snapped' : '') + '"' +
                        ' d="' + VghLantern__Measure3d__Overlay__PathOf(seg) + '"' +
                        ' stroke-width="' + VghLantern__Measure3d__Overlay__N(sizes.Guide) + '"' +
                        (isSnapped ? '' : ' stroke-dasharray="' + sizes.GuideDash + '"') + '/>';
        }
        return markup;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Dimension Being Made
    // ------------------------------------------------------------
    // The first point's marker (the endpoint box kept on the first vertex, a small
    // ring on the first face), the guides, and the live line to the cursor with
    // its value: purple while free, the axis colour once snapped.
    function VghLantern__Measure3d__Overlay__Draft(draft, ctx) {
        const N      =  VghLantern__Measure3d__Overlay__N;
        const sizes  =  ctx.Sizes;
        let markup   =  VghLantern__Measure3d__Overlay__Guides(draft, ctx);

        const live  =  draft.Live;
        if (live) {
            const seg  =  VghLantern__Measure3d__Overlay__Segment(draft.Start, live.End, ctx);
            if (seg) {
                const text  =  VghLantern__Measure3d__SnapSolver__FormatMm(draft.LengthMm, ctx.Decimals);
                const box   =  VghLantern__Measure3d__Overlay__LabelBox(text, seg, sizes);

                if (live.AxisKey !== VghLantern__Measure3d__Axis.Free) markup  +=  VghLantern__Measure3d__Overlay__Witness(live.End, draft.Target, ctx);

                markup  +=  '<g class="VghLantern__Measure3d__Measure VghLantern__Measure3d__Measure--draft ' + CSS_INK_PREFIX + live.AxisKey + '">' +
                            '<path class="VghLantern__Measure3d__LineCasing" d="' + VghLantern__Measure3d__Overlay__PathOf(seg) + '" stroke-width="' + N(sizes.Ray + CASING_EXTRA_PX) + '"/>' +
                            '<path class="VghLantern__Measure3d__Line" d="' + VghLantern__Measure3d__Overlay__PathOf(seg) + '" stroke-width="' + N(sizes.Ray) + '"/>' +
                            VghLantern__Measure3d__Overlay__LabelMarkup(text, box, sizes, 'VghLantern__Measure3d__Label--live') +
                            '</g>';
            }
        }

        if (draft.Tool === 'vertex') {
            const box  =  VghLantern__Measure3d__Overlay__VertexBox(draft.Start, ctx);
            if (box) markup  +=  box.Markup;
        } else {
            markup  +=  VghLantern__Measure3d__Overlay__Reticle(draft.Start, draft.StartNormal, ctx, START_RETICLE_FACTOR, false);
        }
        return markup;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Overlay's Markup and Where Its Labels Landed
    // ------------------------------------------------------------
    // Pure: no DOM, so the dev checks can run it headless. scene is:
    //   Measures   - the finished dimensions { Id, Tool, Start, End, Target, AxisKey, LengthMm }
    //   SelectedId - the one with grips (and, with ShowChip, a delete chip)
    //   ShowChip   - true while a tool is on, so the chip can be clicked
    //   HoverId    - the one under the cursor
    //   Decimals   - 0 or 2
    //   Draft      - the one being made { Tool, Start, StartNormal, SquareDirection, Target, Live, LengthMm } or null
    //   Hover      - the snap under the cursor { Kind, Point, Normal, Name } or null
    // view is { Width, Height } in CSS pixels. Returns
    // { Markup, Labels : [{ Id, Box }], Chip : { Id, X, Y, R } | null }.
    export function VghLantern__Measure3d__Overlay__BuildMarkup(camera, view, scene) {
        const ctx    =  { Camera : camera, View : view, Sizes : VghLantern__Measure3d__Overlay__Sizes(), Decimals : scene.Decimals || 0 };
        const hits   =  { Labels : [], Chip : null };
        const parts  =  [];

        if (scene.Draft) parts.push(VghLantern__Measure3d__Overlay__Draft(scene.Draft, ctx));

        const measures  =  scene.Measures || [];
        for (let i = 0; i < measures.length; i++) {
            const measure  =  measures[i];
            const drawn    =  VghLantern__Measure3d__Overlay__Measurement(measure, ctx,
                measure.Id === scene.SelectedId, measure.Id === scene.HoverId, scene.ShowChip === true);
            if (!drawn) continue;

            parts.push(drawn.Markup);
            hits.Labels.push({ Id : measure.Id, Box : drawn.Box });
            if (drawn.Chip) hits.Chip  =  { Id : measure.Id, X : drawn.Chip.X, Y : drawn.Chip.Y, R : drawn.Chip.R };
        }

        parts.push(VghLantern__Measure3d__Overlay__HoverMarker(scene.Hover, ctx));
        return { Markup : parts.join(''), Labels : hits.Labels, Chip : hits.Chip };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Overlay Element Over a Surface's Canvas (made once)
    // ------------------------------------------------------------
    // Sits in the canvas host after the canvas, sized to it by the stylesheet, so
    // its pixels are the canvas's CSS pixels.
    export function VghLantern__Measure3d__Overlay__Ensure(surface) {
        if (!surface || !surface.HostElement) return null;

        let svg  =  surface.Measure3dOverlay || null;
        if (svg && svg.parentNode === surface.HostElement) return svg;

        svg  =  document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', CSS_OVERLAY);
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        surface.HostElement.appendChild(svg);
        surface.Measure3dOverlay  =  svg;
        return svg;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Canvas Size the Overlay Is Drawn To, in CSS Pixels
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__Overlay__View(surface) {
        const canvas  =  surface && surface.Renderer ? surface.Renderer.domElement : null;
        if (!canvas) return null;

        const rect  =  canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return null;               // <-- Mode hidden: nothing to draw to
        return { Width : rect.width, Height : rect.height, Left : rect.left, Top : rect.top };
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Scene Into a Surface's Overlay, and Return the Label Hits
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__Overlay__Render(surface, scene) {
        const empty  =  { Labels : [], Chip : null };
        if (!surface || surface.IsDestroyed || !surface.Camera) return empty;

        const svg   =  VghLantern__Measure3d__Overlay__Ensure(surface);
        const view  =  VghLantern__Measure3d__Overlay__View(surface);
        if (!svg || !view) return empty;

        const built  =  VghLantern__Measure3d__Overlay__BuildMarkup(surface.Camera, view, scene);
        svg.innerHTML  =  built.Markup;
        return { Labels : built.Labels, Chip : built.Chip };
    }
    // ------------------------------------------------------------


    // FUNCTION | Take the Overlay Off a Surface
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__Overlay__Remove(surface) {
        const svg  =  surface ? surface.Measure3dOverlay : null;
        if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
        if (surface) surface.Measure3dOverlay  =  null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
