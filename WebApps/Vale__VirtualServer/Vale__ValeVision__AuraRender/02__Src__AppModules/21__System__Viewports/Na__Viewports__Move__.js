// =============================================================================
// VALEVISION AURA - VIEWPORTS - MOVING ONE ACCURATELY
// =============================================================================
//
// FILE       : Na__Viewports__Move__.js
// NAMESPACE  : Na__ViewportMove
// MODULE     : Viewports - Move
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : What holds a viewport's move to what was meant: the dead zone
//              before a press becomes a drag, Shift and Ortho, the arrow keys'
//              axis lock during a drag and their nudge at rest, and a typed length
// CREATED    : 03-Nov-2026
//
// DESCRIPTION:
// - Adam, 03-Nov-2026: "The sheet viewports add constraints for moving them like
//   shift and directrional drag and also arrow keys." and "see TrueVision 3D's
//   Layout editor and its viewport handling, and copy that".
// - A PRESS IS NOT YET A DRAG. It travels DragThresholdMm (barely two pixels at
//   any zoom) before anything moves, and the press that selects a viewport
//   travels PickDragPx on screen, so a click that picks one up never shifts it.
// - SHIFT HOLDS THE NEARER AXIS, for as long as it is down. It reaches the drag
//   as it goes down or comes up, without waiting for the mouse.
// - ORTHO (F8, or the toolbar's button) IS A LATCHED SHIFT: the axis is held when
//   Ortho XOR Shift, AutoCAD's rule, so Shift frees a drag while Ortho is on.
//   Remembered in this browser, never in the drawing set.
// - AN ARROW KEY DURING A DRAG LOCKS THE AXIS with nothing held down: left or
//   right holds the frame to X, up or down to Y, the same axis again lets it go.
//   It beats Shift and Ortho, whose axis changes with the cursor. A line runs from
//   the press to where the frame has been carried, red for X and green for Y. The
//   lock is spent when the drag ends.
// - AN ARROW KEY AT REST NUDGES the selected viewport NudgeStepMm, or
//   NudgeCoarseStepMm with Shift (the key map's). Moved in place like a drag, the
//   layer drawn again once the keys rest. A run of presses is one undo step
//   (the history waits for the edits to settle).
// - A TYPED LENGTH (TypeLength, from Na__Viewports__Measurements__) lands a frame
//   exactly that far along the line it is being dragged, and ends the drag. It is
//   paper millimetres here; the box works at the viewport's scale. THE
//   LAST MOVE STAYS ON OFFER, SketchUp's rule: until something else is done, every
//   length typed lands it again that far from where it STARTED (1000, then 1200,
//   is 1200). Another selection, another tool, an undo, a nudge, a resize or a pan
//   ends the offer. A typed length is exact: no Shift, no Ortho, no lock; only the
//   paper's edge can stop it, and the box says so.
// - DURING A RESIZE THE ARROWS DO NOTHING (holds: false): a resize has no axis to
//   lock, and a nudge would walk the frame out from under the handle.
//
// INTEGRATION:
// - Na__Viewports__Editor__ hands its press and handle drags to Drag, moves its
//   frames with Place and mounts this module.
// - Na__DrawingSheets__Workspace__ has Ortho's button; 'ortho' is announced on
//   every switch (Na__AppState__Emit).
// - Na__Viewports__Measurements__ asks Reading and TypeLength, and hears OnRead.
// - The keys are named in Na__Hotkeys__DrawingSheets__.json (Edit__Nudge...,
//   Ortho__Toggle).
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : TrueVision 3D (51__System__LayoutEditor/30__System__SheetTools:
//                   Na__LayoutEditor__SheetTools__PointerDrag__ 1.19.0,
//                   Na__LayoutEditor__SheetTools__Keyboard__ 1.18.0 and
//                   Na__LayoutEditor__AxisLock__ 1.0.0; 32__System__OrthoMode 1.0.0)
// - Ported on     : 03-Nov-2026 for AURA 0.5.19 and 0.5.20 - the plain frame move's rules
// - Parity        : diverged (subset, on AURA's surface)
// - Divergences   :
//   - No carry by a point of the linework, no tracking lines: AURA's viewports
//     are pictures, with no linework here to grab or snap to.
//   - No drawing grid or Ctrl-drag copy: AURA's sheets have neither.
//   - Ortho reaches viewport moves only: AURA's notes and leaders have no held
//     axis for it to latch.
//   - A frame is kept to a thousandth of a millimetre, not TrueVision's raw figure,
//     and a hand drag moves it in tenths from where it started. AURA's frames were
//     rounded to a tenth on the paper, which at 1:50 is 5 mm on the building: a
//     typed length could not have landed on what was typed.
//   - An Alt-drag pan holds too. TrueVision's body pan stays raw; AURA's Shift
//     means nothing else there, and an elevation slid along its frame wants it.
//   - A held arrow counts once during a drag, so the lock cannot flicker.
//   - The arrows do nothing during a resize. TrueVision's fall through to the
//     nudge there.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 03-Nov-2026 - Version 1.1.1 (AURA 0.5.24)
// - A locked viewport takes no nudge, and a typed length has no offer on it.
//
// 03-Nov-2026 - Version 1.1.0 (AURA 0.5.20)
// - Ortho (F8): the flag, the rule, the switch. A typed length, and the last move
//   staying on offer to another (TypeLength, Reading, OnRead).
//
// 03-Nov-2026 - Version 1.0.0 (AURA 0.5.19)
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__AppState__Data, Na__AppState__ActiveSheet, Na__AppState__Emit, Na__AppState__Touch } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__Svg } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Format__Round } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__Paper__ClampFrame } from '../20__System__DrawingSheets/Na__DrawingSheets__Paper__.js';
    import { Na__Surface__AddOverlay, Na__Surface__Elements, Na__Surface__FinishDrag, Na__Surface__GetZoom, Na__Surface__PxPerMm, Na__Surface__RedrawLayer, Na__Surface__RedrawOverlay } from '../20__System__DrawingSheets/Na__DrawingSheets__Surface__.js';
    import { Na__SheetKeys__GetKeyboardSetup, Na__SheetKeys__MatchKey } from '../20__System__DrawingSheets/Na__DrawingSheets__KeyMap__.js';
    import { Na__DrawingSet__Viewport } from '../40__Feature__DrawingSet/Na__DrawingSet__Model__.js';
    import { Na__ViewportLock__Is, Na__ViewportLock__Refuse } from './Na__Viewports__Lock__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    const Na__ViewportMove__ARROWS = {                                          // <-- The key map's actions: the axis an arrow locks, and which way it nudges
        Edit__NudgeLeft  : { axis: 'x', x: -1, y:  0 },
        Edit__NudgeRight : { axis: 'x', x:  1, y:  0 },
        Edit__NudgeUp    : { axis: 'y', x:  0, y: -1 },
        Edit__NudgeDown  : { axis: 'y', x:  0, y:  1 }
    };

    const Na__ViewportMove__ORTHO_STORE = 'aura-sheets-ortho';                  // <-- '1' on, '0' off; absent = off, AutoCAD's initial ORTHOMODE 0
    const Na__ViewportMove__FRAME_DECIMALS = 3;                                 // <-- A thousandth of a paper millimetre: far under anything drawn, at any scale
    const Na__ViewportMove__TYPED_MIN_MM = 0.001;                               // <-- Anything less lands nowhere, and has no line to type along
    const Na__ViewportMove__STOPPED_MM = 0.01;                                  // <-- Further off a typed length than rounding can put it: the paper's edge stopped it
    const Na__ViewportMove__NON_TEXT = ['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color', 'file', 'number'];   // <-- F8 types nothing into these

    const Na__ViewportMove__DRAWN_AT = new WeakMap();                           // <-- A viewport's drawn group -> where its frame was when it was drawn

    const Na__ViewportMove__State = {
        flight  : null,                          // <-- The drag in flight: { startMm, pick, holds, apply, lastMm, shift, moved, frame, from, landed, typed }
        axis    : null,                          // <-- What an arrow has locked: 'x', 'y' or null; spent with the drag
        band    : null,                          // <-- The locked drag's line: { x1, y1, x2, y2, axis }
        settle  : 0,                             // <-- The redraw after a nudge or a retype, waiting for the keys to rest
        ortho   : null,                          // <-- Null until first asked: then read from this browser
        offer   : null,                          // <-- The last move, on offer to a typed length: { viewportId, sheetId, from, dir, lengthMm, landed }
        readers : []                             // <-- Told when the reading changes: the Measurements box
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Ortho
// -----------------------------------------------------------------------------

    // FUNCTION | Is Ortho On (whatever Shift is doing)
    // ------------------------------------------------------------
    function Na__ViewportMove__OrthoIsOn() {
        const S = Na__ViewportMove__State;
        if (S.ortho === null) {
            let stored = null;
            try { stored = window.localStorage.getItem(Na__ViewportMove__ORTHO_STORE); } catch (error) { stored = null; }
            S.ortho = stored === '1';
        }
        return S.ortho;
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch Ortho: remembered here, announced, and a drag in flight re-aimed at once
    // ------------------------------------------------------------
    function Na__ViewportMove__OrthoToggle() {
        const S = Na__ViewportMove__State;
        S.ortho = !Na__ViewportMove__OrthoIsOn();
        try { window.localStorage.setItem(Na__ViewportMove__ORTHO_STORE, S.ortho ? '1' : '0'); } catch (error) { /* storage unavailable: it still works for this visit */ }
        Na__AppState__Emit('ortho', S.ortho);
        if (S.flight && S.flight.moved && S.flight.holds) Na__ViewportMove__Run(S.flight);
        return S.ortho;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Placing the Frame
// -----------------------------------------------------------------------------

    // FUNCTION | Put a Frame Somewhere, Shown at Once Without Drawing the Layer Again
    // ------------------------------------------------------------
    // The viewport's group is carried by a transform from where it was drawn. A
    // group is drawn at the frame's place at that moment, so a group not seen
    // before was drawn where the frame is now, before this write: that holds when
    // a picture arriving redraws the layer in the middle of a drag or a run of
    // nudges. Returns where the frame landed.
    // ------------------------------------------------------------
    function Na__ViewportMove__Place(viewport, x, y) {
        const f = viewport.Viewport__FrameMm;
        const { svg } = Na__Surface__Elements();
        const group = svg ? svg.querySelector(`.aura-vp[data-id="${viewport.Viewport__Id}"]`) : null;
        if (group && !Na__ViewportMove__DRAWN_AT.has(group)) Na__ViewportMove__DRAWN_AT.set(group, { X: f.X, Y: f.Y });
        f.X = Na__Format__Round(x, Na__ViewportMove__FRAME_DECIMALS);
        f.Y = Na__Format__Round(y, Na__ViewportMove__FRAME_DECIMALS);
        if (group) {
            const at = Na__ViewportMove__DRAWN_AT.get(group);
            group.setAttribute('transform', `translate(${f.X - at.X} ${f.Y - at.Y})`);
        }
        return { X: f.X, Y: f.Y };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Layer Is Drawn Again Once the Keys Rest
    // ------------------------------------------------------------
    function Na__ViewportMove__Settle() {
        const S = Na__ViewportMove__State;
        clearTimeout(S.settle);
        S.settle = 0;
        if (S.flight) {                                                          // <-- A drag took over: a redraw now would flash under the hand
            Na__ViewportMove__SettleSoon();
            return;
        }
        if (Na__AppState__Data.tab !== 'environment') Na__Surface__RedrawLayer('viewports');
    }

    function Na__ViewportMove__SettleSoon() {
        const S = Na__ViewportMove__State;
        clearTimeout(S.settle);
        S.settle = setTimeout(Na__ViewportMove__Settle, Na__AppConfig__Get('Viewport__NudgeSettleMs', 300));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Drag
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Tell the Readers the Reading May Have Changed
    // ------------------------------------------------------------
    function Na__ViewportMove__Tell() {
        Na__ViewportMove__State.readers.forEach((reader) => reader());
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | How Far a Press Travels Before It Becomes a Drag, in Paper Millimetres
    // ------------------------------------------------------------
    // The press that selects a viewport is really a pick, and a hand's wobble must
    // not shift what it lands on, so it travels PickDragPx on screen. A press on
    // what is already in hand is as eager as it can be without a click moving it.
    // ------------------------------------------------------------
    function Na__ViewportMove__StartMm(flight) {
        const plain = Na__AppConfig__Get('Viewport__DragThresholdMm', 0.5) / Na__Surface__GetZoom();
        if (!flight.pick) return plain;
        return Math.max(plain, Na__AppConfig__Get('Viewport__PickDragPx', 8) / Na__Surface__PxPerMm());
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Pointer's Travel, Held: the arrow's axis first, then the nearer one
    // ------------------------------------------------------------
    // The nearer axis is held when Ortho XOR Shift: Shift holds it while Ortho is
    // off and frees it while Ortho is on.
    // ------------------------------------------------------------
    function Na__ViewportMove__Held(flight) {
        const dx = flight.lastMm.X - flight.startMm.X, dy = flight.lastMm.Y - flight.startMm.Y;
        if (!flight.holds) return { X: dx, Y: dy };
        const axis = Na__ViewportMove__State.axis;
        if (axis === 'x') return { X: dx, Y: 0 };
        if (axis === 'y') return { X: 0, Y: dy };
        if (Na__ViewportMove__OrthoIsOn() === flight.shift) return { X: dx, Y: dy };
        return Math.abs(dx) >= Math.abs(dy) ? { X: dx, Y: 0 } : { X: 0, Y: dy };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Move What the Drag Carries, From the Last Pointer Position
    // ------------------------------------------------------------
    // apply says how far the thing really went, when the paper's edge stopped it,
    // so the line ends where the frame is. Also run by a key: the pointer only
    // reports Shift when it moves, and an arrow or F8 not at all.
    // ------------------------------------------------------------
    function Na__ViewportMove__Run(flight) {
        const S = Na__ViewportMove__State;
        const held = Na__ViewportMove__Held(flight);
        const landed = flight.apply(held) || held;
        flight.landed = landed;
        S.band = (flight.holds && S.axis)
            ? { x1: flight.startMm.X, y1: flight.startMm.Y, x2: flight.startMm.X + landed.X, y2: flight.startMm.Y + landed.Y, axis: S.axis }
            : null;
        Na__Surface__RedrawOverlay();
        Na__ViewportMove__Tell();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What a Finished Frame Move Leaves on Offer to a Typed Length
    // ------------------------------------------------------------
    // The line and the distance are the typed ones when a value finished the
    // drag, else how far the frame really went. Null for a move that went nowhere:
    // there is no line to type along.
    // ------------------------------------------------------------
    function Na__ViewportMove__MakeOffer(flight) {
        const { sheet, viewport } = flight.frame;
        const f = viewport.Viewport__FrameMm;
        let dir, lengthMm;
        if (flight.typed) {
            dir = flight.typed.dir;
            lengthMm = flight.typed.lengthMm;
        } else {
            const x = f.X - flight.from.X, y = f.Y - flight.from.Y;
            const run = Math.hypot(x, y);
            if (!(run >= Na__ViewportMove__TYPED_MIN_MM)) return null;
            dir = { x: x / run, y: y / run };
            lengthMm = run;
        }
        return { viewportId: viewport.Viewport__Id, sheetId: sheet.Sheet__Id, from: flight.from, dir, lengthMm, landed: Object.assign({}, f) };
    }
    // ------------------------------------------------------------


    // FUNCTION | Make the Surface's Drag for a Press on a Viewport
    // ------------------------------------------------------------
    // startMm : where the press was, { X, Y } on the paper
    // pick    : true for the press that selects it (the larger dead zone)
    // holds   : false for a drag Shift and the arrows have no say in (a resize)
    // frame   : { sheet, viewport } for a move of the frame, which the box reads
    // apply   : (delta, exact) => the delta that landed, or nothing when all of it
    //           did; exact is a typed length, to be taken to the last figure
    // land    : run once on release, only when it really moved
    // ------------------------------------------------------------
    function Na__ViewportMove__Drag(options) {
        const S = Na__ViewportMove__State;
        const frame = options.frame || null;
        const flight = {
            startMm : { X: options.startMm.X, Y: options.startMm.Y },
            pick    : options.pick === true,
            holds   : options.holds !== false,
            apply   : options.apply,
            lastMm  : null,
            shift   : false,
            moved   : false,
            frame,
            from    : frame ? { X: frame.viewport.Viewport__FrameMm.X, Y: frame.viewport.Viewport__FrameMm.Y } : null,
            landed  : null,
            typed   : null
        };
        S.flight = flight;
        S.axis = null;
        S.band = null;
        Na__ViewportMove__Tell();
        return {
            move(mm, event) {
                flight.lastMm = mm;
                flight.shift = !!(event && event.shiftKey);
                if (!flight.moved) {
                    if (Math.hypot(mm.X - flight.startMm.X, mm.Y - flight.startMm.Y) < Na__ViewportMove__StartMm(flight)) return;
                    flight.moved = true;
                }
                Na__ViewportMove__Run(flight);
            },
            end() {
                const banded = !!S.band;
                S.flight = null;
                S.axis = null;
                S.band = null;
                if (flight.moved) {                                              // <-- A click moved nothing, so nothing is forgotten either
                    S.offer = frame ? Na__ViewportMove__MakeOffer(flight) : null;   // <-- Before the land's announcement, so the box finds it. Anything else that moved is the last thing done now
                    if (options.land) options.land();
                }
                if (banded) Na__Surface__RedrawOverlay();
                Na__ViewportMove__Tell();
            }
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Locked Drag's Line (an overlay: thin at any zoom)
    // ------------------------------------------------------------
    function Na__ViewportMove__DrawBand(group) {
        const band = Na__ViewportMove__State.band;
        if (!band) return;
        Na__Dom__Svg('line', { x1: band.x1, y1: band.y1, x2: band.x2, y2: band.y2, class: `aura-move-band aura-move-band--${band.axis}`,
                               'stroke-width': 2 / Na__Surface__PxPerMm(), 'pointer-events': 'none' }, group);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | A Typed Length
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Last Move, While a Typed Length May Still Land It Again
    // ------------------------------------------------------------
    // Only with nothing being dragged, on its own sheet, with the Select tool up,
    // the viewport still selected and exactly where the move left it. The moment
    // one of those stops being true the move is no longer the last thing done.
    // ------------------------------------------------------------
    function Na__ViewportMove__Offer() {
        const S = Na__ViewportMove__State;
        const d = Na__AppState__Data;
        const offer = S.offer;
        if (!offer || S.flight || d.tool !== 'select' || !d.selection || d.selection.kind !== 'viewport' || d.selection.id !== offer.viewportId) return null;
        const sheet = Na__AppState__ActiveSheet();
        if (!sheet || sheet.Sheet__Id !== offer.sheetId) return null;
        const viewport = Na__DrawingSet__Viewport(sheet, offer.viewportId);
        if (!viewport || Na__ViewportLock__Is(viewport)) return null;
        const f = viewport.Viewport__FrameMm, was = offer.landed;
        return (f.X === was.X && f.Y === was.Y && f.WidthMm === was.WidthMm && f.HeightMm === was.HeightMm) ? offer : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Scale a Viewport's Move Is Read At (1: a 3D view has none, so the paper)
    // ------------------------------------------------------------
    function Na__ViewportMove__Denominator(viewport) {
        const denominator = Number(viewport.Viewport__ScaleDenominator);
        return denominator > 0 ? denominator : 1;
    }
    // ------------------------------------------------------------


    // FUNCTION | What the Box Should Read: { runMm, denominator, live } or null while nothing is on offer
    // ------------------------------------------------------------
    // runMm is paper millimetres. live: a frame being dragged, which wakes the box
    // on the press so a figure typed at once is the box's. Otherwise the last move,
    // still on offer.
    // ------------------------------------------------------------
    function Na__ViewportMove__Reading() {
        const flight = Na__ViewportMove__State.flight;
        if (flight) {
            if (!flight.frame) return null;
            return { runMm: flight.landed ? Math.hypot(flight.landed.X, flight.landed.Y) : 0, denominator: Na__ViewportMove__Denominator(flight.frame.viewport), live: true };
        }
        const offer = Na__ViewportMove__Offer();
        if (!offer) return null;
        return { runMm: offer.lengthMm, denominator: Na__ViewportMove__Denominator(Na__DrawingSet__Viewport(Na__AppState__ActiveSheet(), offer.viewportId)), live: false };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Typed Length Against How Far the Frame Really Went
    // ------------------------------------------------------------
    // A landing the paper's edge cut short says where it stopped, and that is the
    // distance read and retyped from: the frame really is there.
    // ------------------------------------------------------------
    function Na__ViewportMove__Went(lengthMm, x, y) {
        const run = Math.hypot(x, y);
        const stopped = Math.abs(Math.abs(lengthMm) - run) > Na__ViewportMove__STOPPED_MM;
        return { lengthMm: stopped ? Math.sign(lengthMm) * run : lengthMm, stoppedAtMm: stopped ? run : null };
    }
    // ------------------------------------------------------------


    // FUNCTION | Land the Frame a Typed Distance Along Its Line (paper millimetres; a minus runs back)
    // ------------------------------------------------------------
    // During a drag: along the way the frame has gone, held axis included, and the
    // drag ends so a still-down pointer cannot pull it back. After one: from where
    // it started, along the same line. Returns { ok: true, retyped, stoppedAtMm } or
    // { ok: false, reason }: 'none' with nothing on offer, 'length' for no length,
    // 'direction' when a drag has no run to aim along yet.
    // ------------------------------------------------------------
    function Na__ViewportMove__TypeLength(lengthMm) {
        const S = Na__ViewportMove__State;
        const flight = S.flight;
        const live = !!(flight && flight.frame);
        const offer = live ? null : Na__ViewportMove__Offer();
        if (!live && !offer) return { ok: false, reason: 'none' };
        if (!Number.isFinite(lengthMm) || Math.abs(lengthMm) < Na__ViewportMove__TYPED_MIN_MM) return { ok: false, reason: 'length' };

        if (live) {
            const run = flight.landed ? Math.hypot(flight.landed.X, flight.landed.Y) : 0;
            if (!(run >= Na__ViewportMove__TYPED_MIN_MM)) return { ok: false, reason: 'direction' };
            const dir = { x: flight.landed.X / run, y: flight.landed.Y / run };
            const landed = flight.apply({ X: dir.x * lengthMm, Y: dir.y * lengthMm }, true) || { X: dir.x * lengthMm, Y: dir.y * lengthMm };
            const went = Na__ViewportMove__Went(lengthMm, landed.X, landed.Y);
            flight.typed = { dir, lengthMm: went.lengthMm };
            flight.landed = landed;
            Na__Surface__FinishDrag();                                           // <-- Runs its end: the offer, the land and its one announcement
            return { ok: true, retyped: false, stoppedAtMm: went.stoppedAtMm };
        }

        const sheet = Na__AppState__ActiveSheet();
        const viewport = Na__DrawingSet__Viewport(sheet, offer.viewportId);
        const f = viewport.Viewport__FrameMm;
        const frame = Na__Paper__ClampFrame(sheet, Object.assign({}, f, { X: offer.from.X + offer.dir.x * lengthMm, Y: offer.from.Y + offer.dir.y * lengthMm }));
        const at = Na__ViewportMove__Place(viewport, frame.X, frame.Y);
        const went = Na__ViewportMove__Went(lengthMm, at.X - offer.from.X, at.Y - offer.from.Y);
        offer.lengthMm = went.lengthMm;
        offer.landed = Object.assign({}, f);                                     // <-- Before the announcement, so the box still finds the move on offer
        Na__Surface__RedrawOverlay();
        Na__AppState__Touch('viewport', sheet.Sheet__Id);
        Na__ViewportMove__SettleSoon();
        return { ok: true, retyped: true, stoppedAtMm: went.stoppedAtMm };
    }
    // ------------------------------------------------------------


    // FUNCTION | Be Told When the Reading May Have Changed
    // ------------------------------------------------------------
    function Na__ViewportMove__OnRead(reader) {
        if (typeof reader === 'function') Na__ViewportMove__State.readers.push(reader);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keys
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is the Focus in Something That Uses the Arrows Itself
    // ------------------------------------------------------------
    function Na__ViewportMove__IsTyping() {
        const active = document.activeElement;
        return /^(INPUT|TEXTAREA|SELECT)$/.test((active && active.tagName) || '') || !!(active && active.isContentEditable);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is the Focus Somewhere Text Is Typed
    // ------------------------------------------------------------
    // A text field keeps every key. A control used a moment ago keeps the focus but
    // has no use for F8, which would otherwise go dead until the paper was clicked.
    // ------------------------------------------------------------
    function Na__ViewportMove__IsTextEntry() {
        const active = document.activeElement;
        if (!active) return false;
        if (active.isContentEditable || active.tagName === 'TEXTAREA') return true;
        return active.tagName === 'INPUT' && !Na__ViewportMove__NON_TEXT.includes(String(active.type || 'text').toLowerCase());
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Nudge the Selected Viewport by a Millimetre Step (true when one was there to take the key)
    // ------------------------------------------------------------
    // Only with the Select tool up: a note half placed must not have the viewport
    // moved from under it. Stopped by the paper's edge, as a drag is.
    // ------------------------------------------------------------
    function Na__ViewportMove__Nudge(dx, dy) {
        const d = Na__AppState__Data;
        const sheet = Na__AppState__ActiveSheet();
        if (!sheet || !d.selection || d.selection.kind !== 'viewport' || d.tool !== 'select') return false;
        const viewport = Na__DrawingSet__Viewport(sheet, d.selection.id);
        if (!viewport) return false;
        if (Na__ViewportLock__Is(viewport)) { Na__ViewportLock__Refuse(); return true; }   // <-- The key is still the viewport's: it does not scroll the sheet
        const f = viewport.Viewport__FrameMm;
        const wasX = f.X, wasY = f.Y;
        const frame = Na__Paper__ClampFrame(sheet, Object.assign({}, f, { X: f.X + dx, Y: f.Y + dy }));
        const at = Na__ViewportMove__Place(viewport, frame.X, frame.Y);
        if (at.X === wasX && at.Y === wasY) return true;                         // <-- At the paper's edge: the key is still the viewport's
        Na__Surface__RedrawOverlay();
        Na__AppState__Touch('viewport', sheet.Sheet__Id);
        Na__ViewportMove__SettleSoon();
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Key From the Map: F8, or an arrow (the axis lock during a drag, a nudge at rest)
    // ------------------------------------------------------------
    // During a drag every key is looked up with no modifiers: Shift and Alt belong
    // to the drag there, and Alt + Left would otherwise be the browser's Back in the
    // middle of an Alt-drag pan. An arrow is always taken then, so a drag it has no
    // say in is never nudged from under the hand.
    // ------------------------------------------------------------
    function Na__ViewportMove__OnKey(event) {
        if (Na__AppState__Data.tab === 'environment' || event.defaultPrevented) return;
        const S = Na__ViewportMove__State;
        const flight = S.flight;
        const held = flight ? {} : { Ctrl: event.ctrlKey, Shift: event.shiftKey, Alt: event.altKey, Meta: event.metaKey };
        const match = Na__SheetKeys__MatchKey(event.key, held);
        if (!match) return;
        if (match.action === 'Ortho__Toggle') {
            if (Na__ViewportMove__IsTextEntry()) return;
            event.preventDefault();
            if (!event.repeat) Na__ViewportMove__OrthoToggle();                  // <-- A held key counts once, or Ortho would flicker
            return;
        }
        const arrow = Na__ViewportMove__ARROWS[match.action];
        if (!arrow || Na__ViewportMove__IsTyping()) return;
        if (flight) {
            event.preventDefault();
            if (event.repeat || !flight.holds) return;                           // <-- A held key counts once, or the lock would flicker
            S.axis = S.axis === arrow.axis ? null : arrow.axis;
            if (flight.moved) Na__ViewportMove__Run(flight);                     // <-- Shown at once; a press still in its dead zone takes the lock when it moves
            return;
        }
        const keys = Na__SheetKeys__GetKeyboardSetup();
        const step = match.coarse ? keys.nudgeCoarseStepMm : keys.nudgeStepMm;
        if (Na__ViewportMove__Nudge(arrow.x * step, arrow.y * step)) event.preventDefault();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Shift Went Down or Up During a Drag: hold or free it at once
    // ------------------------------------------------------------
    function Na__ViewportMove__OnShift(event) {
        const flight = Na__ViewportMove__State.flight;
        if (event.key !== 'Shift' || !flight || event.repeat) return;
        flight.shift = event.type === 'keydown';
        if (flight.moved && flight.holds) Na__ViewportMove__Run(flight);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Panel's Words for All of This (the steps are the key map's)
    // ------------------------------------------------------------
    function Na__ViewportMove__Hint() {
        const keys = Na__SheetKeys__GetKeyboardSetup();
        return `Drag to move it. Shift holds the drag to the nearer axis; Ortho (F8) holds it until Shift frees it. During a drag, the left or right arrow locks it across and the up or down arrow locks it up and down; the same axis again lets it go. During a move or just after one, type a distance and press Enter to land it exactly that far along its line, at the scale the Measurements box shows; type another to correct it. With nothing dragged, the arrow keys move it ${keys.nudgeStepMm} mm, or ${keys.nudgeCoarseStepMm} mm with Shift.`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount
// -----------------------------------------------------------------------------

    // FUNCTION | Join the Surface and the Keyboard (once)
    // ------------------------------------------------------------
    function Na__ViewportMove__Mount() {
        Na__Surface__AddOverlay(Na__ViewportMove__DrawBand);
        document.addEventListener('keydown', Na__ViewportMove__OnKey);
        document.addEventListener('keydown', Na__ViewportMove__OnShift);
        document.addEventListener('keyup', Na__ViewportMove__OnShift);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__ViewportMove__Mount,
        Na__ViewportMove__Drag,
        Na__ViewportMove__Place,
        Na__ViewportMove__Hint,
        Na__ViewportMove__OrthoIsOn,
        Na__ViewportMove__OrthoToggle,
        Na__ViewportMove__Reading,
        Na__ViewportMove__TypeLength,
        Na__ViewportMove__OnRead
    };

// endregion -------------------------------------------------------------------
