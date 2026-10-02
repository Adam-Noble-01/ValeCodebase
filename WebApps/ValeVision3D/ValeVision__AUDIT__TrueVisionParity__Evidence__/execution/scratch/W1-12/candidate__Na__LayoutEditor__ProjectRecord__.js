// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - PROJECT RECORD
// =============================================================================
//
// FILE       : Na__LayoutEditor__ProjectRecord__.js
// NAMESPACE  : Na__LeRecord
// MODULE     : Layout Editor - Project Record (the project's own facts)
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read the client and the site address off the project record
// CREATED    : 19-Sep-2026
//
// DESCRIPTION:
// - Two facts on every title block are facts about the project rather than
//   about a sheet: the site address, and the client's name as a drawing prints
//   it. Where the project already knows them, a new pack should fill its own
//   title blocks in rather than have them typed four times.
// - This module reads them and nothing else. It never writes.
//
// WHERE THE TWO FACTS LIVE:
// - At the root of project.json, as the app loaded it (the transport facade's
//   Na__CfApi__GetLoadedProjectData): `clientDrawingName` and `siteAddress`.
//   Never in the presentation block, which holds the scenes and not the
//   project's facts. Neither key is in any project.json today, so Fetch
//   answers empty and the pack seeds from its own sheets instead. Add the two
//   keys to a project.json's root and the seed starts using them - nothing
//   else has to change.
//
// THE DRAWING NAME IS NOT A CLIENT RECORD:
// - clientDrawingName is deliberately the drawing form - a salutation, an
//   initial and a surname ("Mr J. Doous"), or a plain string for a company or
//   a joint surname - because that is what a title block prints and nothing
//   more is wanted in a project file.
//
// INTEGRATION:
// - Na__LayoutEditor__SheetModel__Common__ seeds the pack's common fields from
//   Fetch() when the project has none, and offers them when they differ.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js
// - Source version: 1.1.0 (TrueVision3D v2.88.0, 20-Sep-2026; read at b2aa9151) - its interface: the same three
//                   exports and the same answer from Fetch; the body is ValeVision's
// - Ported on     : 20-Sep-2026 for ValeVision3D v2.65.0, from 1.0.0 (TrueVision3D v2.74.0); re-read against
//                   1.1.0 and re-pointed at the project root on 01-Oct-2026 for ValeVision3D {{VVREL:W1-12}}
// - Parity        : diverged (no Project Admin system in ValeVision: S03b-F19, DR-27)
// - Divergences   :
//   - THE SOURCE. TrueVision reads two Noble Architecture Project Admin documents over HTTP - the
//     quotation(s) for the site address and the project config for the client - and, since 1.1.0
//     (v2.88.0), PlanVision's project data when no quotation carries an address. ValeVision has no admin
//     system and no PlanVision content (the facade's AdminFileLocation and PlansFileLocation answer null),
//     so this reads the two keys at the root of the project data the app loaded, through the facade's
//     Na__CfApi__GetLoadedProjectData: no fetch, no timeout and no cache. Reset is kept for the seed's
//     call and has nothing to forget.
//   - THE CLIENT RECORD. TrueVision's note about the encrypted client record does not apply: ValeVision
//     holds no client record at all.
//   - MODULE, PURPOSE and DESCRIPTION describe this body; TrueVision's describe its admin system. The log
//     below is ValeVision's own sequence (TrueVision's 1.1.0 entry is the fallback not taken).
// - Back-port     : none. Both differences are facts about which business each app belongs to.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.1 ({{VVREL:W1-12}})
// - The two facts are read at the ROOT of the project data the app loaded
//   (Na__CfApi__GetLoadedProjectData), as this header always said. 1.0.0 read
//   them off the presentation block - GetActiveConfig answers
//   PresentationMode__SavedCameraScenes - where nothing puts them, so a
//   project.json carrying either key at its root still seeded nothing.
//
// 20-Sep-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Project Data the App Loaded
    // ------------------------------------------------------------
    // @delegate: ../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js
    // ------------------------------------------------------------
    import { Na__CfApi__GetLoadedProjectData } from '../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';
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
    // strings: a caller seeding a title block wants a value or nothing. The
    // root of the loaded project data, never its presentation block.
    // ------------------------------------------------------------
    function Na__LeRecord__Fetch() {
        const loaded  = Na__CfApi__GetLoadedProjectData();
        const project = (loaded && typeof loaded === 'object') ? loaded : null;
        const address = (project && typeof project.siteAddress === 'string') ? project.siteAddress.trim() : '';
        return Promise.resolve({
            Client      : project ? Na__LeRecord__ComposeClientName(project.clientDrawingName) : '',
            SiteAddress : address
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Forget the Cached Record (a project change)
    // ------------------------------------------------------------
    // Nothing is cached here - the loaded project data IS the record, and the
    // loading sequence registers it with each load - so this exists only so
    // the seed can call the same pair of resets in both apps.
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
