/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | INSPECT STATS
   =============================================================================

   FILE       : VghLantern__Env3d__InspectStats__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - InspectStats
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Turn a resolved pick into the labelled facts the inspector shows
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - The naming and numbers layer of the hover inspector. PickIndex answers 'which
     object', this module answers 'what is it and how many are there'.
   - Composed at hover time, not at build time. The pick table holds solver records
     only, so a finish change or a profile swap is reflected the next time the
     cursor moves without rebuilding a single mesh.
   - Reads through the same sources the rest of the app uses: the solved skeleton
     for geometry, ProfileIndexLoader for sections, ComponentIndexLoader for placed
     assets, and the lantern config for finish and glazing. It derives nothing of
     its own and stores nothing.

   ---------------------------------------------------------------------------

   OUTPUT CONTRACT - Description:

   {
       CategoryLabel : 'Structural Member',
       TypeLabel     : 'Glazing Bar',
       InstanceLabel : 'Instance 7 of 24',
       InstanceCount : 24,
       Facts         : [ { Label, Value } ]
   }

   Facts are ordered for reading, not alphabetically: what this one thing is,
   then how it sits in the model, then what it is made from.

   ---------------------------------------------------------------------------

   THE SLOPE KEY READS INVERTED, DELIBERATELY:
   A face carrying SlopeKey 'short+' is a LONG slope, and 'long+' is a hip end.
   The key names the axis the slope sits across rather than the rafter it runs,
   which is the same convention QuantityTakeoff buckets its glazing areas by. The
   label map below mirrors that module exactly; correcting the key here would put
   the inspector and the specification schedule into disagreement.

   ============================================================================= */

import { VghLantern__Env3d__ConfigAccess__RequireNumber } from './VghLantern__Env3d__ConfigAccess__.mjs';
import { VghLantern__Env3d__PickIndex__TableOf } from './VghLantern__Env3d__PickIndex__.mjs';

