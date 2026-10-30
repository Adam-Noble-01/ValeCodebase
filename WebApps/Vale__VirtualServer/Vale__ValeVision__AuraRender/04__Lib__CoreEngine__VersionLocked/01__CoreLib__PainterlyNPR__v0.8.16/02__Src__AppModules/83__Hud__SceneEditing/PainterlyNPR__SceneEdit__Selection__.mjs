/* =============================================================================
   PAINTERLYNPR - HUD | SCENE EDITING - SELECTION
   =============================================================================

   FILE       : PainterlyNPR__SceneEdit__Selection__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - SceneEditing - Selection
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : What lies under the pointer (an object, its plop, the face), what
                is selected, and the outline that shows it over the sheet
   CREATED    : 30-Oct-2026 (v0.7.0)

   DESCRIPTION:
   - Adam, 30-Oct-2026: "the insert system is beautiful but create a select and
     context menu for delete / swap etc and other options".
   - A click on the sheet selects: a placed asset as a whole (its canopy and
     trunk are one plop), or one of the cottage's objects. It is held by key
     (the plop's Uid, the object's '#Id'), so it outlives every rebuild.
   - The outline is read from the truth buffers - the pixels whose object is
     the selection's - so only what can be seen is outlined, exactly. It goes
     while the camera moves (the buffers are being redrawn) and returns when
     they are read back (Cpu.Serial moves).
   - A hover outline, in terracotta, shows what a carried swatch or a click with
     the brush would be given to: an object, or one face of it.
   - Undo and redo are 84__System__UndoHistory's: it keeps the settings object,
     which holds every plop and every material given.

   ============================================================================= */

import EditConfig from './Na__SceneEditing__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Maths__V3Normalise  as  V3Normalise,
    PainterlyNPR__Maths__V3Sub        as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_CLASSES as MATERIAL_CLASSES } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import {
    PainterlyNPR__MaterialAssignment__Corners,
    PainterlyNPR__MaterialAssignment__ObjectKey,
    PainterlyNPR__MaterialAssignment__PickFace,
    PainterlyNPR__MaterialAssignment__ResolveObject,
    PainterlyNPR__MaterialAssignment__Triangles,
} from '../17__Scene__MaterialAssignment/PainterlyNPR__MaterialAssignment__Faces__.mjs';
import {
    PainterlyNPR__GpuResources__Cpu  as  Cpu,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__GeometryBuffers__Index } from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
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
import { PainterlyNPR__Interface__RenderPlacedAssets } from '../82__Hud__AssetCatalogue/PainterlyNPR__Interface__AssetDrawer__.mjs';

// =============================================================================
// REGION | Scene Editing - Selection
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__SceneEditing__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const HIGHLIGHT  =  PainterlyNPR__ConfigAccess__Section(EditConfig, 'PainterlyNPR__SceneEditing__Config', 'Highlight', ['Rgb', 'FillAlpha', 'EdgeAlpha', 'EdgePx', 'HoverRgb', 'HoverFillAlpha']);
    // ------------------------------------------------------------


    // MODULE STATE | The Selection, the Hover and Their Outline
    // ------------------------------------------------------------
    // Selected: { Kind: 'Plop', Uid } or { Kind: 'Object', Key }, or null.
    // Hover: { Ids, Face } drawn in terracotta. HoverAt: the pointer a hover was
    // last asked for, read once a frame. Drawn: the readback the outline was
    // drawn from (Cpu.Serial), -1 to draw again.
    const Edit  =  { Selected: null, Hover: null, HoverAt: null, HoverKey: '', Canvas: null, Context: null, Drawn: -1, Watching: false };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Picking - what lies under the pointer
