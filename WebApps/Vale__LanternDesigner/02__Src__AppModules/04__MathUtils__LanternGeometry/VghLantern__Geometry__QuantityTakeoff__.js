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

   {
       Meta : {
           LanternId, LanternTitle, Quantity,
           RoofForm, WidthMm, DepthMm, PitchDegrees,
           IsDerivedFromValidGeometry
       },
       Linear     : [ { Key, Label, ProfileId, LengthMmEach, LengthMEach,
                        LengthMTotal, MemberCount } ],
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
    const BLOCK_KERB          =  'Lantern__KerbAndBase__Config';
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

    // HELPER FUNCTION | Push a Linear Section Row
    // ------------------------------------------------------------
    function VghLantern__QuantityTakeoff__PushLinear(rows, key, label, profileId, lengthMm, memberCount, quantity) {
        if (lengthMm <= 0) return;

        var lengthMEach  =  lengthMm / MM_PER_METRE;

        rows.push({
            Key          : key,
            Label        : label,
            ProfileId    : profileId || '',
            LengthMmEach : Math.round(lengthMm),
            LengthMEach  : VghLantern__QuantityTakeoff__Round(lengthMEach, LINEAR_DP),
            LengthMTotal : VghLantern__QuantityTakeoff__Round(lengthMEach * quantity, LINEAR_DP),
            MemberCount  : memberCount
        });
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
            Key         : key,
            Label       : label,
            ComponentId : componentId || '',
            CountEach   : countEach,
            CountTotal  : countEach * quantity
        });
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

        function totalFor(roleKey) {
            return Solver.VghLantern__SkeletonSolver__TotalLengthForRole(skeleton, roleKey);
        }
        function countFor(roleKey) {
            return Solver.VghLantern__SkeletonSolver__MembersByRole(skeleton, roleKey).length;
        }

        VghLantern__QuantityTakeoff__PushLinear(rows, 'ridge', 'Ridge Section',
            VghLantern__QuantityTakeoff__Read(lantern, BLOCK_RIDGE_HIPS, 'Lantern__RidgeAndHips__Config__RidgeProfileId', ''),
            totalFor('ridge'), countFor('ridge'), quantity);

        VghLantern__QuantityTakeoff__PushLinear(rows, 'hip', 'Hip Section',
            VghLantern__QuantityTakeoff__Read(lantern, BLOCK_RIDGE_HIPS, 'Lantern__RidgeAndHips__Config__HipProfileId', ''),
            totalFor('hip'), countFor('hip'), quantity);

        VghLantern__QuantityTakeoff__PushLinear(rows, 'eaves', 'Eaves Section',
            VghLantern__QuantityTakeoff__Read(lantern, BLOCK_KERB, 'Lantern__KerbAndBase__Config__EavesProfileId', ''),
            totalFor('eaves'), countFor('eaves'), quantity);

        // The kerb and the frame are prisms, not swept members, so their runs come
        // from the Base block rather than from a member-role total. Summing the
        // 'kerb' role would double-count: the solver draws that box at both its
        // base and its top, and each ring is one full perimeter.
        var base  =  skeleton.Base || {};

        VghLantern__QuantityTakeoff__PushLinear(rows, 'frame', 'Base Frame',
            VghLantern__QuantityTakeoff__Read(lantern, BLOCK_KERB, 'Lantern__KerbAndBase__Config__EavesProfileId', ''),
            (Number(base.FrameHeightMm) > 0 ? Number(base.OuterPerimeterMm) || 0 : 0), 4, quantity);

        VghLantern__QuantityTakeoff__PushLinear(rows, 'kerb', 'Kerb Upstand',
            VghLantern__QuantityTakeoff__Read(lantern, BLOCK_KERB, 'Lantern__KerbAndBase__Config__KerbProfileId', ''),
            (Number(base.KerbHeightMm) > 0 ? Number(base.OuterPerimeterMm) || 0 : 0), 4, quantity);

        if (barSet && barSet.Meta) {
            var barProfileId  =  VghLantern__QuantityTakeoff__Read(lantern, BLOCK_GLAZING_BARS, 'Lantern__GlazingBars__Config__BarProfileId', '');

            VghLantern__QuantityTakeoff__PushLinear(rows, 'glazingBar', 'Glazing Bar',
                barProfileId, barSet.Meta.TotalBarLengthMm,
                (barSet.Meta.LongSlopeBarCount * 2) + (barSet.Meta.ShortSlopeBarCount * 2),
                quantity);

            VghLantern__QuantityTakeoff__PushLinear(rows, 'transom', 'Horizontal Transom',
                barProfileId, barSet.Meta.TotalTransomLengthMm, barSet.Meta.TransomEnabled ? 2 : 0, quantity);
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

            for (j = 0; j < takeoffList[i].Components.length; j++) {
                row     =  takeoffList[i].Components[j];
                mapKey  =  row.Key + '::' + row.ComponentId;
                if (!componentMap[mapKey]) {
                    componentMap[mapKey]  =  { Key: row.Key, Label: row.Label, ComponentId: row.ComponentId, CountTotal: 0 };
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

        return {
            Linear      : flatten(linearMap, LINEAR_DP, 'LengthMTotal'),
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
