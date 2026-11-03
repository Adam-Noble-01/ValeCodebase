/* =============================================================================
   PAINTERLYNPR - SCENE | ASSET LIBRARY - CATALOGUE
   =============================================================================

   FILE       : PainterlyNPR__AssetLibrary__Catalogue__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Scene - AssetLibrary - Catalogue
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The library as the app reads it: the index loaded once (and again
                after the factory writes), each asset by its Id, its files' URLs,
                and search and filters over the collections, types and keywords
   CREATED    : 30-Oct-2026 (v0.6.0)

   DESCRIPTION:
   - The index (12__Data__AssetLibrary/PainterlyNPR__AssetLibrary__Index__.json)
     is written by the build utility, and by the local server whenever it serves
     it, so the app always reads the library as it is on disk and a plain static
     server, or an installed app offline, still has a catalogue.
   - Nothing here touches the scene: a plop carries its own recipe, so a drawing
     never needs the catalogue to rebuild.

   ============================================================================= */

import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AssetLibrary__LIBRARY as LIBRARY } from './PainterlyNPR__AssetLibrary__Placement__.mjs';

// =============================================================================
// REGION | Asset Library - Catalogue
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | The Catalogue
// -----------------------------------------------------------------------------

    // MODULE STATE | The Library as Last Read
    // ------------------------------------------------------------
    // Version moves each time the index is read again, so a thumbnail's URL
    // changes with it and the browser fetches the new picture.
    const Catalogue  =  { Assets: [], ById: new Map(), Collections: [], Slots: [], Loaded: false, Loading: null, Error: null, Version: 0 };
    const INDEX_ROOT  =  'PainterlyNPR__AssetLibrary__Index';
    // ------------------------------------------------------------


    // FUNCTION | Load the Index - once, or again when asked (after the factory writes)
    // ------------------------------------------------------------
    function PainterlyNPR__AssetLibrary__LoadCatalogue(again) {
        if (Catalogue.Loading && !again) return Catalogue.Loading;
        Catalogue.Loading  =  (async () => {
            try {
                const response  =  await fetch(LIBRARY.Root + LIBRARY.IndexFile, { cache: 'no-store' });
                if (!response.ok) throw new Error(`the index answered ${response.status}`);
                const index  =  await response.json();
                Catalogue.Assets       =  PainterlyNPR__ConfigAccess__Section(index, INDEX_ROOT, 'Assets', ['Assets']).Assets;
                Catalogue.Collections  =  PainterlyNPR__ConfigAccess__Section(index, INDEX_ROOT, 'Collections', ['Collections']).Collections;
                Catalogue.Slots        =  PainterlyNPR__ConfigAccess__Section(index, INDEX_ROOT, 'Slots', ['Slots']).Slots;
                Catalogue.ById         =  new Map(Catalogue.Assets.map(a => [a.AssetId, a]));
                Catalogue.Loaded       =  true;
                Catalogue.Error        =  null;
                Catalogue.Version++;
            } catch (error) {
                Catalogue.Error  =  `The asset library could not be read (${error.message}).`;
                console.warn('[PainterlyNPR AssetLibrary]', error);
            }
            return Catalogue;
        })();
        return Catalogue.Loading;
    }
    // ------------------------------------------------------------


    // FUNCTION | One Asset's File URL - from the page, versioned by its last render
    // ------------------------------------------------------------
    function PainterlyNPR__AssetLibrary__FileUrl(asset, slot) {
        const file  =  asset && asset.Files && asset.Files[slot];
        if (!file || !file.Present) return null;
        const version  =  encodeURIComponent((asset.Factory && asset.Factory.RenderedOn) || '') + '.' + Catalogue.Version;
        return `${LIBRARY.Root}${asset.Folder}/${file.File}?v=${version}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Search and Filter - text over names, Ids, types and keywords
    // ------------------------------------------------------------
    // Every word of the query must match somewhere in the asset's words, so
    // "oak tree" finds the mature oak and "lav" every lavender.
    function PainterlyNPR__AssetLibrary__Search(query, collection, type) {
        const words  =  String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
        return Catalogue.Assets.filter(asset => {
            const id  =  asset.Identity;
            if (collection && id.Collection !== collection) return false;
            if (type && id.Type !== type) return false;
            if (!words.length) return true;
            const hay  =  [asset.AssetId, id.DisplayName, id.Name, id.Type, id.CollectionName, id.Variant, id.Description, (asset.Catalogue && asset.Catalogue.Botanical) || '', ...((asset.Catalogue && asset.Catalogue.Keywords) || [])].join(' ').toLowerCase();
            return words.every(w => hay.includes(w));
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
        PainterlyNPR__AssetLibrary__FileUrl,
        PainterlyNPR__AssetLibrary__LoadCatalogue,
        PainterlyNPR__AssetLibrary__Search,
        Catalogue  as  PainterlyNPR__AssetLibrary__Catalogue,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
