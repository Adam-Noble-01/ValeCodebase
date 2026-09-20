// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - PROJECT RECORD
// =============================================================================
//
// FILE       : Na__LayoutEditor__ProjectRecord__.js
// NAMESPACE  : Na__LeRecord
// MODULE     : Layout Editor - Project Record (the project's own facts)
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read the client and the site address off the project record
// CREATED    : 20-Sep-2026
//
// DESCRIPTION:
// - Two facts on every title block are facts about the project rather than
//   about a sheet: the site address, and the client's name as a drawing prints
//   it. Where the project already knows them, a new pack should fill its own
//   title blocks in rather than have them typed four times.
// - This module reads them and nothing else. It never writes.
//
// WHERE THE TWO FACTS LIVE:
// - project.json, through the already-loaded active config:
//   `clientDrawingName` and `siteAddress`. Neither key is in any project.json
//   today, so Fetch answers empty and the pack seeds from its own sheets
//   instead. Add the two keys to a project.json and the seed starts using
//   them - nothing else has to change.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js 1.0.0
// - Ported on     : 20-Sep-2026 for ValeVision3D (Common title block fields)
// - Parity        : adapted
// - Divergences   : (1) THE SOURCE. TrueVision reads two Noble Architecture Project Admin
//                       documents - ProjectAdmin__Quotation(s)__.json for the site address and
//                       ProjectAdmin__ProjectConfig__.json for the client - over HTTP from the
//                       website, because that admin system exists and owns those facts.
//                       ValeVision has no Project Admin system at all: no quotation, no client
//                       record, and project.json carries only projectCode, projectName,
//                       displayName and paths. So this reads the active config instead, which is
//                       already in memory, and there is no fetch, no timeout and no cache.
//                   (2) THE CLIENT RECORD. TrueVision's note about PII does not apply here
//                       because ValeVision holds no client record, encrypted or otherwise.
//                       clientDrawingName is still deliberately the drawing form - a salutation,
//                       an initial and a surname - and not a full given name, because that is
//                       what a title block prints and nothing more is wanted in a project file.
// - Back-port     : no. Both divergences are facts about which business each app belongs to.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 20-Sep-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Loaded Project Config
    // ------------------------------------------------------------
    import { Na__PresentationMode__ProjectJson__GetActiveConfig } from '../../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reading the Two Facts
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Compose the Client's Name as a Drawing Prints It
    // ------------------------------------------------------------
    // Accepts either a plain string - a company, a joint surname, anything the
    // parts do not fit - or { salutation, initial, surname }, which is the
    // ordinary householder case and the reason the parts exist: a title block
    // says "Mr P. Samra", and the salutation has to be stored to be printed.
    // ------------------------------------------------------------
    function Na__LeRecord__ComposeClientName(value) {
        if (typeof value === 'string') return value.trim();
        if (!value || typeof value !== 'object') return '';
        const text = (key) => (typeof value[key] === 'string') ? value[key].trim() : '';
        const composed = text('composed');
        if (composed) return composed;                                          // <-- A stored composition always wins: someone wrote it on purpose
        const initial = text('initial').replace(/\.+$/, '');                    // <-- Stored with or without its full stop; printed with one
        return [ text('salutation'), initial ? initial + '.' : '', text('surname') ]
            .filter((part) => part !== '')
            .join(' ');
    }
    // ------------------------------------------------------------


    // FUNCTION | The Project Record, or Empty Fields If It Has None
    // ------------------------------------------------------------
    // A promise, although nothing is fetched, so this reads the same as
    // TrueVision's from the seed's side and the two Common modules stay one
    // piece of code. Always resolves, always to { Client, SiteAddress } of
    // strings: a caller seeding a title block wants a value or nothing.
    // ------------------------------------------------------------
    function Na__LeRecord__Fetch() {
        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        const address = (config && typeof config.siteAddress === 'string') ? config.siteAddress.trim() : '';
        return Promise.resolve({
            Client      : config ? Na__LeRecord__ComposeClientName(config.clientDrawingName) : '',
            SiteAddress : address
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Forget the Cached Record (a project change)
    // ------------------------------------------------------------
    // Nothing is cached here - the active config IS the cache, and the loading
    // sequence replaces it - so this exists only so the seed can call the same
    // pair of resets in both apps.
    // ------------------------------------------------------------
    function Na__LeRecord__Reset() {
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Project Record API
    // ------------------------------------------------------------
    export {
        Na__LeRecord__Fetch,
        Na__LeRecord__Reset,
        Na__LeRecord__ComposeClientName
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
