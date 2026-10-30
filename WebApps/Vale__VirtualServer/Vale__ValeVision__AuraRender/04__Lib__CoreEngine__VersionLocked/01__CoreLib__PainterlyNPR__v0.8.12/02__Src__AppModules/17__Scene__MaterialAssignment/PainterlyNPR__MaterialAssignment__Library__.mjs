/* =============================================================================
   PAINTERLYNPR - SCENE | MATERIAL ASSIGNMENT - THE MATERIAL LIBRARY
   =============================================================================

   FILE       : PainterlyNPR__MaterialAssignment__Library__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Scene - MaterialAssignment - Library
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The material classes as a library: the register read (groups,
                search words, swatches), searched; and a drawing's assignments
                made, replaced and cleared
   CREATED    : 30-Oct-2026 (v0.7.0)

   DESCRIPTION:
   - The register (07__Data__MaterialRecipes) catalogues the classes; each class
     itself - Id, label, albedo, wash - is 13__Scene__MaterialClasses's, and is
     joined in as the register is read. Read when the Materials tab first opens.
   - Assignments are a drawing's data (State.Materials). Giving a class to
     what already has one replaces it: an object's own, and every face of it,
     go when the whole object is given a class; a face's own goes when that
     face is given one. So the list stays as short as what it says.

   ============================================================================= */

import AssignConfig from './Na__MaterialAssignment__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY as MATERIAL_BY_KEY } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';

