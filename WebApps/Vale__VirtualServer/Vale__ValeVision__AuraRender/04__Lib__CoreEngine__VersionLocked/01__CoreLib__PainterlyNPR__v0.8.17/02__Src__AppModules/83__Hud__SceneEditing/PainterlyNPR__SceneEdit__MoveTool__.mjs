/* =============================================================================
   PAINTERLYNPR - HUD | SCENE EDITING - MOVE TOOL
   =============================================================================

   FILE       : PainterlyNPR__SceneEdit__MoveTool__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - SceneEditing - MoveTool
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : M moves the selected plop: carried over the ground by the
                pointer with the insert's own marker, lifted and lowered with
                Shift on its gimbal, set down with a click
   CREATED    : 30-Oct-2026 (v0.8.10)

   DESCRIPTION:
   - Adam, 30-Oct-2026: "adding a new Move Tool you press m when an asset is
     selected and you can move it around show a gimbal for the move tool".
     Asked how, he chose: "Ground only, pressing shift allows for up and down
     movement, show only show the giumbal when shift is held otherwise show
     that same graphic and effect that appears on the insert"; a 10 mm step; a
     ghost while it moves, the drawing redrawn once when it is set down.
   - ON THE GROUND (no Shift): the plop's foot keeps its place under the
     pointer as the pointer moves (it never jumps to it), over the level it
     stands at. It is shown by 82's drop marker - its footprint and its
     height, as a card carried from the drawer is - with a dashed line back to
     where it stood. A view along the ground (an elevation) carries it across
     the view instead, its depth kept.
   - SHIFT: the gimbal at its foot, in SketchUp's colours (red +X, green -Z,
     blue up), and the pointer lifts or lowers it along blue. A press on the
     red or green arrow while Shift is held carries it along that arrow for
     that press.
   - A CLICK, or a drag let go, sets it down: one change, one rebuild, one undo
     step (82's AssetsChanged). Enter sets it down where it is shown; Esc, or M
     again, leaves it where it was. Until then nothing is rebuilt: the drawing
     and the selection's outline stay where it stood.
   - While it is on, a left press on the drawing is the tool's, not an orbit;
     the right button still pans, the middle dollies and the wheel zooms. It
     ends when the selection changes, the plop goes or is moved by something
     else (an undo), or the library is folded away.
   - A move is made in steps of SnapM (10 mm) along each axis from where the
     plop stood, so the shown and the set-down places are the same.

   ============================================================================= */

import EditConfig from './Na__SceneEditing__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Maths__Clamp       as  Clamp,
    PainterlyNPR__Maths__V3Add       as  V3Add,
    PainterlyNPR__Maths__V3Dot       as  V3Dot,
    PainterlyNPR__Maths__V3Normalise as  V3Normalise,
    PainterlyNPR__Maths__V3Scale     as  V3Scale,
    PainterlyNPR__Maths__V3Sub       as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__AssetLibrary__Catalogue as Catalogue } from '../16__Scene__AssetLibrary/PainterlyNPR__AssetLibrary__Catalogue__.mjs';
import {
    PainterlyNPR__CameraRig__Project,
    PainterlyNPR__CameraRig__Unproject,
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
    PainterlyNPR__SceneEdit__Editing,
    PainterlyNPR__SceneEdit__Select,
    PainterlyNPR__SceneEdit__Selected,
} from './PainterlyNPR__SceneEdit__Selection__.mjs';

