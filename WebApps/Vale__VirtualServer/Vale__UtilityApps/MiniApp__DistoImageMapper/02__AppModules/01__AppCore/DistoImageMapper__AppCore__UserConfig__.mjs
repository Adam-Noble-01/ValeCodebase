/* =============================================================================
   DISTO IMAGE MAPPER - APP CORE | USER CONFIG
   =============================================================================

   FILE       : DistoImageMapper__AppCore__UserConfig__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : AppCore - UserConfig
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : One settings file for the person using this browser: everything the
                app remembers, as one JSON document in the house config style
   CREATED    : 06-Nov-2026

   DESCRIPTION:
   - Adam, 06-Nov-2026: "save a user config file to the PWA app per user to chart these
     kinds of user configs, json should be in my style". Kept in the installed app on
     this device (his pick, "This browser"): nothing is sent anywhere, and the app has
     no sign-in.
   - ONE DOCUMENT, in Na__AppConfig__Main.json's shape: a root key, a description, then
     one block per part of the app, PascalCase keys with their colons in a column:
       DistoImageMapper__UserConfig__Meta     schema, the app version that last wrote it, when
       DistoImageMapper__UserConfig__Panel    the menu: width, folded, the open section and groups
       DistoImageMapper__UserConfig__Viewer   arrangement, sizes, sheets, layers (State's prefs)
       DistoImageMapper__UserConfig__ClipBox  the faces' snap, and each survey's box by its name
       DistoImageMapper__UserConfig__Export   the export dialog's ticks
   - Written a moment after the last change, so a dragged slider writes once, and at
     once when the page is hidden or closed.
   - FIRST OPEN OF 1.5.0: the separate keys 1.4.0 and before kept are read in, then
     removed once the document is safely written, so a setting lives in one place.
   - Blocked or full storage: the settings last this visit, and the app runs on.

   USAGE:
     DistoImageMapper__UserConfig__Load(appVersion)        once, at boot
     const panel = DistoImageMapper__UserConfig__Get('Panel');   a live section: change it, then
     DistoImageMapper__UserConfig__Save();                  write it (soon)
     DistoImageMapper__UserConfig__Set('Viewer', prefs);    or replace a section and write it

   ============================================================================= */


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Storage, Shape and Layout
    // ------------------------------------------------------------
    const STORE_KEY      =  'DistoImageMapper__UserConfig';                  // <-- The one key this app keeps in the browser
    const ROOT_KEY       =  'DistoImageMapper__UserConfig';
    const SECTION_PREFIX =  'DistoImageMapper__UserConfig__';
    const SECTIONS       =  ['Meta', 'Panel', 'Viewer', 'ClipBox', 'Export'];
    const SCHEMA_VERSION =  '1.0.0';
    const DESCRIPTION    =  'Disto Image Mapper settings for whoever uses this browser: the menu, the viewer, the clipping boxes by survey and the export ticks. Kept in the app on this device and never sent anywhere. Written by DistoImageMapper__AppCore__UserConfig__.mjs.';
    const SAVE_DELAY_MS  =  400;                                             // <-- A dragged slider writes once, after it stops
    const KEY_COLUMN     =  30;                                              // <-- Keys padded so the colons line up, as in Na__AppConfig__Main.json
    const INLINE_LIMIT   =  110;                                             // <-- A block this short or shorter stays on one line
    const OLD_KEYS       =  {                                                // <-- Where 1.4.0 and before kept them
        Viewer    :  'DistoImageMapper__Prefs__v2',
        Snap      :  'DistoImageMapper__ClipBoxSnap__v1',
        Export    :  'DistoImageMapper__ExportChoice__v1',
        BoxPrefix :  'DistoImageMapper__ClipBox__v1__'
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | The Document in Hand
    // ------------------------------------------------------------
    let Sections      =  null;                                               // <-- { Meta, Panel, Viewer, ClipBox, Export }
    let AppVersion    =  '';
    let SaveTimer     =  0;
    let OldKeysToDrop =  [];                                                 // <-- Removed after the first good write
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Writing the House Style
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Value on One Line: { "Key" : value, ... } and [a, b]
    // ------------------------------------------------------------
    function DistoImageMapper__UserConfig__Inline(value) {
        if (Array.isArray(value)) return `[${value.map(DistoImageMapper__UserConfig__Inline).join(', ')}]`;
        if (value && typeof value === 'object') {
            const entries  =  Object.entries(value).filter(([, entry]) => entry !== undefined);
            return entries.length ? `{ ${entries.map(([key, entry]) => `${JSON.stringify(key)} : ${DistoImageMapper__UserConfig__Inline(entry)}`).join(', ')} }` : '{}';
        }
        return JSON.stringify(value === undefined || (typeof value === 'number' && !Number.isFinite(value)) ? null : value);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Block: One Key a Line, Colons in a Column, Long Objects Opened Up
    // ------------------------------------------------------------
    function DistoImageMapper__UserConfig__Block(object, indent) {
        const pad    =  ' '.repeat(indent);
        const lines  =  Object.entries(object).filter(([, value]) => value !== undefined).map(([key, value]) => {
            const name    =  JSON.stringify(key).padEnd(KEY_COLUMN);
            const inline  =  DistoImageMapper__UserConfig__Inline(value);
            const isOpen  =  value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length && inline.length > INLINE_LIMIT;
            return `${pad}${name}: ${isOpen ? DistoImageMapper__UserConfig__Block(value, indent + 4) : inline}`;
        });
        return lines.length ? `{\n${lines.join(',\n')}\n${' '.repeat(indent - 4)}}` : '{}';
    }
    // ------------------------------------------------------------


    // FUNCTION | The Whole Document as Text, in the House Style
    // ------------------------------------------------------------
    export function DistoImageMapper__UserConfig__Text() {
        const blocks  =  SECTIONS.map(name => `        "${SECTION_PREFIX}${name}": ${DistoImageMapper__UserConfig__Block(Sections[name] || {}, 12)}`);
        return [
            '{',
            `    "${ROOT_KEY}": {`,
            `        "${SECTION_PREFIX}Description": ${JSON.stringify(DESCRIPTION)},`,
            '',
            blocks.join(',\n\n'),
            '    }',
            '}',
            ''
        ].join('\n');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | An Empty Document
    // ------------------------------------------------------------
    function DistoImageMapper__UserConfig__Empty() {
        return { Meta : {}, Panel : {}, Viewer : {}, ClipBox : { Surveys : {} }, Export : {} };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Stored Value Without Throwing
    // ------------------------------------------------------------
    function DistoImageMapper__UserConfig__ReadKey(key) {
        try {
            const text  =  window.localStorage.getItem(key);
            return text ? JSON.parse(text) : null;
        } catch (error) {
            return null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Separate Keys of 1.4.0 and Before, Gathered Into One Document
    // ------------------------------------------------------------
    function DistoImageMapper__UserConfig__FromOldKeys() {
        const sections  =  DistoImageMapper__UserConfig__Empty();
        const isObject  =  value => value && typeof value === 'object' && !Array.isArray(value);
        const viewer    =  DistoImageMapper__UserConfig__ReadKey(OLD_KEYS.Viewer);
        const snap      =  DistoImageMapper__UserConfig__ReadKey(OLD_KEYS.Snap);
        const choice    =  DistoImageMapper__UserConfig__ReadKey(OLD_KEYS.Export);
        if (isObject(viewer)) { sections.Viewer  =  viewer; OldKeysToDrop.push(OLD_KEYS.Viewer); }
        if (isObject(snap))   { sections.ClipBox.Snap  =  snap; OldKeysToDrop.push(OLD_KEYS.Snap); }
        if (isObject(choice)) { sections.Export  =  choice; OldKeysToDrop.push(OLD_KEYS.Export); }
        try {
            for (let i = 0; i < window.localStorage.length; i++) {
                const key  =  window.localStorage.key(i);
                if (!key || !key.startsWith(OLD_KEYS.BoxPrefix)) continue;
                const box  =  DistoImageMapper__UserConfig__ReadKey(key);
                if (isObject(box)) sections.ClipBox.Surveys[key.slice(OLD_KEYS.BoxPrefix.length)]  =  box;
                OldKeysToDrop.push(key);
            }
        } catch (error) {
            // <-- Storage blocked: nothing to gather
        }
        return sections;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load the Document (Once, at Boot), Gathering the Old Keys the First Time
    // ------------------------------------------------------------
    export function DistoImageMapper__UserConfig__Load(appVersion) {
        AppVersion  =  String(appVersion || '');
        const stored  =  DistoImageMapper__UserConfig__ReadKey(STORE_KEY);
        const root    =  stored && stored[ROOT_KEY];
        if (root && typeof root === 'object') {
            Sections  =  DistoImageMapper__UserConfig__Empty();
            for (const name of SECTIONS) {
                const section  =  root[SECTION_PREFIX + name];
                if (section && typeof section === 'object' && !Array.isArray(section)) Sections[name]  =  section;
            }
            if (!Sections.ClipBox.Surveys || typeof Sections.ClipBox.Surveys !== 'object') Sections.ClipBox.Surveys  =  {};
            return;
        }
        Sections  =  DistoImageMapper__UserConfig__FromOldKeys();
        DistoImageMapper__UserConfig__Write();                               // <-- The document exists from the first open on
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Using and Saving
// -----------------------------------------------------------------------------

    // FUNCTION | A Live Section: Change It, Then Save
    // ------------------------------------------------------------
    export function DistoImageMapper__UserConfig__Get(name) {
        if (!Sections) Sections  =  DistoImageMapper__UserConfig__Empty();
        if (!Sections[name] || typeof Sections[name] !== 'object') Sections[name]  =  {};
        return Sections[name];
    }
    // ------------------------------------------------------------


    // FUNCTION | Replace a Section and Save It
    // ------------------------------------------------------------
    export function DistoImageMapper__UserConfig__Set(name, value) {
        if (!Sections) Sections  =  DistoImageMapper__UserConfig__Empty();
        Sections[name]  =  value && typeof value === 'object' ? value : {};
        DistoImageMapper__UserConfig__Save();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write Now: True When the Browser Kept It
    // ------------------------------------------------------------
    function DistoImageMapper__UserConfig__Write() {
        window.clearTimeout(SaveTimer);
        SaveTimer  =  0;
        if (!Sections) return false;
        Sections.Meta  =  { SchemaVersion : SCHEMA_VERSION, AppVersion, SavedUtc : new Date().toISOString().replace(/\.\d+Z$/, 'Z') };
        try {
            window.localStorage.setItem(STORE_KEY, DistoImageMapper__UserConfig__Text());
        } catch (error) {
            return false;                                                    // <-- Blocked or full: this visit only
        }
        for (const key of OldKeysToDrop) {
            try { window.localStorage.removeItem(key); } catch (error) { /* leave it */ }
        }
        OldKeysToDrop  =  [];
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Write Soon (a Moment After the Last Change)
    // ------------------------------------------------------------
    export function DistoImageMapper__UserConfig__Save() {
        window.clearTimeout(SaveTimer);
        SaveTimer  =  window.setTimeout(DistoImageMapper__UserConfig__Write, SAVE_DELAY_MS);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Never Lose a Change Waiting to Be Written When the Page Goes
    // ------------------------------------------------------------
    function DistoImageMapper__UserConfig__Flush() {
        if (SaveTimer) DistoImageMapper__UserConfig__Write();
    }
    window.addEventListener('pagehide', DistoImageMapper__UserConfig__Flush);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') DistoImageMapper__UserConfig__Flush(); });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
