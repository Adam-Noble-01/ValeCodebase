/* =============================================================================
   PAINTERLYNPR - HUD | SCENE EDITING - ROTATE TOOL
   =============================================================================

   FILE       : PainterlyNPR__SceneEdit__RotateTool__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - SceneEditing - RotateTool
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : R turns the selected plop about its foot: the pointer swings it
                round a protractor on the ground, Shift steps it, a click sets it
   CREATED    : 03-Nov-2026 (v0.8.37)

   DESCRIPTION:
   - Adam, 03-Nov-2026: "Add a Rotation tool (R) key so i can test, tool should
     function like m key does for move".
   - R WAS AND IS THE CAMERA'S RESET (74): the tool takes the key only when there
     is a plop to turn, so with the library folded, or nothing selected, R goes
     on to the navigation as it always has. Menus takes it first, in the capture
     phase.
   - As the Move Tool in everything it can be: with the library out, R on a
     selected plop; its marker over the sheet and nothing rebuilt until it is
     set; a click, a drag let go or Enter sets it (one change, one rebuild, one
     undo step, 82's AssetsChanged); Esc, or R again, leaves it where it was;
     a left press is the tool's, the right button still pans, the middle
     dollies and the wheel zooms. It ends when the selection changes or the plop
     goes or is turned by something else (an undo), or the library is folded.
   - THE TURN IS WHAT THE POINTER SWEEPS ROUND THE FOOT ON THE PAGE, so it never
     jumps, can go round more than once, and is finer the further the pointer is
     from the foot. Not a point on the ground: the views a drawing is looked at
     from are shallow (9 degrees in the app's first view), and there the ground is
     a flat ellipse whose near side swings the direction wildly and whose far side
     runs out at the horizon. On the page it keeps one pace in every view, an
     elevation's too, the pointer over the plant included. Blender's R does the
     same.
   - IN STEPS of SnapDeg from where it stood, ShiftSnapDeg while Shift is held,
     so the shown and the set angles are the same.
   - Turned this way a plop is Rigid (16): its lumps and squash go round with it,
     as a proxy in SketchUp does.

   ============================================================================= */

import EditConfig from './Na__SceneEditing__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Engine__DEG as DEG } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__AssetLibrary__Catalogue as Catalogue } from '../16__Scene__AssetLibrary/PainterlyNPR__AssetLibrary__Catalogue__.mjs';
import {
    PainterlyNPR__CameraRig__Project,
    PainterlyNPR__CameraRig__Camera  as  Camera,
} from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';
import {
    PainterlyNPR__Interface__Status,
    PainterlyNPR__Interface__Query  as  $,
    PainterlyNPR__Interface__Ui     as  Ui,
} from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__Interface__AssetsChanged } from '../82__Hud__AssetCatalogue/PainterlyNPR__Interface__AssetDrawer__.mjs';
import {
    PainterlyNPR__AssetDrop__Clear,
    PainterlyNPR__AssetDrop__ShowMarker,
} from '../82__Hud__AssetCatalogue/PainterlyNPR__Interface__AssetDrop__.mjs';
import {
    PainterlyNPR__Interface__MaterialBrush,
    PainterlyNPR__Interface__SetMaterialBrush,
} from '../82__Hud__AssetCatalogue/PainterlyNPR__Interface__MaterialTab__.mjs';
import {
    PainterlyNPR__MoveTool__Active,
    PainterlyNPR__MoveTool__ClientOf,
    PainterlyNPR__MoveTool__OnDrawing,
    PainterlyNPR__MoveTool__OnStart,
    PainterlyNPR__MoveTool__Set,
    PainterlyNPR__MoveTool__Stop,
} from './PainterlyNPR__SceneEdit__MoveTool__.mjs';
import {
    PainterlyNPR__SceneEdit__Editing,
    PainterlyNPR__SceneEdit__Select,
    PainterlyNPR__SceneEdit__Selected,
} from './PainterlyNPR__SceneEdit__Selection__.mjs';