// =============================================================================
// REGION | Scene Editing - Move Tool
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__SceneEditing__Config.json, and the Gimbal's Axes
    // ------------------------------------------------------------
    // Each key read below checked as it is taken. The axes are SketchUp's, as a
    // SketchUp model arrives (its Y is the engine's -Z): red, green, blue up.
    const MOVE  =  PainterlyNPR__ConfigAccess__Section(EditConfig, 'PainterlyNPR__SceneEditing__Config', 'MoveTool', ['SnapM', 'GimbalPx', 'HeadPx', 'HitPx', 'RailArrows', 'MinRayDy', 'MaxRayM', 'MaxLiftM', 'ReadoutPx']);
    const AXES  =  { Red: [1, 0, 0], Green: [0, 0, -1], Blue: [0, 1, 0] };
    const SVG   =  'http://www.w3.org/2000/svg';
    // ------------------------------------------------------------


    // MODULE STATE | The Move Under Way
    // ------------------------------------------------------------
    // Uid: the plop being moved, null while the tool is off. From: where it
    // stood. Raw: where the pointer has carried it (unstepped). Mode: what the
    // pointer drives now - { Axis: 'Ground' or an arrow, Base: Raw when it
    // began, Grab: the foot's offset from the pointer on screen, or null until
    // the pointer is over the drawing }. Press: a left press under way, and the
    // arrow it took. Pointer: the last place on the page (kept while the tool
    // is off, so M grabs at once). Arrows: the gimbal's arrows on screen, for
    // the press to find.
    const Tool  =  { Uid: null, From: null, Raw: null, Mode: null, Press: null, Pointer: null, Shift: false, Hot: null, Arrows: [], Svg: null, Watching: false, Wired: false };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rays and Rails - where the pointer carries the plop
