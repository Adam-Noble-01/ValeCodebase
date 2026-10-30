// =============================================================================
// VALEVISION AURA - 3D ENVIRONMENT - ART DIRECTION POINTS
// =============================================================================
//
// FILE       : Na__Environment3d__ArtDirection__.js
// NAMESPACE  : Na__ArtDirection3d
// MODULE     : 3D Environment - Art Direction Points
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The 3D Environment's Art direction points section: PainterlyNPR's
//              own point editor over the live drawing, one set of points a scene
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE EDITOR IS THE ENGINE'S (65__ArtDirection__InfluencePoints, through the
//   engine host): handles and rings over the drawing, the selected point's
//   node of sliders beside it (after DxO's U-Points), and its list of points
//   with groups, eyes and typable readouts. AURA gives it a layer over the
//   canvas, a home for its list in this section, and a button a point type.
// - ADD A POINT: press a type, then click the drawing where it should act (Esc
//   cancels). Dropped on an object it anchors there and follows it; dropped on
//   brick, tile or paving an Indication point takes all of that material. A
//   drag still orbits: only the press that places is kept from the navigation.
// - ONE SET A SCENE (Adam, 30-Oct-2026: one set a view; scenes since AURA
//   0.5.0): open a scene's tab and its points load, and point edits save into
//   it, so every viewport showing it draws with them. The scene stays open as
//   the camera moves, as a SketchUp scene tab stays lit, so its points can be
//   edited while it is framed again (right-click its tab, Update from camera).
//   With no scene open (a preset picked, or the app just opened) the points
//   are the drawing set's WorkingPoints; Add Scene takes them with the camera.
// - The handles show while this section is open; folded, the drawing is clear.
//   Show influence tints what each point reaches (never on a sheet).
// - KEYS while a point is selected (the engine's): Delete, Ctrl+D, [ and ]
//   (Shift: 10 mm), H, Escape.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 2.0.0 (AURA 0.5.0)
// - Scenes: the owner is a scene (UseScene, LeaveScene, Owner, Adopt) or the
//   working set; the scene stays open while the camera moves (FollowCamera,
//   and 0.4.4's viewport owner, UseViewport and Viewport, are gone).
//
// 30-Oct-2026 - Version 1.1.0 (AURA 0.4.4)
// - A viewport owner beside the saved view: UseViewport and Viewport; Keep,
//   ShowOwner and Retake read and write its points through
//   Na__Viewports__Views__ (Points and SetPoints). Retake is exported. A saved
//   view's camera is read through Na__DrawingSet__CameraFromJson (its file
//   form) and compared by Na__Views__SameCamera (the local copy went).
//
// 30-Oct-2026 - Version 1.0.0 (AURA 0.3.0)
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppState__Data, Na__AppState__Touch, Na__AppState__On } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__El } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Toast__Show } from '../03__AppUtils/Na__AppUtils__Toast__.js';
    import {
        Na__EngineHost__PointTypes, Na__EngineHost__MaxPoints, Na__EngineHost__Points, Na__EngineHost__PointsSignature,
        Na__EngineHost__SetPoints, Na__EngineHost__AttachPoints, Na__EngineHost__ShowPoints, Na__EngineHost__RefreshPoints,
        Na__EngineHost__ShowInfluence, Na__EngineHost__ArmPoint, Na__EngineHost__ArmedPoint, Na__EngineHost__PlacePoint,
        Na__EngineHost__PointKey, Na__EngineHost__DeselectPoint, Na__EngineHost__OnPointsEdited, Na__EngineHost__PointsEdited,
        Na__EngineHost__Borrowed, Na__EngineHost__Release
    } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__DrawingSet__Scene, Na__DrawingSet__WorkingPoints, Na__DrawingSet__SetWorkingPoints } from '../40__Feature__DrawingSet/Na__DrawingSet__Model__.js';
    import { Na__Views__ScenesUsing } from '../21__System__Viewports/Na__Viewports__Views__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__ArtDirection3d__State = {
        section     : null,                      // <-- The panel section: { root, body, meta, IsOpen, SetOpen }
        wrap        : null,                      // <-- The canvas's wrapper: the layer lies over the canvas in it
        canvas      : null,
        layer       : null,                      // <-- The engine's point layer: handles, rings, the node of sliders
        ownerLine   : null,
        typeButtons : [],
        influence   : null,                      // <-- The Show influence box
        owner       : null,                      // <-- The scene whose points these are, or null: the working set's
        signature   : '',                        // <-- The points as last kept
        onChange    : null                       // <-- The scene tabs redraw (whose points, how many)
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keeping the Points
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Scene Being Edited, if It Still Exists
    // ------------------------------------------------------------
    function Na__ArtDirection3d__OwnerScene() {
        const S = Na__ArtDirection3d__State;
        const scene = S.owner ? Na__DrawingSet__Scene(Na__AppState__Data.doc, S.owner) : null;
        if (S.owner && !scene) S.owner = null;                                   // <-- Deleted: the points are the working set's now
        return scene;
    }
    // ------------------------------------------------------------


    // FUNCTION | Keep the Points Where They Belong, if They Changed
    // ------------------------------------------------------------
    // The engine's editor changes the points itself (a drag, a slider, a
    // remove); the engine host says so after each, and this compares the
    // signature, so a click that changed nothing saves nothing.
    // ------------------------------------------------------------
    function Na__ArtDirection3d__Keep() {
        const S = Na__ArtDirection3d__State;
        const doc = Na__AppState__Data.doc;
        if (!doc || Na__EngineHost__Borrowed()) return;
        const signature = Na__EngineHost__PointsSignature();
        if (signature === S.signature) return;
        S.signature = signature;
        const scene = Na__ArtDirection3d__OwnerScene();
        if (scene) scene.View__Points = Na__EngineHost__Points();
        else Na__DrawingSet__SetWorkingPoints(doc, Na__EngineHost__Points());
        Na__AppState__Touch('points');
        Na__ArtDirection3d__ShowOwner();
    }
    // ------------------------------------------------------------


    // FUNCTION | Say Whose Points These Are, and How Many
    // ------------------------------------------------------------
    function Na__ArtDirection3d__ShowOwner() {
        const S = Na__ArtDirection3d__State;
        const doc = Na__AppState__Data.doc;
        if (!S.ownerLine || !doc) return;
        const scene = Na__ArtDirection3d__OwnerScene();
        const count = (scene ? scene.View__Points || [] : Na__DrawingSet__WorkingPoints(doc)).length;
        const shown = scene ? Na__Views__ScenesUsing(doc, scene.View__Id).length : 0;
        S.ownerLine.textContent = scene
            ? `The points of the scene "${scene.View__Name}". They save into it${shown ? `, and ${shown === 1 ? 'the viewport' : `all ${shown} viewports`} showing it draw${shown === 1 ? 's' : ''} with them` : ''}.`
            : 'No scene is open: these points go with the camera when you Add Scene.';
        S.section.meta.textContent = count ? `${count} of ${Na__EngineHost__MaxPoints()}` : '';
        if (S.onChange) S.onChange();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | One Set a Scene
// -----------------------------------------------------------------------------

    // FUNCTION | Edit a Scene's Points (null: the working set's); the camera is the Stage's to set
    // ------------------------------------------------------------
    function Na__ArtDirection3d__UseScene(scene) {
        const S = Na__ArtDirection3d__State;
        const doc = Na__AppState__Data.doc;
        if (!doc) return;
        Na__ArtDirection3d__Keep();                                             // <-- What was being edited is kept first
        Na__ArtDirection3d__Arm(null);
        S.owner = scene ? scene.View__Id : null;
        Na__EngineHost__SetPoints(scene ? scene.View__Points : Na__DrawingSet__WorkingPoints(doc), false);
        S.signature = Na__EngineHost__PointsSignature();
        Na__ArtDirection3d__ShowOwner();
    }
    // ------------------------------------------------------------


    // FUNCTION | Let the Open Scene Go, Its Points Staying on the Drawing (the working set's now)
    // ------------------------------------------------------------
    // When the scene is deleted: the drawing keeps the points it shows.
    // ------------------------------------------------------------
    function Na__ArtDirection3d__LeaveScene() {
        const S = Na__ArtDirection3d__State;
        const doc = Na__AppState__Data.doc;
        if (!S.owner || !doc) return;
        Na__ArtDirection3d__Keep();
        S.owner = null;
        Na__DrawingSet__SetWorkingPoints(doc, Na__EngineHost__Points());
        S.signature = Na__EngineHost__PointsSignature();
        Na__AppState__Touch('points');
        Na__ArtDirection3d__ShowOwner();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Scene Being Edited (its id, or null)
    // ------------------------------------------------------------
    function Na__ArtDirection3d__Owner() {
        return Na__ArtDirection3d__OwnerScene() ? Na__ArtDirection3d__State.owner : null;
    }

    // A scene was made or updated with the drawing as it is: it is the one being edited now
    function Na__ArtDirection3d__Adopt(scene) {
        const S = Na__ArtDirection3d__State;
        S.owner = scene ? scene.View__Id : null;
        S.signature = Na__EngineHost__PointsSignature();
        Na__ArtDirection3d__ShowOwner();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Placing, Keys, Showing
// -----------------------------------------------------------------------------

    // FUNCTION | Arm a Point Type (null disarms): the next click on the drawing places it
    // ------------------------------------------------------------
    function Na__ArtDirection3d__Arm(type) {
        const S = Na__ArtDirection3d__State;
        if (type && Na__EngineHost__Points().length >= Na__EngineHost__MaxPoints()) {
            Na__Toast__Show(`A scene holds ${Na__EngineHost__MaxPoints()} points at most: remove one to add another.`);
            type = null;
        }
        const armed = Na__EngineHost__ArmPoint(type);
        S.typeButtons.forEach((b) => {
            const on = b.dataset.pointType === armed;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', String(on));
        });
        if (S.wrap) S.wrap.classList.toggle('is-placing', !!armed);
        if (armed && S.section && !S.section.IsOpen()) S.section.SetOpen(true);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Press on the Drawing: place the armed point there
    // ------------------------------------------------------------
    // Listened for on the wrapper in the capture phase, before the navigation on
    // the canvas: a press that places is taken (preventDefault) and the
    // navigation leaves it alone. A press on a handle or the node is the editor's.
    // ------------------------------------------------------------
    function Na__ArtDirection3d__OnPress(e) {
        const S = Na__ArtDirection3d__State;
        if (e.button !== 0 || !Na__EngineHost__ArmedPoint() || e.target !== S.canvas || Na__EngineHost__Borrowed()) return;
        e.preventDefault();
        const placed = Na__EngineHost__PlacePoint(e);
        Na__ArtDirection3d__Arm(null);
        if (placed && placed.full) Na__Toast__Show(`A scene holds ${Na__EngineHost__MaxPoints()} points at most.`);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Click on Bare Drawing (the navigation's tap): the point being edited is let go
    // ------------------------------------------------------------
    function Na__ArtDirection3d__OnTap() {
        const S = Na__ArtDirection3d__State;
        if (S.section && S.section.IsOpen() && !Na__EngineHost__ArmedPoint()) Na__EngineHost__DeselectPoint();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Keys: Escape disarms; the selected point's keys are the engine's
    // ------------------------------------------------------------
    function Na__ArtDirection3d__OnKey(e) {
        const S = Na__ArtDirection3d__State;
        if (Na__AppState__Data.tab !== 'environment' || Na__EngineHost__Borrowed() || e.defaultPrevented) return;
        const active = document.activeElement;
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((active && active.tagName) || '') || (active && active.isContentEditable);
        if (typing) return;
        if (e.key === 'Escape' && Na__EngineHost__ArmedPoint()) {
            e.preventDefault();
            Na__ArtDirection3d__Arm(null);
            return;
        }
        if (!S.section || !S.section.IsOpen()) return;                         // <-- The handles are hidden, and so are their keys
        if (Na__EngineHost__PointKey(e)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Section Opened or Folded: the handles show with it
    // ------------------------------------------------------------
    function Na__ArtDirection3d__SetOpen(open) {
        if (!open) Na__ArtDirection3d__Arm(null);
        if (Na__EngineHost__Borrowed()) return;
        Na__EngineHost__ShowPoints(!!open && Na__AppState__Data.tab === 'environment');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount and Show
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Section Around the Engine's Editor
    // ------------------------------------------------------------
    // section: a Na__Panels__Section; wrap: the element holding the canvas (the
    // layer goes over the canvas in it); onChange: the scene tabs redraw.
    // ------------------------------------------------------------
    function Na__ArtDirection3d__Mount(section, wrap, canvas, onChange) {
        const S = Na__ArtDirection3d__State;
        S.section = section;
        S.wrap = wrap;
        S.canvas = canvas;
        S.onChange = typeof onChange === 'function' ? onChange : null;
        const body = section.body;

        S.ownerLine = Na__Dom__El('p', 'aura-points__owner');
        body.appendChild(S.ownerLine);

        // A button a point type: press it, then click the drawing
        const types = Na__Dom__El('div', 'aura-points__types', null, { role: 'group', 'aria-label': 'Add an art direction point' });
        S.typeButtons = Na__EngineHost__PointTypes().map((t) => {
            const b = Na__Dom__El('button', 'aura-points__type', null, { type: 'button', 'aria-pressed': 'false', dataset: { pointType: t.Key },
                                                                         title: `Add ${t.Label.toLowerCase()}: press, then click the drawing where it should act` });
            b.appendChild(Na__Dom__El('span', 'aura-points__glyph', t.Glyph, { 'aria-hidden': 'true' }));
            b.appendChild(Na__Dom__El('span', 'aura-points__label', t.Label));
            b.addEventListener('click', () => Na__ArtDirection3d__Arm(Na__EngineHost__ArmedPoint() === t.Key ? null : t.Key));
            types.appendChild(b);
            return b;
        });
        body.appendChild(types);

        const influenceRow = Na__Dom__El('label', 'aura-check aura-points__influence');
        S.influence = Na__Dom__El('input', null, null, { type: 'checkbox' });
        S.influence.checked = Na__EngineHost__ShowInfluence();
        S.influence.addEventListener('change', () => Na__EngineHost__ShowInfluence(S.influence.checked));
        influenceRow.appendChild(S.influence);
        influenceRow.appendChild(Na__Dom__El('span', null, 'Show influence: tint what each point reaches'));
        body.appendChild(influenceRow);

        const listHome = Na__Dom__El('div', 'aura-points');                    // <-- The engine's list lives here (a sheet borrows it while it edits)
        body.appendChild(listHome);
        body.appendChild(Na__Dom__El('p', 'aura-panel__hint', 'Click a point to edit it: its sliders hang beside it. Drag it to move it, Alt-drag for a copy; '
                                                         + 'Delete removes it, Ctrl+D duplicates it, [ and ] size it, H switches it off.'));

        S.layer = Na__Dom__El('div', 'PainterlyNPR__PointLayer aura-points-layer');
        wrap.appendChild(S.layer);

        Na__EngineHost__AttachPoints(S.layer, canvas, listHome);
        Na__EngineHost__OnPointsEdited(() => Na__ArtDirection3d__Keep());

        // Every edit through the engine's editor ends in one of these, wherever
        // the pointer is: the host tells whoever holds the points, once a frame
        ['pointerup', 'change', 'input'].forEach((type) => window.addEventListener(type, () => Na__EngineHost__PointsEdited(), true));
        wrap.addEventListener('pointerdown', (e) => Na__ArtDirection3d__OnPress(e), true);
        document.addEventListener('keydown', (e) => Na__ArtDirection3d__OnKey(e));

        const doc = Na__AppState__Data.doc;
        Na__EngineHost__SetPoints(Na__DrawingSet__WorkingPoints(doc), true);
        S.signature = Na__EngineHost__PointsSignature();
        Na__ArtDirection3d__ShowOwner();
        Na__ArtDirection3d__SetOpen(section.IsOpen());
        Na__AppState__On('restored', () => Na__ArtDirection3d__Retake());       // <-- An undo or redo (the drawing set's history) wrote the document back
    }
    // ------------------------------------------------------------


    // FUNCTION | Take the Points Again From the Document, Saving Nothing (after an undo or redo)
    // ------------------------------------------------------------
    function Na__ArtDirection3d__Retake() {
        const S = Na__ArtDirection3d__State;
        const doc = Na__AppState__Data.doc;
        if (!doc || !S.section || Na__EngineHost__Borrowed()) return;
        const scene = Na__ArtDirection3d__OwnerScene();
        Na__EngineHost__SetPoints(scene ? scene.View__Points : Na__DrawingSet__WorkingPoints(doc), Na__AppState__Data.tab !== 'environment');
        S.signature = Na__EngineHost__PointsSignature();
        Na__ArtDirection3d__ShowOwner();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Tab Is Shown Again: the points (and the list) come home if a sheet had them
    // ------------------------------------------------------------
    // Taken again from the document: a sheet may have edited the scene's
    // points meanwhile (its viewports share them), and the engine's copy from
    // before would otherwise be saved back over them.
    // ------------------------------------------------------------
    function Na__ArtDirection3d__Show() {
        const S = Na__ArtDirection3d__State;
        if (!S.section) return;
        Na__EngineHost__Release();
        if (S.influence) S.influence.checked = Na__EngineHost__ShowInfluence();
        Na__ArtDirection3d__Retake();
        Na__ArtDirection3d__SetOpen(S.section.IsOpen());
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__ArtDirection3d__Mount,
        Na__ArtDirection3d__Show,
        Na__ArtDirection3d__SetOpen,
        Na__ArtDirection3d__UseScene,
        Na__ArtDirection3d__LeaveScene,
        Na__ArtDirection3d__Retake,
        Na__ArtDirection3d__Owner,
        Na__ArtDirection3d__Adopt,
        Na__ArtDirection3d__Keep,
        Na__ArtDirection3d__OnTap
    };

// endregion -------------------------------------------------------------------
