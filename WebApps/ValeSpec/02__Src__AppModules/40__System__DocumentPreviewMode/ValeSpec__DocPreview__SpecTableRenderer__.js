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
   - renderSpecTable(assemblyData) returns HTML table string
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
    function _buildRow(label, value) {
        var html  =  '<tr>';
        html     +=      '<td class="ValeSpec__DocPreview__SpecLabel">' + label + '</td>';
        html     +=      '<td>' + (value || '—') + '</td>';
        html     +=  '</tr>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Door Type Description
    // ------------------------------------------------------------
    function _getDoorType(assembly) {
        var doorConfig  =  assembly['Assembly__DoorType__Config'] || {};
        return doorConfig['Assembly__DoorType__Config__DoorType'] || '—';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Dimensions String
    // ------------------------------------------------------------
    function _getDimensions(assembly) {
        var dims    =  assembly['Assembly__Dimensions__Config'] || {};
        var width   =  dims['Assembly__Dimensions__Config__WidthMm'];
        var height  =  dims['Assembly__Dimensions__Config__HeightMm'];
        if (!width && !height) return '—';
        return (width || '—') + ' x ' + (height || '—') + ' mm';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Multi-Point Requirement Description
    // ------------------------------------------------------------
    function _getMultiPointDesc(assembly) {
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
    function _getHingeDesc(assembly) {
        var hingeConfig  =  assembly['Assembly__HingeRequirement'] || {};
        var count        =  hingeConfig['Assembly__HingeRequirement__CountPerLeaf'] || '—';
        var projection   =  hingeConfig['Assembly__HingeRequirement__Projection']   || '—';
        var hanging      =  hingeConfig['Assembly__HingeRequirement__Hanging']      || '—';
        return count + ' per leaf, ' + projection + '" projection, ' + hanging + ' hand';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Lever Type and Quantity
    // ------------------------------------------------------------
    function _getLeverDesc(assembly) {
        var leverConfig  =  assembly['Assembly__LeverRequirement'] || {};
        var leverType    =  leverConfig['Assembly__LeverRequirement__LeverType'] || '—';
        var quantity     =  leverConfig['Assembly__LeverRequirement__Quantity']  || 1;
        return leverType + ' x ' + quantity;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Cylinder Requirement
    // ------------------------------------------------------------
    function _getCylinderDesc(assembly) {
        var lockConfig  =  assembly['Assembly__MultiPointRequirement'] || {};
        var lockType    =  lockConfig['Assembly__MultiPointRequirement__LockType'] || 'None';
        if (lockType === 'None') return 'Not required';
        return '1 x Euro Cylinder (per multi-point track)';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Cabin Hooks Summary
    // ------------------------------------------------------------
    function _getCabinHooksDesc(assembly) {
        var hooksConfig  =  assembly['Assembly__CabinHookRequirement'] || {};
        var quantity     =  hooksConfig['Assembly__CabinHookRequirement__Quantity'] || 0;
        if (quantity === 0) return 'None';
        var type  =  hooksConfig['Assembly__CabinHookRequirement__Type'] || 'Standard';
        return type + ' x ' + quantity;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Miscellaneous Items
    // ------------------------------------------------------------
    function _getMiscDesc(assembly) {
        var miscConfig  =  assembly['Assembly__MiscellaneousItems'] || {};
        var items       =  miscConfig['Assembly__MiscellaneousItems__List'] || [];
        if (!items.length) return 'None';
        return items.join(', ');
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Full Spec Table HTML String
    // ------------------------------------------------------------
    function renderSpecTable(assemblyData) {
        if (!assemblyData) return '';

        var html  =  '<table class="ValeSpec__DocPreview__SpecTable">';

        html  +=  '<thead><tr>';
        html  +=      '<th>Specification Item</th>';
        html  +=      '<th>Detail</th>';
        html  +=  '</tr></thead>';

        html  +=  '<tbody>';
        html  +=      _buildRow('Door Type',              _getDoorType(assemblyData));
        html  +=      _buildRow('Dimensions',             _getDimensions(assemblyData));
        html  +=      _buildRow('Multi-Point Locking',    _getMultiPointDesc(assemblyData));
        html  +=      _buildRow('Hinge Requirement',      _getHingeDesc(assemblyData));
        html  +=      _buildRow('Lever Type &amp; Qty',   _getLeverDesc(assemblyData));
        html  +=      _buildRow('Cylinder Requirement',   _getCylinderDesc(assemblyData));
        html  +=      _buildRow('Cabin Hooks',            _getCabinHooksDesc(assemblyData));
        html  +=      _buildRow('Miscellaneous',          _getMiscDesc(assemblyData));
        html  +=  '</tbody>';

        html  +=  '</table>';
        return html;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        renderSpecTable  : renderSpecTable
    };

})();

// endregion ===================================================================

window.ValeSpec__DocPreview__SpecTableRenderer  =  ValeSpec__DocPreview__SpecTableRenderer;