// -----------------------------------------------------------------------------

    // FUNCTION | The Ray Under a Point of the Page - { Origin, Dir }, or null with no drawing
    // ------------------------------------------------------------
    // Off the drawing too: the foot's offset can put the point past its edge.
    function PainterlyNPR__MoveTool__RayAt(clientX, clientY) {
        if (!Ui.Canvas || !Camera) return null;
        const rect  =  Ui.Canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const x  =  ((clientX - rect.left) / rect.width) * Camera.Width;
        const y  =  (1 - (clientY - rect.top) / rect.height) * Camera.Height;
        const a  =  PainterlyNPR__CameraRig__Unproject(x, y, 1);
        const b  =  PainterlyNPR__CameraRig__Unproject(x, y, 2);
        return { Origin: a, Dir: V3Normalise(V3Sub(b, a)) };
    }

    function PainterlyNPR__MoveTool__OnDrawing(clientX, clientY) {
        if (!Ui.Canvas) return false;
        const rect  =  Ui.Canvas.getBoundingClientRect();
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    }
    // ------------------------------------------------------------


    // FUNCTION | Where a Ray Meets the Level a Plop Stands At - or, along the ground, the plane across the view
    // ------------------------------------------------------------
    function PainterlyNPR__MoveTool__LevelHit(ray, base) {
        const O = ray.Origin, D = ray.Dir;
        if (Math.abs(D[1]) >= MOVE.MinRayDy) {
            const t  =  (base[1] - O[1]) / D[1];
            if (!(t > 0) || t > MOVE.MaxRayM) return null;                    // <-- Behind the eye, or out at the horizon
            return [O[0] + D[0] * t, base[1], O[2] + D[2] * t];
        }
        const f  =  (Camera && Camera.Forward) || [0, 0, -1];                 // <-- An elevation: the plane through the foot facing the camera
        const n  =  V3Normalise([f[0], 0, f[2]]);
        const along  =  V3Dot(D, n);
        if (Math.abs(along) < 1e-6) return null;
        const t  =  V3Dot(V3Sub(base, O), n) / along;
        if (!(t > 0)) return null;
        return [O[0] + D[0] * t, base[1], O[2] + D[2] * t];                   // <-- Its height kept: Shift lifts
    }
    // ------------------------------------------------------------


    // FUNCTION | How Far Along a Rail a Ray Passes Nearest - t from its base, or null when the rail points at the eye
    // ------------------------------------------------------------
    function PainterlyNPR__MoveTool__RailT(base, axis, ray) {
        const w  =  V3Sub(base, ray.Origin);
        const b  =  V3Dot(axis, ray.Dir), d = V3Dot(axis, w), e = V3Dot(ray.Dir, w);
        const den  =  1 - b * b;                                              // <-- Both unit length
        if (den < 1e-4) return null;
        return (b * e - d) / den;
    }
    // ------------------------------------------------------------


    // FUNCTION | A World Point on the Page - client pixels, or null behind the eye
    // ------------------------------------------------------------
    function PainterlyNPR__MoveTool__ClientOf(p) {
        if (!Ui.Canvas || !Camera) return null;
        const q  =  PainterlyNPR__CameraRig__Project(p);
        if (!(q.Depth > 0)) return null;
        const rect  =  Ui.Canvas.getBoundingClientRect();
        return { X: rect.left + (q.X / Camera.Width) * rect.width, Y: rect.top + (1 - q.Y / Camera.Height) * rect.height };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Carrying - what the pointer drives
// -----------------------------------------------------------------------------

    // FUNCTION | What the Pointer Should Drive Now - a pressed arrow, blue with Shift, else the ground
    // ------------------------------------------------------------
    function PainterlyNPR__MoveTool__Wanted() {
        if (Tool.Press && Tool.Press.Axis) return Tool.Press.Axis;
        return Tool.Shift ? 'Blue' : 'Ground';
    }

    // From where the plop is shown now, so changing what is driven never makes it jump
    function PainterlyNPR__MoveTool__Rebase(axis) {
        Tool.Mode  =  { Axis: axis, Base: Tool.Raw.slice(), Grab: null };
        if (Tool.Pointer) PainterlyNPR__MoveTool__Grab(Tool.Pointer.X, Tool.Pointer.Y);
    }

    // The foot's offset from the pointer on screen, taken once the pointer is over the drawing
    function PainterlyNPR__MoveTool__Grab(clientX, clientY) {
        if (!PainterlyNPR__MoveTool__OnDrawing(clientX, clientY)) return;
        const foot  =  PainterlyNPR__MoveTool__ClientOf(Tool.Mode.Base);
        Tool.Mode.Grab  =  foot ? { Dx: foot.X - clientX, Dy: foot.Y - clientY } : { Dx: 0, Dy: 0 };   // <-- A foot behind the eye comes to the pointer, as a card from the drawer does
    }
    // ------------------------------------------------------------


    // FUNCTION | The Pointer Moved - the plop carried with it
    // ------------------------------------------------------------
    function PainterlyNPR__MoveTool__Follow(clientX, clientY) {
        if (!Tool.Uid) return;
        if (PainterlyNPR__MoveTool__Wanted() !== Tool.Mode.Axis) PainterlyNPR__MoveTool__Rebase(PainterlyNPR__MoveTool__Wanted());
        const mode  =  Tool.Mode;
        if (!mode.Grab) { PainterlyNPR__MoveTool__Grab(clientX, clientY); return; }
        const ray  =  PainterlyNPR__MoveTool__RayAt(clientX + mode.Grab.Dx, clientY + mode.Grab.Dy);
        if (!ray) return;
        if (mode.Axis === 'Ground') {
            const hit  =  PainterlyNPR__MoveTool__LevelHit(ray, mode.Base);
            if (hit) Tool.Raw = hit;
            return;
        }
        const t  =  PainterlyNPR__MoveTool__RailT(mode.Base, AXES[mode.Axis], ray);
        if (t === null) return;
        const p  =  V3Add(mode.Base, V3Scale(AXES[mode.Axis], t));
        p[1]  =  Clamp(p[1], -MOVE.MaxLiftM, MOVE.MaxLiftM);
        Tool.Raw  =  p;
    }
    // ------------------------------------------------------------


    // FUNCTION | Where the Plop Is Shown - stepped from where it stood, each axis apart
    // ------------------------------------------------------------
    // A step of 0 (a click that never moved) is exactly where it stood.
    function PainterlyNPR__MoveTool__Shown() {
        const step  =  MOVE.SnapM;
        return Tool.From.map((v, i) => {
            const moved  =  Math.round((Tool.Raw[i] - v) / step) * step;
            return moved ? Math.round((v + moved) * 1000) / 1000 : v;
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Gimbal Over the Sheet
// -----------------------------------------------------------------------------

    // FUNCTION | The Gimbal's Layer - an SVG over the drawing in the sheet's own pixels, as the drop marker is
    // ------------------------------------------------------------
    function PainterlyNPR__MoveTool__Layer() {
        if (Tool.Svg && Tool.Svg.isConnected) return Tool.Svg;
        const sheet  =  $('#PainterlyNPR__App__Sheet');
        if (!sheet) return null;
        const svg  =  document.createElementNS(SVG, 'svg');
        svg.setAttribute('class', 'PainterlyNPR__MoveTool__Gimbal');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('aria-hidden', 'true');
        const arrows  =  Object.keys(AXES).map(a => `<line class="PainterlyNPR__MoveTool__Axis PainterlyNPR__MoveTool__Axis--${a}" data-axis="${a}"/><polygon class="PainterlyNPR__MoveTool__Head PainterlyNPR__MoveTool__Head--${a}" data-head="${a}"/>`).join('');
        svg.innerHTML  =  '<line class="PainterlyNPR__MoveTool__Trail"/><circle class="PainterlyNPR__MoveTool__From"/><line class="PainterlyNPR__MoveTool__Drop"/>'
                       + `<g class="PainterlyNPR__MoveTool__Axes"><line class="PainterlyNPR__MoveTool__Rail"/>${arrows}</g>`
                       + '<text class="PainterlyNPR__MoveTool__Readout"/>';
        sheet.appendChild(svg);
        Tool.Svg  =  svg;
        return svg;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Set an Element's Attributes - numbers to a tenth of a pixel
    // ------------------------------------------------------------
    function PainterlyNPR__MoveTool__Set(el, values) {
        for (const [k, v] of Object.entries(values)) el.setAttribute(k, typeof v === 'number' ? v.toFixed(1) : v);
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Move - the insert's marker, the trail, the readout, and the gimbal while Shift is held
    // ------------------------------------------------------------
    function PainterlyNPR__MoveTool__Draw() {
        const placement  =  State.Assets.find(p => p.Uid === Tool.Uid);
        const svg        =  PainterlyNPR__MoveTool__Layer();
        if (!placement || !svg || !Camera || !Ui.Canvas) return;
        const shown  =  PainterlyNPR__MoveTool__Shown();
        PainterlyNPR__AssetDrop__ShowMarker(Catalogue.ById.get(placement.AssetId) || null, shown);   // <-- The insert's own footprint and height

        const W = Camera.Width, H = Camera.Height;
        const rect  =  Ui.Canvas.getBoundingClientRect();
        const k     =  rect.width ? W / rect.width : 1;                       // <-- Sheet pixels a CSS pixel
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svg.style.display  =  '';
        const at   =  (p) => { const q = PainterlyNPR__CameraRig__Project(p); return { X: q.X, Y: H - q.Y, Depth: q.Depth }; };
        const q    =  (sel) => svg.querySelector(sel);
        const foot =  at(shown), from = at(Tool.From);
        const seen =  foot.Depth > 0;

        // Where it stood, the trail to where it is shown, and the drop to its old level when lifted
        const moved  =  shown.some((v, i) => v !== Tool.From[i]);
        q('.PainterlyNPR__MoveTool__Trail').style.display  =  moved && seen && from.Depth > 0 ? '' : 'none';
        PainterlyNPR__MoveTool__Set(q('.PainterlyNPR__MoveTool__Trail'), { x1: from.X, y1: from.Y, x2: foot.X, y2: foot.Y });
        q('.PainterlyNPR__MoveTool__From').style.display  =  moved && from.Depth > 0 ? '' : 'none';
        PainterlyNPR__MoveTool__Set(q('.PainterlyNPR__MoveTool__From'), { cx: from.X, cy: from.Y, r: 5 * k });
        const lifted  =  Math.abs(shown[1] - Tool.From[1]) > 1e-6;
        const below   =  at([shown[0], Tool.From[1], shown[2]]);
        q('.PainterlyNPR__MoveTool__Drop').style.display  =  lifted && seen && below.Depth > 0 ? '' : 'none';
        PainterlyNPR__MoveTool__Set(q('.PainterlyNPR__MoveTool__Drop'), { x1: foot.X, y1: foot.Y, x2: below.X, y2: below.Y });

        // The gimbal: only while Shift is held, or an arrow is pressed (Adam)
        const axes   =  q('.PainterlyNPR__MoveTool__Axes');
        const drive  =  Tool.Mode ? Tool.Mode.Axis : 'Ground';
        const open   =  seen && (Tool.Shift || drive !== 'Ground');
        axes.style.display  =  open ? '' : 'none';
        Tool.Arrows  =  [];
        if (open) {
            const perMetre  =  Camera.Ortho ? H / (2 * Camera.HalfHeight) : H / (2 * Camera.TanHalf * foot.Depth);   // <-- Sheet pixels a metre at the foot's depth
            const length    =  MOVE.GimbalPx * k / perMetre;                  // <-- World metres: the same size on screen at any zoom
            for (const name of Object.keys(AXES)) {
                const tip   =  at(V3Add(shown, V3Scale(AXES[name], length)));
                const line  =  q(`[data-axis="${name}"]`), head = q(`[data-head="${name}"]`);
                const dx = tip.X - foot.X, dy = tip.Y - foot.Y, len = Math.hypot(dx, dy);
                const show  =  tip.Depth > 0 && len > 3 * k;                  // <-- An arrow toward the eye is a dot: it is left out
                line.style.display = head.style.display = show ? '' : 'none';
                line.classList.toggle('PainterlyNPR__MoveTool__Axis--live', name === drive || name === Tool.Hot);
                head.classList.toggle('PainterlyNPR__MoveTool__Head--live', name === drive || name === Tool.Hot);
                if (!show) continue;
                const ux = dx / len, uy = dy / len, h = MOVE.HeadPx * k;
                PainterlyNPR__MoveTool__Set(line, { x1: foot.X, y1: foot.Y, x2: tip.X, y2: tip.Y });
                head.setAttribute('points', [[tip.X + ux * h, tip.Y + uy * h], [tip.X - uy * h * 0.45, tip.Y + ux * h * 0.45], [tip.X + uy * h * 0.45, tip.Y - ux * h * 0.45]].map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' '));
                Tool.Arrows.push({ Axis: name, X0: rect.left + foot.X / k, Y0: rect.top + foot.Y / k, X1: rect.left + (tip.X + ux * h) / k, Y1: rect.top + (tip.Y + uy * h) / k });
            }
            const rail  =  q('.PainterlyNPR__MoveTool__Rail');
            const axis  =  AXES[drive === 'Ground' ? 'Blue' : drive];
            const reach =  length * MOVE.RailArrows;
            const r0 = at(V3Add(shown, V3Scale(axis, -reach))), r1 = at(V3Add(shown, V3Scale(axis, reach)));
            rail.style.display  =  r0.Depth > 0 && r1.Depth > 0 ? '' : 'none';
            rail.setAttribute('class', `PainterlyNPR__MoveTool__Rail PainterlyNPR__MoveTool__Rail--${drive === 'Ground' ? 'Blue' : drive}`);
            PainterlyNPR__MoveTool__Set(rail, { x1: r0.X, y1: r0.Y, x2: r1.X, y2: r1.Y });
        }

        // How far it has gone, beside it
        const text  =  q('.PainterlyNPR__MoveTool__Readout');
        const words =  PainterlyNPR__MoveTool__Distance(shown);
        text.style.display  =  words && seen ? '' : 'none';
        text.textContent    =  words;
        PainterlyNPR__MoveTool__Set(text, { x: foot.X + 14 * k, y: foot.Y - 12 * k, 'font-size': MOVE.ReadoutPx * k });
    }
    // ------------------------------------------------------------


    // FUNCTION | A Move in Words - across the ground, then up or down ('' while it has not moved)
    // ------------------------------------------------------------
    function PainterlyNPR__MoveTool__Distance(shown) {
        const across  =  Math.hypot(shown[0] - Tool.From[0], shown[2] - Tool.From[2]);
        const up      =  shown[1] - Tool.From[1];
        const words   =  [];
        if (across > 1e-6) words.push(`${across.toFixed(2)} m`);
        if (Math.abs(up) > 1e-6) words.push(`${up > 0 ? 'up' : 'down'} ${Math.abs(up).toFixed(2)} m`);
        return words.join(', ');
    }
    // ------------------------------------------------------------


    // FUNCTION | Watch - redrawn every frame while the tool is on (the camera may move), ended when its plop is not the selection
    // ------------------------------------------------------------
    function PainterlyNPR__MoveTool__Watch() {
        if (Tool.Watching) return;
        Tool.Watching  =  true;
        const tick  =  () => {
            if (!Tool.Uid) { Tool.Watching = false; return; }
            const selection  =  PainterlyNPR__SceneEdit__Selected();
            const placement  =  State.Assets.find(p => p.Uid === Tool.Uid);
            if (!PainterlyNPR__SceneEdit__Editing() || !selection || selection.Kind !== 'Plop' || selection.Uid !== Tool.Uid
                || !placement || placement.Position.some((v, i) => v !== Tool.From[i])) {   // <-- Folded away, another selection, taken out, or moved by an undo
                PainterlyNPR__MoveTool__Stop();
                Tool.Watching  =  false;
                return;
            }
            PainterlyNPR__MoveTool__Draw();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Starting, Ending and Setting Down
// -----------------------------------------------------------------------------

    // FUNCTION | Start Moving a Plop - true when the tool is on
    // ------------------------------------------------------------
    function PainterlyNPR__MoveTool__Start(uid) {
        const placement  =  State.Assets.find(p => p.Uid === uid);
        if (!placement) return false;
        if (!PainterlyNPR__SceneEdit__Editing()) { PainterlyNPR__Interface__Status('Open the asset library to move what is placed.'); return false; }
        if (Tool.Uid) PainterlyNPR__MoveTool__Stop();
        PainterlyNPR__AssetDrop__Clear();                                     // <-- A card carried or a placement armed gives way
        if (PainterlyNPR__Interface__MaterialBrush()) PainterlyNPR__Interface__SetMaterialBrush(null);
        const selection  =  PainterlyNPR__SceneEdit__Selected();
        if (!selection || selection.Kind !== 'Plop' || selection.Uid !== uid) PainterlyNPR__SceneEdit__Select({ Kind: 'Plop', Uid: uid }, true);
        Tool.Uid    =  uid;
        Tool.From   =  placement.Position.slice();
        Tool.Raw    =  placement.Position.slice();
        Tool.Press  =  null;
        Tool.Hot    =  null;
        Tool.Shift  =  !!(Tool.Pointer && Tool.Pointer.Shift);
        PainterlyNPR__MoveTool__Rebase(PainterlyNPR__MoveTool__Wanted());
        if (Ui.Root) Ui.Root.classList.add('PainterlyNPR--movingAsset');
        PainterlyNPR__Interface__Status(`Moving ${placement.Name} (${uid}): move the pointer to carry it over the ground, hold Shift to lift or lower it, click to set it down. Esc leaves it where it was.`);
        PainterlyNPR__MoveTool__Watch();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | End the Tool - nothing changed; the marker and the gimbal go
    // ------------------------------------------------------------
    function PainterlyNPR__MoveTool__Stop(note) {
        if (!Tool.Uid) return;
        Tool.Uid    =  null;
        Tool.Press  =  null;
        Tool.Mode   =  null;
        Tool.Hot    =  null;
        Tool.Arrows =  [];
        if (Tool.Svg) Tool.Svg.style.display = 'none';
        PainterlyNPR__AssetDrop__ShowMarker(null, null);                     // <-- Hides the insert's marker
        if (Ui.Root) Ui.Root.classList.remove('PainterlyNPR--movingAsset', 'PainterlyNPR--carryingAsset');
        if (note) PainterlyNPR__Interface__Status(note);
    }

    function PainterlyNPR__MoveTool__Active() {
        return !!Tool.Uid;
    }
    // ------------------------------------------------------------


    // FUNCTION | M - start moving the selected plop, or leave the one moving where it was
    // ------------------------------------------------------------
    // True when the key was the tool's.
    function PainterlyNPR__MoveTool__Toggle() {
        if (Tool.Uid) {
            const placement  =  State.Assets.find(p => p.Uid === Tool.Uid);
            PainterlyNPR__MoveTool__Stop(placement ? `${placement.Name} (${placement.Uid}) left where it was.` : 'Move cancelled.');
            return true;
        }
        if (!PainterlyNPR__SceneEdit__Editing()) return false;
        const selection  =  PainterlyNPR__SceneEdit__Selected();
        if (!selection || selection.Kind !== 'Plop') {
            PainterlyNPR__Interface__Status(selection ? "The cottage's own objects stay where they are: only placed assets move." : 'Select a placed asset first, then press M to move it.');
            return true;
        }
        return PainterlyNPR__MoveTool__Start(selection.Uid);
    }
    // ------------------------------------------------------------


    // FUNCTION | Set It Down Where It Is Shown - one change, one rebuild, one undo step
    // ------------------------------------------------------------
    function PainterlyNPR__MoveTool__Commit() {
        const placement  =  State.Assets.find(p => p.Uid === Tool.Uid);
        if (!placement) { PainterlyNPR__MoveTool__Stop(); return; }
        const shown  =  PainterlyNPR__MoveTool__Shown();
        const words  =  PainterlyNPR__MoveTool__Distance(shown);
        if (!words) { PainterlyNPR__MoveTool__Stop(`${placement.Name} (${placement.Uid}) left where it was.`); return; }
        PainterlyNPR__MoveTool__Stop();
        placement.Position  =  shown;
        PainterlyNPR__Interface__AssetsChanged(`Moved ${placement.Name} (${placement.Uid}) ${words}`);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Wiring - the pointer and the keys
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Arrow Under a Point of the Page - while the gimbal shows
    // ------------------------------------------------------------
    function PainterlyNPR__MoveTool__ArrowAt(x, y) {
        let best = null, near = MOVE.HitPx;
        for (const a of Tool.Arrows) {
            const vx = a.X1 - a.X0, vy = a.Y1 - a.Y0, l2 = vx * vx + vy * vy || 1;
            const t  =  Clamp(((x - a.X0) * vx + (y - a.Y0) * vy) / l2, 0.2, 1);   // <-- Not the foot, where the three meet
            const d  =  Math.hypot(x - (a.X0 + vx * t), y - (a.Y0 + vy * t));
            if (d < near) { near = d; best = a.Axis; }
        }
        return best;
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire the Tool - once, from SceneEdit__Wire
    // ------------------------------------------------------------
    // Window listeners, so the app (navigation on the sheet) and a wrapper
    // (navigation on the canvas) are served alike. A press is taken in the
    // capture phase and marked handled, so the navigation never starts an orbit.
    function PainterlyNPR__MoveTool__Wire() {
        if (Tool.Wired) return;
        Tool.Wired  =  true;
        const typing  =  () => { const a = document.activeElement; return !!(a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)); };

        window.addEventListener('pointermove', (e) => {
            Tool.Pointer  =  { X: e.clientX, Y: e.clientY, Shift: e.shiftKey };
            if (!Tool.Uid || (Tool.Press && e.pointerId !== Tool.Press.PointerId)) return;
            Tool.Shift  =  e.shiftKey;
            PainterlyNPR__MoveTool__Follow(e.clientX, e.clientY);
            Tool.Hot  =  Tool.Shift && !Tool.Press ? PainterlyNPR__MoveTool__ArrowAt(e.clientX, e.clientY) : null;
        }, { passive: true });

        window.addEventListener('pointerdown', (e) => {
            if (!Tool.Uid || e.button !== 0) return;
            const sheet  =  $('#PainterlyNPR__App__Sheet');
            if (e.target !== Ui.Canvas && e.target !== sheet) return;         // <-- A point's handle, a button, a wrapper's own grips: theirs
            if (!PainterlyNPR__MoveTool__OnDrawing(e.clientX, e.clientY)) return;
            e.preventDefault();                                               // <-- The navigation leaves a handled press alone: no orbit, no tap
            Tool.Pointer  =  { X: e.clientX, Y: e.clientY, Shift: e.shiftKey };
            Tool.Shift    =  e.shiftKey;
            const arrow   =  Tool.Shift ? PainterlyNPR__MoveTool__ArrowAt(e.clientX, e.clientY) : null;
            Tool.Press    =  { PointerId: e.pointerId, Axis: arrow };
            if (PainterlyNPR__MoveTool__Wanted() !== Tool.Mode.Axis) PainterlyNPR__MoveTool__Rebase(PainterlyNPR__MoveTool__Wanted());
            else if (!Tool.Mode.Grab) PainterlyNPR__MoveTool__Grab(e.clientX, e.clientY);   // <-- A finger has no hover: the carry starts at the press
            if (Ui.Root) Ui.Root.classList.add('PainterlyNPR--carryingAsset');
        }, true);

        window.addEventListener('pointerup', (e) => {
            if (!Tool.Uid || !Tool.Press || e.pointerId !== Tool.Press.PointerId) return;
            PainterlyNPR__MoveTool__Follow(e.clientX, e.clientY);
            PainterlyNPR__MoveTool__Commit();                                 // <-- A click, or a drag let go: it is set down
        });
        window.addEventListener('pointercancel', (e) => {
            if (!Tool.Press || e.pointerId !== Tool.Press.PointerId) return;
            Tool.Press  =  null;
            if (Ui.Root) Ui.Root.classList.remove('PainterlyNPR--carryingAsset');
        });

        window.addEventListener('keydown', (e) => {
            if (!Tool.Uid || typing()) return;
            if (e.key === 'Shift') {                                          // <-- The gimbal shows at once, before the pointer moves
                Tool.Shift  =  true;
                if (Tool.Pointer) { Tool.Pointer.Shift = true; PainterlyNPR__MoveTool__Follow(Tool.Pointer.X, Tool.Pointer.Y); }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();                                          // <-- Esc ends the move only: the selection stays
                const placement  =  State.Assets.find(p => p.Uid === Tool.Uid);
                PainterlyNPR__MoveTool__Stop(placement ? `${placement.Name} (${placement.Uid}) left where it was.` : 'Move cancelled.');
                return;
            }
            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); PainterlyNPR__MoveTool__Commit(); }
        }, true);
        window.addEventListener('keyup', (e) => {
            if (e.key !== 'Shift' || !Tool.Uid) return;
            Tool.Shift  =  false;
            if (Tool.Pointer) { Tool.Pointer.Shift = false; PainterlyNPR__MoveTool__Follow(Tool.Pointer.X, Tool.Pointer.Y); }
            Tool.Hot  =  null;
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
        PainterlyNPR__MoveTool__Active,
        PainterlyNPR__MoveTool__Commit,
        PainterlyNPR__MoveTool__Start,
        PainterlyNPR__MoveTool__Stop,
        PainterlyNPR__MoveTool__Toggle,
        PainterlyNPR__MoveTool__Wire,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
