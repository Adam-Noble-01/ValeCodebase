// =============================================================================
// VALEVISION3D - ORBIT PIVOT - INTERACTION SWAP
// =============================================================================
//
// FILE       : Na__Navmode__OrbitPivot__InteractionSwap.js
// NAMESPACE  : Na__OrbitPivot
// MODULE     : Orbit Pivot Interaction Swap
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Keep the resting view framed exactly as the SketchUp scene while
//              re-pivoting the orbit around the OrbitHelperCube the moment the
//              user actually starts to rotate.
// CREATED    : 10-Jul-2026
//
// DESCRIPTION:
// - OrbitControls conflates two ideas into a single controls.target: it is
//   BOTH the point the camera looks at (camera.lookAt(target) runs on every
//   controls.update()) AND the point the camera orbits around. A SketchUp
//   scene needs those two to be DIFFERENT points:
//     * VIEW / framing    -> the scene's own camera.target (the shot's look-at
//       point). Setting controls.target here reproduces the exact SketchUp
//       framing, because the baked rotation was derived from eye -> target.
//     * ORBIT pivot        -> the physical OrbitHelperCube centre, so that
//       dragging to rotate always swings around the building, not around each
//       shot's arbitrary look-at point (which, on a wide establishing shot,
//       can sit far off to one side).
// - Because a single target cannot be both, this module leaves the framing
//   target in place at rest and swaps controls.target to the cube pivot on the
//   FIRST real rotation after each scene is applied ("the cube kicks in").
// - The swap is gated on an actual 'change' during an active interaction, so a
//   bare click (pointer down + up, no drag) never re-frames the view.
//
// INTEGRATION:
// - Na__AppFlow__LoadingSequence calls Init(controls) once, SetPivot(vec) with
//   the resolved cube / saved orbit target, and Arm() after the boot scene is
//   framed.
// - Na__PresentationMode__UI__SceneCarousel calls Arm() after each scene is
//   applied (card click / prev / next / default) for SketchUp-derived scenes.
// - Scenes whose per-scene orbit target is deliberately human-authored do NOT
//   arm the swap (see Na__PresentationMode__ProjectJson__ShouldTrustSceneOrbitTarget)
//   so their authored pivot is preserved.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Jul-2026 - Version 1.0.0
// - Initial implementation. Replaces the earlier approach of leaving
//   controls.target on the cube at rest (which made OrbitControls' per-frame
//   lookAt(target) aim the camera at the cube and discard the SketchUp look
//   direction, so scenes framed the cube instead of the shot).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Swap State
    // ------------------------------------------------------------
    let Na__OrbitPivot__Controls    = null;   // <-- Live OrbitControls reference
    let Na__OrbitPivot__Pivot       = null;   // <-- { x, y, z } cube / saved orbit target (null when none resolved)
    let Na__OrbitPivot__Armed       = false;  // <-- True after a scene is framed, until the first real rotation consumes it
    let Na__OrbitPivot__Interacting = false;  // <-- True between OrbitControls 'start' and 'end' (a pointer gesture is live)
    let Na__OrbitPivot__Initialized = false;  // <-- Guard against attaching listeners twice
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Interaction Wiring
// -----------------------------------------------------------------------------

    // FUNCTION | Attach the One-Time OrbitControls Interaction Listeners
    // ------------------------------------------------------------
    // controls {OrbitControls} - the live orbit controls instance
    // ------------------------------------------------------------
    function Na__OrbitPivot__Init(controls) {
        if (Na__OrbitPivot__Initialized) return;                         // <-- Idempotent
        if (!controls) return;

        Na__OrbitPivot__Controls    = controls;
        Na__OrbitPivot__Initialized = true;

        controls.addEventListener('start',  Na__OrbitPivot__OnInteractionStart);
        controls.addEventListener('change', Na__OrbitPivot__OnInteractionChange);
        controls.addEventListener('end',    Na__OrbitPivot__OnInteractionEnd);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mark the Start of a Pointer Gesture
    // ------------------------------------------------------------
    function Na__OrbitPivot__OnInteractionStart() {
        Na__OrbitPivot__Interacting = true;                              // <-- A gesture is live; a real move may follow
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Swap the Pivot on the First Real Movement of a Gesture
    // ------------------------------------------------------------
    // OrbitControls only dispatches 'change' when the camera actually moved, so
    // this fires on a genuine rotate/pan drag but NOT on a bare click. On that
    // first movement we re-point controls.target at the cube pivot; the next
    // controls.update() then orbits (and re-frames) around the cube — this is
    // the moment "the orbit helper cube kicks in".
    // ------------------------------------------------------------
    function Na__OrbitPivot__OnInteractionChange() {
        if (!Na__OrbitPivot__Interacting) return;                        // <-- Ignore programmatic updates (scene applies, etc.)
        if (!Na__OrbitPivot__Armed) return;                              // <-- Already swapped for this scene
        if (!Na__OrbitPivot__Pivot) return;                              // <-- No cube resolved -> orbit stays on the scene target
        if (!Na__OrbitPivot__Controls) return;

        Na__OrbitPivot__Controls.target.set(                             // <-- Hand the orbit pivot to the cube
            Na__OrbitPivot__Pivot.x,
            Na__OrbitPivot__Pivot.y,
            Na__OrbitPivot__Pivot.z
        );
        Na__OrbitPivot__Armed = false;                                   // <-- One swap per framed scene
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mark the End of a Pointer Gesture
    // ------------------------------------------------------------
    function Na__OrbitPivot__OnInteractionEnd() {
        Na__OrbitPivot__Interacting = false;                             // <-- Gesture finished
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public State Setters
// -----------------------------------------------------------------------------

    // FUNCTION | Set (or Clear) the Cube / Saved Orbit Pivot
    // ------------------------------------------------------------
    // pivot {Vector3 | {x,y,z} | null} - resolved OrbitHelperCube centre or
    // saved OrbitHelperCube__Position. Pass null when the project has no cube;
    // the swap then never fires and orbiting stays on the scene target.
    // ------------------------------------------------------------
    function Na__OrbitPivot__SetPivot(pivot) {
        if (pivot && Number.isFinite(pivot.x) && Number.isFinite(pivot.y) && Number.isFinite(pivot.z)) {
            Na__OrbitPivot__Pivot = { x: pivot.x, y: pivot.y, z: pivot.z };  // <-- Store a plain copy (no THREE dependency)
        } else {
            Na__OrbitPivot__Pivot = null;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Arm the Swap for the Next Rotation
    // ------------------------------------------------------------
    // Call AFTER a scene has been framed (controls.target set to the scene's own
    // look-at point). The next genuine rotation will hand the pivot to the cube.
    // ------------------------------------------------------------
    function Na__OrbitPivot__Arm() {
        Na__OrbitPivot__Armed = true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Disarm the Swap
    // ------------------------------------------------------------
    // Call when the resting framing target IS the intended orbit pivot (e.g.
    // deliberately human-authored presentation scenes) so the cube never
    // overrides it.
    // ------------------------------------------------------------
    function Na__OrbitPivot__Disarm() {
        Na__OrbitPivot__Armed = false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is a Cube / Saved Pivot Currently Resolved?
    // ------------------------------------------------------------
    function Na__OrbitPivot__HasPivot() {
        return Na__OrbitPivot__Pivot !== null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Orbit Pivot Interaction Swap API
    // ------------------------------------------------------------
    export {
        Na__OrbitPivot__Init,
        Na__OrbitPivot__SetPivot,
        Na__OrbitPivot__Arm,
        Na__OrbitPivot__Disarm,
        Na__OrbitPivot__HasPivot
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