// =============================================================================
// REGION | Material Assignment - The Material Library
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__MaterialAssignment__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const LIBRARY  =  PainterlyNPR__ConfigAccess__Section(AssignConfig, 'PainterlyNPR__MaterialAssignment__Config', 'Library', ['Root', 'RegisterFile', 'Api', 'MaxAssignments']);
    LIBRARY.Root  =  new URL('../../' + LIBRARY.Root, import.meta.url).href;   // <-- From the engine's own files, not the page: a wrapper's pinned copy reads the register pinned beside it (v0.8.2)
    const REGISTER_ROOT  =  'PainterlyNPR__MaterialLibrary__Register';
    // ------------------------------------------------------------


    // MODULE STATE | The Library as Last Read
    // ------------------------------------------------------------
    // Version moves each time the register is read again, so a swatch's URL
    // changes with it and the browser fetches the new picture.
    const MaterialLibrary  =  { Materials: [], ByKey: new Map(), Groups: [], SwatchFile: '', Loaded: false, Loading: null, Error: null, Version: 0 };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Register
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Register - once, or again when asked (after the factory writes)
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialAssignment__LoadLibrary(again) {
        if (MaterialLibrary.Loading && !again) return MaterialLibrary.Loading;
        MaterialLibrary.Loading  =  (async () => {
            try {
                const response  =  await fetch(LIBRARY.Root + LIBRARY.RegisterFile, { cache: 'no-store' });
                if (!response.ok) throw new Error(`the register answered ${response.status}`);
                const register  =  await response.json();
                const meta      =  PainterlyNPR__ConfigAccess__Section(register, REGISTER_ROOT, 'Meta', ['SwatchFile']);
                const groups    =  PainterlyNPR__ConfigAccess__Section(register, REGISTER_ROOT, 'Groups', ['Groups']).Groups;
                const listed    =  PainterlyNPR__ConfigAccess__Section(register, REGISTER_ROOT, 'Materials', ['Materials']).Materials;
                const materials  =  listed.filter(m => MATERIAL_BY_KEY[m.Key]).map(m => {
                    const cls  =  MATERIAL_BY_KEY[m.Key];
                    return Object.assign({}, m, { Id: cls.Id, Label: cls.Label, Albedo: cls.Albedo, Pigment: cls.Pigment });   // <-- The class is the truth for what the register only names
                });
                MaterialLibrary.SwatchFile  =  meta.SwatchFile;
                MaterialLibrary.Groups      =  groups.map(g => Object.assign({}, g, { Count: materials.filter(m => m.Group === g.Code).length }));
                MaterialLibrary.Materials   =  materials;
                MaterialLibrary.ByKey       =  new Map(materials.map(m => [m.Key, m]));
                MaterialLibrary.Loaded      =  true;
                MaterialLibrary.Error       =  null;
                MaterialLibrary.Version++;
            } catch (error) {
                MaterialLibrary.Error  =  `The material library could not be read (${error.message}).`;
                console.warn('[PainterlyNPR MaterialAssignment]', error);
            }
            return MaterialLibrary;
        })();
        return MaterialLibrary.Loading;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Swatch's File Name, and Its URL When It Is on Disk
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialAssignment__SwatchFile(material, slot) {
        return MaterialLibrary.SwatchFile.replace('{Id}', String(material.Id).padStart(2, '0')).replace('{Key}', material.Key).replace('{Slot}', slot);
    }

    function PainterlyNPR__MaterialAssignment__SwatchUrl(material, slot) {
        if (!material || !material.Swatches || !material.Swatches[slot]) return null;
        const version  =  encodeURIComponent(material.RenderedOn || '') + '.' + MaterialLibrary.Version;
        return `${LIBRARY.Root}${material.Folder}/${PainterlyNPR__MaterialAssignment__SwatchFile(material, slot)}?v=${version}`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Search the Library - words against key, label, group and tags, then a group
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialAssignment__Search(query, group) {
        const words  =  String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
        return MaterialLibrary.Materials.filter(m => {
            if (group && m.Group !== group) return false;
            if (!words.length) return true;
            const text  =  [m.Key, m.Label, m.Group, m.Description, ...(m.Tags || [])].join(' ').toLowerCase();
            return words.every(w => text.includes(w));
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | A Drawing's Assignments
// -----------------------------------------------------------------------------

    // FUNCTION | The Next Assignment Identity in a Drawing - M0001, M0002 ...
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialAssignment__NextUid(list) {
        const top  =  (list || []).reduce((m, a) => Math.max(m, parseInt(String(a.Uid).slice(1), 10) || 0), 0);
        return 'M' + String(top + 1).padStart(4, '0');
    }
    // ------------------------------------------------------------


    // FUNCTION | Give a Class - to an object (its key) or one of its faces
    // ------------------------------------------------------------
    // target: { Object: key, Face: null or the face's place }. Returns the new
    // list (the old one is left as it was) and the assignment made, or null
    // when the list is full.
    function PainterlyNPR__MaterialAssignment__Give(list, target, materialKey) {
        const face   =  target.Face == null ? null : target.Face;
        const kept   =  (list || []).filter(a => a.Object !== target.Object || (face !== null && (a.Target !== 'Face' || a.Face !== face)));
        if (kept.length >= LIBRARY.MaxAssignments) return { List: list, Made: null };
        const made   =  { Uid: PainterlyNPR__MaterialAssignment__NextUid(list), Target: face === null ? 'Object' : 'Face', Object: target.Object, Face: face, Material: materialKey };
        return { List: kept.concat([made]), Made: made };
    }
    // ------------------------------------------------------------


    // FUNCTION | Take Classes Off - an object's (and its faces'), one face's, or one plop's
    // ------------------------------------------------------------
    // what: { Object: key } every assignment on that object; { Object, Face }
    // that face's only; { Uid: plop } every part of a placed asset.
    function PainterlyNPR__MaterialAssignment__Clear(list, what) {
        return (list || []).filter(a => {
            if (what.Uid) return a.Object.split('.')[0] !== what.Uid;
            if (a.Object !== what.Object) return true;
            return what.Face != null && (a.Target !== 'Face' || a.Face !== what.Face);
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
        PainterlyNPR__MaterialAssignment__Clear,
        PainterlyNPR__MaterialAssignment__Give,
        PainterlyNPR__MaterialAssignment__LoadLibrary,
        PainterlyNPR__MaterialAssignment__NextUid,
        PainterlyNPR__MaterialAssignment__Search,
        PainterlyNPR__MaterialAssignment__SwatchFile,
        PainterlyNPR__MaterialAssignment__SwatchUrl,
        LIBRARY          as  PainterlyNPR__MaterialAssignment__LIBRARY,
        MaterialLibrary  as  PainterlyNPR__MaterialAssignment__MaterialLibrary,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
