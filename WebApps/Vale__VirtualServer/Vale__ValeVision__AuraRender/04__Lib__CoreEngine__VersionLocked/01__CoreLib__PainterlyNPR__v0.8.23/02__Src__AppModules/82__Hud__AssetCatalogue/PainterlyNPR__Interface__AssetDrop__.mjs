/* =============================================================================
   PAINTERLYNPR - INTERFACE | ASSET DROP
   =============================================================================

   FILE       : PainterlyNPR__Interface__AssetDrop__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Interface - AssetDrop
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Drag a card from the Assets drawer onto the sheet - or click it,
                then click the sheet - and the asset lands on the ground under
                the pointer, its footprint and height shown before it is let go
   CREATED    : 30-Oct-2026 (v0.6.0)

   DESCRIPTION:
   - Pointer events, not the browser's drag and drop: they work for a mouse, a
     pen and a finger alike, and a real pointer can drive them in a test. No
     pointer capture: the sheet's own hover keeps reading what lies under it.
   - Where it lands: the camera's ray through the pointer, met with the ground
     (y = 0). An elevation looks along the ground, so there the truth buffers'
     surface under the pointer is set down onto the ground instead.
   - A click arms a placement, as an art direction point is placed: the next
     press on the sheet places it, before the sheet can take it for an orbit.
   - The drawer decides what a drop does (OnPlace, OnMove); this module only
     says where.

   ============================================================================= */

