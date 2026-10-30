/* =============================================================================
   PAINTERLYNPR - INTERFACE | MATERIAL TAB
   =============================================================================

   FILE       : PainterlyNPR__Interface__MaterialTab__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Interface - MaterialTab
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The Assets drawer's Materials tab: the material classes as
                swatches, searched and grouped, given to an object or one face
                of it - with a brush, by a drag onto the sheet - and the list of
                what this drawing has been given
   CREATED    : 30-Oct-2026 (v0.7.0)

   DESCRIPTION:
   - Adam, 30-Oct-2026: "make a new assets tab for materials and built a
     materials application system which can handle per object and per face
     material asignment".
   - Click a swatch and it is the brush: each click on the sheet gives its class
     to what is under the pointer - the whole object, or (Face) the one face, as
     SketchUp's paint bucket does; Shift flips it for one click; a drag of the
     sheet still orbits between clicks. Esc, or the swatch again, puts it down.
   - Drag a swatch onto the sheet and it is given where it is let go, what it
     will reach outlined as it is carried.
   - The picking, the giving and the undo are the scene editing's
     (83__Hud__SceneEditing); this module is the tab.

   ============================================================================= */

import CatalogueConfig from './Na__AssetCatalogue__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY as MATERIAL_BY_KEY } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import { PainterlyNPR__MaterialAssignment__PatternOf } from '../17__Scene__MaterialAssignment/PainterlyNPR__MaterialAssignment__Apply__.mjs';
import { PainterlyNPR__MaterialAssignment__ResolveObject } from '../17__Scene__MaterialAssignment/PainterlyNPR__MaterialAssignment__Faces__.mjs';
import {
    PainterlyNPR__MaterialAssignment__LoadLibrary,
    PainterlyNPR__MaterialAssignment__Search,
    PainterlyNPR__MaterialAssignment__SwatchUrl,
    PainterlyNPR__MaterialAssignment__MaterialLibrary  as  MaterialLibrary,
} from '../17__Scene__MaterialAssignment/PainterlyNPR__MaterialAssignment__Library__.mjs';
import {
    PainterlyNPR__Interface__Status,
    PainterlyNPR__Interface__Query     as  $,
    PainterlyNPR__Interface__QueryAll  as  $$,
    PainterlyNPR__Interface__Ui        as  Ui,
} from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import {
    PainterlyNPR__SceneEdit__ClearAllMaterials,
    PainterlyNPR__SceneEdit__GiveAt,
    PainterlyNPR__SceneEdit__RemoveAssignment,
    PainterlyNPR__SceneEdit__SelectAssignment,
} from '../83__Hud__SceneEditing/PainterlyNPR__SceneEdit__Actions__.mjs';
import { PainterlyNPR__SceneEdit__ShowHover } from '../83__Hud__SceneEditing/PainterlyNPR__SceneEdit__Selection__.mjs';
import { PainterlyNPR__AssetFactory__RunMaterials } from '../88__Export__AssetFactory/PainterlyNPR__AssetFactory__Run__.mjs';

