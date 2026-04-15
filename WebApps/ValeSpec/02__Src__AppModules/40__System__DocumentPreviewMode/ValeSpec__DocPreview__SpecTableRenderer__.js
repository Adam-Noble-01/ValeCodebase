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
  - ValeSpec__SpecTableRenderer__GetSpecRows(assemblyData) returns ordered row objects
  - Rows are atomic (locking, hinges, handles, cabin hooks split into separate fields)
   - Optional row Miscellaneous Notes when Assembly__Miscellaneous__Config__OtherText is set
   - Uses ValeSpec__DocPreview__SpecTable CSS classes for styling
   - Config-driven table styling via DocPreview__SpecTable__Config

   ============================================================================= */

// =============================================================================
// REGION | Spec Table Renderer Module
// =============================================================================

const ValeSpec__DocPreview__SpecTableRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Utility Helpers - HTML Escaping and Row Markup
// -----------------------------------------------------------------------------

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


    // HELPER FUNCTION | Build Multiline Table Row (escaped, multiline-friendly)
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__BuildMultilineRow(label, escapedValue) {
        var html  =  '<tr>';
        html     +=      '<td class="ValeSpec__DocPreview__SpecLabel">' + label + '</td>';
        html     +=      '<td class="ValeSpec__DocPreview__SpecDetail ValeSpec__DocPreview__SpecDetail--multiline">' + escapedValue + '</td>';
        html     +=  '</tr>';
        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Extractors - Door Type and Dimensions
// -----------------------------------------------------------------------------


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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Extractors - Locking, Hinges, Handles, Cylinder
// -----------------------------------------------------------------------------


    // HELPER FUNCTION | Extract Locking Type
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetLockingType(assembly) {
        var lockConfig  =  assembly['Assembly__Locking__Config'] || {};
        var lockType    =  lockConfig['Assembly__Locking__Config__Type'] || 'None';
        return lockType;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Extract Locking Points Description
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetLockingPoints(assembly) {
        var lockType  =  ValeSpec__SpecTableRenderer__GetLockingType(assembly);
        if (lockType === 'None') return 'Not required';

        var lockConfig  =  assembly['Assembly__Locking__Config'] || {};
        var points      =  lockConfig['Assembly__Locking__Config__Points'];
        if (points === null || points === undefined || points === '') return '—';
        return points + '-point';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Hinges per Leaf
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetHingesPerLeaf(assembly) {
        var hingeConfig  =  assembly['Assembly__Hinge__Config'] || {};
        var count        =  hingeConfig['Assembly__Hinge__Config__HingesPerLeaf'] || '—';
        return count;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Hinge Projection
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetHingeProjection(assembly) {
        var hingeConfig  =  assembly['Assembly__Hinge__Config'] || {};
        var projection   =  hingeConfig['Assembly__Hinge__Config__Projection']    || '—';
        if (projection === '—') return projection;
        return projection + '"';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Hinge Hand
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetHingeHand(assembly) {
        var hingeConfig  =  assembly['Assembly__Hinge__Config'] || {};
        var hanging      =  hingeConfig['Assembly__Hinge__Config__Hanging'] || '';
        if (!hanging) return '—';
        return hanging + ' hand';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Handle Type
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetHandleType(assembly) {
        var handleConfig  =  assembly['Assembly__Lever__Config'] || {};
        return handleConfig['Assembly__Lever__Config__Type'] || '—';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Handle Height
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetHandleHeight(assembly) {
        var handleConfig  =  assembly['Assembly__Lever__Config'] || {};
        var handleHeight  =  handleConfig['Assembly__Lever__Config__HeightMm'];
        if (!handleHeight) return '—';
        return handleHeight + ' mm';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Cylinder Requirement
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetCylinderDesc(assembly) {
        var lockType  =  ValeSpec__SpecTableRenderer__GetLockingType(assembly);
        if (lockType === 'None') return 'Not required';
        return '1 x Euro Cylinder (per multi-point track)';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Extractors - Cabin Hooks and Miscellaneous
// -----------------------------------------------------------------------------


    // HELPER FUNCTION | Extract Cabin Hooks Counts
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetCabinHooksCounts(assembly) {
        var hooksConfig  =  assembly['Assembly__CabinHooks__Config'] || {};
        var hookCountRaw =  hooksConfig['Assembly__CabinHooks__Config__HookCount'];
        var eyeCountRaw  =  hooksConfig['Assembly__CabinHooks__Config__EyeCount'];

        var hookCount  =  parseInt(hookCountRaw, 10);
        var eyeCount   =  parseInt(eyeCountRaw, 10);

        if (isNaN(hookCount) || hookCount < 0) hookCount  =  0;
        if (isNaN(eyeCount) || eyeCount < 0) eyeCount     =  0;

        return {
            hookCount  : hookCount,
            eyeCount   : eyeCount
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Count + Unit with Singular/Plural
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__FormatCountUnit(count, singular, plural) {
        var suffix  =  (count === 1) ? singular : plural;
        return count + ' ' + suffix;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Cabin Hook Type
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetCabinHookType(assembly) {
        var hooksConfig  =  assembly['Assembly__CabinHooks__Config'] || {};
        var counts       =  ValeSpec__SpecTableRenderer__GetCabinHooksCounts(assembly);
        if (counts.hookCount === 0 && counts.eyeCount === 0) return 'None';
        return hooksConfig['Assembly__CabinHooks__Config__Size'] || '—';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Cabin Hooks Quantity
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetCabinHooksNo(assembly) {
        var counts  =  ValeSpec__SpecTableRenderer__GetCabinHooksCounts(assembly);
        if (counts.hookCount === 0 && counts.eyeCount === 0) return 'None';
        return ValeSpec__SpecTableRenderer__FormatCountUnit(counts.hookCount, 'Hook', 'Hooks');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Cabin Hook Eyes Quantity
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetCabinHookEyes(assembly) {
        var counts  =  ValeSpec__SpecTableRenderer__GetCabinHooksCounts(assembly);
        if (counts.hookCount === 0 && counts.eyeCount === 0) return 'None';
        return ValeSpec__SpecTableRenderer__FormatCountUnit(counts.eyeCount, 'Eye', 'Eyes');
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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Spec Row Schema and HTML Table Rendering
// -----------------------------------------------------------------------------


    // HELPER FUNCTION | Build Ordered Atomic Spec Rows
    // ------------------------------------------------------------
    function ValeSpec__SpecTableRenderer__GetSpecRows(assembly) {
        var rows  =  [];

        rows.push({ label: 'Door Type',            value: ValeSpec__SpecTableRenderer__GetDoorType(assembly) });
        rows.push({ label: 'Dimensions',           value: ValeSpec__SpecTableRenderer__GetDimensions(assembly) });
        rows.push({ label: 'Handle Type',          value: ValeSpec__SpecTableRenderer__GetHandleType(assembly) });
        rows.push({ label: 'Handle Height',        value: ValeSpec__SpecTableRenderer__GetHandleHeight(assembly) });
        rows.push({ label: 'Locking Type',         value: ValeSpec__SpecTableRenderer__GetLockingType(assembly) });
        rows.push({ label: 'Locking Points',       value: ValeSpec__SpecTableRenderer__GetLockingPoints(assembly) });
        rows.push({ label: 'Cylinder Requirement', value: ValeSpec__SpecTableRenderer__GetCylinderDesc(assembly) });
        rows.push({ label: 'Hinges Per Leaf',      value: ValeSpec__SpecTableRenderer__GetHingesPerLeaf(assembly) });
        rows.push({ label: 'Hinge Projection',     value: ValeSpec__SpecTableRenderer__GetHingeProjection(assembly) });
        rows.push({ label: 'Hinge Hand',           value: ValeSpec__SpecTableRenderer__GetHingeHand(assembly) });
        rows.push({ label: 'Cabin Hook Type',      value: ValeSpec__SpecTableRenderer__GetCabinHookType(assembly) });
        rows.push({ label: 'Cabin Hooks No.',      value: ValeSpec__SpecTableRenderer__GetCabinHooksNo(assembly) });
        rows.push({ label: 'Cabin Hook Eyes',      value: ValeSpec__SpecTableRenderer__GetCabinHookEyes(assembly) });
        rows.push({ label: 'Miscellaneous',        value: ValeSpec__SpecTableRenderer__GetMiscDesc(assembly) });

        var otherNotes  =  ValeSpec__SpecTableRenderer__GetMiscOtherTextTrimmed(assembly);
        if (otherNotes) {
            rows.push({
                label       : 'Miscellaneous Notes',
                value       : otherNotes,
                isMultiline : true
            });
        }

        return rows;
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
        var specRows  =  ValeSpec__SpecTableRenderer__GetSpecRows(assemblyData);
        for (var i = 0; i < specRows.length; i++) {
            var row    =  specRows[i] || {};
            var label  =  row.label || '—';
            var value  =  row.value;

            if (value === null || value === undefined || value === '') value  =  '—';

            if (row.isMultiline) {
                html  +=  ValeSpec__SpecTableRenderer__BuildMultilineRow(label, ValeSpec__SpecTableRenderer__EscapeHtml(value));
            } else {
                html  +=  ValeSpec__SpecTableRenderer__BuildRow(label, value);
            }
        }

        html  +=  '</tbody>';

        html  +=  '</table>';
        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API Export
// -----------------------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__SpecTableRenderer__RenderSpecTable           : ValeSpec__SpecTableRenderer__RenderSpecTable,
        ValeSpec__SpecTableRenderer__GetSpecRows               : ValeSpec__SpecTableRenderer__GetSpecRows,
        ValeSpec__SpecTableRenderer__GetMiscellaneousForPdf    : ValeSpec__SpecTableRenderer__GetMiscellaneousForPdf
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.ValeSpec__DocPreview__SpecTableRenderer  =  ValeSpec__DocPreview__SpecTableRenderer;