// -----------------------------------------------------------------------------

    // FUNCTION | Pick - the object under a point of the page, from the truth buffers
    // ------------------------------------------------------------
    // Returns null off the sheet or before the truth is read back; { Sky: true }
    // over the sky; else the object, its key, its plop's Uid (or null), the class
    // drawn at the pixel, whether it is a plant (a plant's face is the plant), the
    // point in the world and the ray through it - started just short of it, so a
    // face pick meets it first.
    function PainterlyNPR__SceneEdit__PickAt(clientX, clientY) {
        if (!Ui.Canvas || !Camera || !Cpu.Valid || !Scene) return null;
        const rect  =  Ui.Canvas.getBoundingClientRect();
        if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
        const x  =  ((clientX - rect.left) / rect.width) * Camera.Width;
        const y  =  (1 - (clientY - rect.top) / rect.height) * Camera.Height;
        const i  =  PainterlyNPR__GeometryBuffers__Index(x, y);
        if (i < 0) return null;
        const object  =  Scene.ObjectById.get(Math.round(Cpu.Geo[i + 1]));
        if (!object) return { Sky: true, X: x, Y: y };
        const depth  =  Cpu.Geo[i];
        const near   =  PainterlyNPR__CameraRig__Unproject(x, y, Math.max(0.05, depth - 0.5));
        const far    =  PainterlyNPR__CameraRig__Unproject(x, y, depth + 0.5);
        return {
            Sky      :  false,
            X        :  x,
            Y        :  y,
            Object   :  object,
            Key      :  PainterlyNPR__MaterialAssignment__ObjectKey(object),
            Uid      :  object.Uid || null,
            Class    :  Math.round(Cpu.Geo[i + 2]),                           // <-- The class this pixel is drawn in: a face given its own reads here, not on the object
            Organic  :  Scene.Organics.some(o => o.ObjectId === object.Id),
            Point    :  PainterlyNPR__CameraRig__Unproject(x, y, depth),
            Origin   :  near,
            Dir      :  V3Normalise(V3Sub(far, near)),
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | What a Material Would Be Given To - the object, or one face of it
    // ------------------------------------------------------------
    // A plant's face is the plant (its masses are smooth); so is any face the ray
    // cannot find. Returns { Object: key, Face: place or null, Triangles }.
    function PainterlyNPR__SceneEdit__TargetOf(pick, mode) {
        if (!pick || pick.Sky) return null;
        if (mode === 'Face' && !pick.Organic) {
            const face  =  PainterlyNPR__MaterialAssignment__PickFace(Scene, pick.Object.Id, pick.Origin, pick.Dir);
            if (face) return { Object: pick.Key, Face: face.Local, Triangles: face.Triangles, Flat: face.Flat };
        }
        return { Object: pick.Key, Face: null, Triangles: null };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Objects a Selection Is - a plop's every part, or the one object
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__IdsOf(selection) {
        if (!selection || !Scene) return [];
        if (selection.Kind === 'Plop') return Scene.Objects.filter(o => o.Uid === selection.Uid).map(o => o.Id);
        const object  =  PainterlyNPR__MaterialAssignment__ResolveObject(Scene, selection.Key);
        return object ? [object.Id] : [];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Selection
// -----------------------------------------------------------------------------

    // FUNCTION | Select - a plop, an object, or nothing (null)
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__Select(selection, quiet) {
        Edit.Selected  =  selection || null;
        Edit.Drawn     =  -1;
        PainterlyNPR__Interface__RenderPlacedAssets();                        // <-- The plop's row in the drawer is marked
        PainterlyNPR__SceneEdit__Watch();
        if (!quiet) PainterlyNPR__Interface__Status(PainterlyNPR__SceneEdit__Describe(Edit.Selected));
    }

    function PainterlyNPR__SceneEdit__SelectPlop(uid) {
        PainterlyNPR__SceneEdit__Select(uid ? { Kind: 'Plop', Uid: uid } : null);
    }

    function PainterlyNPR__SceneEdit__SelectPick(pick, quiet) {
        if (!pick || pick.Sky) { PainterlyNPR__SceneEdit__Select(null, quiet); return; }
        PainterlyNPR__SceneEdit__Select(pick.Uid ? { Kind: 'Plop', Uid: pick.Uid } : { Kind: 'Object', Key: pick.Key }, quiet);
    }

    function PainterlyNPR__SceneEdit__Selected() {
        return Edit.Selected;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Sheet Open to Editing? - only while the asset library is out (v0.8.8)
    // ------------------------------------------------------------
    // The drawer marks the root (82, SetAssetDrawer), the app's or a wrapper's:
    // so a stray click while drawing never selects or highlights anything. Here
    // since v0.8.10, so the Move Tool reads it too; Actions still exports it.
    function PainterlyNPR__SceneEdit__Editing() {
        return !!(Ui.Root && Ui.Root.classList.contains('PainterlyNPR--assetsOpen'));
    }
    // ------------------------------------------------------------


    // FUNCTION | A Selection in Words - for the status line and the menu's title
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__Describe(selection) {
        if (!selection) return 'Nothing selected.';
        if (selection.Kind === 'Plop') {
            const placement  =  State.Assets.find(p => p.Uid === selection.Uid);
            return placement ? `${placement.Name} (${placement.Uid}) selected: right-click for its menu, Delete takes it out, Ctrl + D copies it.` : 'Nothing selected.';
        }
        const object  =  Scene ? PainterlyNPR__MaterialAssignment__ResolveObject(Scene, selection.Key) : null;
        return object ? `${object.Name} selected (${MATERIAL_CLASSES[object.MaterialId].Label.toLowerCase()}): right-click to give it or one of its faces a material.` : 'Nothing selected.';
    }
    // ------------------------------------------------------------


    // FUNCTION | The Scene Was Rebuilt - the selection checked, its outline drawn afresh
    // ------------------------------------------------------------
    // Called by the drawer's AssetsChanged (82) after every rebuild, whatever made
    // it: a plop taken out takes its selection with it.
    function PainterlyNPR__SceneEdit__Changed() {
        if (Edit.Selected && !PainterlyNPR__SceneEdit__IdsOf(Edit.Selected).length) Edit.Selected = null;
        Edit.Hover     =  null;
        Edit.HoverKey  =  '';
        Edit.Drawn     =  -1;
        PainterlyNPR__SceneEdit__Watch();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Outline Over the Sheet
// -----------------------------------------------------------------------------

    // FUNCTION | The Outline's Canvas - over the sheet, in the sheet's own pixels
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__Canvas() {
        if (Edit.Canvas) return Edit.Canvas;
        const sheet  =  $('#PainterlyNPR__App__Sheet');
        if (!sheet) return null;
        Edit.Canvas  =  document.createElement('canvas');
        Edit.Canvas.className  =  'PainterlyNPR__SceneEdit__Highlight';
        Edit.Canvas.setAttribute('aria-hidden', 'true');
        sheet.insertBefore(Edit.Canvas, Ui.Canvas ? Ui.Canvas.nextSibling : sheet.firstChild);   // <-- Straight over the drawing, under the point handles and the badges
        Edit.Context  =  Edit.Canvas.getContext('2d');
        return Edit.Canvas;
    }
    // ------------------------------------------------------------


    // FUNCTION | Where Some Triangles Fall on the Sheet - a box in its pixels
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__ScreenBox(triangles, W, H) {
        const V  =  Scene.Vertices;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const t of triangles) {
            for (const p of PainterlyNPR__MaterialAssignment__Corners(V, t)) {
                const q  =  PainterlyNPR__CameraRig__Project(p);
                if (!(q.Depth > 0)) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; continue; }   // <-- Behind the camera: the whole sheet, the truth decides
                if (q.X < x0) x0 = q.X; if (q.X > x1) x1 = q.X;
                if (q.Y < y0) y0 = q.Y; if (q.Y > y1) y1 = q.Y;
            }
        }
        const pad  =  HIGHLIGHT.EdgePx + 2;
        return { X0: Math.max(0, Math.floor(x0) - pad), Y0: Math.max(0, Math.floor(y0) - pad), X1: Math.min(W - 1, Math.ceil(x1) + pad), Y1: Math.min(H - 1, Math.ceil(y1) + pad) };
    }
    // ------------------------------------------------------------


    // FUNCTION | Paint One Outline - a tint over what is seen of it, a line round it
    // ------------------------------------------------------------
    // ids: its objects. face: scene triangles to keep it to, or null. The mask is
    // the truth's object channel inside the box; a face is first drawn into the
    // box and the mask kept to it.
    function PainterlyNPR__SceneEdit__Paint(g, ids, face, rgb, fill, W, H) {
        if (!ids.length) return;
        const byObject  =  PainterlyNPR__MaterialAssignment__Triangles(Scene);
        const tris      =  face || ids.flatMap(id => byObject.get(id) || []);
        if (!tris.length) return;
        const box  =  PainterlyNPR__SceneEdit__ScreenBox(tris, W, H);
        const bw   =  box.X1 - box.X0 + 1, bh = box.Y1 - box.Y0 + 1;
        if (bw <= 0 || bh <= 0) return;
        const top    =  Math.max(0, ...ids) + 1;
        const want   =  new Uint8Array(top + 1);
        for (const id of ids) want[id] = 1;
        let onFace  =  null;
        if (face) {
            const off  =  document.createElement('canvas');
            off.width = bw; off.height = bh;
            const o  =  off.getContext('2d');
            o.fillStyle  =  '#000';
            o.beginPath();
            const V  =  Scene.Vertices;
            for (const t of face) {
                const c  =  PainterlyNPR__MaterialAssignment__Corners(V, t).map(p => PainterlyNPR__CameraRig__Project(p));
                o.moveTo(c[0].X - box.X0, (H - 1 - c[0].Y) - (H - 1 - box.Y1));
                o.lineTo(c[1].X - box.X0, (H - 1 - c[1].Y) - (H - 1 - box.Y1));
                o.lineTo(c[2].X - box.X0, (H - 1 - c[2].Y) - (H - 1 - box.Y1));
                o.closePath();
            }
            o.fill();
            onFace  =  o.getImageData(0, 0, bw, bh).data;
        }
        const mask  =  new Uint8Array(bw * bh);                               // <-- Rows top down, as the picture's
        for (let r = 0; r < bh; r++) {
            const gy  =  box.Y1 - r;                                          // <-- The truth's rows run bottom up
            for (let c = 0; c < bw; c++) {
                const id  =  Math.round(Cpu.Geo[(gy * W + box.X0 + c) * 4 + 1]);
                if (id > 0 && id <= top && want[id] && (!onFace || onFace[(r * bw + c) * 4 + 3] > 0)) mask[r * bw + c] = 1;
            }
        }
        const image  =  new ImageData(bw, bh);
        const px     =  image.data;
        const e      =  HIGHLIGHT.EdgePx;
        const inside =  (r, c) => r >= 0 && c >= 0 && r < bh && c < bw && mask[r * bw + c] === 1;
        for (let r = 0; r < bh; r++) {
            for (let c = 0; c < bw; c++) {
                if (!mask[r * bw + c]) continue;
                let edge  =  false;
                for (let k = 1; k <= e && !edge; k++) edge = !inside(r - k, c) || !inside(r + k, c) || !inside(r, c - k) || !inside(r, c + k);
                const o  =  (r * bw + c) * 4;
                px[o] = rgb[0]; px[o + 1] = rgb[1]; px[o + 2] = rgb[2];
                px[o + 3]  =  Math.round((edge ? HIGHLIGHT.EdgeAlpha : fill) * 255);
            }
        }
        const layer  =  document.createElement('canvas');
        layer.width = bw; layer.height = bh;
        layer.getContext('2d').putImageData(image, 0, 0);
        g.drawImage(layer, box.X0, H - 1 - box.Y1);                           // <-- Drawn, not put: the hover lies over the selection
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw Both Outlines Afresh - the selection's, then the hover's
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__Draw() {
        const canvas  =  PainterlyNPR__SceneEdit__Canvas();
        if (!canvas) return;
        const W = Gpu.Width, H = Gpu.Height;
        if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
        const g  =  Edit.Context;
        g.clearRect(0, 0, W, H);
        const any  =  !!(Edit.Selected || Edit.Hover);
        canvas.style.display  =  any && Cpu.Valid ? '' : 'none';
        Edit.Drawn  =  Cpu.Valid ? (Cpu.Serial || 0) : -1;
        if (!any || !Cpu.Valid || !Scene) return;
        if (Edit.Selected) PainterlyNPR__SceneEdit__Paint(g, PainterlyNPR__SceneEdit__IdsOf(Edit.Selected), null, HIGHLIGHT.Rgb, HIGHLIGHT.FillAlpha, W, H);
        if (Edit.Hover) PainterlyNPR__SceneEdit__Paint(g, Edit.Hover.Ids, Edit.Hover.Face, HIGHLIGHT.HoverRgb, HIGHLIGHT.HoverFillAlpha, W, H);
    }
    // ------------------------------------------------------------


    // FUNCTION | Watch the Readback - a frame loop while anything is outlined
    // ------------------------------------------------------------
    // While the camera moves the buffers are being redrawn (Cpu.Valid false):
    // the outline goes. When they are read back again it is drawn from them.
    // A hover asked for is worked out here, once a frame however fast the
    // pointer moves.
    function PainterlyNPR__SceneEdit__Watch() {
        if (Edit.Watching) return;
        Edit.Watching  =  true;
        const tick  =  () => {
            if (Edit.HoverAt) PainterlyNPR__SceneEdit__TakeHover();
            if (!Edit.Selected && !Edit.Hover && !Edit.HoverAt) { Edit.Watching = false; PainterlyNPR__SceneEdit__Draw(); return; }
            if (!Cpu.Valid) { if (Edit.Canvas) Edit.Canvas.style.display = 'none'; Edit.Drawn = -1; }
            else if (Edit.Drawn !== (Cpu.Serial || 0)) PainterlyNPR__SceneEdit__Draw();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Hover - what a carried swatch would be given to
// -----------------------------------------------------------------------------

    // FUNCTION | Ask for a Hover Outline at a Pointer ({ X, Y, Mode }), or None (null)
    // ------------------------------------------------------------
    function PainterlyNPR__SceneEdit__ShowHover(at) {
        Edit.HoverAt  =  at || null;
        if (!at && Edit.Hover) { Edit.Hover = null; Edit.HoverKey = ''; Edit.Drawn = -1; }
        PainterlyNPR__SceneEdit__Watch();
    }

    function PainterlyNPR__SceneEdit__TakeHover() {
        const at  =  Edit.HoverAt;
        Edit.HoverAt  =  null;
        const target  =  PainterlyNPR__SceneEdit__TargetOf(PainterlyNPR__SceneEdit__PickAt(at.X, at.Y), at.Mode);
        const key     =  target ? `${target.Object}/${target.Face}` : '';
        if (key === Edit.HoverKey) return;                                    // <-- Still over the same object or face: nothing to draw
        Edit.HoverKey  =  key;
        const object   =  target ? PainterlyNPR__MaterialAssignment__ResolveObject(Scene, target.Object) : null;
        Edit.Hover     =  object ? { Ids: [object.Id], Face: target.Triangles } : null;
        Edit.Drawn     =  -1;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__SceneEdit__Changed,
        PainterlyNPR__SceneEdit__Describe,
        PainterlyNPR__SceneEdit__Editing,
        PainterlyNPR__SceneEdit__IdsOf,
        PainterlyNPR__SceneEdit__PickAt,
        PainterlyNPR__SceneEdit__Select,
        PainterlyNPR__SceneEdit__Selected,
        PainterlyNPR__SceneEdit__SelectPick,
        PainterlyNPR__SceneEdit__SelectPlop,
        PainterlyNPR__SceneEdit__ShowHover,
        PainterlyNPR__SceneEdit__TargetOf,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
