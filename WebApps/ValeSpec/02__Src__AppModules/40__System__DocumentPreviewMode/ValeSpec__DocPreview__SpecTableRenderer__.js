/* =============================================================================
   VALESPEC - DOCUMENT PREVIEW SPEC TABLE RENDERER
   =============================================================================

   FILE       : ValeSpec__DocPreview__SpecTableRenderer__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocPreview - SpecTableRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Generate HTML spec table for hardware schedule from assembly data
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - ValeSpec__SpecTableRenderer__RenderSpecTable(assemblyData) returns HTML table string
   - Rows: Door Type, Dimensions, Multi-Point, Hinges, Handle, Cylinder, Cabin Hooks, Misc
   - Optional row Miscellaneous Notes when Assembly__Miscellaneous__Config__OtherText is set
   - Uses ValeSpec__DocPreview__SpecTable CSS classes for styling
   - Config-driven table styling via DocPreview__SpecTable__Config

   ============================================================================= */

// =============================================================================
// REGION | Spec Table Renderer Module
// =============================================================================

const ValeSpec__DocPreview__SpecTableRenderer = (function() {

    // HELPER FUNCTION | Escape HTML for Safe Table Cell Text
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__EscapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Miscellaneous Option Key to Display Label
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__ResolveMiscLabel(key) {
        var Misc  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__Miscellaneous;
        if (Misc && Misc.ValeSpec__Miscellaneous__ResolveLabelForKey) {
            return Misc.ValeSpec__Miscellaneous__ResolveLabelForKey(key);
        }
        return key;
    }
    // ------------------------------------------------------------


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


    // HELPER FUNCTION | Build Miscellaneous Notes Row (escaped, multiline-friendly)
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__BuildMiscNotesRow(escapedNotes) {
        var html  =  '<tr>';
        html     +=      '<td class="ValeSpec__DocPreview__SpecLabel">Miscellaneous Notes</td>';
        html     +=      '<td class="ValeSpec__DocPreview__SpecDetail ValeSpec__DocPreview__SpecDetail--multiline">' + escapedNotes + '</td>';
        html     +=  '</tr>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Door Type Description
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetDoorType(assembly) {
        var doorConfig  =  assembly['Assembly__DoorType__Config'] || {};
        var doorType    =  doorConfig['Assembly__DoorType__Config__Type']             || '';
        var direction   =  doorConfig['Assembly__DoorType__Config__OpeningDirection'] || '';
        if (!doorType) return '\u2014';
        return direction ? (direction + ' Opening ' + doorType) : doorType;
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


    // HELPER FUNCTION | Extract Multi-Point Locking Description
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetMultiPointDesc(assembly) {
        var lockConfig  =  assembly['Assembly__Locking__Config'] || {};
        var lockType    =  lockConfig['Assembly__Locking__Config__Type'] || 'None';
        if (lockType === 'None') return 'None';

        var points  =  lockConfig['Assembly__Locking__Config__Points'] || '';
        var desc    =  lockType;
        if (points) desc  +=  ' (' + points + '-point)';
        return desc;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Hinge Requirement Description
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetHingeDesc(assembly) {
        var hingeConfig  =  assembly['Assembly__Hinge__Config'] || {};
        var count        =  hingeConfig['Assembly__Hinge__Config__HingesPerLeaf'] || '—';
        var projection   =  hingeConfig['Assembly__Hinge__Config__Projection']    || '—';
        var hanging      =  hingeConfig['Assembly__Hinge__Config__Hanging']       || '—';
        return count + ' per leaf, ' + projection + '" projection, ' + hanging + ' hand';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Handle Type and Quantity
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetHandleDesc(assembly) {
        var handleConfig  =  assembly['Assembly__Lever__Config'] || {};
        var handleType    =  handleConfig['Assembly__Lever__Config__Type']      || '—';
        var handleHeight  =  handleConfig['Assembly__Lever__Config__HeightMm'] || '';
        var desc          =  handleType;
        if (handleHeight) desc  +=  ' @ ' + handleHeight + ' mm';
        return desc;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Cylinder Requirement
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetCylinderDesc(assembly) {
        var lockConfig  =  assembly['Assembly__Locking__Config'] || {};
        var lockType    =  lockConfig['Assembly__Locking__Config__Type'] || 'None';
        if (lockType === 'None') return 'Not required';
        return '1 x Euro Cylinder (per multi-point track)';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Cabin Hooks Summary
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetCabinHooksDesc(assembly) {
        var hooksConfig  =  assembly['Assembly__CabinHooks__Config'] || {};
        var hookCount    =  hooksConfig['Assembly__CabinHooks__Config__HookCount'] || 0;
        var eyeCount     =  hooksConfig['Assembly__CabinHooks__Config__EyeCount']  || 0;
        if (hookCount === 0 && eyeCount === 0) return 'None';
        var size  =  hooksConfig['Assembly__CabinHooks__Config__Size'] || '';
        return size + ' — ' + hookCount + ' hook(s), ' + eyeCount + ' eye(s)';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Miscellaneous Items (human-readable labels)
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetMiscDesc(assembly) {
        var miscConfig  =  assembly['Assembly__Miscellaneous__Config'] || {};
        var items       =  miscConfig['Assembly__Miscellaneous__Config__Items'] || [];
        if (!items.length) return 'None';
        var labels  =  [];
        for (var i = 0; i < items.length; i++) {
            labels.push(ValeSpec__SpecTableRenderer__ResolveMiscLabel(items[i]));
        }
        return labels.join(', ');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Trimmed Other Text (for conditional notes row / PDF)
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetMiscOtherTextTrimmed(assembly) {
        var miscConfig  =  assembly['Assembly__Miscellaneous__Config'] || {};
        var raw         =  miscConfig['Assembly__Miscellaneous__Config__OtherText'];
        if (raw === null || raw === undefined) return '';
        return String(raw).trim();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Miscellaneous Line + Optional Notes for PDF Mirror
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetMiscellaneousForPdf(assembly) {
        return {
            itemsLine  : ValeSpec__SpecTableRenderer__GetMiscDesc(assembly),
            notesText  : ValeSpec__SpecTableRenderer__GetMiscOtherTextTrimmed(assembly) || null
        };
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
        html  +=      ValeSpec__SpecTableRenderer__BuildRow('Handle Type &amp; Qty',   ValeSpec__SpecTableRenderer__GetHandleDesc(assemblyData));
        html  +=      ValeSpec__SpecTableRenderer__BuildRow('Cylinder Requirement',   ValeSpec__SpecTableRenderer__GetCylinderDesc(assemblyData));
        html  +=      ValeSpec__SpecTableRenderer__BuildRow('Cabin Hooks',            ValeSpec__SpecTableRenderer__GetCabinHooksDesc(assemblyData));
        html  +=      ValeSpec__SpecTableRenderer__BuildRow('Miscellaneous',          ValeSpec__SpecTableRenderer__GetMiscDesc(assemblyData));

        var otherNotes  =  ValeSpec__SpecTableRenderer__GetMiscOtherTextTrimmed(assemblyData);
        if (otherNotes) {
            html  +=  ValeSpec__SpecTableRenderer__BuildMiscNotesRow(ValeSpec__SpecTableRenderer__EscapeHtml(otherNotes));
        }

        html  +=  '</tbody>';

        html  +=  '</table>';
        return html;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__SpecTableRenderer__RenderSpecTable           : ValeSpec__SpecTableRenderer__RenderSpecTable,
        ValeSpec__SpecTableRenderer__GetMiscellaneousForPdf    : ValeSpec__SpecTableRenderer__GetMiscellaneousForPdf
    };

})();

// endregion ===================================================================

window.ValeSpec__DocPreview__SpecTableRenderer  =  ValeSpec__DocPreview__SpecTableRenderer;
