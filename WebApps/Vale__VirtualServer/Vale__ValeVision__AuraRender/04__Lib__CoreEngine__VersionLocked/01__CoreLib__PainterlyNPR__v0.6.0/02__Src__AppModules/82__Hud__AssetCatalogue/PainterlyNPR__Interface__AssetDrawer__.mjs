/* =============================================================================
   PAINTERLYNPR - INTERFACE | ASSET DRAWER
   =============================================================================

   FILE       : PainterlyNPR__Interface__AssetDrawer__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Interface - AssetDrawer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The pull-out Assets drawer left of the sheet: the library's cards,
                searched and filtered, shown as drawn or as proxies; the assets
                placed in this drawing; and the factory that renders the cards
   CREATED    : 30-Oct-2026 (v0.6.0)

   DESCRIPTION:
   - Adam, 30-Oct-2026: "Add a pull out Assets menu here to the left ... Ensure
     catalogue has filters and search. in the catalogue add a toggle to switch
     between see rendered and see proxy".
   - Closed, it is a slim tab down the desk's left edge (as the folded panel is
     a strip down its right); open, a column of its own, and the sheet keeps
     its 3:2 in what is left. Open or not, and which pictures, are remembered per
     viewer, as the folds are.
   - The library is read when the drawer first opens (16, the index), so boot
     never waits for it. A card is dragged onto the sheet, or clicked and then
     the sheet clicked (82's AssetDrop); each plop rebuilds the scene and the
     drawing redraws only what reads the geometry.

   ============================================================================= */

import CatalogueConfig from './Na__AssetCatalogue__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__SeededRandom__MintSeed } from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import {
    PainterlyNPR__ScenePackage__Reload,
    PainterlyNPR__ScenePackage__Scene  as  Scene,
} from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import {
    PainterlyNPR__AssetLibrary__FileUrl,
    PainterlyNPR__AssetLibrary__LoadCatalogue,
    PainterlyNPR__AssetLibrary__Search,
    PainterlyNPR__AssetLibrary__Catalogue  as  Catalogue,
} from '../16__Scene__AssetLibrary/PainterlyNPR__AssetLibrary__Catalogue__.mjs';
import {
    PainterlyNPR__AssetLibrary__MakePlacement,
    PainterlyNPR__AssetLibrary__NextUid,
    PainterlyNPR__AssetLibrary__LIBRARY  as  LIBRARY,
} from '../16__Scene__AssetLibrary/PainterlyNPR__AssetLibrary__Placement__.mjs';
import {
    PainterlyNPR__RenderGraph__Bump,
    PainterlyNPR__RenderGraph__Request,
} from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import { PainterlyNPR__CameraRig__Camera as Camera } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';
import {
    PainterlyNPR__Interface__Status,
    PainterlyNPR__Interface__Query     as  $,
    PainterlyNPR__Interface__QueryAll  as  $$,
} from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__Interface__InfoBubbles } from '../80__System__HudOverlay/PainterlyNPR__Interface__Folds__.mjs';
import {
    PainterlyNPR__AssetDrop__Arm,
    PainterlyNPR__AssetDrop__Wire,
} from './PainterlyNPR__Interface__AssetDrop__.mjs';
import { PainterlyNPR__Interface__UpdateSettingsJson } from '../85__System__ProjectPersistence/PainterlyNPR__Interface__SettingsJson__.mjs';
import { PainterlyNPR__AssetFactory__Run } from '../88__Export__AssetFactory/PainterlyNPR__AssetFactory__Run__.mjs';

