/* =============================================================================
   VGHLANTERN - APP UTILS | JOINERY FINISH SYNC
   =============================================================================

   FILE       : VghLantern__AppUtils__JoineryFinishSync__.js
   NAMESPACE  : VghLantern
   MODULE     : AppUtils - JoineryFinishSync
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Keep finish macros and their consumers in lockstep
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - JOINERY PAINT FINISH: job macro for interior paint. Changing it writes the
     same value onto glaze bar trim, interior cornice and eaves trim.
   - EXTERIOR FINISH (FrameFinish): job macro for exterior coating. Changing it
     writes the same value onto glaze bar CAP finish only - core and trim stay
     on their own paths.
   - Advanced per-element finishes may diverge; DetectMixed* reports that so the
     WarningSystem can surface it without blocking issue.
   - WriteValue in ControlDescriptors calls the matching ApplyMacroWrite after a
     successful finish field edit.

   ============================================================================= */

// =============================================================================
// REGION | Finish Sync Module
// =============================================================================

const VghLantern__AppUtils__JoineryFinishSync = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Field Paths
    // ------------------------------------------------------------
    const FINISH_BLOCK     =  'Lantern__FinishAndGlazing__Config';
    const BARS_BLOCK       =  'Lantern__GlazingBars__Config';
    const JOINERY_BLOCK    =  'Lantern__InteriorJoinery__Config';

    const FIELD_JOINERY_MACRO   =  'Lantern__FinishAndGlazing__Config__JoineryPaintFinish';
    const FIELD_EXTERIOR_MACRO  =  'Lantern__FinishAndGlazing__Config__FrameFinish';
    const FIELD_TRIM            =  'Lantern__GlazingBars__Config__TrimFinish';
    const FIELD_CAP             =  'Lantern__GlazingBars__Config__CapFinish';
    const FIELD_CORNICE         =  'Lantern__InteriorJoinery__Config__CorniceFinish';
    const FIELD_EAVES           =  'Lantern__InteriorJoinery__Config__EavesTrimFinish';

    const JOINERY_CONSUMERS  =  [
        { Block: BARS_BLOCK,    Field: FIELD_TRIM,    Label: 'Glaze bar trim' },
        { Block: JOINERY_BLOCK, Field: FIELD_CORNICE, Label: 'Interior cornice' },
        { Block: JOINERY_BLOCK, Field: FIELD_EAVES,   Label: 'Eaves trim' }
    ];

    // Cap only - glaze bar core is mill aluminium and trim is joinery paint.
    const EXTERIOR_CONSUMERS  =  [
        { Block: BARS_BLOCK, Field: FIELD_CAP, Label: 'Glaze bar cap' }
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read a Nested String Field
    // ------------------------------------------------------------
    function VghLantern__JoineryFinishSync__Read(lantern, blockKey, fieldKey) {
        var block  =  lantern ? lantern[blockKey] : null;
        if (!block) return '';
        var value  =  block[fieldKey];
        return (value === null || value === undefined) ? '' : String(value);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write a Nested String Field
    // ------------------------------------------------------------
    function VghLantern__JoineryFinishSync__Write(lantern, blockKey, fieldKey, value) {
        if (!lantern[blockKey] || typeof lantern[blockKey] !== 'object') {
            lantern[blockKey]  =  {};
        }
        lantern[blockKey][fieldKey]  =  value;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply One Finish Name Onto a Consumer List
    // ------------------------------------------------------------
    function VghLantern__JoineryFinishSync__ApplyToConsumers(lantern, finishName, consumers) {
        if (!lantern || !finishName || !consumers) return false;

        var didChange  =  false;
        var i, consumer, current;

        for (i = 0; i < consumers.length; i++) {
            consumer  =  consumers[i];
            current   =  VghLantern__JoineryFinishSync__Read(lantern, consumer.Block, consumer.Field);
            if (current === finishName) continue;
            VghLantern__JoineryFinishSync__Write(lantern, consumer.Block, consumer.Field, finishName);
            didChange  =  true;
        }
        return didChange;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | List Consumers That Differ From a Macro
    // ------------------------------------------------------------
    function VghLantern__JoineryFinishSync__DetectMismatches(lantern, macro, consumers) {
        if (!macro) return [];

        var mismatched  =  [];
        var i, consumer, value;

        for (i = 0; i < consumers.length; i++) {
            consumer  =  consumers[i];
            value     =  VghLantern__JoineryFinishSync__Read(lantern, consumer.Block, consumer.Field);
            if (!value) continue;
            if (value !== macro) {
                mismatched.push({
                    Label  : consumer.Label,
                    Finish : value,
                    Macro  : macro
                });
            }
        }
        return mismatched;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is This Descriptor the Joinery Paint Macro Field
    // ------------------------------------------------------------
    function VghLantern__JoineryFinishSync__IsMacroField(descriptor) {
        return descriptor
            && descriptor.Field === FIELD_JOINERY_MACRO;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is This Descriptor the Exterior Finish Macro Field
    // ------------------------------------------------------------
    function VghLantern__JoineryFinishSync__IsExteriorMacroField(descriptor) {
        return descriptor
            && descriptor.Field === FIELD_EXTERIOR_MACRO;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is This Descriptor a Joinery Paint Consumer Field
    // ------------------------------------------------------------
    function VghLantern__JoineryFinishSync__IsConsumerField(descriptor) {
        if (!descriptor || !descriptor.Field) return false;
        var i;
        for (i = 0; i < JOINERY_CONSUMERS.length; i++) {
            if (JOINERY_CONSUMERS[i].Field === descriptor.Field) return true;
        }
        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sync and Detect
// -----------------------------------------------------------------------------

    // FUNCTION | Apply the Joinery Macro to Every Interior Consumer
    // ------------------------------------------------------------
    function VghLantern__JoineryFinishSync__ApplyMacroWrite(lantern, finishName) {
        return VghLantern__JoineryFinishSync__ApplyToConsumers(lantern, finishName, JOINERY_CONSUMERS);
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply the Exterior Macro to Glaze Bar Cap Finish
    // ------------------------------------------------------------
    function VghLantern__JoineryFinishSync__ApplyExteriorMacroWrite(lantern, finishName) {
        return VghLantern__JoineryFinishSync__ApplyToConsumers(lantern, finishName, EXTERIOR_CONSUMERS);
    }
    // ------------------------------------------------------------


    // FUNCTION | List Joinery Consumers That Differ From the Macro
    // ------------------------------------------------------------
    function VghLantern__JoineryFinishSync__DetectMixedJoineryFinishes(lantern) {
        var macro  =  VghLantern__JoineryFinishSync__Read(lantern, FINISH_BLOCK, FIELD_JOINERY_MACRO);
        if (!macro) {
            macro  =  VghLantern__JoineryFinishSync__Read(lantern, BARS_BLOCK, FIELD_TRIM);
        }
        return VghLantern__JoineryFinishSync__DetectMismatches(lantern, macro, JOINERY_CONSUMERS);
    }
    // ------------------------------------------------------------


    // FUNCTION | List Exterior Consumers That Differ From Exterior Finish
    // ------------------------------------------------------------
    function VghLantern__JoineryFinishSync__DetectMixedExteriorFinishes(lantern) {
        var macro  =  VghLantern__JoineryFinishSync__Read(lantern, FINISH_BLOCK, FIELD_EXTERIOR_MACRO);
        return VghLantern__JoineryFinishSync__DetectMismatches(lantern, macro, EXTERIOR_CONSUMERS);
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Warning Message for Mixed Joinery Paints
    // ------------------------------------------------------------
    function VghLantern__JoineryFinishSync__MixedFinishMessage(lantern) {
        var mismatched  =  VghLantern__JoineryFinishSync__DetectMixedJoineryFinishes(lantern);
        if (mismatched.length === 0) return null;

        var parts  =  mismatched.map(function(entry) {
            return entry.Label + ' is "' + entry.Finish + '"';
        });

        return 'Mixed joinery paints on this job. Joinery Paint Finish is "'
            + mismatched[0].Macro + '", but ' + parts.join('; ')
            + '. Change Joinery Paint Finish to re-sync everything, or keep the mix deliberately.';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Warning Message for Mixed Exterior Finishes
    // ------------------------------------------------------------
    function VghLantern__JoineryFinishSync__MixedExteriorFinishMessage(lantern) {
        var mismatched  =  VghLantern__JoineryFinishSync__DetectMixedExteriorFinishes(lantern);
        if (mismatched.length === 0) return null;

        var parts  =  mismatched.map(function(entry) {
            return entry.Label + ' is "' + entry.Finish + '"';
        });

        return 'Mixed exterior finishes on this job. Exterior Finish is "'
            + mismatched[0].Macro + '", but ' + parts.join('; ')
            + '. Change Exterior Finish to re-sync glaze bar caps, or keep the mix deliberately.';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__JoineryFinishSync__IsMacroField                  : VghLantern__JoineryFinishSync__IsMacroField,
        VghLantern__JoineryFinishSync__IsExteriorMacroField          : VghLantern__JoineryFinishSync__IsExteriorMacroField,
        VghLantern__JoineryFinishSync__IsConsumerField               : VghLantern__JoineryFinishSync__IsConsumerField,
        VghLantern__JoineryFinishSync__ApplyMacroWrite               : VghLantern__JoineryFinishSync__ApplyMacroWrite,
        VghLantern__JoineryFinishSync__ApplyExteriorMacroWrite       : VghLantern__JoineryFinishSync__ApplyExteriorMacroWrite,
        VghLantern__JoineryFinishSync__DetectMixedJoineryFinishes    : VghLantern__JoineryFinishSync__DetectMixedJoineryFinishes,
        VghLantern__JoineryFinishSync__DetectMixedExteriorFinishes   : VghLantern__JoineryFinishSync__DetectMixedExteriorFinishes,
        VghLantern__JoineryFinishSync__MixedFinishMessage            : VghLantern__JoineryFinishSync__MixedFinishMessage,
        VghLantern__JoineryFinishSync__MixedExteriorFinishMessage    : VghLantern__JoineryFinishSync__MixedExteriorFinishMessage
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppUtils__JoineryFinishSync  =  VghLantern__AppUtils__JoineryFinishSync;