// =============================================================================
// REGION | Interface - Material Tab
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__AssetCatalogue__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const MATERIALS  =  PainterlyNPR__ConfigAccess__Section(CatalogueConfig, 'PainterlyNPR__AssetCatalogue__Config', 'Materials', ['SearchHint', 'Empty', 'Mode', 'NoSwatch']);
    const DRAG       =  PainterlyNPR__ConfigAccess__Section(CatalogueConfig, 'PainterlyNPR__AssetCatalogue__Config', 'Drag', ['ThresholdPx', 'GhostPx']);
    // ------------------------------------------------------------


    // MODULE STATE | The Tab
    // ------------------------------------------------------------
    // Brush: the class clicks on the sheet give, or null. Press and Drag: a
    // swatch pressed, then carried. Hooks: the drawer's shared picture choice.
    const Tab  =  { Root: null, Query: '', Group: '', Mode: MATERIALS.Mode, Brush: null, Press: null, Drag: null, Ghost: null, Hooks: null };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building the Tab
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Tab Into Its Pane, and Wire It
    // ------------------------------------------------------------
    // hooks: Thumbs() and SetThumbs(slot) - the drawer's one choice of pictures,
    // shared by both tabs - and Count(text), the drawer's count while this tab shows;
    // Factory false (a wrapper's, v0.8.2) leaves the factory's buttons out.
    function PainterlyNPR__Interface__BuildMaterialTab(pane, hooks) {
        Tab.Root   =  pane;
        Tab.Hooks  =  hooks;
        const factory  =  hooks.Factory === false ? '' : `
            <section class="PainterlyNPR__Group PainterlyNPR__AssetDrawer__Section">
                <h3 class="PainterlyNPR__Group__Title">Swatches</h3>
                <p class="PainterlyNPR__Hint">The factory draws each class on its sample (a block of wall, a slab of ground, a mound of planting, a log of bark) as proxy (PXY) and as pen and wash (RND), and writes them into 07__Data__MaterialRecipes. It needs the local server.</p>
                <div class="PainterlyNPR__ButtonRow">
                    <button type="button" class="PainterlyNPR__Button PainterlyNPR__Button--small" data-materials-factory="Missing">Render missing</button>
                    <button type="button" class="PainterlyNPR__Button PainterlyNPR__Button--small" data-materials-factory="All">Render all</button>
                </div>
                <p class="PainterlyNPR__Readout" data-materials-factory-status></p>
            </section>`;
        pane.innerHTML  =  `
            <input type="search" class="PainterlyNPR__AssetDrawer__Search" data-materials-search placeholder="${MATERIALS.SearchHint}" aria-label="Search the materials">
            <div class="PainterlyNPR__ChipRow" data-materials-groups role="group" aria-label="Groups"></div>
            <div class="PainterlyNPR__AssetDrawer__Show" role="group" aria-label="Give to">
                <span>Give to</span>
                <button type="button" class="PainterlyNPR__Button PainterlyNPR__Button--small" data-materials-mode="Object" aria-pressed="true" title="A click gives the class to the whole object">Object</button>
                <button type="button" class="PainterlyNPR__Button PainterlyNPR__Button--small" data-materials-mode="Face" aria-pressed="false" title="A click gives the class to the one face under it, as SketchUp paints">Face</button>
            </div>
            <div class="PainterlyNPR__AssetDrawer__Show" role="group" aria-label="Pictures">
                <span>Show</span>
                <button type="button" class="PainterlyNPR__Button PainterlyNPR__Button--small" data-materials-thumbs="RND" aria-pressed="true">Rendered</button>
                <button type="button" class="PainterlyNPR__Button PainterlyNPR__Button--small" data-materials-thumbs="PXY" aria-pressed="false">Proxy</button>
            </div>
            <div class="PainterlyNPR__MaterialTab__Grid" data-materials-grid role="list" aria-label="Materials"></div>
            <section class="PainterlyNPR__Group PainterlyNPR__AssetDrawer__Section">
                <h3 class="PainterlyNPR__Group__Title">Given in this drawing <span data-materials-given-count></span></h3>
                <p class="PainterlyNPR__Hint">Click a swatch, then click the sheet: each click gives it to what is under the pointer (Shift for the other of object and face; a drag still orbits). Or drag a swatch onto the sheet. Esc puts the brush down. The courses follow: brick and tile lay theirs, anything else leaves them off.</p>
                <ol class="PainterlyNPR__AssetDrawer__Placed" data-materials-given></ol>
                <div class="PainterlyNPR__ButtonRow">
                    <button type="button" class="PainterlyNPR__Button PainterlyNPR__Button--small" data-materials-clear>Clear them all</button>
                </div>
            </section>${factory}`;

        $('[data-materials-search]', pane).addEventListener('input', (e) => { Tab.Query = e.target.value; PainterlyNPR__Interface__RenderMaterialCards(); });
        $('[data-materials-groups]', pane).addEventListener('click', (e) => {
            const chip  =  e.target.closest('[data-group]');
            if (!chip) return;
            Tab.Group  =  chip.dataset.group;
            PainterlyNPR__Interface__RenderMaterialGroups();
            PainterlyNPR__Interface__RenderMaterialCards();
        });
        for (const button of $$('[data-materials-mode]', pane)) button.addEventListener('click', () => PainterlyNPR__Interface__SetMaterialMode(button.dataset.materialsMode));
        for (const button of $$('[data-materials-thumbs]', pane)) button.addEventListener('click', () => { Tab.Hooks.SetThumbs(button.dataset.materialsThumbs); PainterlyNPR__Interface__RenderMaterialCards(); });
        $('[data-materials-given]', pane).addEventListener('click', (e) => {
            const row  =  e.target.closest('[data-assignment-uid]');
            if (!row) return;
            if (e.target.closest('[data-given-action="Remove"]')) PainterlyNPR__SceneEdit__RemoveAssignment(row.dataset.assignmentUid);
            else PainterlyNPR__SceneEdit__SelectAssignment(row.dataset.assignmentUid);
        });
        $('[data-materials-clear]', pane).addEventListener('click', () => PainterlyNPR__SceneEdit__ClearAllMaterials());
        for (const button of $$('[data-materials-factory]', pane)) button.addEventListener('click', () => PainterlyNPR__Interface__RunMaterialFactory(button.dataset.materialsFactory));
        PainterlyNPR__Interface__WireMaterialDrag($('[data-materials-grid]', pane));
        PainterlyNPR__Interface__SetMaterialMode(Tab.Mode);
    }
    // ------------------------------------------------------------


    // FUNCTION | Show the Tab - the library read the first time
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__ShowMaterialTab() {
        if (!Tab.Root) return;
        if (!MaterialLibrary.Loaded) {
            $('[data-materials-grid]', Tab.Root).textContent  =  'Reading the materials …';
            PainterlyNPR__MaterialAssignment__LoadLibrary().then(() => PainterlyNPR__Interface__RenderMaterialTab());
        }
        PainterlyNPR__Interface__RenderMaterialTab();
    }
    // ------------------------------------------------------------


    // FUNCTION | Object or Face - what a click with the brush gives the class to
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__SetMaterialMode(mode) {
        Tab.Mode  =  mode === 'Face' ? 'Face' : 'Object';
        if (!Tab.Root) return;
        for (const button of $$('[data-materials-mode]', Tab.Root)) {
            const on  =  button.dataset.materialsMode === Tab.Mode;
            button.setAttribute('aria-pressed', String(on));
            button.classList.toggle('PainterlyNPR__Button--active', on);
        }
        if (Tab.Brush) PainterlyNPR__Interface__SetMaterialBrush(Tab.Brush);   // <-- The brush's words say what it now reaches
    }

    function PainterlyNPR__Interface__MaterialMode() {
        return Tab.Mode;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Swatches
// -----------------------------------------------------------------------------

    // FUNCTION | Everything the Tab Shows
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__RenderMaterialTab() {
        PainterlyNPR__Interface__RenderMaterialGroups();
        PainterlyNPR__Interface__RenderMaterialCards();
        PainterlyNPR__Interface__RenderMaterialGiven();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Groups - a chip each, with how many classes it holds
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__RenderMaterialGroups() {
        if (!Tab.Root || !MaterialLibrary.Loaded) return;
        const chip  =  (value, label, active) => {
            const b  =  document.createElement('button');
            b.type  =  'button';
            b.className  =  'PainterlyNPR__Button PainterlyNPR__Chip' + (active ? ' PainterlyNPR__Button--active' : '');
            b.dataset.group  =  value;
            b.setAttribute('aria-pressed', String(active));
            b.textContent  =  label;
            return b;
        };
        $('[data-materials-groups]', Tab.Root).replaceChildren(chip('', `All ${MaterialLibrary.Materials.length}`, !Tab.Group),
            ...MaterialLibrary.Groups.filter(g => g.Count > 0).map(g => chip(g.Code, `${g.Label} ${g.Count}`, Tab.Group === g.Code)));
        Tab.Hooks.Count(`${MaterialLibrary.Materials.length} materials`);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Swatch Cards - what the search and the group leave
    // ------------------------------------------------------------
    // A card shows its swatch as drawn or as proxy; with none yet, the class's
    // own pigment, flat. The brush's card is marked.
    function PainterlyNPR__Interface__RenderMaterialCards() {
        if (!Tab.Root) return;
        const thumbs  =  Tab.Hooks.Thumbs();
        for (const button of $$('[data-materials-thumbs]', Tab.Root)) {
            const on  =  button.dataset.materialsThumbs === thumbs;
            button.setAttribute('aria-pressed', String(on));
            button.classList.toggle('PainterlyNPR__Button--active', on);
        }
        const grid  =  $('[data-materials-grid]', Tab.Root);
        if (MaterialLibrary.Error && !MaterialLibrary.Loaded) { grid.textContent = MaterialLibrary.Error; return; }
        if (!MaterialLibrary.Loaded) return;
        const found  =  PainterlyNPR__MaterialAssignment__Search(Tab.Query, Tab.Group);
        if (!found.length) { grid.textContent = MATERIALS.Empty; return; }
        grid.replaceChildren(...found.map(m => {
            const card  =  document.createElement('div');
            card.className  =  'PainterlyNPR__AssetCard PainterlyNPR__MaterialCard' + (Tab.Brush === m.Key ? ' PainterlyNPR__MaterialCard--brush' : '');
            card.setAttribute('role', 'listitem');
            card.dataset.materialKey  =  m.Key;
            card.title  =  `${m.Label}: ${m.Description} Click to paint with it, or drag it onto the sheet. Right-click for more.`;
            const thumb  =  document.createElement('div');
            thumb.className  =  'PainterlyNPR__AssetCard__Thumb PainterlyNPR__MaterialCard__Swatch';
            const url  =  PainterlyNPR__MaterialAssignment__SwatchUrl(m, thumbs) || PainterlyNPR__MaterialAssignment__SwatchUrl(m, thumbs === 'RND' ? 'PXY' : 'RND');
            if (url) {
                const img  =  document.createElement('img');
                img.src  =  url;
                img.alt  =  '';
                img.draggable  =  false;
                img.loading  =  'lazy';
                thumb.appendChild(img);
            } else {
                thumb.style.background  =  m.Pigment;
                thumb.title  =  MATERIALS.NoSwatch;
            }
            const name  =  document.createElement('div');
            name.className  =  'PainterlyNPR__AssetCard__Name';
            name.textContent  =  m.Label;
            const meta  =  document.createElement('div');
            meta.className  =  'PainterlyNPR__AssetCard__Meta';
            const pattern  =  PainterlyNPR__MaterialAssignment__PatternOf(m.Key);
            meta.textContent  =  pattern ? `${m.Key} · courses` : m.Key;
            card.append(thumb, name, meta);
            return card;
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | The Given List - every assignment in this drawing, in the order made
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__RenderMaterialGiven() {
        if (!Tab.Root) return;
        const list  =  $('[data-materials-given]', Tab.Root);
        $('[data-materials-given-count]', Tab.Root).textContent  =  State.Materials.length ? `(${State.Materials.length})` : '';
        $('[data-materials-clear]', Tab.Root).disabled  =  !State.Materials.length;
        if (!State.Materials.length) {
            const empty  =  document.createElement('li');
            empty.className  =  'PainterlyNPR__AssetDrawer__PlacedEmpty';
            empty.textContent  =  'Nothing given yet: every object is in its own class.';
            list.replaceChildren(empty);
            return;
        }
        list.replaceChildren(...State.Materials.map(a => {
            const row  =  document.createElement('li');
            row.dataset.assignmentUid  =  a.Uid;
            const object  =  Scene ? PainterlyNPR__MaterialAssignment__ResolveObject(Scene, a.Object) : null;
            const cls     =  MATERIAL_BY_KEY[a.Material];
            const dot  =  document.createElement('span');
            dot.className  =  'PainterlyNPR__MaterialTab__Dot';
            if (cls) dot.style.background = cls.Pigment;
            const label  =  document.createElement('span');
            label.className  =  'PainterlyNPR__AssetDrawer__PlacedName';
            label.textContent  =  `${cls ? cls.Label : a.Material} · ${object ? object.Name : a.Object + ' (gone)'}${a.Target === 'Face' ? ', one face' : ''}`;
            label.title  =  `${a.Uid}: ${a.Material} given to ${a.Target === 'Face' ? `face ${a.Face} of ` : ''}${a.Object}. Click to select it.`;
            const tools  =  document.createElement('span');
            tools.className  =  'PainterlyNPR__AssetDrawer__PlacedTools';
            const b  =  document.createElement('button');
            b.type  =  'button';
            b.className  =  'PainterlyNPR__IconButton';
            b.dataset.givenAction  =  'Remove';
            b.title  =  'Take it off: back to the class it was';
            b.setAttribute('aria-label', `Take ${a.Uid} off`);
            b.textContent  =  '×';
            tools.appendChild(b);
            row.append(dot, label, tools);
            return row;
        }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Brush and the Drag
// -----------------------------------------------------------------------------

    // FUNCTION | Take Up a Class as the Brush, or Put It Down (null)
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__SetMaterialBrush(key) {
        Tab.Brush  =  key && MATERIAL_BY_KEY[key] ? key : null;
        if (!Tab.Brush) PainterlyNPR__SceneEdit__ShowHover(null);              // <-- The brush's outline goes with it
        if (Ui.Root) Ui.Root.classList.toggle('PainterlyNPR--paintingMaterial', !!Tab.Brush);
        if (Tab.Root) for (const card of $$('[data-material-key]', Tab.Root)) card.classList.toggle('PainterlyNPR__MaterialCard--brush', card.dataset.materialKey === Tab.Brush);
        if (Tab.Brush) PainterlyNPR__Interface__Status(`Painting with ${MATERIAL_BY_KEY[Tab.Brush].Label.toLowerCase()}: click ${Tab.Mode === 'Face' ? 'a face' : 'an object'} on the sheet (Shift for ${Tab.Mode === 'Face' ? 'the whole object' : 'one face'}). Esc puts the brush down.`);
    }

    function PainterlyNPR__Interface__MaterialBrush() {
        return Tab.Brush ? { Key: Tab.Brush, Mode: Tab.Mode } : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Ghost - the swatch following the pointer
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__MaterialGhost(card, x, y) {
        if (!Tab.Ghost) {
            Tab.Ghost  =  document.createElement('div');
            Tab.Ghost.className  =  'PainterlyNPR__AssetDrop__Ghost';
            const thumb  =  card.querySelector('.PainterlyNPR__AssetCard__Thumb');
            if (thumb) Tab.Ghost.appendChild(thumb.cloneNode(true));
            const name  =  document.createElement('span');
            name.textContent  =  MATERIAL_BY_KEY[card.dataset.materialKey].Label;
            Tab.Ghost.appendChild(name);
            Tab.Ghost.style.width  =  Math.round(DRAG.GhostPx * 0.8) + 'px';
            document.body.appendChild(Tab.Ghost);
        }
        Tab.Ghost.style.transform  =  `translate(${x - DRAG.GhostPx * 0.4}px, ${y - DRAG.GhostPx * 0.4}px)`;
    }

    function PainterlyNPR__Interface__EndMaterialDrag() {
        if (Tab.Ghost) { Tab.Ghost.remove(); Tab.Ghost = null; }
        Tab.Press  =  null;
        Tab.Drag   =  null;
        PainterlyNPR__SceneEdit__ShowHover(null);
        if (Ui.Root) Ui.Root.classList.remove('PainterlyNPR--draggingAsset');
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire the Swatches - a click takes up the brush, a drag gives where it is let go
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__WireMaterialDrag(grid) {
        grid.addEventListener('pointerdown', (e) => {
            const card  =  e.target.closest('[data-material-key]');
            if (!card || e.button !== 0) return;
            e.preventDefault();                                               // <-- No text selection or image drag while the swatch is carried
            Tab.Press  =  { Card: card, Key: card.dataset.materialKey, X: e.clientX, Y: e.clientY, Pointer: e.pointerId };
        });
        window.addEventListener('pointermove', (e) => {
            if (Tab.Press && !Tab.Drag && e.pointerId === Tab.Press.Pointer && Math.hypot(e.clientX - Tab.Press.X, e.clientY - Tab.Press.Y) >= DRAG.ThresholdPx) {
                Tab.Drag  =  { Key: Tab.Press.Key, Card: Tab.Press.Card };
                Ui.Root.classList.add('PainterlyNPR--draggingAsset');
            }
            if (!Tab.Drag) return;
            PainterlyNPR__Interface__MaterialGhost(Tab.Drag.Card, e.clientX, e.clientY);
            PainterlyNPR__SceneEdit__ShowHover({ X: e.clientX, Y: e.clientY, Mode: e.shiftKey ? (Tab.Mode === 'Face' ? 'Object' : 'Face') : Tab.Mode });
        });
        window.addEventListener('pointerup', (e) => {
            if (Tab.Drag) {
                const key   =  Tab.Drag.Key;
                const mode  =  e.shiftKey ? (Tab.Mode === 'Face' ? 'Object' : 'Face') : Tab.Mode;
                PainterlyNPR__Interface__EndMaterialDrag();
                if (!PainterlyNPR__SceneEdit__GiveAt(e.clientX, e.clientY, key, mode)) PainterlyNPR__Interface__Status('Let go off the drawing: nothing given.');
                return;
            }
            if (Tab.Press && e.pointerId === Tab.Press.Pointer) {
                const key  =  Tab.Press.Key;
                Tab.Press  =  null;
                PainterlyNPR__Interface__SetMaterialBrush(Tab.Brush === key ? null : key);   // <-- A click: the brush taken up, or put down again
                if (!Tab.Brush) PainterlyNPR__Interface__Status('Brush put down.');
            }
        });
        window.addEventListener('pointercancel', () => { if (Tab.Press || Tab.Drag) PainterlyNPR__Interface__EndMaterialDrag(); });
        window.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (Tab.Drag || Tab.Press) { e.preventDefault(); PainterlyNPR__Interface__EndMaterialDrag(); PainterlyNPR__Interface__Status('Cancelled.'); return; }
            if (Tab.Brush) { e.preventDefault(); PainterlyNPR__Interface__SetMaterialBrush(null); PainterlyNPR__Interface__Status('Brush put down.'); }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Factory's Buttons
// -----------------------------------------------------------------------------

    // FUNCTION | Render the Swatches - the ones missing, or all of them
    // ------------------------------------------------------------
    async function PainterlyNPR__Interface__RunMaterialFactory(which) {
        const status  =  $('[data-materials-factory-status]', Tab.Root);
        await PainterlyNPR__MaterialAssignment__LoadLibrary();
        const list  =  MaterialLibrary.Materials.filter(m => which === 'All' || !m.Swatches.RND || !m.Swatches.PXY);
        if (!list.length) { status.textContent = 'Every material has its swatches.'; return; }
        for (const button of $$('[data-materials-factory]', Tab.Root)) button.disabled = true;
        try {
            const result  =  await PainterlyNPR__AssetFactory__RunMaterials(list, (i, n, m) => { status.textContent = `Rendering ${i + 1} of ${n}: ${m.Label} …`; });
            status.textContent  =  result.Message;
            await PainterlyNPR__MaterialAssignment__LoadLibrary(true);
            PainterlyNPR__Interface__RenderMaterialTab();
        } finally {
            for (const button of $$('[data-materials-factory]', Tab.Root)) button.disabled = false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Interface__BuildMaterialTab,
        PainterlyNPR__Interface__MaterialBrush,
        PainterlyNPR__Interface__MaterialMode,
        PainterlyNPR__Interface__RenderMaterialCards,
        PainterlyNPR__Interface__RenderMaterialGiven,
        PainterlyNPR__Interface__RenderMaterialTab,
        PainterlyNPR__Interface__SetMaterialBrush,
        PainterlyNPR__Interface__SetMaterialMode,
        PainterlyNPR__Interface__ShowMaterialTab,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
