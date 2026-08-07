/* =============================================================================
   VGHLANTERN - QUANTITY TAKEOFF
   =============================================================================

   FILE       : VghLantern__Geometry__QuantityTakeoff__.js
   NAMESPACE  : VghLantern
   MODULE     : Geometry - QuantityTakeoff
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Derive the specification schedule from solved lantern geometry
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Converts a SolvedSkeleton plus its GlazeBarSet into the quantities the
     specification document lists: linear metres of each section, glazing areas,
     and discrete component counts.
   - The specification is ALWAYS derived, never hand-entered. This module is the
     only place those numbers come from, so a drawing and its schedule can never
     disagree.
   - Pure data in, pure data out. No DOM, no formatting decisions beyond unit
     conversion - presentation belongs to 35__System__SpecificationMode.

   ---------------------------------------------------------------------------

   OUTPUT CONTRACT - TakeoffResult:

   TWO LINEAR TABLES, ANSWERING DIFFERENT QUESTIONS:
   Linear is a purchasing figure - the total run of each section per lantern, which
   is what stock is ordered against. CuttingList is a workshop figure - the distinct
   lengths that run is broken into and how many of each. They are not the same
   number seen twice: fifty-two glaze bars on a hipped lantern are one common
   rafter length plus a progression of shorter bars wrapping each hip, and a run
   total cannot express that. The cut runs always sum back to the section run.

   Only sections whose individual members are solved carry cuts. The builders
   upstand and the base frame are continuous perimeter runs mitred on site, so they
   appear in Linear and are deliberately absent from CuttingList.

   {
       Meta : {
           LanternId, LanternTitle, Quantity,
           RoofForm, WidthMm, DepthMm, PitchDegrees,
           IsDerivedFromValidGeometry
       },
       Linear     : [ { Key, Label, ProfileId, RunMmEach, LengthMEach,
                        LengthMTotal, MemberCount, CutTypes?,
                        SectionWidthMm?, SectionHeightMm? } ],
       CuttingList: [ { Key, SectionKey, Label, ProfileId, TypeRef,
                        CutLengthMm, CountEach, CountTotal,
                        LengthMEach, LengthMTotal } ],
       Areas      : [ { Key, Label, AreaSqMmEach, AreaSqMEach, AreaSqMTotal } ],
       Components : [ { Key, Label, ComponentId, CountEach, CountTotal } ],
       Totals     : { LinearMEach, LinearMTotal,
                      GlazingAreaSqMEach, GlazingAreaSqMTotal,
                      ComponentCountTotal },
       Warnings   : [ string ]
   }

   "Each" values describe one lantern. "Total" values multiply by the lantern
   quantity from the identity block, which is what a works order needs.

   ============================================================================= */

// =============================================================================
// REGION | Quantity Takeoff Module
// =============================================================================

