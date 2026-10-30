/* =============================================================================
   PAINTERLYNPR - APP UTILS | MATHS
   =============================================================================

   FILE       : PainterlyNPR__AppUtils__Maths__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : AppUtils - Maths
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Vectors, matrices as WebGL reads them, and colour from hex to
                linear light
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Pure functions, no imports. The vector helpers keep their short names inside
     the modules that use them.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Maths
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

// =============================================================================
// REGION | Maths
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Maths
// -----------------------------------------------------------------------------

    // FUNCTION | Vector Helpers
    // ------------------------------------------------------------
    const V3Add        =  (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const V3Sub        =  (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const V3Scale      =  (a, s) => [a[0] * s, a[1] * s, a[2] * s];
    const V3Dot        =  (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const V3Cross      =  (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const V3Length     =  (a) => Math.hypot(a[0], a[1], a[2]);
    const V3Normalise  =  (a) => { const l = V3Length(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    const V3Lerp       =  (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const Clamp        =  (x, a, b) => Math.min(b, Math.max(a, x));
    const Lerp         =  (a, b, t) => a + (b - a) * t;
    const SmoothStep   =  (a, b, x) => { const t = Clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    // ------------------------------------------------------------


    // FUNCTION | Perspective Projection (column-major, as WebGL reads it)
    // ------------------------------------------------------------
    function PainterlyNPR__Maths__Perspective(fovY, aspect, near, far) {
        const f   =  1 / Math.tan(fovY / 2);
        const nf  =  1 / (near - far);
        return new Float32Array([f / aspect, 0, 0, 0,  0, f, 0, 0,  0, 0, (far + near) * nf, -1,  0, 0, 2 * far * near * nf, 0]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Orthographic Projection
    // ------------------------------------------------------------
    function PainterlyNPR__Maths__Ortho(l, r, b, t, n, f) {
        return new Float32Array([2 / (r - l), 0, 0, 0,  0, 2 / (t - b), 0, 0,  0, 0, -2 / (f - n), 0,  -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Look-At View Matrix
    // ------------------------------------------------------------
    function PainterlyNPR__Maths__LookAt(eye, target, up) {
        const z  =  V3Normalise(V3Sub(eye, target));
        const x  =  V3Normalise(V3Cross(up, z));
        const y  =  V3Cross(z, x);
        return new Float32Array([x[0], y[0], z[0], 0,  x[1], y[1], z[1], 0,  x[2], y[2], z[2], 0,  -V3Dot(x, eye), -V3Dot(y, eye), -V3Dot(z, eye), 1]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Multiply Two 4x4 Matrices (a x b)
    // ------------------------------------------------------------
    function PainterlyNPR__Maths__Multiply(a, b) {
        const out  =  new Float32Array(16);
        for (let c = 0; c < 4; c++) {
            for (let r = 0; r < 4; r++) {
                out[c * 4 + r]  =  a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
            }
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Hex to sRGB Triple, and sRGB to Linear Light
    // ------------------------------------------------------------
    function PainterlyNPR__Maths__Hex(hex) {
        const v  =  parseInt(hex.slice(1), 16);
        return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
    }

    function PainterlyNPR__Maths__Linear(rgb) {
        return rgb.map(c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Maths__Hex,
        PainterlyNPR__Maths__Linear,
        PainterlyNPR__Maths__LookAt,
        PainterlyNPR__Maths__Multiply,
        PainterlyNPR__Maths__Ortho,
        PainterlyNPR__Maths__Perspective,
        Clamp        as  PainterlyNPR__Maths__Clamp,
        Lerp         as  PainterlyNPR__Maths__Lerp,
        SmoothStep   as  PainterlyNPR__Maths__SmoothStep,
        V3Add        as  PainterlyNPR__Maths__V3Add,
        V3Cross      as  PainterlyNPR__Maths__V3Cross,
        V3Dot        as  PainterlyNPR__Maths__V3Dot,
        V3Length     as  PainterlyNPR__Maths__V3Length,
        V3Lerp       as  PainterlyNPR__Maths__V3Lerp,
        V3Normalise  as  PainterlyNPR__Maths__V3Normalise,
        V3Scale      as  PainterlyNPR__Maths__V3Scale,
        V3Sub        as  PainterlyNPR__Maths__V3Sub,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