import CatalogueConfig from './Na__AssetCatalogue__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__AssetLibrary__Catalogue as Catalogue } from '../16__Scene__AssetLibrary/PainterlyNPR__AssetLibrary__Catalogue__.mjs';
import { PainterlyNPR__GpuResources__Cpu as Cpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
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

// =============================================================================
// REGION | Interface - Asset Drop
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__AssetCatalogue__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const DRAG  =  PainterlyNPR__ConfigAccess__Section(CatalogueConfig, 'PainterlyNPR__AssetCatalogue__Config', 'Drag', ['ThresholdPx', 'GhostPx', 'FootprintSides', 'FootprintMinM']);
    // ------------------------------------------------------------


    // MODULE STATE | The Drag or the Armed Placement Under Way
    // ------------------------------------------------------------
    // Press: a card pressed, not yet moved far enough to be a drag. Drag: the
    // asset following the pointer. Armed: { AssetId } or { Move: uid } waiting
    // for a press on the sheet.
    const Drop  =  { Press: null, Drag: null, Armed: null, Ghost: null, Marker: null, Hooks: null };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Where It Lands
// -----------------------------------------------------------------------------

    // FUNCTION | The Ground Under a Pointer - world metres, or null off the sheet
    // ------------------------------------------------------------
    function PainterlyNPR__AssetDrop__GroundAt(clientX, clientY) {
        if (!Ui.Canvas || !Camera) return null;
        const rect  =  Ui.Canvas.getBoundingClientRect();
        if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
        const x  =  ((clientX - rect.left) / rect.width) * Camera.Width;
        const y  =  (1 - (clientY - rect.top) / rect.height) * Camera.Height;
        const a  =  PainterlyNPR__CameraRig__Unproject(x, y, 1);
        const b  =  PainterlyNPR__CameraRig__Unproject(x, y, 2);
        const dy =  b[1] - a[1];
        if (dy < -1e-4) {
            const t  =  -a[1] / dy;                                           // <-- Along the ray to y = 0, in steps of one metre of view depth
            if (t > 0 && t < 1500) return [a[0] + (b[0] - a[0]) * t, 0, a[2] + (b[2] - a[2]) * t];
        }
        const i      =  Cpu.Valid ? PainterlyNPR__GeometryBuffers__Index(x, y) : -1;
        const depth  =  i >= 0 && Cpu.Geo[i] < 1000 ? Cpu.Geo[i] : State.Camera.Distance;   // <-- An elevation: the surface under the pointer, or the camera's subject
        const w      =  PainterlyNPR__CameraRig__Unproject(x, y, depth);
        return [w[0], 0, w[2]];
    }
    // ------------------------------------------------------------


    // FUNCTION | The Drop Marker - the asset's footprint on the ground, and its height
    // ------------------------------------------------------------
    // An outline drawn over the sheet in its own pixels: the ring the asset will
    // cover, and a line up to its height, so a tree and a lavender are told apart
    // before either is let go.
    function PainterlyNPR__AssetDrop__ShowMarker(asset, ground) {
        const sheet  =  $('#PainterlyNPR__App__Sheet');
        if (!sheet || !Camera) return;
        if (!Drop.Marker) {
            Drop.Marker  =  document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            Drop.Marker.setAttribute('class', 'PainterlyNPR__AssetDrop__Marker');
            Drop.Marker.setAttribute('preserveAspectRatio', 'none');
            Drop.Marker.innerHTML  =  '<polygon class="PainterlyNPR__AssetDrop__Ring"/><line class="PainterlyNPR__AssetDrop__Height"/><circle class="PainterlyNPR__AssetDrop__Foot" r="5"/>';
            sheet.appendChild(Drop.Marker);
        }
        if (!ground) { Drop.Marker.style.display = 'none'; return; }
        const W = Camera.Width, H = Camera.Height;
        Drop.Marker.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const geometry  =  (asset && asset.Geometry) || {};
        const radius    =  Math.max(DRAG.FootprintMinM, (geometry.NominalSpreadM || 1) / 2);
        const height    =  geometry.NominalHeightM || 1;
        const points    =  [];
        for (let k = 0; k < DRAG.FootprintSides; k++) {
            const a  =  (k / DRAG.FootprintSides) * Math.PI * 2;
            const p  =  PainterlyNPR__CameraRig__Project([ground[0] + Math.cos(a) * radius, ground[1], ground[2] + Math.sin(a) * radius]);
            points.push(`${p.X.toFixed(1)},${(H - p.Y).toFixed(1)}`);
        }
        const foot  =  PainterlyNPR__CameraRig__Project(ground);
        const top   =  PainterlyNPR__CameraRig__Project([ground[0], ground[1] + height, ground[2]]);
        Drop.Marker.querySelector('polygon').setAttribute('points', points.join(' '));
        Object.entries({ x1: foot.X, y1: H - foot.Y, x2: top.X, y2: H - top.Y }).forEach(([k, v]) => Drop.Marker.querySelector('line').setAttribute(k, v.toFixed(1)));
        Drop.Marker.querySelector('circle').setAttribute('cx', foot.X.toFixed(1));
        Drop.Marker.querySelector('circle').setAttribute('cy', (H - foot.Y).toFixed(1));
        Drop.Marker.style.display  =  '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Dragging a Card
// -----------------------------------------------------------------------------

    // FUNCTION | The Ghost - the card's picture following the pointer
    // ------------------------------------------------------------
    function PainterlyNPR__AssetDrop__Ghost(card, x, y) {
        if (!Drop.Ghost) {
            Drop.Ghost  =  document.createElement('div');
            Drop.Ghost.className  =  'PainterlyNPR__AssetDrop__Ghost';
            const thumb  =  card.querySelector('.PainterlyNPR__AssetCard__Thumb');
            if (thumb) Drop.Ghost.appendChild(thumb.cloneNode(true));
            const name  =  document.createElement('span');
            name.textContent  =  card.dataset.assetName || card.dataset.assetId;
            Drop.Ghost.appendChild(name);
            Drop.Ghost.style.width  =  DRAG.GhostPx + 'px';
            document.body.appendChild(Drop.Ghost);
        }
        Drop.Ghost.style.transform  =  `translate(${x - DRAG.GhostPx / 2}px, ${y - DRAG.GhostPx / 2}px)`;
    }
    // ------------------------------------------------------------


    // FUNCTION | End a Drag or a Placement - the ghost, the marker and the cursor go
    // ------------------------------------------------------------
    function PainterlyNPR__AssetDrop__Clear() {
        if (Drop.Ghost) { Drop.Ghost.remove(); Drop.Ghost = null; }
        if (Drop.Marker) Drop.Marker.style.display = 'none';
        Drop.Press  =  null;
        Drop.Drag   =  null;
        Drop.Armed  =  null;
        if (Ui.Root) Ui.Root.classList.remove('PainterlyNPR--placingAsset', 'PainterlyNPR--draggingAsset');
    }
    // ------------------------------------------------------------


    // FUNCTION | Arm a Placement - the next press on the sheet places the asset (or moves a plop)
    // ------------------------------------------------------------
    function PainterlyNPR__AssetDrop__Arm(what) {
        PainterlyNPR__AssetDrop__Clear();
        Drop.Armed  =  what;
        Ui.Root.classList.add('PainterlyNPR--placingAsset');
        const asset  =  what.AssetId ? Catalogue.ById.get(what.AssetId) : null;
        PainterlyNPR__Interface__Status(asset ? `Click the sheet to place ${asset.Identity.DisplayName}. Esc cancels.` : `Click the sheet where ${what.Move} should stand. Esc cancels.`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire the Drawer's Cards and the Sheet
    // ------------------------------------------------------------
    // hooks: OnPlace(assetId, ground) and OnMove(uid, ground), from the drawer.
    function PainterlyNPR__AssetDrop__Wire(grid, hooks) {
        Drop.Hooks  =  hooks;
        const sheet  =  $('#PainterlyNPR__App__Sheet');

        grid.addEventListener('pointerdown', (e) => {
            const card  =  e.target.closest('[data-asset-id]');
            if (!card || e.button !== 0) return;
            e.preventDefault();                                               // <-- No text selection or image drag while the card is carried
            Drop.Press  =  { Card: card, AssetId: card.dataset.assetId, X: e.clientX, Y: e.clientY, Pointer: e.pointerId };
        });
        window.addEventListener('pointermove', (e) => {
            if (Drop.Press && !Drop.Drag && e.pointerId === Drop.Press.Pointer && Math.hypot(e.clientX - Drop.Press.X, e.clientY - Drop.Press.Y) >= DRAG.ThresholdPx) {
                Drop.Drag  =  { AssetId: Drop.Press.AssetId, Card: Drop.Press.Card };
                Ui.Root.classList.add('PainterlyNPR--draggingAsset');
            }
            if (Drop.Drag) {
                PainterlyNPR__AssetDrop__Ghost(Drop.Drag.Card, e.clientX, e.clientY);
                PainterlyNPR__AssetDrop__ShowMarker(Catalogue.ById.get(Drop.Drag.AssetId), PainterlyNPR__AssetDrop__GroundAt(e.clientX, e.clientY));
            } else if (Drop.Armed) {
                const id  =  Drop.Armed.AssetId || ((State.Assets.find(p => p.Uid === Drop.Armed.Move) || {}).AssetId);
                PainterlyNPR__AssetDrop__ShowMarker(Catalogue.ById.get(id), PainterlyNPR__AssetDrop__GroundAt(e.clientX, e.clientY));
            }
        });
        window.addEventListener('pointerup', (e) => {
            if (Drop.Drag) {
                const ground  =  PainterlyNPR__AssetDrop__GroundAt(e.clientX, e.clientY);
                const id      =  Drop.Drag.AssetId;
                PainterlyNPR__AssetDrop__Clear();
                if (ground) Drop.Hooks.OnPlace(id, ground);
                else PainterlyNPR__Interface__Status('Dropped off the sheet: nothing placed.');
                return;
            }
            if (Drop.Press && e.pointerId === Drop.Press.Pointer) {
                const id  =  Drop.Press.AssetId;
                Drop.Press  =  null;
                PainterlyNPR__AssetDrop__Arm({ AssetId: id });               // <-- A click: armed, as an art direction point is placed
            }
        });
        window.addEventListener('pointercancel', () => { if (Drop.Press || Drop.Drag) PainterlyNPR__AssetDrop__Clear(); });

        // An armed placement takes the press before the sheet can begin an orbit
        if (sheet) sheet.addEventListener('pointerdown', (e) => {
            if (!Drop.Armed || e.button !== 0) return;
            const ground  =  PainterlyNPR__AssetDrop__GroundAt(e.clientX, e.clientY);
            if (!ground) return;
            e.stopImmediatePropagation();
            e.preventDefault();
            const armed  =  Drop.Armed;
            PainterlyNPR__AssetDrop__Clear();
            if (armed.Move) Drop.Hooks.OnMove(armed.Move, ground);
            else Drop.Hooks.OnPlace(armed.AssetId, ground);
        }, true);
        if (sheet) sheet.addEventListener('pointerleave', () => { if (Drop.Marker && !Drop.Drag) Drop.Marker.style.display = 'none'; });

        window.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' || !(Drop.Armed || Drop.Drag || Drop.Press)) return;
            e.preventDefault();
            PainterlyNPR__AssetDrop__Clear();
            PainterlyNPR__Interface__Status('Placement cancelled.');
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    // ShowMarker since v0.8.10: 83's Move Tool shows a carried plop by it.
    export {
        PainterlyNPR__AssetDrop__Arm,
        PainterlyNPR__AssetDrop__Clear,
        PainterlyNPR__AssetDrop__GroundAt,
        PainterlyNPR__AssetDrop__ShowMarker,
        PainterlyNPR__AssetDrop__Wire,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
