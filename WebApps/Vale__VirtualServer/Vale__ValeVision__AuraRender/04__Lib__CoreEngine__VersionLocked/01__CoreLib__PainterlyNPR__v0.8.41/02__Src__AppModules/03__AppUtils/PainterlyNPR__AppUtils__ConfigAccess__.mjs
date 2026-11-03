/* =============================================================================
   PAINTERLYNPR - APP UTILS | CONFIG ACCESS
   =============================================================================

   FILE       : PainterlyNPR__AppUtils__ConfigAccess__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : AppUtils - ConfigAccess
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Read a section of a JSON config document - a copy, checked for every
                key the reader needs, or a loud failure that names the file and key
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Every config document has one root key, and each section's key is the root
     key and the section name joined by a double underscore, as AudioSPACE writes
     them: { "PainterlyNPR__Paper__Config": { "PainterlyNPR__Paper__Config__Presets":
     { ... } } }.
   - Section returns a deep copy, so a module that changes what it read changes
     only its own copy: two modules reading one document never see each other's
     edits, as no two of Experiment 01's constants shared an object.
   - Missing a key throws at load, naming the document's root key and the key: a
     half-read config fails in ways that are very hard to read later.
   - Pure: no imports, no DOM. Modules read their documents through JSON imports
     (with { type: 'json' }), so a config is there before any module runs.

   ============================================================================= */

// =============================================================================
// REGION | Config Access
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Reading a Section
// -----------------------------------------------------------------------------

    // FUNCTION | One Section of a Config Document - a copy, every needed key present
    // ------------------------------------------------------------
    // document: the parsed JSON; rootKey: its one root key; section: the name after
    // the double underscore; keys: what the reader goes on to read, each checked.
    function PainterlyNPR__ConfigAccess__Section(document, rootKey, section, keys) {
        const root  =  document && document[rootKey];
        if (!root || typeof root !== 'object') throw new Error(`[PainterlyNPR ConfigAccess] No root key ${rootKey} in its document.`);
        const name  =  `${rootKey}__${section}`;
        if (!Object.prototype.hasOwnProperty.call(root, name)) throw new Error(`[PainterlyNPR ConfigAccess] ${rootKey} has no section ${name}.`);
        const copy  =  structuredClone(root[name]);
        for (const key of keys || []) {
            if (!copy || !Object.prototype.hasOwnProperty.call(copy, key)) throw new Error(`[PainterlyNPR ConfigAccess] ${name} has no ${key}.`);
        }
        return copy;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__ConfigAccess__Section,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