// =============================================================================
// REGION | 3D Inspect Stats Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Category and Member Role Display Names
    // ------------------------------------------------------------
    const CATEGORY_LABELS  =  {
        member     : 'Structural Member',
        glazing    : 'Glazing',
        base       : 'Base Assembly',
        component  : 'Placed Component'
    };

    const MEMBER_ROLE_LABELS  =  {
        glazingBar           : 'Glazing Bar',
        transom              : 'Horizontal Transom',
        ridge                : 'Ridge',
        hip                  : 'Hip',
        verge                : 'Verge',
        eaves                : 'Eaves',
        frame                : 'Base Frame',
        buildersUpstand      : 'Builders Upstand',
        buildersUpstandPost  : 'Builders Upstand Post'
    };

    const ANCHOR_ROLE_LABELS  =  {
        ridgeEnd   : 'Ridge End Component',
        apex       : 'Apex Component',
        finial     : 'Finial',
        finialBase : 'Finial Base',
        cresting   : 'Ridge Cresting'
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Slope Key Display Names
    // ------------------------------------------------------------
    // See the header note: the key names the axis, so 'short' is the long slope.
    const SLOPE_LABELS  =  {
        'short+'  : 'Long slope (+)',
        'short-'  : 'Long slope (-)',
        'long+'   : 'Hip end (+)',
        'long-'   : 'Hip end (-)'
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Roles Carrying the Builders Upstand Material
    // ------------------------------------------------------------
    // Mirrors MeshBuilder__Skeleton's own split, so the reported material always
    // matches the material the mesh was actually given.
    const ROLE_BUILDERS_UPSTAND_SET  =  ['buildersUpstand', 'buildersUpstandPost'];

    const MATERIAL_LABEL_FRAME       =  'Frame';
    const MATERIAL_LABEL_UPSTAND     =  'Builders upstand';
    const SUPPLIED_BY_OTHERS         =  'Others, built on site';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Lantern Config Block and Field Names
    // ------------------------------------------------------------
    const FINISH_BLOCK          =  'Lantern__FinishAndGlazing__Config';
    const FIELD_FRAME_FINISH    =  'Lantern__FinishAndGlazing__Config__FrameFinish';
    const FIELD_GLAZING_SPEC    =  'Lantern__FinishAndGlazing__Config__GlazingSpec';
    const FIELD_GLAZING_TINT    =  'Lantern__FinishAndGlazing__Config__GlazingTint';

    const VALUE_UNSPECIFIED     =  'Not specified';
    const VALUE_UNASSIGNED      =  'Not assigned';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Number Formatting
    // ------------------------------------------------------------
    const MM_PER_METRE      =  1000;
    const SQMM_PER_SQMETRE  =  1000000;
    const METRE_DP          =  2;                                            // <-- Matches QuantityTakeoff linear reporting
    const AREA_DP           =  3;                                            // <-- Matches QuantityTakeoff area reporting
    const DEGREE_DP         =  1;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Formatting Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Format a Millimetre Value With Thousands Separators
    // ------------------------------------------------------------
    function VghLantern__Env3d__InspectStats__Mm(value) {
        const rounded  =  Math.round(Number(value) || 0);
        return rounded.toLocaleString('en-GB') + ' mm';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format a Millimetre Value as Metres
    // ------------------------------------------------------------
    function VghLantern__Env3d__InspectStats__Metres(valueMm) {
        return ((Number(valueMm) || 0) / MM_PER_METRE).toFixed(METRE_DP) + ' m';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format a Square Millimetre Value as Square Metres
    // ------------------------------------------------------------
    function VghLantern__Env3d__InspectStats__SquareMetres(valueSqMm) {
        return ((Number(valueSqMm) || 0) / SQMM_PER_SQMETRE).toFixed(AREA_DP) + ' m²';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format an Angle in Degrees
    // ------------------------------------------------------------
    function VghLantern__Env3d__InspectStats__Degrees(value) {
        return (Number(value) || 0).toFixed(DEGREE_DP) + '°';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push a Fact Row, Skipping Empty Values
    // ------------------------------------------------------------
    // Keeps the panel free of rows reading 'undefined' when a record happens not to
    // carry a field, without every call site needing its own guard.
    function VghLantern__Env3d__InspectStats__Push(facts, label, value) {
        if (value === undefined || value === null || value === '') return;
        facts.push({ Label : label, Value : String(value) });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shared Lookups
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Lantern's Chosen Frame Finish
    // ------------------------------------------------------------
    function VghLantern__Env3d__InspectStats__FinishName(lantern) {
        if (!lantern) return '';

        const block  =  lantern[FINISH_BLOCK];
        return block ? (block[FIELD_FRAME_FINISH] || '') : '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Profile Index Entry a Role Uses
    // ------------------------------------------------------------
    // Both lookups are synchronous reads of memoised indexes, so this runs inside
    // the hover path without touching the network.
    function VghLantern__Env3d__InspectStats__ProfileForRole(lantern, roleKey) {
        const Loader  =  window.VghLantern__AppData__ProfileIndexLoader;
        if (!Loader || !lantern) return { ProfileId : '', Entry : null };

        const profileId  =  Loader.VghLantern__ProfileIndexLoader__ProfileIdForRole(lantern, roleKey) || '';
        const entry      =  profileId ? Loader.VghLantern__ProfileIndexLoader__GetEntry(profileId) : null;

        return { ProfileId : profileId, Entry : entry };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve a Component Index Entry by Asset Id
    // ------------------------------------------------------------
    function VghLantern__Env3d__InspectStats__ComponentEntry(componentId) {
        const Loader  =  window.VghLantern__AppData__ComponentIndexLoader;
        if (!Loader || !componentId) return null;

        return Loader.VghLantern__ComponentIndexLoader__GetEntry(componentId);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Describe the Section a Role Is Swept With
    // ------------------------------------------------------------
    // A role with no assigned profile is still swept, as the configured fallback
    // rectangle. Saying so is the point of the row: an unlabelled placeholder in
    // the model is exactly the thing an audit pass is looking for.
    function VghLantern__Env3d__InspectStats__SectionText(profileEntry) {
        if (profileEntry) {
            const width  =  Number(profileEntry.FaceWidthMm)    || 0;
            const depth  =  Number(profileEntry.SectionDepthMm) || 0;
            if (width > 0 && depth > 0) return width + ' x ' + depth + ' mm';
            return '';
        }

        const width   =  VghLantern__Env3d__ConfigAccess__RequireNumber('MeshBuilders', 'FallbackBarWidthMm');
        const depth   =  VghLantern__Env3d__ConfigAccess__RequireNumber('MeshBuilders', 'FallbackBarDepthMm');

        return width + ' x ' + depth + ' mm (placeholder)';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sum the Length of Every Entry in a Pick Table
    // ------------------------------------------------------------
    // The set total the inspector reports is summed from the same records that
    // produced the mesh, so it describes what is actually drawn rather than what a
    // separate schedule pass believes should be.
    function VghLantern__Env3d__InspectStats__TotalLengthMm(pick) {
        const table  =  VghLantern__Env3d__PickIndex__TableOf(pick.Object3d);
        if (!table || !Array.isArray(table.Entries)) return 0;

        let total  =  0;
        for (let i = 0; i < table.Entries.length; i++) {
            const record  =  table.Entries[i].Record;
            if (record) total  +=  Number(record.LengthMm) || 0;
        }
        return total;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sum the Area of Every Entry in a Pick Table
    // ------------------------------------------------------------
    function VghLantern__Env3d__InspectStats__TotalAreaSqMm(pick) {
        const table  =  VghLantern__Env3d__PickIndex__TableOf(pick.Object3d);
        if (!table || !Array.isArray(table.Entries)) return 0;

        let total  =  0;
        for (let i = 0; i < table.Entries.length; i++) {
            const record  =  table.Entries[i].Record;
            if (record) total  +=  Number(record.AreaSqMm) || 0;
        }
        return total;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Category Describers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Describe a Glaze Bar Part From What the Builder Stamped
    // ------------------------------------------------------------
    // A glaze bar part has no profile index entry to look up - it is one of three
    // sections in a composite, catalogued by the glaze bar system rather than by
    // the profile library. Left to the ordinary member path it reported "Profile:
    // Not assigned", a placeholder section size it does not have, and the frame's
    // material and finish, none of which is true of a bare aluminium core.
    //
    // Everything here comes from the userData the composite builder stamped on
    // the mesh, so the panel quotes the part that was actually extruded.
    // Returns null for any mesh that is not a glaze bar part.
    function VghLantern__Env3d__InspectStats__GlazeBarFacts(pick) {
        const object3d  =  pick.Object3d;
        const data      =  object3d ? object3d.userData : null;
        if (!data || !data.VghLantern__PartKey) return null;

        const facts  =  [];

        VghLantern__Env3d__InspectStats__Push(facts, 'Part',      data.VghLantern__PartName);
        VghLantern__Env3d__InspectStats__Push(facts, 'Asset',     data.VghLantern__AssetId);
        VghLantern__Env3d__InspectStats__Push(facts, 'Element',   data.VghLantern__ElementType);
        VghLantern__Env3d__InspectStats__Push(facts, 'Material',  data.VghLantern__SpecMaterial);

        // Material says what the part is made of, Finish says how it was specified,
        // and on a painted trim those are two different answers. Absent on the
        // core, which is never finished because it is never seen.
        VghLantern__Env3d__InspectStats__Push(facts, 'Finish',    data.VghLantern__PartFinish);

        if (typeof data.VghLantern__SectionAreaSqMm === 'number') {
            VghLantern__Env3d__InspectStats__Push(facts, 'Section area',
                (Math.round(data.VghLantern__SectionAreaSqMm * 10) / 10) + ' mm2');
        }

        return facts;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Describe a Structural Member
    // ------------------------------------------------------------
    function VghLantern__Env3d__InspectStats__DescribeMember(pick, lantern) {
        const member    =  pick.Record   || {};
        const roleKey   =  pick.RoleKey;
        const isUpstand =  ROLE_BUILDERS_UPSTAND_SET.indexOf(roleKey) !== -1;
        const glazeBar  =  VghLantern__Env3d__InspectStats__GlazeBarFacts(pick);
        const facts     =  [];

        VghLantern__Env3d__InspectStats__Push(facts, 'Member id',   member.Id);
        VghLantern__Env3d__InspectStats__Push(facts, 'Length',      VghLantern__Env3d__InspectStats__Mm(member.LengthMm));
        VghLantern__Env3d__InspectStats__Push(facts, 'Slope',       SLOPE_LABELS[member.SlopeKey]);

        VghLantern__Env3d__InspectStats__Push(facts, 'Instances in model', pick.EntryCount);
        VghLantern__Env3d__InspectStats__Push(facts, 'Total length',
            VghLantern__Env3d__InspectStats__Metres(VghLantern__Env3d__InspectStats__TotalLengthMm(pick)));

        // A glaze bar part describes itself. Everything else resolves a profile.
        if (glazeBar) {
            for (let i = 0; i < glazeBar.length; i++) facts.push(glazeBar[i]);

            return {
                TypeLabel : (pick.Object3d.userData.VghLantern__PartName || MEMBER_ROLE_LABELS[roleKey] || roleKey),
                Facts     : facts
            };
        }

        const profile  =  VghLantern__Env3d__InspectStats__ProfileForRole(lantern, roleKey);

        VghLantern__Env3d__InspectStats__Push(facts, 'Profile',
            profile.Entry ? (profile.Entry.Name + ' (' + profile.ProfileId + ')')
                          : (profile.ProfileId || VALUE_UNASSIGNED));
        VghLantern__Env3d__InspectStats__Push(facts, 'Section',
            VghLantern__Env3d__InspectStats__SectionText(profile.Entry));

        VghLantern__Env3d__InspectStats__Push(facts, 'Material',
            isUpstand ? MATERIAL_LABEL_UPSTAND : MATERIAL_LABEL_FRAME);
        VghLantern__Env3d__InspectStats__Push(facts, isUpstand ? 'Supplied by' : 'Finish',
            isUpstand ? SUPPLIED_BY_OTHERS
                      : (VghLantern__Env3d__InspectStats__FinishName(lantern) || VALUE_UNSPECIFIED));

        return {
            TypeLabel : MEMBER_ROLE_LABELS[roleKey] || roleKey,
            Facts     : facts
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Describe a Glazing Panel
    // ------------------------------------------------------------
    function VghLantern__Env3d__InspectStats__DescribeGlazing(pick, lantern) {
        const face    =  pick.Record  || {};
        const block   =  lantern ? lantern[FINISH_BLOCK] : null;
        const facts   =  [];

        VghLantern__Env3d__InspectStats__Push(facts, 'Face id',    face.Id);
        VghLantern__Env3d__InspectStats__Push(facts, 'Slope',      SLOPE_LABELS[face.SlopeKey] || face.SlopeKey);
        VghLantern__Env3d__InspectStats__Push(facts, 'Gross area', VghLantern__Env3d__InspectStats__SquareMetres(face.AreaSqMm));
        VghLantern__Env3d__InspectStats__Push(facts, 'Pitch',      VghLantern__Env3d__InspectStats__Degrees(face.PitchDegrees));

        VghLantern__Env3d__InspectStats__Push(facts, 'Panels in model', pick.EntryCount);
        VghLantern__Env3d__InspectStats__Push(facts, 'Total gross area',
            VghLantern__Env3d__InspectStats__SquareMetres(VghLantern__Env3d__InspectStats__TotalAreaSqMm(pick)));

        VghLantern__Env3d__InspectStats__Push(facts, 'Glazing spec', (block && block[FIELD_GLAZING_SPEC]) || VALUE_UNSPECIFIED);
        VghLantern__Env3d__InspectStats__Push(facts, 'Tint',        (block && block[FIELD_GLAZING_TINT]) || VALUE_UNSPECIFIED);
        VghLantern__Env3d__InspectStats__Push(facts, 'Unit thickness',
            VghLantern__Env3d__InspectStats__Mm(VghLantern__Env3d__ConfigAccess__RequireNumber('MeshBuilders', 'GlazingThicknessMm')));
        VghLantern__Env3d__InspectStats__Push(facts, 'Inner face above bar datum',
            VghLantern__Env3d__InspectStats__Mm(VghLantern__Env3d__ConfigAccess__RequireNumber('MeshBuilders', 'GlazingInnerFaceOffsetMm')));

        return {
            TypeLabel : 'Glazing Panel',
            Facts     : facts
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Describe a Base Frame System Part
    // ------------------------------------------------------------
    // The head beam, eaves extrusion, lead flashing and spot welds carry the
    // same userData stamp set the glaze bar parts do, so they are described
    // from the mesh rather than from the prism block.
    function VghLantern__Env3d__InspectStats__DescribeBaseFramePart(pick) {
        const data   =  pick.Object3d ? pick.Object3d.userData : {};
        const record =  pick.Record || {};
        const facts  =  [];

        if (data.VghLantern__AssetId)      VghLantern__Env3d__InspectStats__Push(facts, 'Product code', data.VghLantern__AssetId);
        if (data.VghLantern__SpecMaterial) VghLantern__Env3d__InspectStats__Push(facts, 'Material',     data.VghLantern__SpecMaterial);
        if (data.VghLantern__PartFinish)   VghLantern__Env3d__InspectStats__Push(facts, 'Finish',       data.VghLantern__PartFinish);
        if (record.PerimeterMm)            VghLantern__Env3d__InspectStats__Push(facts, 'Datum ring perimeter', VghLantern__Env3d__InspectStats__Metres(record.PerimeterMm));

        return {
            TypeLabel : data.VghLantern__PartName || pick.RoleKey,
            Facts     : facts
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Describe a Base Assembly Prism
    // ------------------------------------------------------------
    // The upstand and the frame share one footprint and one wall thickness, so they
    // report the same set-out and differ only in height and who supplies them.
    function VghLantern__Env3d__InspectStats__DescribeBase(pick, lantern) {
        if (pick.Object3d && pick.Object3d.userData && pick.Object3d.userData.VghLantern__PartName) {
            return VghLantern__Env3d__InspectStats__DescribeBaseFramePart(pick);
        }

        const base       =  pick.Record  || {};
        const isUpstand  =  pick.RoleKey !== 'frame';
        const facts      =  [];

        const heightMm  =  isUpstand ? base.UpstandHeightMm : base.FrameHeightMm;

        VghLantern__Env3d__InspectStats__Push(facts, 'Height',         VghLantern__Env3d__InspectStats__Mm(heightMm));
        VghLantern__Env3d__InspectStats__Push(facts, 'Wall thickness', VghLantern__Env3d__InspectStats__Mm(base.UpstandThicknessMm));
        VghLantern__Env3d__InspectStats__Push(facts, 'Outer size',
            VghLantern__Env3d__InspectStats__Mm((Number(base.OuterHalfWidthMm) || 0) * 2) + ' x ' +
            VghLantern__Env3d__InspectStats__Mm((Number(base.OuterHalfDepthMm) || 0) * 2));

        VghLantern__Env3d__InspectStats__Push(facts, 'Reveal',
            base.HasReveal
                ? (VghLantern__Env3d__InspectStats__Mm(base.RevealWidthMm) + ' x ' + VghLantern__Env3d__InspectStats__Mm(base.RevealDepthMm))
                : 'None, wall thickness leaves no opening');

        VghLantern__Env3d__InspectStats__Push(facts, 'Outer perimeter', VghLantern__Env3d__InspectStats__Metres(base.OuterPerimeterMm));
        VghLantern__Env3d__InspectStats__Push(facts, 'Instances in model', 1);

        VghLantern__Env3d__InspectStats__Push(facts, 'Material',
            isUpstand ? MATERIAL_LABEL_UPSTAND : MATERIAL_LABEL_FRAME);
        VghLantern__Env3d__InspectStats__Push(facts, isUpstand ? 'Supplied by' : 'Finish',
            isUpstand ? SUPPLIED_BY_OTHERS
                      : (VghLantern__Env3d__InspectStats__FinishName(lantern) || VALUE_UNSPECIFIED));

        return {
            TypeLabel : isUpstand ? 'Builders Upstand' : 'Base Frame',
            Facts     : facts
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Describe a Placed Component
    // ------------------------------------------------------------
    // Components are separate objects rather than one merged mesh, so the instance
    // count comes from the solved anchor list rather than from the pick table.
    function VghLantern__Env3d__InspectStats__DescribeComponent(pick, lantern, skeleton) {
        const record   =  pick.Record  || {};
        const anchor   =  record.Anchor || {};
        const entry    =  VghLantern__Env3d__InspectStats__ComponentEntry(record.ComponentId);
        const facts    =  [];

        let anchorCount  =  0;
        const anchors    =  (skeleton && skeleton.FinialAnchors) || [];
        for (let i = 0; i < anchors.length; i++) {
            if (anchors[i] && anchors[i].Role === anchor.Role) anchorCount++;
        }

        VghLantern__Env3d__InspectStats__Push(facts, 'Anchor id',   anchor.Id);
        VghLantern__Env3d__InspectStats__Push(facts, 'Anchor role', ANCHOR_ROLE_LABELS[anchor.Role] || anchor.Role);
        VghLantern__Env3d__InspectStats__Push(facts, 'Component',
            entry ? (entry.Name + ' (' + record.ComponentId + ')') : (record.ComponentId || VALUE_UNASSIGNED));

        if (entry) {
            VghLantern__Env3d__InspectStats__Push(facts, 'Overall height', VghLantern__Env3d__InspectStats__Mm(entry.OverallHeightMm));
            VghLantern__Env3d__InspectStats__Push(facts, 'Seating width',  VghLantern__Env3d__InspectStats__Mm(entry.SeatingWidthMm));
        }

        VghLantern__Env3d__InspectStats__Push(facts, 'Instances in model', anchorCount || 1);
        VghLantern__Env3d__InspectStats__Push(facts, 'Geometry',
            record.IsPlaceholder ? 'Placeholder, no 3D model authored yet' : 'Authored GLB model');
        VghLantern__Env3d__InspectStats__Push(facts, 'Finish',
            VghLantern__Env3d__InspectStats__FinishName(lantern) || VALUE_UNSPECIFIED);

        return {
            TypeLabel : (entry && entry.CategoryName)
                ? entry.CategoryName.replace(/s$/, '')                       // <-- 'Finials' names one finial
                : (ANCHOR_ROLE_LABELS[anchor.Role] || 'Placed Component'),
            Facts     : facts
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Description Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Describe a Resolved Pick as Labelled Facts
    // ------------------------------------------------------------
    // Returns null for an unrecognised category rather than a partial description,
    // so a future pickable class cannot silently render as a blank panel.
    export function VghLantern__Env3d__InspectStats__Describe(pick, skeleton, lantern) {
        if (!pick) return null;

        let described;

        if      (pick.CategoryKey === 'member')    described  =  VghLantern__Env3d__InspectStats__DescribeMember(pick, lantern);
        else if (pick.CategoryKey === 'glazing')   described  =  VghLantern__Env3d__InspectStats__DescribeGlazing(pick, lantern);
        else if (pick.CategoryKey === 'base')      described  =  VghLantern__Env3d__InspectStats__DescribeBase(pick, lantern);
        else if (pick.CategoryKey === 'component') described  =  VghLantern__Env3d__InspectStats__DescribeComponent(pick, lantern, skeleton);
        else return null;

        const instanceCount  =  (pick.CategoryKey === 'component') ? 1 : pick.EntryCount;

        return {
            CategoryLabel : CATEGORY_LABELS[pick.CategoryKey] || '',
            TypeLabel     : described.TypeLabel,
            InstanceLabel : instanceCount > 1
                ? ('Instance ' + (pick.EntryIndex + 1) + ' of ' + instanceCount)
                : '',                                                        // <-- A lone object needs no 1 of 1
            InstanceCount : instanceCount,
            Facts         : described.Facts
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
