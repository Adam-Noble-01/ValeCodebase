/* =============================================================================
   VALESPEC - DOCUMENT PREVIEW DOCUMENT MODEL
   =============================================================================

   FILE       : ValeSpec__DocPreview__DocumentModel__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocPreview - DocumentModel
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Shared data model and runtime hardware parser for preview + PDF
   CREATED    : 16-Apr-2026

   DESCRIPTION:
   - Builds a normalized document model consumed by PageRenderer and PdfExporter
   - Applies deterministic assembly order (Bifold, Double, Single, Window)
   - Parses selected hardware metadata from state.hardwareIndex at runtime
   - Collates schedule summary rows with N/A fallbacks for missing fields
   - Collates warning rows and special job notes sections

   ============================================================================= */

// =============================================================================
// REGION | Document Model Module
// =============================================================================

const ValeSpec__DocPreview__DocumentModel = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Assembly Type Priority
    // ------------------------------------------------------------
    const TYPE_PRIORITY  =  {
        'bifold doors'  : 1,
        'double doors'  : 2,
        'single door'   : 3,
        'window panel'  : 4
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Text Fallback
    // ------------------------------------------------------------
    const FALLBACK_NA  =  'N/A';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - State Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get State Snapshot
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__GetState() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return {};
        return StateManager.ValeSpec__StateManager__GetState() || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Current Project Object
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__GetProject() {
        var state  =  ValeSpec__DocumentModel__GetState();
        return state.currentProject || null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Spec Table Renderer Module
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__GetSpecRenderer() {
        return window.ValeSpec__DocPreview__SpecTableRenderer || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Generic Normalizers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Normalize Text Value
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__ToText(value, fallbackValue) {
        var textValue  =  String(value === null || value === undefined ? '' : value).trim();
        return textValue || (fallbackValue || '');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalize Summary Field with N/A Fallback
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__ToSummaryText(value) {
        var textValue  =  ValeSpec__DocumentModel__ToText(value, '');
        if (!textValue) return FALLBACK_NA;
        if (textValue.toLowerCase() === 'null') return FALLBACK_NA;
        return textValue;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse Optional Numeric Quantity
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__ParseOptionalQuantity(rawValue) {
        var parsed  =  parseInt(rawValue, 10);
        if (isNaN(parsed) || parsed < 0) return null;
        return parsed;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Assembly Ordering and Titles
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get Door Type String
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__GetDoorType(assembly) {
        var doorCfg  =  assembly['Assembly__DoorType__Config'] || {};
        return ValeSpec__DocumentModel__ToText(doorCfg['Assembly__DoorType__Config__Type'], 'None');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Determine if Assembly Is Configured
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__IsAssemblyConfigured(assembly) {
        var doorType  =  ValeSpec__DocumentModel__GetDoorType(assembly).toLowerCase();
        return doorType !== 'none' && doorType !== '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Type Priority Rank
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__GetTypeRank(assembly) {
        var doorTypeLower  =  ValeSpec__DocumentModel__GetDoorType(assembly).toLowerCase();
        return TYPE_PRIORITY[doorTypeLower] || 99;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Assembly Title
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__BuildAssemblyTitle(assembly) {
        var identityCfg  =  assembly['Assembly__Identity__Config'] || {};
        var customTitle  =  ValeSpec__DocumentModel__ToText(identityCfg['Assembly__Identity__Config__Title'], '');
        if (customTitle) return customTitle;

        var doorCfg     =  assembly['Assembly__DoorType__Config'] || {};
        var doorType    =  ValeSpec__DocumentModel__ToText(doorCfg['Assembly__DoorType__Config__Type'], 'Door');
        var direction   =  ValeSpec__DocumentModel__ToText(doorCfg['Assembly__DoorType__Config__OpeningDirection'], '');
        var dimsCfg     =  assembly['Assembly__Dimensions__Config'] || {};
        var widthMm     =  dimsCfg['Assembly__Dimensions__Config__WidthMm'] || '—';
        var heightMm    =  dimsCfg['Assembly__Dimensions__Config__HeightMm'] || '—';
        var typeLabel   =  direction ? (direction + ' Opening ' + doorType) : doorType;
        return typeLabel + ' — ' + widthMm + ' x ' + heightMm + ' mm';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Ordered Configured Assemblies
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__ResolveOrderedAssemblies(rawAssemblies) {
        var mapped  =  [];

        for (var i = 0; i < rawAssemblies.length; i++) {
            var assembly  =  rawAssemblies[i] || {};
            if (!ValeSpec__DocumentModel__IsAssemblyConfigured(assembly)) continue;

            var identityCfg  =  assembly['Assembly__Identity__Config'] || {};
            mapped.push({
                sourceIndex  : i,
                sortOrder    : parseInt(identityCfg['Assembly__Identity__Config__SortOrder'], 10),
                typeRank     : ValeSpec__DocumentModel__GetTypeRank(assembly),
                assemblyData : assembly
            });
        }

        mapped.sort(function(a, b) {
            if (a.typeRank !== b.typeRank) return a.typeRank - b.typeRank;

            var aSort  =  isNaN(a.sortOrder) ? a.sourceIndex : a.sortOrder;
            var bSort  =  isNaN(b.sortOrder) ? b.sourceIndex : b.sortOrder;
            if (aSort !== bSort) return aSort - bSort;

            return a.sourceIndex - b.sourceIndex;
        });

        var ordered  =  [];
        for (var j = 0; j < mapped.length; j++) {
            ordered.push({
                renderIndex   : j,
                sourceIndex   : mapped[j].sourceIndex,
                title         : ValeSpec__DocumentModel__BuildAssemblyTitle(mapped[j].assemblyData),
                assemblyData  : mapped[j].assemblyData
            });
        }

        return ordered;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Runtime Hardware Parser
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Hardware Item by Name
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__ResolveHardwareItemByName(hardwareIndex, desiredName) {
        if (!hardwareIndex || !desiredName) return null;

        if (hardwareIndex[desiredName]) return hardwareIndex[desiredName];

        var desiredLower  =  String(desiredName).toLowerCase().trim();
        var keys          =  Object.keys(hardwareIndex);
        for (var i = 0; i < keys.length; i++) {
            var item  =  hardwareIndex[keys[i]];
            var itemName  =  item ? item['HardwareItem__Name'] : '';
            if (String(itemName || '').toLowerCase().trim() === desiredLower) {
                return item;
            }
        }

        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Assembly Finish Text
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__ResolveAssemblyFinish(globalSettings) {
        return ValeSpec__DocumentModel__ToSummaryText(globalSettings['ValeSpec__ProjectFile__GlobalSettings__IronmongeryFinish']);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Explicit Quantity (if present)
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__ResolveExplicitQuantity(assembly) {
        var leverCfg  =  assembly['Assembly__Lever__Config'] || {};

        var quantityFromLever  =  ValeSpec__DocumentModel__ParseOptionalQuantity(leverCfg['Assembly__Lever__Config__Quantity']);
        if (quantityFromLever !== null) return quantityFromLever;

        var quantityFromLegacy  =  ValeSpec__DocumentModel__ParseOptionalQuantity(assembly['Assembly__Summary__Config__Quantity']);
        if (quantityFromLegacy !== null) return quantityFromLegacy;

        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Hardware Selection Record for Handle
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__BuildHandleSelectionRecord(assembly, assemblyTitle, globalSettings, hardwareIndex) {
        var leverCfg     =  assembly['Assembly__Lever__Config'] || {};
        var handleName   =  ValeSpec__DocumentModel__ToText(
                                leverCfg['Assembly__Lever__Config__Type'] || globalSettings['ValeSpec__ProjectFile__GlobalSettings__LeverType'],
                                ''
                            );
        if (!handleName || handleName.toLowerCase() === 'none') return null;

        var hardwareItem  =  ValeSpec__DocumentModel__ResolveHardwareItemByName(hardwareIndex, handleName);
        var supplier      =  hardwareItem ? hardwareItem['HardwareItem__Supplier'] : '';
        var finishText    =  ValeSpec__DocumentModel__ResolveAssemblyFinish(globalSettings);
        var quantityValue =  ValeSpec__DocumentModel__ResolveExplicitQuantity(assembly);
        var quantityText  =  quantityValue === null ? FALLBACK_NA : String(quantityValue);

        return {
            itemName           : ValeSpec__DocumentModel__ToSummaryText(hardwareItem ? hardwareItem['HardwareItem__Name'] : handleName),
            detail             : ValeSpec__DocumentModel__ToSummaryText(hardwareItem ? hardwareItem['HardwareItem__Description'] : 'Door Handle'),
            supplier           : ValeSpec__DocumentModel__ToSummaryText(supplier),
            finish             : ValeSpec__DocumentModel__ToSummaryText(finishText),
            quantityText       : quantityText,
            quantityNumeric    : quantityValue,
            unitPriceGbp       : hardwareItem ? hardwareItem['HardwareItem__SupplierPrice__GBP'] : null,
            isComplementary    : hardwareItem ? (hardwareItem['HardwareItem__IsComplementary'] !== false) : null,
            sourceAssembly     : assemblyTitle,
            sourceType         : 'Handle'
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Generic Summary Record
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__BuildSummaryRecord(itemName, supplier, finishText, quantity, sourceAssembly, sourceType) {
        var quantityValue  =  ValeSpec__DocumentModel__ParseOptionalQuantity(quantity);
        return {
            itemName           : ValeSpec__DocumentModel__ToSummaryText(itemName),
            detail             : '',
            supplier           : ValeSpec__DocumentModel__ToSummaryText(supplier),
            finish             : ValeSpec__DocumentModel__ToSummaryText(finishText),
            quantityText       : quantityValue === null ? FALLBACK_NA : String(quantityValue),
            quantityNumeric    : quantityValue,
            isComplementary    : null,
            sourceAssembly     : sourceAssembly,
            sourceType         : sourceType
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Hardware Records for One Assembly
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__BuildAssemblyHardwareRecords(orderedAssembly, globalSettings, hardwareIndex) {
        var records       =  [];
        var assembly      =  orderedAssembly.assemblyData;
        var assemblyTitle =  orderedAssembly.title;
        var finishText    =  ValeSpec__DocumentModel__ResolveAssemblyFinish(globalSettings);

        // --- Handle ---
        var handleRecord  =  ValeSpec__DocumentModel__BuildHandleSelectionRecord(assembly, assemblyTitle, globalSettings, hardwareIndex);
        if (handleRecord) records.push(handleRecord);

        // --- Locking Hardware ---
        var lockCfg   =  assembly['Assembly__Locking__Config'] || {};
        var lockType  =  lockCfg['Assembly__Locking__Config__Type'] || 'None';
        if (lockType !== 'None') {
            var lockPoints  =  lockCfg['Assembly__Locking__Config__Points'];
            var lockLabel   =  lockType + (lockPoints ? ' (' + lockPoints + '-point)' : '');
            records.push(ValeSpec__DocumentModel__BuildSummaryRecord(lockLabel, '', finishText, 1, assemblyTitle, 'Locking'));
        }

        // --- Cylinder ---
        if (lockType !== 'None') {
            records.push(ValeSpec__DocumentModel__BuildSummaryRecord('Euro Cylinder', '', finishText, 1, assemblyTitle, 'Cylinder'));
        }

        // --- Hinges ---
        var hingeCfg        =  assembly['Assembly__Hinge__Config'] || {};
        var hingesPerLeaf   =  parseInt(hingeCfg['Assembly__Hinge__Config__HingesPerLeaf'], 10);
        var hingeProjection =  hingeCfg['Assembly__Hinge__Config__Projection'];
        if (!isNaN(hingesPerLeaf) && hingesPerLeaf > 0) {
            var doorCfg      =  assembly['Assembly__DoorType__Config'] || {};
            var doorType     =  (doorCfg['Assembly__DoorType__Config__Type'] || '').toLowerCase();
            var leafCount    =  (doorType === 'double doors' || doorType === 'bifold doors') ? 2 : 1;
            var totalHinges  =  hingesPerLeaf * leafCount;
            var hingeLabel   =  hingeProjection ? (hingeProjection + '" Hinge') : 'Hinge';
            records.push(ValeSpec__DocumentModel__BuildSummaryRecord(hingeLabel, '', finishText, totalHinges, assemblyTitle, 'Hinge'));
        }

        // --- Cabin Hooks ---
        var hooksCfg   =  assembly['Assembly__CabinHooks__Config'] || {};
        var hookCount  =  parseInt(hooksCfg['Assembly__CabinHooks__Config__HookCount'], 10);
        var eyeCount   =  parseInt(hooksCfg['Assembly__CabinHooks__Config__EyeCount'], 10);
        var hookSize   =  hooksCfg['Assembly__CabinHooks__Config__Size'] || '';
        if (!isNaN(hookCount) && hookCount > 0) {
            var hookLabel  =  hookSize ? (hookSize + ' Cabin Hook') : 'Cabin Hook';
            records.push(ValeSpec__DocumentModel__BuildSummaryRecord(hookLabel, '', finishText, hookCount, assemblyTitle, 'CabinHook'));
        }
        if (!isNaN(eyeCount) && eyeCount > 0) {
            var eyeLabel  =  hookSize ? (hookSize + ' Cabin Hook Eye') : 'Cabin Hook Eye';
            records.push(ValeSpec__DocumentModel__BuildSummaryRecord(eyeLabel, '', finishText, eyeCount, assemblyTitle, 'CabinHookEye'));
        }

        return records;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build Collated Summary Rows
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__BuildSummaryRows(orderedAssemblies, globalSettings, hardwareIndex) {
        var summaryMap  =  {};
        var summaryRows =  [];

        for (var i = 0; i < orderedAssemblies.length; i++) {
            var records  =  ValeSpec__DocumentModel__BuildAssemblyHardwareRecords(orderedAssemblies[i], globalSettings, hardwareIndex);

            for (var r = 0; r < records.length; r++) {
                var record  =  records[r];
                var key     =  [record.itemName, record.supplier, record.finish].join('||');

                if (!summaryMap[key]) {
                    summaryMap[key]  = {
                        itemName        : record.itemName,
                        detail          : record.detail,
                        supplier        : record.supplier,
                        finish          : record.finish,
                        totalQuantity   : record.quantityText,
                        quantityNumeric : record.quantityNumeric
                    };
                    summaryRows.push(summaryMap[key]);
                    continue;
                }

                if (summaryMap[key].quantityNumeric === null || record.quantityNumeric === null) {
                    summaryMap[key].quantityNumeric  =  null;
                    summaryMap[key].totalQuantity    =  FALLBACK_NA;
                } else {
                    summaryMap[key].quantityNumeric += record.quantityNumeric;
                    summaryMap[key].totalQuantity    =  String(summaryMap[key].quantityNumeric);
                }
            }
        }

        return summaryRows;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Warnings and Notes
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Extract Active Warnings for an Assembly
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__GetAssemblyWarnings(assembly) {
        var warningCfg  =  assembly['Assembly__Warnings__Config'] || {};
        return warningCfg['Assembly__Warnings__Config__ActiveWarnings'] || [];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Collated Warning Rows
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__BuildWarningRows(orderedAssemblies) {
        var rows  =  [];

        for (var i = 0; i < orderedAssemblies.length; i++) {
            var assemblyInfo    =  orderedAssemblies[i];
            var activeWarnings  =  ValeSpec__DocumentModel__GetAssemblyWarnings(assemblyInfo.assemblyData);

            for (var w = 0; w < activeWarnings.length; w++) {
                var warning     =  activeWarnings[w] || {};
                var docWarning  =  warning.DocumentWarning || {};
                var warningTitle =  ValeSpec__DocumentModel__ToSummaryText(docWarning.Title || 'Warning');
                var warningMsg   =  ValeSpec__DocumentModel__ToSummaryText(docWarning.Message || warning.WarningMessage);

                rows.push({
                    assemblyTitle  : assemblyInfo.title,
                    warningTitle   : warningTitle,
                    warningMessage : warningMsg
                });
            }

            var hasNonComplementaryItem  =  false;
            var hardwareRows             =  assemblyInfo.hardwareItems || [];
            for (var h = 0; h < hardwareRows.length; h++) {
                if (hardwareRows[h] && hardwareRows[h].isComplementary === false) {
                    hasNonComplementaryItem  =  true;
                    break;
                }
            }

            if (hasNonComplementaryItem) {
                var alreadyFlagged  =  false;
                for (var a = 0; a < activeWarnings.length; a++) {
                    var warningRuleId  =  (activeWarnings[a] && activeWarnings[a].RuleId) ? String(activeWarnings[a].RuleId) : '';
                    if (warningRuleId === 'WARN_NON_COMPLEMENTARY_HARDWARE') {
                        alreadyFlagged  =  true;
                        break;
                    }
                }

                if (!alreadyFlagged) {
                    rows.push({
                        assemblyTitle  : assemblyInfo.title,
                        warningTitle   : 'Cost Upgrade Warning',
                        warningMessage : 'Selected hardware includes non-complementary items. Confirm quotation and client approval for upgraded costs before ordering.'
                    });
                }
            }
        }

        return rows;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Build Document Model
// -----------------------------------------------------------------------------

    // FUNCTION | Build Normalized Document Model
    // ------------------------------------------------------------
    function ValeSpec__DocumentModel__Build(overrideViewState) {
        var project         =  ValeSpec__DocumentModel__GetProject() || {};
        var metadata        =  project['ValeSpec__ProjectFile__Metadata'] || {};
        var globalSettings  =  project['ValeSpec__ProjectFile__GlobalSettings'] || {};
        var assemblies      =  project['ValeSpec__ProjectFile__Assemblies'] || [];
        var state           =  ValeSpec__DocumentModel__GetState();
        var hardwareIndex   =  state.hardwareIndex || {};
        var SpecRenderer    =  ValeSpec__DocumentModel__GetSpecRenderer();
        var DocumentState   =  window.ValeSpec__DocPreview__DocumentState;

        var viewState  =  overrideViewState || (
            DocumentState && DocumentState.ValeSpec__DocumentState__GetViewState
                ? DocumentState.ValeSpec__DocumentState__GetViewState()
                : {
                    diagramMode       : 'small',
                    showFullSchedule  : true,
                    showSummary       : true,
                    showJobNotes      : true
                }
        );

        var orderedAssemblies  =  ValeSpec__DocumentModel__ResolveOrderedAssemblies(assemblies);

        for (var i = 0; i < orderedAssemblies.length; i++) {
            var assemblyData  =  orderedAssemblies[i].assemblyData;
            orderedAssemblies[i].specRows       =  (SpecRenderer && SpecRenderer.ValeSpec__SpecTableRenderer__GetSpecRows)
                                                    ? (SpecRenderer.ValeSpec__SpecTableRenderer__GetSpecRows(assemblyData) || [])
                                                    : [];
            orderedAssemblies[i].activeWarnings =  ValeSpec__DocumentModel__GetAssemblyWarnings(assemblyData);
            orderedAssemblies[i].hardwareItems  =  ValeSpec__DocumentModel__BuildAssemblyHardwareRecords(
                                                    orderedAssemblies[i],
                                                    globalSettings,
                                                    hardwareIndex
                                                  );
        }

        var summaryRows  =  ValeSpec__DocumentModel__BuildSummaryRows(orderedAssemblies, globalSettings, hardwareIndex);
        var warningRows  =  ValeSpec__DocumentModel__BuildWarningRows(orderedAssemblies);
        var jobNotes     =  ValeSpec__DocumentModel__ToText(globalSettings['ValeSpec__ProjectFile__GlobalSettings__JobNotes'], '');

        return {
            metadata         : metadata,
            globalSettings   : globalSettings,
            orderedAssemblies: orderedAssemblies,
            summaryRows      : summaryRows,
            warningRows      : warningRows,
            jobNotes         : jobNotes,
            viewState        : viewState
        };
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        FALLBACK_NA                    : FALLBACK_NA,
        ValeSpec__DocumentModel__Build : ValeSpec__DocumentModel__Build
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.ValeSpec__DocPreview__DocumentModel  =  ValeSpec__DocPreview__DocumentModel;
