/* =============================================================================
   PAINTERLYNPR - SYSTEM | GPU RESOURCES - FLOAT BUILDER
   =============================================================================

   FILE       : PainterlyNPR__GpuResources__FloatBuilder__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : System - GpuResources - FloatBuilder
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A growable float array: ribbons, debug lines, dabs and quads are
                built in one
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - A class with no imports: the line, indication and shadow-line outputs make
     theirs at load time.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region GPU Resources
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

// =============================================================================
// REGION | Gpu Resources - Float Builder
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | GPU Resources
// -----------------------------------------------------------------------------

    // CLASS | A Growable Float Array - ribbons and debug lines are built in it
    // ------------------------------------------------------------
    class PainterlyNPR__FloatBuilder {
        constructor(capacity) { this.Data = new Float32Array(capacity); this.Length = 0; }
        Reserve(extra) {
            if (this.Length + extra <= this.Data.length) return;
            let size  =  this.Data.length * 2;
            while (size < this.Length + extra) size *= 2;
            const next  =  new Float32Array(size);
            next.set(this.Data.subarray(0, this.Length));
            this.Data  =  next;
        }
        Clear() { this.Length = 0; }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__FloatBuilder,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