const VghLantern__Geometry__QuantityTakeoff = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Unit Factors and Config Block Keys
    // ------------------------------------------------------------
    const MM_PER_METRE        =  1000;                                       // <-- Linear conversion factor
    const SQMM_PER_SQMETRE    =  1000000;                                    // <-- Area conversion factor
    const LINEAR_DP           =  2;                                          // <-- Linear metres reported to 2 dp
    const AREA_DP             =  3;                                          // <-- Areas reported to 3 dp

    const BLOCK_IDENTITY      =  'Lantern__Identity__Config';
    const BLOCK_FORM          =  'Lantern__Form__Config';
    const BLOCK_DIMENSIONS    =  'Lantern__Dimensions__Config';
    const BLOCK_GLAZING_BARS  =  'Lantern__GlazingBars__Config';
    const BLOCK_RIDGE_HIPS    =  'Lantern__RidgeAndHips__Config';
    const BLOCK_FINIALS       =  'Lantern__Finials__Config';
    const BLOCK_UPSTAND          =  'Lantern__BuildersUpstandAndBase__Config';
    const BLOCK_VENTILATION   =  'Lantern__Ventilation__Config';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rounding and Read Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Round a Number to a Given Decimal Place Count
    // ------------------------------------------------------------
    function VghLantern__QuantityTakeoff__Round(value, decimalPlaces) {
        var factor  =  Math.pow(10, decimalPlaces);
        return Math.round((Number(value) || 0) * factor) / factor;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Config Field with a Fallback
    // ------------------------------------------------------------
    function VghLantern__QuantityTakeoff__Read(lantern, blockKey, fieldKey, fallbackValue) {
        var block  =  lantern[blockKey];
        if (!block) return fallbackValue;
        var value  =  block[fieldKey];
        return (value === undefined || value === null || value === '') ? fallbackValue : value;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Row Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Group a Member List Into Distinct Cut Lengths
    // ------------------------------------------------------------
    // A run total is not a cutting list. Fifty-two glaze bars on a hipped lantern
    // are not fifty-two different bars: the commons are all one length, and the
    // bars wrapping each hip step down in a regular progression, so the whole set
    // resolves to a handful of distinct cuts repeated many times. That handful is
    // what a saw is set to and what a workshop counts, and totalling the run threw
    // it away.
    //
    // Lengths are grouped on the nearest whole millimetre. Two bars whose solved
    // lengths differ in the third decimal are the same cut - nobody sets a saw to
    // a micron - and rounding first is what stops floating point noise splitting
    // one real type into two near-identical rows.
    //
    // Types are numbered longest first, which is the order a cutting list is
    // written in and the order stock is broken down in.
    function VghLantern__QuantityTakeoff__CutTypes(memberList, quantity) {
        if (!Array.isArray(memberList) || memberList.length === 0) return [];

        var buckets  =  {};
        var i, lengthMm, key;

        for (i = 0; i < memberList.length; i++) {
            lengthMm  =  Number(memberList[i] && memberList[i].LengthMm) || 0;
            if (lengthMm <= 0) continue;

            key  =  String(Math.round(lengthMm));
            if (!buckets[key]) buckets[key]  =  { LengthMm : Math.round(lengthMm), CountEach : 0 };
            buckets[key].CountEach++;
        }

        var types  =  Object.keys(buckets).map(function(k) { return buckets[k]; });
        types.sort(function(a, b) { return b.LengthMm - a.LengthMm; });

        var out  =  [];
        for (i = 0; i < types.length; i++) {
            var runMEach  =  (types[i].LengthMm * types[i].CountEach) / MM_PER_METRE;

            out.push({
                TypeRef      : 'T' + String(i + 1).padStart(2, '0'),
                LengthMm     : types[i].LengthMm,
                CountEach    : types[i].CountEach,
                CountTotal   : types[i].CountEach * quantity,
                LengthMEach  : VghLantern__QuantityTakeoff__Round(runMEach, LINEAR_DP),
                LengthMTotal : VghLantern__QuantityTakeoff__Round(runMEach * quantity, LINEAR_DP)
            });
        }
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push a Linear Section Row
    // ------------------------------------------------------------
    // lengthMm is the TOTAL run for one lantern, not the length of one member.
    // sectionSizeOpts may carry SectionWidthMm / SectionHeightMm for prism
    // members (base frame) where pricing needs the ring beam cross-section, and
    // MemberList for the sections whose individual members are known, which is
    // what lets the cutting list below report real cut lengths.
    function VghLantern__QuantityTakeoff__PushLinear(rows, key, label, profileId, lengthMm, memberCount, quantity, sectionSizeOpts) {
        if (lengthMm <= 0) return;

        var lengthMEach  =  lengthMm / MM_PER_METRE;

        var row  =  {
            Key          : key,
            Label        : label,
            ProfileId    : profileId || '',
            RunMmEach    : Math.round(lengthMm),
            LengthMEach  : VghLantern__QuantityTakeoff__Round(lengthMEach, LINEAR_DP),
            LengthMTotal : VghLantern__QuantityTakeoff__Round(lengthMEach * quantity, LINEAR_DP),
            MemberCount  : memberCount
        };

        if (sectionSizeOpts && Array.isArray(sectionSizeOpts.MemberList)) {
            row.CutTypes  =  VghLantern__QuantityTakeoff__CutTypes(sectionSizeOpts.MemberList, quantity);
        }

        if (sectionSizeOpts) {
            if (sectionSizeOpts.SectionWidthMm  != null) row.SectionWidthMm  =  Math.round(Number(sectionSizeOpts.SectionWidthMm)  || 0);
            if (sectionSizeOpts.SectionHeightMm != null) row.SectionHeightMm =  Math.round(Number(sectionSizeOpts.SectionHeightMm) || 0);

            // Carried for the parts that know their own section: area times run
            // gives a volume, and volume times density gives a weight, which is
            // what a materials schedule is costed from.
            if (sectionSizeOpts.SectionAreaSqMm != null) row.SectionAreaSqMm =  VghLantern__QuantityTakeoff__Round(Number(sectionSizeOpts.SectionAreaSqMm) || 0, 2);
            if (sectionSizeOpts.ElementType)             row.ElementType     =  sectionSizeOpts.ElementType;
            if (sectionSizeOpts.SpecMaterial)            row.SpecMaterial    =  sectionSizeOpts.SpecMaterial;
        }

        rows.push(row);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Describe the Three Parts of This Lantern's Glaze Bar
    // ------------------------------------------------------------
    // Falls back to an empty list when the glaze bar system has not loaded, which
    // drops the bar rows from the takeoff rather than inventing them. A takeoff
    // that is silently short is recoverable; one carrying a guessed section area
    // that gets costed is not.
    function VghLantern__QuantityTakeoff__GlazeBarParts(lantern) {
        var Loader  =  window.VghLantern__AppData__GlazeBarSystemLoader;
        if (!Loader) return [];

        return Loader.VghLantern__GlazeBarSystemLoader__DescribeParts(lantern) || [];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply the Per-Part Eaves End Adjustment to Bar Lengths
    // ------------------------------------------------------------
    // Returns { Members, TotalMm }: the same bar records where no adjustment
    // applies, shallow copies with an adjusted LengthMm where one does. The
    // delta comes from the BaseFrameAssembly geometry module - core and cap
    // extensions along the pitch, trim plumb cut to the long point - so this
    // list and the 3D solids are cut by one set of maths. Without the module
    // the datum lengths pass through untouched.
    function VghLantern__QuantityTakeoff__AdjustedBarMembers(partKey, members, eavesLevelMm, trimDepthMm) {
        var Assembly  =  window.VghLantern__Geometry__BaseFrameAssembly;
        var out       =  [];
        var totalMm   =  0;
        var i, bar, deltaMm;

        for (i = 0; i < members.length; i++) {
            bar      =  members[i];
            deltaMm  =  Assembly
                ? Assembly.VghLantern__BaseFrameAssembly__PartLengthDeltaMm(partKey, bar, eavesLevelMm, trimDepthMm)
                : 0;

            if (deltaMm === 0) {
                out.push(bar);
            } else {
                out.push({
                    Id       : bar.Id,
                    Role     : bar.Role,
                    SlopeKey : bar.SlopeKey,
                    Start    : bar.Start,
                    End      : bar.End,
                    EavesEnd : bar.EavesEnd,
                    LengthMm : bar.LengthMm + deltaMm
                });
            }
            totalMm  +=  out[out.length - 1].LengthMm;
        }

        return { Members: out, TotalMm: totalMm };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push an Area Row
    // ------------------------------------------------------------
    function VghLantern__QuantityTakeoff__PushArea(rows, key, label, areaSqMm, quantity) {
        if (areaSqMm <= 0) return;

        var areaSqMEach  =  areaSqMm / SQMM_PER_SQMETRE;

        rows.push({
            Key          : key,
            Label        : label,
            AreaSqMmEach : Math.round(areaSqMm),
            AreaSqMEach  : VghLantern__QuantityTakeoff__Round(areaSqMEach, AREA_DP),
            AreaSqMTotal : VghLantern__QuantityTakeoff__Round(areaSqMEach * quantity, AREA_DP)
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push a Discrete Component Row
    // ------------------------------------------------------------
    function VghLantern__QuantityTakeoff__PushComponent(rows, key, label, componentId, countEach, quantity) {
        if (countEach <= 0) return;

        rows.push({
            Key           : key,
            Label         : label,
            ComponentId   : componentId || '',
            ComponentName : VghLantern__QuantityTakeoff__ComponentName(componentId),
            CountEach     : countEach,
            CountTotal    : countEach * quantity
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve a Component Id to Its Product Name
    // ------------------------------------------------------------
    // Label says what the component IS on the lantern ('Finial'); this says
    // WHICH one was specified ('Ball Finial'). The name is read from the
    // component index, which resolves it in priority order: the asset's own
    // Na__Asset__ValeSpec__ProductName once the Vale spec audit fills it in,
    // then a hand-authored metadata name, then a label derived from the file
    // naming standard. Nothing is fetched - the index is already resident.
    function VghLantern__QuantityTakeoff__ComponentName(componentId) {
        if (!componentId) return '';

        var ComponentLoader  =  window.VghLantern__AppData__ComponentIndexLoader;
        if (!ComponentLoader) return '';

        var entry  =  ComponentLoader.VghLantern__ComponentIndexLoader__GetEntry(componentId);
        return (entry && entry.Name) ? entry.Name : '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Takeoff Sections
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build Linear Section Rows from Skeleton and Bar Set
    // ------------------------------------------------------------
    function VghLantern__QuantityTakeoff__BuildLinearRows(skeleton, barSet, lantern, quantity) {
        var Solver  =  window.VghLantern__Geometry__SkeletonSolver;
        var rows    =  [];

        function membersFor(roleKey) {
            return Solver.VghLantern__SkeletonSolver__MembersByRole(skeleton, roleKey) || [];
        }
        function totalFor(roleKey) {
            return Solver.VghLantern__SkeletonSolver__TotalLengthForRole(skeleton, roleKey);
        }
        function countFor(roleKey) {
            return membersFor(roleKey).length;
        }

        VghLantern__QuantityTakeoff__PushLinear(rows, 'ridge', 'Ridge Section',
            VghLantern__QuantityTakeoff__Read(lantern, BLOCK_RIDGE_HIPS, 'Lantern__RidgeAndHips__Config__RidgeProfileId', ''),
            totalFor('ridge'), countFor('ridge'), quantity,
            { MemberList : membersFor('ridge') });

        VghLantern__QuantityTakeoff__PushLinear(rows, 'hip', 'Hip Section',
            VghLantern__QuantityTakeoff__Read(lantern, BLOCK_RIDGE_HIPS, 'Lantern__RidgeAndHips__Config__HipProfileId', ''),
            totalFor('hip'), countFor('hip'), quantity,
            { MemberList : membersFor('hip') });

        // THE BASE FRAME SYSTEM - three continuous rings around the lantern,
        // read from the base frame system index so the names, product codes and
        // specification materials come from data rather than being restated:
        //   headBeam        46_1001  Sapele, 125 x 96, runs the outer envelope
        //   eavesExtrusion  46_1002  mill aluminium ring on the eaves datum
        //   leadFlashing    46_1003  patination oiled lead, over the envelope
        // The old generic 'frame' prism row this replaces carried no profile id
        // and upstand-derived section sizes.
        var base  =  skeleton.Base || {};
        var meta  =  skeleton.Meta || {};

        var outerPerimeterMm  =  Number(base.OuterPerimeterMm) || 0;
        var datumPerimeterMm  =  ((Number(meta.EavesHalfWidthMm) || 0) + (Number(meta.EavesHalfDepthMm) || 0)) * 4;

        var BaseFrameLoader  =  window.VghLantern__AppData__BaseFrameSystemLoader;
        var basePartList     =  BaseFrameLoader ? (BaseFrameLoader.VghLantern__BaseFrameSystemLoader__DescribeParts() || []) : [];
        var basePartRuns     =  { headBeam: outerPerimeterMm, eavesExtrusion: datumPerimeterMm, leadFlashing: outerPerimeterMm };
        var basePartIndex, basePart, basePartRun;

        for (basePartIndex = 0; basePartIndex < basePartList.length; basePartIndex++) {
            basePart     =  basePartList[basePartIndex];
            basePartRun  =  Number(basePartRuns[basePart.PartKey]) || 0;

            VghLantern__QuantityTakeoff__PushLinear(rows, 'baseFrame__' + basePart.PartKey, basePart.PartName,
                basePart.AssetId, basePartRun, 4, quantity, {
                    SectionWidthMm  : Math.abs((Number(basePart.SectionMaxXMm) || 0) - (Number(basePart.SectionMinXMm) || 0)),
                    SectionHeightMm : Math.abs((Number(basePart.SectionMaxYMm) || 0) - (Number(basePart.SectionMinYMm) || 0)),
                    ElementType     : basePart.ElementType,
                    SpecMaterial    : basePart.SpecMaterial
                });
        }

        // Before the system index has loaded the base frame rows would vanish
        // entirely, so a single fallback row keeps the timber visible using the
        // solver's own head beam numbers.
        if (basePartList.length === 0) {
            VghLantern__QuantityTakeoff__PushLinear(rows, 'baseFrame__headBeam', 'Head Beam',
                '46_1001', outerPerimeterMm, 4, quantity, {
                    SectionWidthMm  : Number(meta.HeadBeamWidthMm)  || 0,
                    SectionHeightMm : Number(meta.HeadBeamHeightMm) || 0,
                    ElementType     : 'Structural',
                    SpecMaterial    : 'Sapele Hardwood'
                });
        }

        VghLantern__QuantityTakeoff__PushLinear(rows, 'buildersUpstand', 'Builders Upstand',
            VghLantern__QuantityTakeoff__Read(lantern, BLOCK_UPSTAND, 'Lantern__BuildersUpstandAndBase__Config__UpstandProfileId', ''),
            (Number(base.UpstandHeightMm) > 0 ? outerPerimeterMm : 0), 4, quantity);

        // A glaze bar is three parts, so it is three rows - and the three parts
        // no longer share one length. At the eaves end of every glazing bar the
        // core extends 42.5mm along the pitch past the eaves datum, the cap
        // extends 170mm, and the trim stops short of the datum at a vertical
        // plumb cut whose reported length is to the LONG POINT (the bottom
        // arris - the ordering length of the sawn piece). The adjustments come
        // from VghLantern__Geometry__BaseFrameAssembly, the same maths the 3D
        // solids are cut with, so a length here is the length of a solid that
        // exists in the model. Transoms never touch the eaves and pass through
        // unadjusted.
        //
        // The parts are read from the glaze bar system rather than named here, so
        // a change of trim depth reaches the takeoff without an edit and the
        // section areas quoted are the ones actually extruded.
        if (barSet && barSet.Meta) {
            var barParts  =  VghLantern__QuantityTakeoff__GlazeBarParts(lantern);
            var allBars   =  Array.isArray(barSet.Bars) ? barSet.Bars : [];
            var partIndex, barPart, adjusted;

            var barMembers      =  allBars.filter(function(bar) { return bar && bar.Role !== 'transom'; });
            var transomMembers  =  allBars.filter(function(bar) { return bar && bar.Role === 'transom'; });

            for (partIndex = 0; partIndex < barParts.length; partIndex++) {
                barPart   =  barParts[partIndex];
                adjusted  =  VghLantern__QuantityTakeoff__AdjustedBarMembers(
                    barPart.PartKey, barMembers, meta.EavesLevelMm, barPart.DepthMm);

                VghLantern__QuantityTakeoff__PushLinear(rows, 'glazeBar__' + barPart.PartKey, barPart.PartName,
                    barPart.AssetId, adjusted.TotalMm, barMembers.length, quantity,
                    { SectionAreaSqMm : barPart.SectionAreaSqMm, ElementType : barPart.ElementType,
                      SpecMaterial : barPart.SpecMaterial, MemberList : adjusted.Members });

                VghLantern__QuantityTakeoff__PushLinear(rows, 'transom__' + barPart.PartKey, barPart.PartName + ' - Transom',
                    barPart.AssetId, barSet.Meta.TotalTransomLengthMm, transomMembers.length, quantity,
                    { SectionAreaSqMm : barPart.SectionAreaSqMm, ElementType : barPart.ElementType,
                      SpecMaterial : barPart.SpecMaterial, MemberList : transomMembers });
            }
        }

        var crestingEnabled  =  VghLantern__QuantityTakeoff__Read(lantern, BLOCK_RIDGE_HIPS, 'Lantern__RidgeAndHips__Config__CrestingEnabled', false) === true;
        if (crestingEnabled) {
            VghLantern__QuantityTakeoff__PushLinear(rows, 'cresting', 'Ridge Cresting',
                VghLantern__QuantityTakeoff__Read(lantern, BLOCK_RIDGE_HIPS, 'Lantern__RidgeAndHips__Config__CrestingComponentId', ''),
                totalFor('ridge'), countFor('ridge'), quantity);
        }

        return rows;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Flatten Every Section's Cut Types Into One Cutting List
    // ------------------------------------------------------------
    // One row per section per distinct cut length, in section order and longest
    // cut first within each section. This is the table a workshop sets a saw
    // from, so it deliberately leads with the cut length and the number off
    // rather than with a run total, which is a purchasing figure and not a
    // cutting one.
    //
    // Sections whose members are not individually known contribute nothing: the
    // builders upstand and the base frame are continuous perimeter runs mitred on
    // site, and inventing four equal "cuts" for them would read as instruction.
    function VghLantern__QuantityTakeoff__BuildCuttingListRows(linearRows) {
        var rows  =  [];
        var i, j, section, cut;

        for (i = 0; i < linearRows.length; i++) {
            section  =  linearRows[i];
            if (!Array.isArray(section.CutTypes) || section.CutTypes.length === 0) continue;

            for (j = 0; j < section.CutTypes.length; j++) {
                cut  =  section.CutTypes[j];

                rows.push({
                    Key           : section.Key + '__' + cut.TypeRef,
                    SectionKey    : section.Key,
                    Label         : section.Label,
                    ProfileId     : section.ProfileId,
                    TypeRef       : cut.TypeRef,
                    CutLengthMm   : cut.LengthMm,
                    CountEach     : cut.CountEach,
                    CountTotal    : cut.CountTotal,
                    LengthMEach   : cut.LengthMEach,
                    LengthMTotal  : cut.LengthMTotal,
                    ElementType   : section.ElementType  || '',
                    SpecMaterial  : section.SpecMaterial || ''
                });
            }
        }
        return rows;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Glazing Area Rows from Solved Faces
    // ------------------------------------------------------------
    // Reported gross to the glazing line, because the bar count and therefore the
    // net pane area changes constantly during design; the gross slope area is the
    // stable figure the glazing supplier quotes against.
    function VghLantern__QuantityTakeoff__BuildAreaRows(skeleton, quantity) {
        var rows       =  [];
        var longArea   =  0;
        var endArea    =  0;
        var i, face;

        for (i = 0; i < skeleton.Faces.length; i++) {
            face  =  skeleton.Faces[i];
            if (face.SlopeKey === 'short-' || face.SlopeKey === 'short+') {
                longArea  +=  face.AreaSqMm;
            } else {
                endArea   +=  face.AreaSqMm;
            }
        }

        VghLantern__QuantityTakeoff__PushArea(rows, 'glazingLongSlopes', 'Glazing - Long Slopes', longArea, quantity);
        VghLantern__QuantityTakeoff__PushArea(rows, 'glazingHipEnds',    'Glazing - Hip Ends',    endArea,  quantity);
        VghLantern__QuantityTakeoff__PushArea(rows, 'glazingTotal',      'Glazing - Total Gross', longArea + endArea, quantity);

        return rows;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Discrete Component Rows
    // ------------------------------------------------------------
    function VghLantern__QuantityTakeoff__BuildComponentRows(skeleton, lantern, quantity) {
        var rows  =  [];

        var finialsEnabled  =  VghLantern__QuantityTakeoff__Read(lantern, BLOCK_FINIALS, 'Lantern__Finials__Config__Enabled', false) === true;
        if (finialsEnabled) {
            var anchorCount  =  (skeleton.FinialAnchors || []).length;

            VghLantern__QuantityTakeoff__PushComponent(rows, 'finial', 'Finial',
                VghLantern__QuantityTakeoff__Read(lantern, BLOCK_FINIALS, 'Lantern__Finials__Config__FinialComponentId', ''),
                anchorCount, quantity);

            var baseId  =  VghLantern__QuantityTakeoff__Read(lantern, BLOCK_FINIALS, 'Lantern__Finials__Config__FinialBaseComponentId', '');
            if (baseId) {
                VghLantern__QuantityTakeoff__PushComponent(rows, 'finialBase', 'Finial Base', baseId, anchorCount, quantity);
            }
        }

        var ventEnabled  =  VghLantern__QuantityTakeoff__Read(lantern, BLOCK_VENTILATION, 'Lantern__Ventilation__Config__Enabled', false) === true;
        if (ventEnabled) {
            VghLantern__QuantityTakeoff__PushComponent(rows, 'ventilator', 'Ventilator',
                VghLantern__QuantityTakeoff__Read(lantern, BLOCK_VENTILATION, 'Lantern__Ventilation__Config__VentComponentId', ''),
                Number(VghLantern__QuantityTakeoff__Read(lantern, BLOCK_VENTILATION, 'Lantern__Ventilation__Config__VentCount', 0)) || 0,
                quantity);
        }

        return rows;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Takeoff Entry Points
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Takeoff for One Lantern
    // ------------------------------------------------------------
    function VghLantern__QuantityTakeoff__BuildForLantern(skeleton, barSet, lantern) {
        if (!skeleton || !skeleton.Meta || !lantern) return null;

        var warnings  =  [];
        var quantity  =  Math.max(1, Number(VghLantern__QuantityTakeoff__Read(lantern, BLOCK_IDENTITY, 'Lantern__Identity__Config__Quantity', 1)) || 1);

        if (!skeleton.Meta.IsValid) {
            warnings.push('Geometry is invalid - quantities are indicative only.');
        }

        var linearRows     =  VghLantern__QuantityTakeoff__BuildLinearRows(skeleton, barSet, lantern, quantity);
        var areaRows       =  VghLantern__QuantityTakeoff__BuildAreaRows(skeleton, quantity);
        var componentRows  =  VghLantern__QuantityTakeoff__BuildComponentRows(skeleton, lantern, quantity);

        var linearMEach       =  0;
        var componentTotal    =  0;
        var glazingSqMEach    =  0;
        var i;

        for (i = 0; i < linearRows.length; i++)    linearMEach     +=  linearRows[i].LengthMEach;
        for (i = 0; i < componentRows.length; i++) componentTotal  +=  componentRows[i].CountTotal;
        for (i = 0; i < areaRows.length; i++) {
            if (areaRows[i].Key === 'glazingTotal') glazingSqMEach  =  areaRows[i].AreaSqMEach;
        }

        return {
            Meta : {
                LanternId                   : VghLantern__QuantityTakeoff__Read(lantern, BLOCK_IDENTITY, 'Lantern__Identity__Config__Id', ''),
                LanternTitle                : VghLantern__QuantityTakeoff__Read(lantern, BLOCK_IDENTITY, 'Lantern__Identity__Config__Title', ''),
                Quantity                    : quantity,
                RoofForm                    : VghLantern__QuantityTakeoff__Read(lantern, BLOCK_FORM, 'Lantern__Form__Config__RoofForm', ''),
                WidthMm                     : VghLantern__QuantityTakeoff__Read(lantern, BLOCK_DIMENSIONS, 'Lantern__Dimensions__Config__WidthMm', 0),
                DepthMm                     : VghLantern__QuantityTakeoff__Read(lantern, BLOCK_DIMENSIONS, 'Lantern__Dimensions__Config__DepthMm', 0),
                PitchDegrees                : VghLantern__QuantityTakeoff__Round(skeleton.Meta.PitchDegrees, 1),
                IsDerivedFromValidGeometry  : skeleton.Meta.IsValid === true
            },
            Linear      : linearRows,
            CuttingList : VghLantern__QuantityTakeoff__BuildCuttingListRows(linearRows),
            Areas       : areaRows,
            Components  : componentRows,
            Totals : {
                LinearMEach          : VghLantern__QuantityTakeoff__Round(linearMEach, LINEAR_DP),
                LinearMTotal         : VghLantern__QuantityTakeoff__Round(linearMEach * quantity, LINEAR_DP),
                GlazingAreaSqMEach   : glazingSqMEach,
                GlazingAreaSqMTotal  : VghLantern__QuantityTakeoff__Round(glazingSqMEach * quantity, AREA_DP),
                ComponentCountTotal  : componentTotal
            },
            Warnings : warnings
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Aggregate Several Lantern Takeoffs into a Project Summary
    // ------------------------------------------------------------
    // Used by the specification document when a project contains more than one
    // lantern. Rows are merged on Key + ProfileId so a shared section appears
    // once with a combined length.
    function VghLantern__QuantityTakeoff__AggregateProject(takeoffList) {
        var linearMap     =  {};
        var cutMap        =  {};
        var componentMap  =  {};
        var totalLinearM  =  0;
        var totalGlazing  =  0;
        var totalCount    =  0;
        var i, j, row, mapKey;

        for (i = 0; i < takeoffList.length; i++) {
            if (!takeoffList[i]) continue;

            for (j = 0; j < takeoffList[i].Linear.length; j++) {
                row     =  takeoffList[i].Linear[j];
                mapKey  =  row.Key + '::' + row.ProfileId;
                if (!linearMap[mapKey]) {
                    linearMap[mapKey]  =  { Key: row.Key, Label: row.Label, ProfileId: row.ProfileId, LengthMTotal: 0 };
                }
                linearMap[mapKey].LengthMTotal  +=  row.LengthMTotal;
            }

            // Cuts merge on section AND length, never on the type reference. Two
            // lanterns of different sizes both have a longest common rafter called
            // T01 and they are not the same cut, so merging on the label would
            // silently add unlike pieces together. The merged list is renumbered
            // afterwards so the project sheet reads T01 down again.
            for (j = 0; j < (takeoffList[i].CuttingList || []).length; j++) {
                row     =  takeoffList[i].CuttingList[j];
                mapKey  =  row.SectionKey + '::' + row.ProfileId + '::' + row.CutLengthMm;
                if (!cutMap[mapKey]) {
                    cutMap[mapKey]  =  {
                        SectionKey    : row.SectionKey,
                        Label         : row.Label,
                        ProfileId     : row.ProfileId,
                        CutLengthMm   : row.CutLengthMm,
                        CountTotal    : 0,
                        LengthMTotal  : 0,
                        ElementType   : row.ElementType,
                        SpecMaterial  : row.SpecMaterial
                    };
                }
                cutMap[mapKey].CountTotal    +=  row.CountTotal;
                cutMap[mapKey].LengthMTotal  +=  row.LengthMTotal;
            }

            for (j = 0; j < takeoffList[i].Components.length; j++) {
                row     =  takeoffList[i].Components[j];
                mapKey  =  row.Key + '::' + row.ComponentId;
                if (!componentMap[mapKey]) {
                    componentMap[mapKey]  =  {
                        Key           : row.Key,
                        Label         : row.Label,
                        ComponentId   : row.ComponentId,
                        ComponentName : row.ComponentName,
                        CountTotal    : 0
                    };
                }
                componentMap[mapKey].CountTotal  +=  row.CountTotal;
            }

            totalLinearM  +=  takeoffList[i].Totals.LinearMTotal;
            totalGlazing  +=  takeoffList[i].Totals.GlazingAreaSqMTotal;
            totalCount    +=  takeoffList[i].Totals.ComponentCountTotal;
        }

        function flatten(sourceMap, roundDp, roundField) {
            var out  =  [];
            var key;
            for (key in sourceMap) {
                if (!Object.prototype.hasOwnProperty.call(sourceMap, key)) continue;
                if (roundField) sourceMap[key][roundField]  =  VghLantern__QuantityTakeoff__Round(sourceMap[key][roundField], roundDp);
                out.push(sourceMap[key]);
            }
            return out;
        }

        // Renumber the merged cuts: grouped by section in the order the sections
        // were first met, longest cut first inside each, so the project sheet
        // reads T01 down exactly as a single-lantern sheet does.
        var sectionOrder  =  [];
        var mergedCuts    =  flatten(cutMap, LINEAR_DP, 'LengthMTotal');

        for (i = 0; i < mergedCuts.length; i++) {
            if (sectionOrder.indexOf(mergedCuts[i].SectionKey) === -1) sectionOrder.push(mergedCuts[i].SectionKey);
        }
        mergedCuts.sort(function(a, b) {
            var bySection  =  sectionOrder.indexOf(a.SectionKey) - sectionOrder.indexOf(b.SectionKey);
            return bySection !== 0 ? bySection : (b.CutLengthMm - a.CutLengthMm);
        });

        var runningSection  =  '';
        var runningIndex    =  0;
        for (i = 0; i < mergedCuts.length; i++) {
            if (mergedCuts[i].SectionKey !== runningSection) {
                runningSection  =  mergedCuts[i].SectionKey;
                runningIndex    =  0;
            }
            runningIndex++;
            mergedCuts[i].TypeRef  =  'T' + String(runningIndex).padStart(2, '0');
            mergedCuts[i].Key      =  mergedCuts[i].SectionKey + '__' + mergedCuts[i].TypeRef;
        }

        return {
            Linear      : flatten(linearMap, LINEAR_DP, 'LengthMTotal'),
            CuttingList : mergedCuts,
            Components  : flatten(componentMap, 0, null),
            Totals : {
                LinearMTotal         : VghLantern__QuantityTakeoff__Round(totalLinearM, LINEAR_DP),
                GlazingAreaSqMTotal  : VghLantern__QuantityTakeoff__Round(totalGlazing, AREA_DP),
                ComponentCountTotal  : totalCount
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__QuantityTakeoff__BuildForLantern    : VghLantern__QuantityTakeoff__BuildForLantern,
        VghLantern__QuantityTakeoff__AggregateProject   : VghLantern__QuantityTakeoff__AggregateProject
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__QuantityTakeoff  =  VghLantern__Geometry__QuantityTakeoff;