// =============================================================================
// REGION | Interface - Asset Drawer
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__AssetCatalogue__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const DRAWER  =  PainterlyNPR__ConfigAccess__Section(CatalogueConfig, 'PainterlyNPR__AssetCatalogue__Config', 'Drawer', ['Store', 'Thumbs', 'SearchHint', 'Empty', 'NoThumbnail']);
    // ------------------------------------------------------------


    // MODULE STATE | The Drawer
    // ------------------------------------------------------------
    const Drawer  =  { Root: null, Open: false, Thumbs: DRAWER.Thumbs, Query: '', Collection: '', Type: '' };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building the Drawer
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Drawer Into Its Aside, Wire It, and Restore This Viewer's Choice
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__BuildAssetDrawer() {
        const root  =  $('.PainterlyNPR__AssetDrawer');
        if (!root) return;
        Drawer.Root  =  root;
        root.innerHTML  =  `
            <button type="button" class="PainterlyNPR__AssetDrawer__Tab" data-assets-toggle aria-expanded="false" title="The asset library: drag trees, plants and furniture into the drawing">Assets ▸</button>
            <div class="PainterlyNPR__AssetDrawer__Body">
                <div class="PainterlyNPR__AssetDrawer__Head">
                    <h2 class="PainterlyNPR__AssetDrawer__Title">Assets</h2>
                    <span class="PainterlyNPR__AssetDrawer__Count" data-assets-count></span>
                    <button type="button" class="PainterlyNPR__FoldButton" data-assets-toggle aria-expanded="true" title="Fold the asset library away">◂ Hide</button>
                </div>
                <input type="search" class="PainterlyNPR__AssetDrawer__Search" data-assets-search placeholder="${DRAWER.SearchHint}" aria-label="Search the asset library">
                <div class="PainterlyNPR__ChipRow" data-assets-collections role="group" aria-label="Collections"></div>
                <div class="PainterlyNPR__ChipRow" data-assets-types role="group" aria-label="Types"></div>
                <div class="PainterlyNPR__AssetDrawer__Show" role="group" aria-label="Pictures">
                    <span>Show</span>
                    <button type="button" class="PainterlyNPR__Button PainterlyNPR__Button--small" data-assets-thumbs="RND" aria-pressed="true">Rendered</button>
                    <button type="button" class="PainterlyNPR__Button PainterlyNPR__Button--small" data-assets-thumbs="PXY" aria-pressed="false">Proxy</button>
                </div>
                <div class="PainterlyNPR__AssetDrawer__Grid" data-assets-grid role="list" aria-label="Library assets"></div>
                <section class="PainterlyNPR__Group PainterlyNPR__AssetDrawer__Section">
                    <h3 class="PainterlyNPR__Group__Title">In this drawing <span data-assets-placed-count></span></h3>
                    <p class="PainterlyNPR__Hint">Each plop is its own plant: its own shape, turn and size, drawn the same way every time. Turn one, move it (click the sheet where it should stand) or take it out.</p>
                    <ol class="PainterlyNPR__AssetDrawer__Placed" data-assets-placed></ol>
                </section>
                <section class="PainterlyNPR__Group PainterlyNPR__AssetDrawer__Section">
                    <h3 class="PainterlyNPR__Group__Title">Pictures</h3>
                    <p class="PainterlyNPR__Hint">The factory draws each asset alone in the catalogue environment - its base shape, a fixed light and camera, the starting style - as proxy (PXY) and as pen and wash (RND), and writes them with its three.js model (MOD) into its folder in 12__Data__AssetLibrary. It needs the local server.</p>
                    <div class="PainterlyNPR__ButtonRow">
                        <button type="button" class="PainterlyNPR__Button PainterlyNPR__Button--small" data-assets-factory="Missing">Render missing</button>
                        <button type="button" class="PainterlyNPR__Button PainterlyNPR__Button--small" data-assets-factory="All">Render all</button>
                    </div>
                    <p class="PainterlyNPR__Readout" data-assets-factory-status></p>
                </section>
            </div>`;
        PainterlyNPR__Interface__InfoBubbles(root);

        for (const button of $$('[data-assets-toggle]', root)) button.addEventListener('click', () => PainterlyNPR__Interface__SetAssetDrawer(!Drawer.Open));
        $('[data-assets-search]', root).addEventListener('input', (e) => { Drawer.Query = e.target.value; PainterlyNPR__Interface__RenderAssetCards(); });
        $('[data-assets-collections]', root).addEventListener('click', (e) => {
            const chip  =  e.target.closest('[data-collection]');
            if (!chip) return;
            Drawer.Collection  =  chip.dataset.collection;
            Drawer.Type        =  '';
            PainterlyNPR__Interface__RenderAssetFilters();
            PainterlyNPR__Interface__RenderAssetCards();
        });
        $('[data-assets-types]', root).addEventListener('click', (e) => {
            const chip  =  e.target.closest('[data-type]');
            if (!chip) return;
            Drawer.Type  =  chip.dataset.type;
            PainterlyNPR__Interface__RenderAssetFilters();
            PainterlyNPR__Interface__RenderAssetCards();
        });
        for (const button of $$('[data-assets-thumbs]', root)) button.addEventListener('click', () => { Drawer.Thumbs = button.dataset.assetsThumbs; PainterlyNPR__Interface__RememberAssetDrawer(); PainterlyNPR__Interface__RenderAssetCards(); });
        $('[data-assets-placed]', root).addEventListener('click', (e) => {
            const button  =  e.target.closest('[data-placed-action]');
            if (button) PainterlyNPR__Interface__PlacedAction(button.dataset.placedAction, button.closest('[data-uid]').dataset.uid);
        });
        for (const button of $$('[data-assets-factory]', root)) button.addEventListener('click', () => PainterlyNPR__Interface__RunAssetFactory(button.dataset.assetsFactory));

        PainterlyNPR__AssetDrop__Wire($('[data-assets-grid]', root), { OnPlace: PainterlyNPR__Interface__PlaceAsset, OnMove: PainterlyNPR__Interface__MoveAsset });

        let saved  =  null;
        try { saved = JSON.parse(localStorage.getItem(DRAWER.Store) || 'null'); } catch (error) { saved = null; }
        if (saved && (saved.Thumbs === 'RND' || saved.Thumbs === 'PXY')) Drawer.Thumbs = saved.Thumbs;
        PainterlyNPR__Interface__SetAssetDrawer(!!(saved && saved.Open), false);
        PainterlyNPR__Interface__RenderPlacedAssets();
    }
    // ------------------------------------------------------------


    // FUNCTION | Open or Fold the Drawer - the library is read the first time it opens
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__SetAssetDrawer(open, remember) {
        const app  =  $('#PainterlyNPR__App__Root');
        Drawer.Open  =  !!open;
        if (app) app.classList.toggle('PainterlyNPR--assetsOpen', Drawer.Open);
        for (const button of $$('[data-assets-toggle]', Drawer.Root)) button.setAttribute('aria-expanded', String(Drawer.Open));   // <-- The sheet's new size re-places the point handles through the desk's resize observer
        if (remember !== false) PainterlyNPR__Interface__RememberAssetDrawer();
        if (!Drawer.Open) return;
        if (!Catalogue.Loaded) {
            $('[data-assets-grid]', Drawer.Root).textContent  =  'Reading the library …';
            PainterlyNPR__AssetLibrary__LoadCatalogue().then(() => { PainterlyNPR__Interface__RenderAssetFilters(); PainterlyNPR__Interface__RenderAssetCards(); PainterlyNPR__Interface__RenderPlacedAssets(); });
        }
    }

    function PainterlyNPR__Interface__RememberAssetDrawer() {
        try { localStorage.setItem(DRAWER.Store, JSON.stringify({ Open: Drawer.Open, Thumbs: Drawer.Thumbs })); }
        catch (error) { /* <-- Private window or blocked storage: the drawer still works, it is just not remembered */ }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Catalogue's Cards
// -----------------------------------------------------------------------------

    // FUNCTION | The Filters - a chip a collection that has assets, then its types
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__RenderAssetFilters() {
        if (!Drawer.Root) return;
        const chip  =  (attr, value, label, active) => {
            const b  =  document.createElement('button');
            b.type  =  'button';
            b.className  =  'PainterlyNPR__Button PainterlyNPR__Chip' + (active ? ' PainterlyNPR__Button--active' : '');
            b.dataset[attr]  =  value;
            b.setAttribute('aria-pressed', String(active));
            b.textContent  =  label;
            return b;
        };
        const cols  =  $('[data-assets-collections]', Drawer.Root);
        cols.replaceChildren(chip('collection', '', `All ${Catalogue.Assets.length}`, !Drawer.Collection),
            ...Catalogue.Collections.filter(c => c.Count > 0).map(c => chip('collection', c.Code, `${c.Label} ${c.Count}`, Drawer.Collection === c.Code)));
        const types  =  $('[data-assets-types]', Drawer.Root);
        const collection  =  Catalogue.Collections.find(c => c.Code === Drawer.Collection);
        types.hidden  =  !collection;
        types.replaceChildren(...(collection ? [chip('type', '', 'All types', !Drawer.Type), ...collection.Types.filter(t => t.Count > 0).map(t => chip('type', t.Type, `${t.Type.replace(/([a-z])([A-Z])/g, '$1 $2')} ${t.Count}`, Drawer.Type === t.Type))] : []));
        $('[data-assets-count]', Drawer.Root).textContent  =  `${Catalogue.Assets.length} in the library`;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Cards - what the search and filters leave, as drawn or as proxies
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__RenderAssetCards() {
        if (!Drawer.Root) return;
        for (const button of $$('[data-assets-thumbs]', Drawer.Root)) {
            button.setAttribute('aria-pressed', String(button.dataset.assetsThumbs === Drawer.Thumbs));
            button.classList.toggle('PainterlyNPR__Button--active', button.dataset.assetsThumbs === Drawer.Thumbs);
        }
        const grid  =  $('[data-assets-grid]', Drawer.Root);
        if (Catalogue.Error && !Catalogue.Loaded) { grid.textContent = Catalogue.Error; return; }
        const found  =  PainterlyNPR__AssetLibrary__Search(Drawer.Query, Drawer.Collection, Drawer.Type);
        if (!found.length) { grid.textContent = DRAWER.Empty; return; }
        grid.replaceChildren(...found.map(asset => {
            const id    =  asset.Identity;
            const card  =  document.createElement('div');
            card.className  =  'PainterlyNPR__AssetCard';
            card.setAttribute('role', 'listitem');
            card.dataset.assetId    =  asset.AssetId;
            card.dataset.assetName  =  id.DisplayName;
            card.title  =  `${id.DisplayName} - ${asset.AssetId}. Drag onto the sheet, or click it and then the sheet.`;
            const thumb  =  document.createElement('div');
            thumb.className  =  'PainterlyNPR__AssetCard__Thumb';
            const url  =  PainterlyNPR__AssetLibrary__FileUrl(asset, Drawer.Thumbs) || PainterlyNPR__AssetLibrary__FileUrl(asset, Drawer.Thumbs === 'RND' ? 'PXY' : 'RND');
            if (url) {
                const img  =  document.createElement('img');
                img.src  =  url;
                img.alt  =  '';
                img.draggable  =  false;
                img.loading  =  'lazy';
                thumb.appendChild(img);
            } else {
                thumb.classList.add('PainterlyNPR__AssetCard__Thumb--none');
                thumb.textContent  =  DRAWER.NoThumbnail;
            }
            const name  =  document.createElement('div');
            name.className  =  'PainterlyNPR__AssetCard__Name';
            name.textContent  =  id.DisplayName;
            const meta  =  document.createElement('div');
            meta.className  =  'PainterlyNPR__AssetCard__Meta';
            const height  =  asset.Geometry && asset.Geometry.NominalHeightM;
            meta.textContent  =  `${asset.AssetId}${height ? ` · ${height < 1 ? Math.round(height * 1000) + ' mm' : height.toFixed(1) + ' m'}` : ''}`;
            card.append(thumb, name, meta);
            return card;
        }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Plops - placing, turning, moving, removing
// -----------------------------------------------------------------------------

    // FUNCTION | The Placed Assets Changed - rebuild the scene, redraw what reads it
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__AssetsChanged(note) {
        const started  =  performance.now();
        PainterlyNPR__ScenePackage__Reload(State.Assets);
        PainterlyNPR__RenderGraph__Bump('Scene');
        const counts  =  $('#PainterlyNPR__App__SceneCounts');
        if (counts) counts.textContent = `${Scene.Objects.length} objects, ${Scene.Edges.length} edges, ${Scene.Surfaces.length} surfaces` + (State.Assets.length ? `, ${State.Assets.length} placed assets` : '');
        PainterlyNPR__Interface__RenderPlacedAssets();
        PainterlyNPR__Interface__UpdateSettingsJson();
        PainterlyNPR__RenderGraph__Request('Navigate');
        if (note) PainterlyNPR__Interface__Status(`${note} - the scene rebuilt in ${(performance.now() - started).toFixed(0)} ms.`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Place an Asset on the Ground - a new plop, its own seed, turn and size
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__PlaceAsset(assetId, ground) {
        const asset  =  Catalogue.ById.get(assetId);
        if (!asset) { PainterlyNPR__Interface__Status(`${assetId} is not in the library as read.`); return; }
        if (State.Assets.length >= LIBRARY.MaxPlaced) { PainterlyNPR__Interface__Status(`A drawing holds ${LIBRARY.MaxPlaced} placed assets at most.`); return; }
        const uid        =  PainterlyNPR__AssetLibrary__NextUid(State.Assets);
        const placement  =  PainterlyNPR__AssetLibrary__MakePlacement(asset, ground, PainterlyNPR__SeededRandom__MintSeed(), uid, Camera && Camera.Eye);
        State.Assets.push(placement);
        PainterlyNPR__Interface__AssetsChanged(`Placed ${asset.Identity.DisplayName} as ${uid} at ${placement.Position[0].toFixed(1)}, ${placement.Position[2].toFixed(1)} m`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Move a Plop - it keeps its shape, turn and size
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__MoveAsset(uid, ground) {
        const placement  =  State.Assets.find(p => p.Uid === uid);
        if (!placement) return;
        placement.Position  =  [Math.round(ground[0] * 1000) / 1000, placement.Position[1], Math.round(ground[2] * 1000) / 1000];
        PainterlyNPR__Interface__AssetsChanged(`Moved ${placement.Name} (${uid})`);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Placed Row's Buttons - turn 45 degrees, move, take it out
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__PlacedAction(action, uid) {
        const index  =  State.Assets.findIndex(p => p.Uid === uid);
        if (index < 0) return;
        const placement  =  State.Assets[index];
        if (action === 'Turn') {
            placement.RotationDeg  =  Math.round(((placement.RotationDeg + 45) % 360) * 10) / 10;
            PainterlyNPR__Interface__AssetsChanged(`Turned ${placement.Name} (${uid}) to ${placement.RotationDeg} degrees`);
        } else if (action === 'Move') {
            PainterlyNPR__AssetDrop__Arm({ Move: uid });
        } else if (action === 'Remove') {
            State.Assets.splice(index, 1);
            PainterlyNPR__Interface__AssetsChanged(`Took ${placement.Name} (${uid}) out of the drawing`);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Placed List - every plop in this drawing, newest last
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__RenderPlacedAssets() {
        if (!Drawer.Root) return;
        const list  =  $('[data-assets-placed]', Drawer.Root);
        $('[data-assets-placed-count]', Drawer.Root).textContent  =  State.Assets.length ? `(${State.Assets.length})` : '';
        if (!State.Assets.length) {
            const empty  =  document.createElement('li');
            empty.className  =  'PainterlyNPR__AssetDrawer__PlacedEmpty';
            empty.textContent  =  'Nothing placed yet: drag a card onto the sheet.';
            list.replaceChildren(empty);
            return;
        }
        list.replaceChildren(...State.Assets.map(p => {
            const row  =  document.createElement('li');
            row.dataset.uid  =  p.Uid;
            const label  =  document.createElement('span');
            label.className  =  'PainterlyNPR__AssetDrawer__PlacedName';
            label.textContent  =  `${p.Uid} · ${p.Name}`;
            label.title  =  `${p.AssetId} at ${p.Position[0].toFixed(2)}, ${p.Position[2].toFixed(2)} m, turned ${p.RotationDeg} degrees, scale ${p.Scale}`;
            const tools  =  document.createElement('span');
            tools.className  =  'PainterlyNPR__AssetDrawer__PlacedTools';
            for (const [action, glyph, title] of [['Turn', '↻', 'Turn it 45 degrees'], ['Move', '✥', 'Move it: click the sheet where it should stand'], ['Remove', '×', 'Take it out of the drawing']]) {
                const b  =  document.createElement('button');
                b.type  =  'button';
                b.className  =  'PainterlyNPR__IconButton';
                b.dataset.placedAction  =  action;
                b.title  =  title;
                b.setAttribute('aria-label', `${title} - ${p.Uid}`);
                b.textContent  =  glyph;
                tools.appendChild(b);
            }
            row.append(label, tools);
            return row;
        }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Factory's Buttons
// -----------------------------------------------------------------------------

    // FUNCTION | Render the Cards' Pictures - the ones missing, or all of them
    // ------------------------------------------------------------
    async function PainterlyNPR__Interface__RunAssetFactory(which) {
        const status  =  $('[data-assets-factory-status]', Drawer.Root);
        await PainterlyNPR__AssetLibrary__LoadCatalogue();
        const list  =  Catalogue.Assets.filter(a => which === 'All' || !a.Files.RND.Present || !a.Files.PXY.Present || !a.Files.MOD.Present);
        if (!list.length) { status.textContent = 'Every asset has its pictures and model.'; return; }
        for (const button of $$('[data-assets-factory]', Drawer.Root)) button.disabled = true;
        try {
            const result  =  await PainterlyNPR__AssetFactory__Run(list, (i, n, asset) => { status.textContent = `Rendering ${i + 1} of ${n}: ${asset.Identity.DisplayName} …`; });
            status.textContent  =  result.Message;
            await PainterlyNPR__AssetLibrary__LoadCatalogue(true);
            PainterlyNPR__Interface__RenderAssetFilters();
            PainterlyNPR__Interface__RenderAssetCards();
        } finally {
            for (const button of $$('[data-assets-factory]', Drawer.Root)) button.disabled = false;
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
        PainterlyNPR__Interface__AssetsChanged,
        PainterlyNPR__Interface__BuildAssetDrawer,
        PainterlyNPR__Interface__RenderPlacedAssets,
        PainterlyNPR__Interface__SetAssetDrawer,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
