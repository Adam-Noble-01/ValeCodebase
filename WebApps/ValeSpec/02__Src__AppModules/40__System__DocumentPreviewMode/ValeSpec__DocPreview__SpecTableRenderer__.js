/* =============================================================================
   VALESPEC - DOCUMENT PREVIEW SPEC TABLE RENDERER
   =============================================================================

   FILE       : ValeSpec__DocPreview__SpecTableRenderer__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocPreview - SpecTableRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Generate HTML spec table for hardware schedule from assembly data
   CREATED    : 2026

   DESCRIPTION:
   - ValeSpec__SpecTableRenderer__RenderSpecTable(assemblyData) returns HTML table string
   - Rows: Door Type, Dimensions, Multi-Point, Hinges, Lever, Cylinder, Cabin Hooks, Misc
   - Uses ValeSpec__DocPreview__SpecTable CSS classes for styling
   - Config-driven table styling via DocPreview__SpecTable__Config

   ============================================================================= */

// =============================================================================
// REGION | Spec Table Renderer Module
// =============================================================================

const ValeSpec__DocPreview__SpecTableRenderer = (function() {

    // HELPER FUNCTION | Build a Single Table Row
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__BuildRow(label, value) {
        var html  =  '<tr>';
        html     +=      '<td class="ValeSpec__DocPreview__SpecLabel">' + label + '</td>';
        html     +=      '<td>' + (value || '—') + '</td>';
        html     +=  '</tr>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Door Type Description
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetDoorType(assembly) {
        var doorConfig  =  assembly['Assembly__DoorType__Config'] || {};
        return doorConfig['Assembly__DoorType__Config__DoorType'] || '—';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Dimensions String
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetDimensions(assembly) {
        var dims    =  assembly['Assembly__Dimensions__Config'] || {};
        var width   =  dims['Assembly__Dimensions__Config__WidthMm'];
        var height  =  dims['Assembly__Dimensions__Config__HeightMm'];
        if (!width && !height) return '—';
        return (width || '—') + ' x ' + (height || '—') + ' mm';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Multi-Point Requirement Description
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetMultiPointDesc(assembly) {
        var lockConfig  =  assembly['Assembly__MultiPointRequirement'] || {};
        var lockType    =  lockConfig['Assembly__MultiPointRequirement__LockType'] || 'None';
        if (lockType === 'None') return 'None';

        var points  =  lockConfig['Assembly__MultiPointRequirement__Points'] || '';
        var desc    =  lockType;
        if (points) desc  +=  ' (' + points + '-point)';
        return desc;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Hinge Requirement Description
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetHingeDesc(assembly) {
        var hingeConfig  =  assembly['Assembly__HingeRequirement'] || {};
        var count        =  hingeConfig['Assembly__HingeRequirement__CountPerLeaf'] || '—';
        var projection   =  hingeConfig['Assembly__HingeRequirement__Projection']   || '—';
        var hanging      =  hingeConfig['Assembly__HingeRequirement__Hanging']      || '—';
        return count + ' per leaf, ' + projection + '" projection, ' + hanging + ' hand';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Lever Type and Quantity
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetLeverDesc(assembly) {
        var leverConfig  =  assembly['Assembly__LeverRequirement'] || {};
        var leverType    =  leverConfig['Assembly__LeverRequirement__LeverType'] || '—';
        var quantity     =  leverConfig['Assembly__LeverRequirement__Quantity']  || 1;
        return leverType + ' x ' + quantity;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Cylinder Requirement
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetCylinderDesc(assembly) {
        var lockConfig  =  assembly['Assembly__MultiPointRequirement'] || {};
        var lockType    =  lockConfig['Assembly__MultiPointRequirement__LockType'] || 'None';
        if (lockType === 'None') return 'Not required';
        return '1 x Euro Cylinder (per multi-point track)';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Cabin Hooks Summary
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetCabinHooksDesc(assembly) {
        var hooksConfig  =  assembly['Assembly__CabinHookRequirement'] || {};
        var quantity     =  hooksConfig['Assembly__CabinHookRequirement__Quantity'] || 0;
        if (quantity === 0) return 'None';
        var type  =  hooksConfig['Assembly__CabinHookRequirement__Type'] || 'Standard';
        return type + ' x ' + quantity;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Miscellaneous Items
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetMiscDesc(assembly) {
        var miscConfig  =  assembly['Assembly__MiscellaneousItems'] || {};
        var items       =  miscConfig['Assembly__MiscellaneousItems__List'] || [];
        if (!items.length) return 'None';
        return items.join(', ');
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Full Spec Table HTML String
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__RenderSpecTable(assemblyData) {
        if (!assemblyData) return '';

        var html  =  '<table class="ValeSpec__DocPreview__SpecTable">';

        html  +=  '<thead><tr>';
        html  +=      '<th>Specification Item</th>';
        html  +=      '<th>Detail</th>';
        html  +=  '</tr></thead>';

        html  +=  '<tbody>';
        html  +=      ValeSpec__SpecTableRenderer__BuildRow('Door Type',              ValeSpec__SpecTableRenderer__GetDoorType(assemblyData));
        html  +=      ValeSpec__SpecTableRenderer__BuildRow('Dimensions',             ValeSpec__SpecTableRenderer__GetDimensions(assemblyData));
        html  +=      ValeSpec__SpecTableRenderer__BuildRow('Multi-Point Locking',    ValeSpec__SpecTableRenderer__GetMultiPointDesc(assemblyData));
        html  +=      ValeSpec__SpecTableRenderer__BuildRow('Hinge Requirement',      ValeSpec__SpecTableRenderer__GetHingeDesc(assemblyData));
        html  +=      ValeSpec__SpecTableRenderer__BuildRow('Lever Type &amp; Qty',   ValeSpec__SpecTableRenderer__GetLeverDesc(assemblyData));
        html  +=      ValeSpec__SpecTableRenderer__BuildRow('Cylinder Requirement',   ValeSpec__SpecTableRenderer__GetCylinderDesc(assemblyData));
        html  +=      ValeSpec__SpecTableRenderer__BuildRow('Cabin Hooks',            ValeSpec__SpecTableRenderer__GetCabinHooksDesc(assemblyData));
        html  +=      ValeSpec__SpecTableRenderer__BuildRow('Miscellaneous',          ValeSpec__SpecTableRenderer__GetMiscDesc(assemblyData));
        html  +=  '</tbody>';

        html  +=  '</table>';
        return html;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__SpecTableRenderer__RenderSpecTable  : ValeSpec__SpecTableRenderer__RenderSpecTable
    };

})();

// endregion ===================================================================

window.ValeSpec__DocPreview__SpecTableRenderer  =  ValeSpec__DocPreview__SpecTableRenderer;
