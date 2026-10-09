// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - UNDO HISTORY
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__UndoHistory__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Undo History
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Undo and redo on the Create Drawing page: Ctrl+Z, Ctrl+Y (or
//              Ctrl+Shift+Z; Cmd on a Mac) and the Undo and Redo buttons
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - WHAT IS A STEP: everything that changes the drawing - the picture's place,
//   size and trims (drags, Fit Picture in Frame), the composition guide (drags,
//   typed margins, Show, Lock, Move Opposite Edges Together, Reset to Frame), and
//   the picture itself (a re-render). Panning and zooming the view are not steps.
// - HOW STEPS ARE TAKEN: every finished change already says so ('changed' on the
//   page's events). The history keeps the drawing as it was before that change;
//   a 'changed' that altered nothing it holds (the layout's name, say) is no step.
//   Typing a margin is one step however many keys it took (the controls name it
//   with a coalesce key; a pause longer than COALESCE_MS starts a new step).
// - THE NAME BOX AND THE MARGIN BOXES keep their own text undo: Ctrl+Z inside a
//   text or number box is the box's, not the drawing's.
// - BACK TO SAVED IS SAVED: undoing (or redoing) to exactly the drawing last saved
//   or opened makes it clean again, so Save Drawing turns green; anything else
//   leaves it to be saved. A picture undone to an earlier render is uploaded again
//   on the next save unless it is the one the Vale Cloud already has.
// - A FRESH START when a saved layout is opened (or someone else's version is):
//   steps belong to one drawing.
// - BOUNDED: MAX_STEPS steps, and at most MAX_PICTURES earlier pictures held for
//   re-render steps (an 8K picture is large); the oldest steps go first.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.0.0
// - Initial build (ValeVision3D v2.75.3).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Page Events
    // ------------------------------------------------------------
    import { Na__PageLayout__Emit, Na__PageLayout__On } from './Na__PageLayoutSystem__UiNotify__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Limits, Timing, DOM Ids
    // ------------------------------------------------------------
    const Na__PageLayout__Undo__MAX_STEPS    = 100;
    const Na__PageLayout__Undo__MAX_PICTURES = 2;                           // <-- Earlier pictures kept for re-render steps
    const Na__PageLayout__Undo__COALESCE_MS  = 1200;                        // <-- Keys in one margin box closer than this are one step
    const Na__PageLayout__Undo__IDS          = Object.freeze({ undo : 'naLayoutUndo', redo : 'naLayoutRedo', dialog : 'naLayoutUnsavedDialog' });
    const Na__PageLayout__Undo__WORDS        = Object.freeze({ image : 'picture placement', guide : 'composition guide', render : 're-render' });
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Stacks, Where the Drawing Stands, What Was Saved
    // ------------------------------------------------------------
    let Na__PageLayout__Undo__State        = null;
    let Na__PageLayout__Undo__Redraw       = null;
    let Na__PageLayout__Undo__Past         = [];                            // <-- [{ snap, what }] oldest first: the drawing before each step
    let Na__PageLayout__Undo__Future       = [];                            // <-- [{ snap, what }] steps undone, nearest last
    let Na__PageLayout__Undo__Current      = null;                          // <-- The drawing as it stands
    let Na__PageLayout__Undo__SavedSig     = null;                          // <-- The drawing as last saved or opened (null: never)
    let Na__PageLayout__Undo__SavedPicture = null;                          // <-- The picture the Vale Cloud has
    let Na__PageLayout__Undo__LastKey      = '';                            // <-- The last step's coalesce key
    let Na__PageLayout__Undo__LastAt       = 0;
    const Na__PageLayout__Undo__PictureIds = new WeakMap();                 // <-- Image -> a number, for comparing pictures
    let Na__PageLayout__Undo__NextPictureId = 1;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Snapshots
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Number for a Picture (0 for None)
    // ------------------------------------------------------------
    function Na__PageLayout__Undo__PictureId(image) {
        if (!image) return 0;
        if (!Na__PageLayout__Undo__PictureIds.has(image)) Na__PageLayout__Undo__PictureIds.set(image, Na__PageLayout__Undo__NextPictureId++);
        return Na__PageLayout__Undo__PictureIds.get(image);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Drawing as It Stands (Copies, Except the Picture Itself)
    // ------------------------------------------------------------
    function Na__PageLayout__Undo__Snapshot(state) {
        const it = state.imageTransform;
        const g  = state.guide;
        return {
            image   : { x : it.x, y : it.y, width : it.width, height : it.height,
                        clipTop : it.clipTop || 0, clipRight : it.clipRight || 0, clipBottom : it.clipBottom || 0, clipLeft : it.clipLeft || 0 },
            guide   : { visible : g.visible === true, locked : g.locked === true, pairEdges : g.pairEdges === true,
                        margins : { top : g.margins.top, right : g.margins.right, bottom : g.margins.bottom, left : g.margins.left } },
            picture : {
                image          : state.viewportImage || null,               // <-- By reference: a re-render step keeps the earlier picture
                blob           : state.imageBlob || null,
                meta           : { ...(state.sourceImageMeta || {}) },
                renderSettings : state.renderSettings || null
            }
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Snapshot as Text, for "Is This the Same Drawing?"
    // ------------------------------------------------------------
    function Na__PageLayout__Undo__Signature(snap) {
        if (!snap) return '';
        return JSON.stringify([snap.image, snap.guide, Na__PageLayout__Undo__PictureId(snap.picture.image)]);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put a Snapshot Back on the Page; True When the Picture Changed
    // ------------------------------------------------------------
    function Na__PageLayout__Undo__Restore(state, snap) {
        Object.assign(state.imageTransform, snap.image);

        const g = state.guide;
        g.visible    = snap.guide.visible;
        g.locked     = snap.guide.locked;
        g.pairEdges  = snap.guide.pairEdges;
        g.margins    = { ...snap.guide.margins };
        g.dragHandle = null;
        g.dragPaired = false;

        const pictureChanged = snap.picture.image !== state.viewportImage;
        if (pictureChanged) {
            state.viewportImage   = snap.picture.image;
            state.imageBlob       = snap.picture.blob;
            state.sourceImageMeta = { ...snap.picture.meta };
            state.renderSettings  = snap.picture.renderSettings;
        }
        state.imageIsSaved = !!state.viewportImage && state.viewportImage === Na__PageLayout__Undo__SavedPicture;   // <-- Upload again unless the Vale Cloud has this one
        return pictureChanged;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Taking Steps
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Keep at Most MAX_STEPS Steps and MAX_PICTURES Earlier Pictures
    // ------------------------------------------------------------
    function Na__PageLayout__Undo__Trim() {
        while (Na__PageLayout__Undo__Past.length > Na__PageLayout__Undo__MAX_STEPS) Na__PageLayout__Undo__Past.shift();

        const current = Na__PageLayout__Undo__Current ? Na__PageLayout__Undo__Current.picture.image : null;
        const others  = () => {
            const seen = new Set();
            Na__PageLayout__Undo__Past.concat(Na__PageLayout__Undo__Future).forEach((step) => {
                if (step.snap.picture.image && step.snap.picture.image !== current) seen.add(step.snap.picture.image);
            });
            return seen.size;
        };
        while (others() > Na__PageLayout__Undo__MAX_PICTURES && Na__PageLayout__Undo__Past.length) {
            Na__PageLayout__Undo__Past.shift();                             // <-- The oldest step goes first
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Undo and Redo Buttons Follow the Stacks
    // ------------------------------------------------------------
    function Na__PageLayout__Undo__RefreshButtons() {
        const undo = document.getElementById(Na__PageLayout__Undo__IDS.undo);
        const redo = document.getElementById(Na__PageLayout__Undo__IDS.redo);
        const last = Na__PageLayout__Undo__Past[Na__PageLayout__Undo__Past.length - 1];
        const next = Na__PageLayout__Undo__Future[Na__PageLayout__Undo__Future.length - 1];
        if (undo) {
            undo.disabled = !last;
            undo.title    = last ? `Undo ${Na__PageLayout__Undo__WORDS[last.what] || 'the last change'} (Ctrl+Z)` : 'Nothing to undo';
        }
        if (redo) {
            redo.disabled = !next;
            redo.title    = next ? `Redo ${Na__PageLayout__Undo__WORDS[next.what] || 'the change'} (Ctrl+Y)` : 'Nothing to redo';
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Finished Change: Remember the Drawing as It Was Before It
    // ------------------------------------------------------------
    function Na__PageLayout__Undo__OnChanged(detail) {
        const state = Na__PageLayout__Undo__State;
        if (!state) return;
        const now = Na__PageLayout__Undo__Snapshot(state);
        if (Na__PageLayout__Undo__Signature(now) === Na__PageLayout__Undo__Signature(Na__PageLayout__Undo__Current)) return;   // <-- Nothing the history holds changed

        const key     = detail && detail.coalesce ? String(detail.coalesce) : '';
        const time    = Date.now();
        const sameRun = !!key && key === Na__PageLayout__Undo__LastKey && (time - Na__PageLayout__Undo__LastAt) < Na__PageLayout__Undo__COALESCE_MS
                     && Na__PageLayout__Undo__Future.length === 0 && Na__PageLayout__Undo__Past.length > 0;
        if (!sameRun) {
            Na__PageLayout__Undo__Past.push({ snap : Na__PageLayout__Undo__Current, what : (detail && detail.what) || '' });
        }
        Na__PageLayout__Undo__Future  = [];                                  // <-- A new step forgets what was undone
        Na__PageLayout__Undo__Current = now;
        Na__PageLayout__Undo__LastKey = key;
        Na__PageLayout__Undo__LastAt  = time;
        Na__PageLayout__Undo__Trim();
        Na__PageLayout__Undo__RefreshButtons();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Start Again From the Drawing as It Stands (a Layout Opened)
    // ------------------------------------------------------------
    function Na__PageLayout__Undo__Reset() {
        Na__PageLayout__Undo__Past    = [];
        Na__PageLayout__Undo__Future  = [];
        Na__PageLayout__Undo__Current = Na__PageLayout__Undo__State ? Na__PageLayout__Undo__Snapshot(Na__PageLayout__Undo__State) : null;
        Na__PageLayout__Undo__LastKey = '';
        Na__PageLayout__Undo__RefreshButtons();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Undo and Redo
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Move One Step From One Stack to the Other and Put It on the Page
    // ------------------------------------------------------------
    function Na__PageLayout__Undo__Step(from, to) {
        const state = Na__PageLayout__Undo__State;
        if (!state || !from.length) return false;

        const step = from.pop();
        to.push({ snap : Na__PageLayout__Undo__Current, what : step.what });
        const pictureChanged = Na__PageLayout__Undo__Restore(state, step.snap);
        Na__PageLayout__Undo__Current = step.snap;
        Na__PageLayout__Undo__LastKey = '';                                 // <-- Typing after an undo is a new step

        // Clean only when this is exactly the drawing last saved or opened
        // ------------------------------------------------------------
        state.layout.dirty = !(state.layout.record && Na__PageLayout__Undo__SavedSig !== null
                               && Na__PageLayout__Undo__Signature(step.snap) === Na__PageLayout__Undo__SavedSig);

        if (Na__PageLayout__Undo__Redraw) Na__PageLayout__Undo__Redraw();
        Na__PageLayout__Emit('guide', { undo : true });                      // <-- The guide's boxes and toggles follow
        if (pictureChanged) Na__PageLayout__Emit('image', { undo : true });  // <-- The Render Quality section follows the picture
        Na__PageLayout__Emit('history', { dirty : state.layout.dirty });     // <-- Save Drawing goes red or green
        Na__PageLayout__Undo__RefreshButtons();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Undo the Last Step
    // ------------------------------------------------------------
    function Na__PageLayout__Undo__Undo() {
        return Na__PageLayout__Undo__Step(Na__PageLayout__Undo__Past, Na__PageLayout__Undo__Future);
    }
    // ------------------------------------------------------------


    // FUNCTION | Redo the Step Last Undone
    // ------------------------------------------------------------
    function Na__PageLayout__Undo__Redo() {
        return Na__PageLayout__Undo__Step(Na__PageLayout__Undo__Future, Na__PageLayout__Undo__Past);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Undo History Initialization
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is the Keyboard in a Box That Has Its Own Text Undo?
    // ------------------------------------------------------------
    function Na__PageLayout__Undo__IsTextBox(target) {
        if (!target) return false;
        if (target.isContentEditable) return true;
        const tag = String(target.tagName || '').toLowerCase();
        if (tag === 'textarea') return true;
        if (tag !== 'input') return false;
        const type = String(target.type || 'text').toLowerCase();
        return ['text', 'search', 'number', 'email', 'url', 'tel', 'password'].indexOf(type) >= 0;   // <-- Not a checkbox or a slider: those undo the drawing
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Undo and Redo (Keys, Buttons, the Page's Events)
    // ------------------------------------------------------------
    function Na__PageLayout__InitUndoHistory(state, requestRedraw) {
        Na__PageLayout__Undo__State  = state || null;
        Na__PageLayout__Undo__Redraw = (typeof requestRedraw === 'function') ? requestRedraw : null;
        Na__PageLayout__Undo__Reset();
        Na__PageLayout__Undo__SavedSig     = null;                          // <-- A new picture has never been saved
        Na__PageLayout__Undo__SavedPicture = null;

        // Steps, saves and opened layouts
        // ------------------------------------------------------------
        Na__PageLayout__On('changed', Na__PageLayout__Undo__OnChanged);
        Na__PageLayout__On('layout', (detail) => {
            if (detail.opened) {
                Na__PageLayout__Undo__Reset();                              // <-- Another drawing: its own history
                Na__PageLayout__Undo__SavedSig     = Na__PageLayout__Undo__Signature(Na__PageLayout__Undo__Current);
                Na__PageLayout__Undo__SavedPicture = state.viewportImage || null;
            } else if (detail.saved) {
                Na__PageLayout__Undo__SavedSig     = Na__PageLayout__Undo__Signature(Na__PageLayout__Undo__Snapshot(state));
                Na__PageLayout__Undo__SavedPicture = state.viewportImage || null;
            } else if (detail.deleted) {
                Na__PageLayout__Undo__SavedSig     = null;                  // <-- Nothing on the Vale Cloud any more
                Na__PageLayout__Undo__SavedPicture = null;
            }
        });

        // Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z (Cmd on a Mac)
        // ------------------------------------------------------------
        document.addEventListener('keydown', (event) => {
            if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
            const key    = String(event.key || '').toLowerCase();
            const isUndo = key === 'z' && !event.shiftKey;
            const isRedo = key === 'y' || (key === 'z' && event.shiftKey);
            if (!isUndo && !isRedo) return;
            if (Na__PageLayout__Undo__IsTextBox(event.target)) return;       // <-- The box's own text undo
            const dialog = document.getElementById(Na__PageLayout__Undo__IDS.dialog);
            if (dialog && !dialog.hidden) return;                           // <-- Not behind the unsaved question
            event.preventDefault();
            if (isUndo) Na__PageLayout__Undo__Undo();
            else Na__PageLayout__Undo__Redo();
        });

        // The buttons in the menu's head (a touch screen has no Ctrl)
        // ------------------------------------------------------------
        const undo = document.getElementById(Na__PageLayout__Undo__IDS.undo);
        const redo = document.getElementById(Na__PageLayout__Undo__IDS.redo);
        if (undo) undo.addEventListener('click', () => Na__PageLayout__Undo__Undo());
        if (redo) redo.addEventListener('click', () => Na__PageLayout__Undo__Redo());
        Na__PageLayout__Undo__RefreshButtons();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Undo History API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__InitUndoHistory,
        Na__PageLayout__Undo__Undo,
        Na__PageLayout__Undo__Redo
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