// =============================================================================
// REGION | Scene Editing - Rotate Tool
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__SceneEditing__Config.json
    // ------------------------------------------------------------
    // Each key read below checked as it is taken.
    const ROTATE  =  PainterlyNPR__ConfigAccess__Section(EditConfig, 'PainterlyNPR__SceneEditing__Config', 'RotateTool', ['SnapDeg', 'ShiftSnapDeg', 'RingPx', 'RingSteps', 'TickDeg', 'TickShare', 'HeadPx', 'MinRadiusPx', 'ReadoutPx']);
    const SVG     =  'http://www.w3.org/2000/svg';
    // ------------------------------------------------------------


    // MODULE STATE | The Turn Under Way
    // ------------------------------------------------------------
    // Uid: the plop being turned, null while the tool is off. From: the turn it
    // stood at. Foot: where it stands. Raw: the degrees the pointer has swept
    // (unstepped, and not wrapped: it can go round). Last: where the pointer was
    // when last read. Press: a left press under way. Pointer: the last place on
    // the page.
    const Tool  =  { Uid: null, From: 0, Foot: null, Raw: 0, Last: null, Press: null, Pointer: null, Shift: false, Svg: null, Watching: false, Wired: false };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Sweep - how far the pointer has swung it
// -----------------------------------------------------------------------------

    // FUNCTION | The Pointer Moved - what it has swept round the foot since it was last read
    // ------------------------------------------------------------
    // Anticlockwise on the page is anticlockwise from above, as RotationDeg is
    // (16's Transform), unless the plop stands above the eye and is seen from
    // underneath. Both ends are measured round the foot as it stands now, so only
    // the pointer's own movement counts: a foot moved on the page (the camera, or
    // a long status line shifting the sheet) is no turn. Close to the foot the
    // angle is wild, so the turn holds there: passing over it never makes it jump.
    function PainterlyNPR__RotateTool__Follow(clientX, clientY) {
        if (!Tool.Uid) return;
        const was   =  Tool.Last;
        const foot  =  PainterlyNPR__MoveTool__ClientOf(Tool.Foot);
        Tool.Last   =  { X: clientX, Y: clientY };
        if (!was || !foot) return;
        const round  =  (p) => Math.hypot(p.X - foot.X, p.Y - foot.Y) < ROTATE.MinRadiusPx ? null : Math.atan2(p.X - foot.X, p.Y - foot.Y) / DEG;
        const a = round(was), b = round(Tool.Last);
        if (a === null || b === null) return;
        const swept  =  (b - a + 540) % 360 - 180;                            // <-- The short way round: over the top of the page is no whole turn
        Tool.Raw    +=  Camera.Eye && Camera.Eye[1] < Tool.Foot[1] ? -swept : swept;
    }
    // ------------------------------------------------------------


    // FUNCTION | How Far It Is Shown Turned - in steps from where it stood; a click that never swept is exactly there
    // ------------------------------------------------------------
    function PainterlyNPR__RotateTool__Shown() {
        const step  =  Tool.Shift ? ROTATE.ShiftSnapDeg : ROTATE.SnapDeg;
        return Math.round(Tool.Raw / step) * step;
    }

    function PainterlyNPR__RotateTool__Turned(shown) {
        return Math.round((((Tool.From + shown) % 360) + 360) % 360 * 10) / 10;
    }

    // A turn in words: '' while it has not turned
    function PainterlyNPR__RotateTool__Words(shown) {
        if (!shown) return '';
        return `${Math.abs(shown)}° ${shown > 0 ? 'anticlockwise' : 'clockwise'}, to ${PainterlyNPR__RotateTool__Turned(shown)}°`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Protractor Over the Sheet
// -----------------------------------------------------------------------------

    // FUNCTION | The Protractor's Layer - an SVG over the drawing in the sheet's own pixels, as the gimbal is
    // ------------------------------------------------------------
    function PainterlyNPR__RotateTool__Layer() {
        if (Tool.Svg && Tool.Svg.isConnected) return Tool.Svg;
        const sheet  =  $('#PainterlyNPR__App__Sheet');
        if (!sheet) return null;
        const svg  =  document.createElementNS(SVG, 'svg');
        svg.setAttribute('class', 'PainterlyNPR__MoveTool__Gimbal');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('aria-hidden', 'true');
        svg.innerHTML  =  '<polygon class="PainterlyNPR__RotateTool__Sweep"/><polygon class="PainterlyNPR__RotateTool__Box"/><polygon class="PainterlyNPR__RotateTool__Ring"/><path class="PainterlyNPR__RotateTool__Ticks"/><line class="PainterlyNPR__RotateTool__Lever"/>'
                       + '<line class="PainterlyNPR__RotateTool__Start"/><line class="PainterlyNPR__RotateTool__Hand"/><polygon class="PainterlyNPR__RotateTool__Head"/><text class="PainterlyNPR__MoveTool__Readout"/>';
        sheet.appendChild(svg);
        Tool.Svg  =  svg;
        return svg;
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Turn - the protractor, where its front stood and is shown, its box, how far
    // ------------------------------------------------------------
    // Everything lies on the ground at the plop's foot, so a view from high up
    // reads as a dial and one near the ground as a flat ellipse.
    function PainterlyNPR__RotateTool__Draw() {
        const placement  =  State.Assets.find(p => p.Uid === Tool.Uid);
        const svg        =  PainterlyNPR__RotateTool__Layer();
        if (!placement || !svg || !Camera || !Ui.Canvas) return;
        const asset  =  Catalogue.ById.get(placement.AssetId) || null;
        PainterlyNPR__AssetDrop__ShowMarker(asset, Tool.Foot);                // <-- The insert's own footprint and height, as M shows
        const W = Camera.Width, H = Camera.Height;
        const rect  =  Ui.Canvas.getBoundingClientRect();
        const k     =  rect.width ? W / rect.width : 1;                       // <-- Sheet pixels a CSS pixel
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svg.style.display  =  '';
        const at    =  (p) => { const q = PainterlyNPR__CameraRig__Project(p); return { X: q.X, Y: H - q.Y, Depth: q.Depth }; };
        const q     =  (sel) => svg.querySelector(sel);
        const foot  =  at(Tool.Foot);
        const seen  =  foot.Depth > 0;
        svg.querySelectorAll('*').forEach(el => { el.style.display = seen ? '' : 'none'; });
        if (!seen) return;

        const perMetre  =  Camera.Ortho ? H / (2 * Camera.HalfHeight) : H / (2 * Camera.TanHalf * foot.Depth);   // <-- Sheet pixels a metre at the foot's depth
        const spread    =  asset && asset.Geometry && asset.Geometry.NominalSpreadM ? asset.Geometry.NominalSpreadM : 0;
        const radius    =  Math.max(ROTATE.RingPx * k / perMetre, 0.6 * spread * placement.Scale);   // <-- Outside its footprint, and never too small on screen
        const onGround  =  (deg, r) => { const a = deg * DEG; return at([Tool.Foot[0] + Math.sin(a) * r, Tool.Foot[1], Tool.Foot[2] + Math.cos(a) * r]); };
        const listOf    =  (points) => points.map(p => `${p.X.toFixed(1)},${p.Y.toFixed(1)}`).join(' ');

        const ring  =  [];
        for (let i = 0; i < ROTATE.RingSteps; i++) ring.push(onGround((i / ROTATE.RingSteps) * 360, radius));
        q('.PainterlyNPR__RotateTool__Ring').setAttribute('points', listOf(ring));
        let ticks  =  '';
        for (let deg = 0; deg < 360; deg += ROTATE.TickDeg) {
            const a = onGround(deg, radius * ROTATE.TickShare), b = onGround(deg, radius);
            ticks  +=  `M${a.X.toFixed(1)} ${a.Y.toFixed(1)}L${b.X.toFixed(1)} ${b.Y.toFixed(1)}`;
        }
        q('.PainterlyNPR__RotateTool__Ticks').setAttribute('d', ticks);

        const shown  =  PainterlyNPR__RotateTool__Shown();
        const now    =  Tool.From + shown;
        const stood  =  onGround(Tool.From, radius), tip = onGround(now, radius);
        PainterlyNPR__MoveTool__Set(q('.PainterlyNPR__RotateTool__Start'), { x1: foot.X, y1: foot.Y, x2: stood.X, y2: stood.Y });
        PainterlyNPR__MoveTool__Set(q('.PainterlyNPR__RotateTool__Hand'), { x1: foot.X, y1: foot.Y, x2: tip.X, y2: tip.Y });
        const dx = tip.X - foot.X, dy = tip.Y - foot.Y, len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len, h = ROTATE.HeadPx * k;
        q('.PainterlyNPR__RotateTool__Head').setAttribute('points', listOf([{ X: tip.X + ux * h, Y: tip.Y + uy * h }, { X: tip.X - uy * h * 0.45, Y: tip.Y + ux * h * 0.45 }, { X: tip.X + uy * h * 0.45, Y: tip.Y - ux * h * 0.45 }]));

        const sweep  =  [foot];                                               // <-- The part swept: its front's way round, at most a whole turn
        const arc    =  Math.max(-360, Math.min(360, shown));
        const steps  =  Math.max(1, Math.ceil(Math.abs(arc) / 5));
        for (let i = 0; i <= steps; i++) sweep.push(onGround(Tool.From + (i / steps) * arc, radius));
        q('.PainterlyNPR__RotateTool__Sweep').setAttribute('points', shown ? listOf(sweep) : '');

        // Its footprint's box at the turn shown, by the same turn 16 builds it with
        const bounds  =  asset && asset.Geometry ? asset.Geometry.Bounds : null;
        const box     =  q('.PainterlyNPR__RotateTool__Box');
        box.style.display  =  bounds ? '' : 'none';
        if (bounds) {
            const c = Math.cos(now * DEG), s = Math.sin(now * DEG), S = placement.Scale;
            box.setAttribute('points', listOf([[bounds.Min[0], bounds.Min[2]], [bounds.Max[0], bounds.Min[2]], [bounds.Max[0], bounds.Max[2]], [bounds.Min[0], bounds.Max[2]]].map(([x, z]) => at([Tool.Foot[0] + (c * x + s * z) * S, Tool.Foot[1], Tool.Foot[2] + (-s * x + c * z) * S]))));
        }

        // What the pointer is swinging: the foot to the pointer, on the page
        const lever  =  q('.PainterlyNPR__RotateTool__Lever');
        lever.style.display  =  Tool.Pointer ? '' : 'none';
        if (Tool.Pointer) PainterlyNPR__MoveTool__Set(lever, { x1: foot.X, y1: foot.Y, x2: (Tool.Pointer.X - rect.left) * k, y2: (Tool.Pointer.Y - rect.top) * k });

        const text   =  q('.PainterlyNPR__MoveTool__Readout');
        const words  =  PainterlyNPR__RotateTool__Words(shown);
        text.style.display  =  words ? '' : 'none';
        text.textContent    =  words;
        PainterlyNPR__MoveTool__Set(text, { x: tip.X + 14 * k, y: tip.Y - 12 * k, 'font-size': ROTATE.ReadoutPx * k });
    }
    // ------------------------------------------------------------


    // FUNCTION | Watch - redrawn every frame while the tool is on (the camera may move), ended when its plop is not the selection
    // ------------------------------------------------------------
    function PainterlyNPR__RotateTool__Watch() {
        if (Tool.Watching) return;
        Tool.Watching  =  true;
        const tick  =  () => {
            if (!Tool.Uid) { Tool.Watching = false; return; }
            const selection  =  PainterlyNPR__SceneEdit__Selected();
            const placement  =  State.Assets.find(p => p.Uid === Tool.Uid);
            if (!PainterlyNPR__SceneEdit__Editing() || !selection || selection.Kind !== 'Plop' || selection.Uid !== Tool.Uid
                || !placement || placement.RotationDeg !== Tool.From || placement.Position.some((v, i) => v !== Tool.Foot[i])) {   // <-- Folded away, another selection, taken out, or changed by an undo
                PainterlyNPR__RotateTool__Stop();
                Tool.Watching  =  false;
                return;
            }
            PainterlyNPR__RotateTool__Draw();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Starting, Ending and Setting
// -----------------------------------------------------------------------------

    // FUNCTION | Start Turning a Plop - true when the tool is on
    // ------------------------------------------------------------
    function PainterlyNPR__RotateTool__Start(uid) {
        const placement  =  State.Assets.find(p => p.Uid === uid);
        if (!placement) return false;
        if (!PainterlyNPR__SceneEdit__Editing()) { PainterlyNPR__Interface__Status('Open the asset library to turn what is placed.'); return false; }
        if (Tool.Uid) PainterlyNPR__RotateTool__Stop();
        if (PainterlyNPR__MoveTool__Active()) PainterlyNPR__MoveTool__Stop();
        PainterlyNPR__AssetDrop__Clear();                                     // <-- A card carried or a placement armed gives way
        if (PainterlyNPR__Interface__MaterialBrush()) PainterlyNPR__Interface__SetMaterialBrush(null);
        const selection  =  PainterlyNPR__SceneEdit__Selected();
        if (!selection || selection.Kind !== 'Plop' || selection.Uid !== uid) PainterlyNPR__SceneEdit__Select({ Kind: 'Plop', Uid: uid }, true);
        Tool.Uid    =  uid;
        Tool.From   =  placement.RotationDeg;
        Tool.Foot   =  placement.Position.slice();
        Tool.Raw    =  0;
        Tool.Last   =  null;
        Tool.Press  =  null;
        Tool.Shift  =  !!(Tool.Pointer && Tool.Pointer.Shift);
        if (Tool.Pointer && PainterlyNPR__MoveTool__OnDrawing(Tool.Pointer.X, Tool.Pointer.Y)) PainterlyNPR__RotateTool__Follow(Tool.Pointer.X, Tool.Pointer.Y);   // <-- Where the sweep is read from: no jump at the first move
        if (Ui.Root) Ui.Root.classList.add('PainterlyNPR--turningAsset');
        PainterlyNPR__Interface__Status(`Turning ${placement.Name} (${uid}): swing the pointer round its foot, Shift for steps of ${ROTATE.ShiftSnapDeg} degrees, click to set it, Esc to cancel.`);
        PainterlyNPR__RotateTool__Watch();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | End the Tool - nothing changed; the protractor goes
    // ------------------------------------------------------------
    function PainterlyNPR__RotateTool__Stop(note) {
        if (!Tool.Uid) return;
        Tool.Uid    =  null;
        Tool.Press  =  null;
        Tool.Last   =  null;
        if (Tool.Svg) Tool.Svg.style.display = 'none';
        PainterlyNPR__AssetDrop__ShowMarker(null, null);                     // <-- Hides the insert's marker
        if (Ui.Root) Ui.Root.classList.remove('PainterlyNPR--turningAsset', 'PainterlyNPR--carryingAsset');
        if (note) PainterlyNPR__Interface__Status(note);
    }

    function PainterlyNPR__RotateTool__Active() {
        return !!Tool.Uid;
    }
    // ------------------------------------------------------------


    // FUNCTION | R - start turning the selected plop, or leave the one turning where it was
    // ------------------------------------------------------------
    // True when the key was the tool's: false lets it go on to the camera's reset.
    function PainterlyNPR__RotateTool__Toggle() {
        if (Tool.Uid) {
            const placement  =  State.Assets.find(p => p.Uid === Tool.Uid);
            PainterlyNPR__RotateTool__Stop(placement ? `${placement.Name} (${placement.Uid}) left as it was.` : 'Turn cancelled.');
            return true;
        }
        if (!PainterlyNPR__SceneEdit__Editing()) return false;
        const selection  =  PainterlyNPR__SceneEdit__Selected();
        return !!selection && selection.Kind === 'Plop' && PainterlyNPR__RotateTool__Start(selection.Uid);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set It at the Turn Shown - one change, one rebuild, one undo step
    // ------------------------------------------------------------
    function PainterlyNPR__RotateTool__Commit() {
        const placement  =  State.Assets.find(p => p.Uid === Tool.Uid);
        if (!placement) { PainterlyNPR__RotateTool__Stop(); return; }
        const shown  =  PainterlyNPR__RotateTool__Shown();
        const words  =  PainterlyNPR__RotateTool__Words(shown);
        const turned =  PainterlyNPR__RotateTool__Turned(shown);
        if (!words || turned === Tool.From) { PainterlyNPR__RotateTool__Stop(`${placement.Name} (${placement.Uid}) left as it was.`); return; }
        PainterlyNPR__RotateTool__Stop();
        placement.RotationDeg  =  turned;
        placement.Rigid        =  true;                                       // <-- Its lumps and squash go round with it from now on (16)
        PainterlyNPR__Interface__AssetsChanged(`Turned ${placement.Name} (${placement.Uid}) ${words}`);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Wiring - the pointer and the keys
// -----------------------------------------------------------------------------

    // FUNCTION | Wire the Tool - once, from SceneEdit__Wire
    // ------------------------------------------------------------
    // As the Move Tool's: window listeners, so the app and a wrapper are served
    // alike, and a press taken in the capture phase and marked handled, so the
    // navigation never starts an orbit. M and R give way to each other.
    function PainterlyNPR__RotateTool__Wire() {
        if (Tool.Wired) return;
        Tool.Wired  =  true;
        PainterlyNPR__MoveTool__OnStart(() => PainterlyNPR__RotateTool__Stop());
        const typing  =  () => { const a = document.activeElement; return !!(a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)); };

        window.addEventListener('pointermove', (e) => {
            Tool.Pointer  =  { X: e.clientX, Y: e.clientY, Shift: e.shiftKey };
            if (!Tool.Uid || (Tool.Press && e.pointerId !== Tool.Press.PointerId)) return;
            Tool.Shift  =  e.shiftKey;
            if (e.buttons & 6) { Tool.Last = null; return; }                  // <-- The right button pans and the middle dollies: that is no sweep
            PainterlyNPR__RotateTool__Follow(e.clientX, e.clientY);
        }, { passive: true });

        window.addEventListener('pointerdown', (e) => {
            if (!Tool.Uid || e.button !== 0) return;
            const sheet  =  $('#PainterlyNPR__App__Sheet');
            if (e.target !== Ui.Canvas && e.target !== sheet) return;         // <-- A point's handle, a button, a wrapper's own grips: theirs
            if (!PainterlyNPR__MoveTool__OnDrawing(e.clientX, e.clientY)) return;
            e.preventDefault();                                               // <-- The navigation leaves a handled press alone: no orbit, no tap
            Tool.Pointer  =  { X: e.clientX, Y: e.clientY, Shift: e.shiftKey };
            Tool.Shift    =  e.shiftKey;
            Tool.Press    =  { PointerId: e.pointerId };
            PainterlyNPR__RotateTool__Follow(e.clientX, e.clientY);           // <-- A finger has no hover: the sweep starts at the press
            if (Ui.Root) Ui.Root.classList.add('PainterlyNPR--carryingAsset');
        }, true);

        window.addEventListener('pointerup', (e) => {
            if (!Tool.Uid || !Tool.Press || e.pointerId !== Tool.Press.PointerId) return;
            PainterlyNPR__RotateTool__Follow(e.clientX, e.clientY);
            PainterlyNPR__RotateTool__Commit();                               // <-- A click, or a drag let go: it is set
        });
        window.addEventListener('pointercancel', (e) => {
            if (!Tool.Press || e.pointerId !== Tool.Press.PointerId) return;
            Tool.Press  =  null;
            if (Ui.Root) Ui.Root.classList.remove('PainterlyNPR--carryingAsset');
        });

        window.addEventListener('keydown', (e) => {
            if (!Tool.Uid || typing()) return;
            if (e.key === 'Shift') { Tool.Shift = true; return; }             // <-- The steps show at once, before the pointer moves
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();                                          // <-- Esc ends the turn only: the selection stays
                const placement  =  State.Assets.find(p => p.Uid === Tool.Uid);
                PainterlyNPR__RotateTool__Stop(placement ? `${placement.Name} (${placement.Uid}) left as it was.` : 'Turn cancelled.');
                return;
            }
            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); PainterlyNPR__RotateTool__Commit(); }
        }, true);
        window.addEventListener('keyup', (e) => {
            if (e.key === 'Shift' && Tool.Uid) Tool.Shift = false;
        }, true);
        window.addEventListener('blur', () => {
            Tool.Shift  =  false;
            if (Tool.Press) { Tool.Press = null; if (Ui.Root) Ui.Root.classList.remove('PainterlyNPR--carryingAsset'); }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__RotateTool__Active,
        PainterlyNPR__RotateTool__Commit,
        PainterlyNPR__RotateTool__Start,
        PainterlyNPR__RotateTool__Stop,
        PainterlyNPR__RotateTool__Toggle,
        PainterlyNPR__RotateTool__Wire,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
