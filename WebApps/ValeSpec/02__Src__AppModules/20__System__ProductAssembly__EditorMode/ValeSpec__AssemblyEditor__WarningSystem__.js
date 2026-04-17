/* =============================================================================
   VALESPEC - ASSEMBLY EDITOR WARNING SYSTEM
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__WarningSystem__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - WarningSystem
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Data-driven warning evaluation engine, modal dialogs, centred
                notifications, inline warning sections, and toast notifications
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - ValeSpec__WarningSystem__EvaluateWarnings() evaluates config-driven rules against assembly state
   - ValeSpec__WarningSystem__ShowCentredNotification() for prominent centred screen overlay
   - ValeSpec__WarningSystem__RenderInlineWarnings() renders warning sections inside editor step cards
   - ValeSpec__WarningSystem__ShowHingeProjectionWarning() for 8-inch projection approval modal
   - ValeSpec__WarningSystem__ShowHeightMismatchWarning() compares all assembly heights (>15mm diff)
   - ValeSpec__WarningSystem__ShowWarningToast() for non-blocking toast notifications
   - ValeSpec__WarningSystem__GetWarningRules() returns cached warning rules array
   - Approval modals append to document.body

   =============================================================================

   DEVELOPMENT LOG:
   17-Apr-2026
   - IronmongeryMismatch and LeverMismatch rule conditions; modal copy from WarningSystem JSON global config
   - Approval modals append to document.body; ShowIronmongeryMismatchWarning / ShowLeverMismatchWarning for global vs per-assembly updates

   ============================================================================= */

// =============================================================================
// REGION | Assembly Editor Warning System Module
// =============================================================================

const ValeSpec__AssemblyEditor__WarningSystem = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and Cached State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Path and Defaults
    // ------------------------------------------------------------
    const CONFIG_PATH                         =  '02__Src__AppModules/20__System__ProductAssembly__EditorMode/ValeSpec__AssemblyEditor__WarningSystem__ConfigAndConditions__.json';
    const HEIGHT_THRESHOLD                    =  15;                           // <-- Max mm difference before height mismatch warning
    const TOAST_DURATION_MS                   =  4000;                         // <-- Toast display duration
    const DEFAULT_CENTRED_NOTIFICATION_MS     =  4000;                         // <-- Centred notification auto-dismiss duration
    // ------------------------------------------------------------


    // MODULE VARIABLES | Cached Config Data
    // ------------------------------------------------------------
    let ValeSpec__WarningSystem__HingeWarningMsg              =  null;         // <-- 8-inch hinge warning text
    let ValeSpec__WarningSystem__HeightMismatchMsg             =  null;         // <-- Height mismatch warning text
    let ValeSpec__WarningSystem__IronmongeryMismatchMsg        =  null;         // <-- Ironmongery mismatch warning text
    let ValeSpec__WarningSystem__LeverMismatchMsg              =  null;         // <-- Lever mismatch warning text
    let ValeSpec__WarningSystem__ConfigLoaded                  =  false;        // <-- Config load flag
    let ValeSpec__WarningSystem__WarningRules                  =  [];           // <-- Cached warning rules array from config
    let ValeSpec__WarningSystem__CentredNotificationDurationMs =  DEFAULT_CENTRED_NOTIFICATION_MS;
    let ValeSpec__WarningSystem__PanelCountMap                 =  {};           // <-- Door type → panel count mapping
    let ValeSpec__WarningSystem__DefaultPanelCount             =  1;            // <-- Fallback panel count when type is not in map
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Loading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Load Warning Messages and Rules from Config
    // ------------------------------------------------------------
    async function ValeSpec__WarningSystem__EnsureConfig() {
        if (ValeSpec__WarningSystem__ConfigLoaded) return;
        try {
            var response  =  await fetch(CONFIG_PATH);
            if (!response.ok) return;
            var data      =  await response.json();

            var globalConfig  =  data['WarningSystem__GlobalConfig'] || {};

            ValeSpec__WarningSystem__HingeWarningMsg    =  globalConfig['WarningSystem__GlobalConfig__HingeProjection8ModalMessage']
                                                        || 'Non-standard hinge projection selected.';
            ValeSpec__WarningSystem__HeightMismatchMsg   =  globalConfig['WarningSystem__GlobalConfig__HeightMismatchModalMessage']
                                                        || 'Assembly heights differ significantly.';
            ValeSpec__WarningSystem__IronmongeryMismatchMsg = globalConfig['WarningSystem__GlobalConfig__IronmongeryMismatchModalMessage']
                                                        || 'The Ironmongery for this assembly is different to the others on the project. Would you like to update all others to match this finish?';
            ValeSpec__WarningSystem__LeverMismatchMsg = globalConfig['WarningSystem__GlobalConfig__LeverMismatchModalMessage']
                                                        || 'The Handle Type for this assembly is different to the others on the project. Would you like to update all others to match this handle?';

            var centredMs  =  parseInt(globalConfig['WarningSystem__GlobalConfig__CentredNotificationDurationMs'], 10);
            if (!isNaN(centredMs) && centredMs > 0) {
                ValeSpec__WarningSystem__CentredNotificationDurationMs  =  centredMs;
            }

            ValeSpec__WarningSystem__PanelCountMap      =  globalConfig['WarningSystem__GlobalConfig__PanelCountMap'] || {};
            var defaultPanels  =  parseInt(globalConfig['WarningSystem__GlobalConfig__DefaultPanelCount'], 10);
            if (!isNaN(defaultPanels) && defaultPanels > 0) {
                ValeSpec__WarningSystem__DefaultPanelCount  =  defaultPanels;
            }

            ValeSpec__WarningSystem__WarningRules  =  data['WarningSystem__Rules'] || [];

            ValeSpec__WarningSystem__ConfigLoaded  =  true;
        } catch (e) {
            console.warn('[ValeSpec__WarningSystem] Config load failed:', e);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Warning Rule Evaluation Engine
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Hardware Item by Name from Loaded Index
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__ResolveHardwareItemByName(hardwareIndex, desiredName) {
        if (!hardwareIndex || !desiredName) return null;
        if (hardwareIndex[desiredName]) return hardwareIndex[desiredName];

        var desiredLower  =  String(desiredName).toLowerCase().trim();
        var keys          =  Object.keys(hardwareIndex);
        for (var i = 0; i < keys.length; i++) {
            var item      =  hardwareIndex[keys[i]];
            var itemName  =  item ? item['HardwareItem__Name'] : '';
            if (String(itemName || '').toLowerCase().trim() === desiredLower) {
                return item;
            }
        }

        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Selected Hardware Items for Rule Evaluation
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__ResolveSelectedHardwareItems(assembly) {
        var resolvedItems  =  [];
        var StateManager   =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager || !assembly) return resolvedItems;

        var state         =  StateManager.ValeSpec__StateManager__GetState() || {};
        var hardwareIndex =  state.hardwareIndex || null;
        if (!hardwareIndex) return resolvedItems;

        var leverCfg    =  assembly['Assembly__Lever__Config'] || {};
        var handleName  =  leverCfg['Assembly__Lever__Config__Type'] || state.globalHandleType || '';
        if (!handleName || String(handleName).toLowerCase().trim() === 'none') return resolvedItems;

        var item  =  ValeSpec__WarningSystem__ResolveHardwareItemByName(hardwareIndex, handleName);
        if (item) resolvedItems.push(item);

        return resolvedItems;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Panel Count for a Given Door Type and Assembly
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__ResolvePanelCount(doorType, assembly) {
        var mapped  =  ValeSpec__WarningSystem__PanelCountMap[doorType];

        if (mapped === 'FromAssembly') {
            var bifoldCfg    =  assembly ? (assembly['Assembly__BifoldConfig'] || {}) : {};
            var fromAsm      =  parseInt(bifoldCfg['Assembly__BifoldConfig__PanelCount'], 10);
            if (!isNaN(fromAsm) && fromAsm > 0) return fromAsm;
            return ValeSpec__WarningSystem__DefaultPanelCount;
        }

        var numeric  =  parseInt(mapped, 10);
        if (!isNaN(numeric) && numeric > 0) return numeric;

        return ValeSpec__WarningSystem__DefaultPanelCount;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Object Type Match Against Door Type String
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__MatchesObjectType(ruleObjectType, doorType) {
        if (!ruleObjectType) return true;

        var lower  =  (doorType || '').toLowerCase();
        var isDoor    =  lower.indexOf('door') !== -1;
        var isWindow  =  lower.indexOf('window') !== -1;

        if (ruleObjectType === 'AnyDoor')          return isDoor;
        if (ruleObjectType === 'SingleDoor')        return lower.indexOf('single') !== -1;
        if (ruleObjectType === 'DoubleDoor')        return lower.indexOf('double') !== -1;
        if (ruleObjectType === 'BifoldDoor')        return lower.indexOf('bifold') !== -1;
        if (ruleObjectType === 'AnyWindow')         return isWindow;
        if (ruleObjectType === 'SashWindow')        return lower.indexOf('sash') !== -1;
        if (ruleObjectType === 'SideHungCasement')  return lower.indexOf('side hung') !== -1 || lower.indexOf('side-hung') !== -1;
        if (ruleObjectType === 'TopHungCasement')   return lower.indexOf('top hung') !== -1  || lower.indexOf('top-hung') !== -1;

        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Evaluate a Single Rule Condition Against Assembly Values
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__EvaluateCondition(rule, assemblyValues) {
        var condition  =  rule['Condition'] || '';
        var isPerPanel =  rule['Scope'] === 'PerPanel';
        var effWidth   =  isPerPanel ? assemblyValues.panelWidthMm : assemblyValues.widthMm;

        if (condition === 'WidthOver') {
            var threshold  =  parseInt(rule['ThresholdMm'], 10);
            if (isNaN(threshold)) return false;
            return effWidth >= threshold;
        }
        if (condition === 'WidthUnder') {
            var threshold  =  parseInt(rule['ThresholdMm'], 10);
            if (isNaN(threshold)) return false;
            return effWidth <= threshold;
        }
        if (condition === 'HeightOver') {
            var threshold  =  parseInt(rule['ThresholdMm'], 10);
            if (isNaN(threshold)) return false;
            return assemblyValues.heightMm >= threshold;
        }
        if (condition === 'HeightUnder') {
            var threshold  =  parseInt(rule['ThresholdMm'], 10);
            if (isNaN(threshold)) return false;
            return assemblyValues.heightMm <= threshold;
        }
        if (condition === 'WidthUnderAndHeightOver') {
            var wThreshold  =  parseInt(rule['ThresholdMm'], 10);
            var hThreshold  =  parseInt(rule['ThresholdHeightMm'], 10);
            if (isNaN(wThreshold) || isNaN(hThreshold)) return false;
            return effWidth <= wThreshold && assemblyValues.heightMm >= hThreshold;
        }
        if (condition === 'HingeProjectionEquals') {
            var thresholdVal  =  rule['ThresholdValue'];
            if (thresholdVal === undefined || thresholdVal === null) return false;
            return assemblyValues.hingeProjection == thresholdVal;             // <-- Loose equality for string/number interop
        }
        if (condition === 'SelectedHardwareHasNonComplementary') {
            var selectedItems  =  assemblyValues.selectedHardwareItems || [];
            for (var i = 0; i < selectedItems.length; i++) {
                if (selectedItems[i] && selectedItems[i]['HardwareItem__IsComplementary'] === false) {
                    return true;
                }
            }
            return false;
        }
        if (condition === 'IronmongeryMismatch') {
            return assemblyValues.assemblyFinish && assemblyValues.globalFinish && assemblyValues.assemblyFinish !== assemblyValues.globalFinish;
        }
        if (condition === 'LeverMismatch') {
            return assemblyValues.assemblyHandle && assemblyValues.globalHandle && assemblyValues.assemblyHandle !== assemblyValues.globalHandle;
        }

        return false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Assembly Values for Rule Evaluation
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__ExtractAssemblyValues(assembly) {
        var dimsCfg   =  assembly['Assembly__Dimensions__Config']  || {};
        var doorCfg   =  assembly['Assembly__DoorType__Config']    || {};
        var hingeCfg  =  assembly['Assembly__Hinge__Config']       || {};
        var finishCfg =  assembly['Assembly__IronmongeryFinish__Config'] || {};
        var selectedHardwareItems  =  ValeSpec__WarningSystem__ResolveSelectedHardwareItems(assembly);
        var selectedHardwareNames  =  [];

        var StateManager = window.ValeSpec__AppCore__StateManager;
        var globalFinish = StateManager ? (StateManager.ValeSpec__StateManager__GetState().globalIronmongeryFinish || null) : null;
        var assemblyFinish = finishCfg['Assembly__IronmongeryFinish__Config__Finish'] || null;
        var globalHandle = StateManager ? (StateManager.ValeSpec__StateManager__GetState().globalHandleType || null) : null;
        var assemblyHandle = assembly['Assembly__Lever__Config'] ? (assembly['Assembly__Lever__Config']['Assembly__Lever__Config__Type'] || null) : null;

        for (var i = 0; i < selectedHardwareItems.length; i++) {
            var itemName  =  selectedHardwareItems[i] ? selectedHardwareItems[i]['HardwareItem__Name'] : '';
            if (itemName) selectedHardwareNames.push(itemName);
        }

        var doorType      =  doorCfg['Assembly__DoorType__Config__Type']                       || '';
        var widthMm       =  parseInt(dimsCfg['Assembly__Dimensions__Config__WidthMm'], 10)    || 0;
        var heightMm      =  parseInt(dimsCfg['Assembly__Dimensions__Config__HeightMm'], 10)   || 0;
        var panelCount    =  ValeSpec__WarningSystem__ResolvePanelCount(doorType, assembly);
        var panelWidthMm  =  panelCount > 0 ? Math.round(widthMm / panelCount) : widthMm;

        return {
            doorType              :  doorType,
            widthMm               :  widthMm,
            heightMm              :  heightMm,
            panelCount            :  panelCount,
            panelWidthMm          :  panelWidthMm,
            hingeProjection       :  hingeCfg['Assembly__Hinge__Config__Projection']     || null,
            selectedHardwareItems :  selectedHardwareItems,
            selectedHardwareNames :  selectedHardwareNames,
            globalFinish          :  globalFinish,
            assemblyFinish        :  assemblyFinish,
            globalHandle          :  globalHandle,
            assemblyHandle        :  assemblyHandle
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Evaluate All Warning Rules Against an Assembly
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__EvaluateWarnings(assembly) {
        if (!assembly) return [];

        var values          =  ValeSpec__WarningSystem__ExtractAssemblyValues(assembly);
        var rules           =  ValeSpec__WarningSystem__WarningRules;
        var activeWarnings  =  [];

        for (var i = 0; i < rules.length; i++) {
            var rule  =  rules[i];

            if (rule['Enabled'] === false) continue;
            if (!ValeSpec__WarningSystem__MatchesObjectType(rule['ObjectType'], values.doorType)) continue;
            if (!ValeSpec__WarningSystem__EvaluateCondition(rule, values)) continue;

            var isPerPanel      =  rule['Scope'] === 'PerPanel';
            var triggeredValue  =  0;
            var condition       =  rule['Condition'] || '';

            if (condition === 'WidthOver' || condition === 'WidthUnder') {
                triggeredValue  =  isPerPanel
                    ? (values.panelWidthMm + ' mm/panel (' + values.panelCount + ' panels, ' + values.widthMm + ' mm total)')
                    : values.widthMm;
            }
            if (condition === 'HeightOver' || condition === 'HeightUnder')                triggeredValue  =  values.heightMm;
            if (condition === 'WidthUnderAndHeightOver')                                  triggeredValue  =  values.panelWidthMm + ' mm wide x ' + values.heightMm + ' mm tall';
            if (condition === 'HingeProjectionEquals')                                    triggeredValue  =  values.hingeProjection;
            if (condition === 'SelectedHardwareHasNonComplementary')                      triggeredValue  =  (values.selectedHardwareNames || []).join(', ');
            if (condition === 'IronmongeryMismatch')                                      triggeredValue  =  values.assemblyFinish;
            if (condition === 'LeverMismatch')                                            triggeredValue  =  values.assemblyHandle;

            activeWarnings.push({
                RuleId           :  rule['RuleId']             || '',
                Severity         :  rule['Severity']           || 'Warning',
                WarningMessage   :  rule['EditorNotification'] || '',
                DocumentWarning  :  rule['DocumentWarning']    || null,
                TriggeredAtValue :  triggeredValue,
                Acknowledged     :  false
            });
        }

        return activeWarnings;
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply Warning Evaluation and Persist to Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__ApplyWarningsToAssembly(assembly) {
        if (!assembly) return [];

        var newWarnings   =  ValeSpec__WarningSystem__EvaluateWarnings(assembly);
        var existingCfg   =  assembly['Assembly__Warnings__Config'] || {};
        var oldWarnings   =  existingCfg['Assembly__Warnings__Config__ActiveWarnings'] || [];

        var oldMap  =  {};
        for (var o = 0; o < oldWarnings.length; o++) {
            oldMap[oldWarnings[o].RuleId]  =  oldWarnings[o];
        }

        var newMap  =  {};
        for (var n = 0; n < newWarnings.length; n++) {
            newMap[newWarnings[n].RuleId]  =  newWarnings[n];
            if (oldMap[newWarnings[n].RuleId] && oldMap[newWarnings[n].RuleId].Acknowledged) {
                newWarnings[n].Acknowledged  =  true;                          // <-- Preserve prior acknowledgement
            }
        }

        var newlyTriggered  =  [];
        for (var t = 0; t < newWarnings.length; t++) {
            if (!oldMap[newWarnings[t].RuleId]) {
                newlyTriggered.push(newWarnings[t]);
            }
        }

        if (!assembly['Assembly__Warnings__Config']) {
            assembly['Assembly__Warnings__Config']  =  {};
        }
        assembly['Assembly__Warnings__Config']['Assembly__Warnings__Config__ActiveWarnings']  =  newWarnings;

        for (var s = 0; s < newlyTriggered.length; s++) {
            ValeSpec__WarningSystem__ShowCentredNotification(
                newlyTriggered[s].DocumentWarning ? newlyTriggered[s].DocumentWarning.Title : 'Warning',
                newlyTriggered[s].WarningMessage
            );
        }

        return newWarnings;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Cached Warning Rules Array
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__GetWarningRules() {
        return ValeSpec__WarningSystem__WarningRules;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Centred Screen Notification
// -----------------------------------------------------------------------------

    // FUNCTION | Show Centred Warning Notification Overlay
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__ShowCentredNotification(title, message) {
        var overlay  =  document.createElement('div');
        overlay.className  =  'ValeSpec__AssemblyEditor__CentredNotification';

        var card  =  document.createElement('div');
        card.className  =  'ValeSpec__AssemblyEditor__CentredNotification__Card';

        var iconEl  =  document.createElement('div');
        iconEl.className   =  'ValeSpec__AssemblyEditor__CentredNotification__Icon';
        iconEl.textContent =  '\u26A0';

        var titleEl  =  document.createElement('div');
        titleEl.className   =  'ValeSpec__AssemblyEditor__CentredNotification__Title';
        titleEl.textContent =  title || 'Warning';

        var msgEl  =  document.createElement('div');
        msgEl.className   =  'ValeSpec__AssemblyEditor__CentredNotification__Message';
        msgEl.textContent =  message || '';

        card.appendChild(iconEl);
        card.appendChild(titleEl);
        card.appendChild(msgEl);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        requestAnimationFrame(function() {
            overlay.classList.add('ValeSpec__AssemblyEditor__CentredNotification--visible');
        });

        function dismiss() {
            overlay.classList.remove('ValeSpec__AssemblyEditor__CentredNotification--visible');
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 300);
        }

        overlay.addEventListener('click', dismiss);

        setTimeout(dismiss, ValeSpec__WarningSystem__CentredNotificationDurationMs);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Inline Warning Section Renderer
// -----------------------------------------------------------------------------

    // FUNCTION | Render Inline Warning Sections into a Step Card Container
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__RenderInlineWarnings(containerEl, activeWarnings) {
        if (!containerEl) return;

        var existing  =  containerEl.querySelectorAll('.ValeSpec__AssemblyEditor__WarningSection');
        for (var r = 0; r < existing.length; r++) {
            existing[r].parentNode.removeChild(existing[r]);
        }

        if (!activeWarnings || activeWarnings.length === 0) return;

        var footerEl  =  containerEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');

        for (var i = 0; i < activeWarnings.length; i++) {
            var warning  =  activeWarnings[i];

            var section  =  document.createElement('div');
            section.className  =  'ValeSpec__AssemblyEditor__WarningSection';
            if (warning.Severity === 'Caution') {
                section.classList.add('ValeSpec__AssemblyEditor__WarningSection--caution');
            }

            var titleEl  =  document.createElement('div');
            titleEl.className  =  'ValeSpec__AssemblyEditor__WarningSection__Title';

            var docWarning  =  warning.DocumentWarning || {};
            titleEl.textContent  =  docWarning.Title || 'Warning';

            var msgEl  =  document.createElement('div');
            msgEl.className    =  'ValeSpec__AssemblyEditor__WarningSection__Message';
            msgEl.textContent  =  warning.WarningMessage || '';

            section.appendChild(titleEl);
            section.appendChild(msgEl);

            if (footerEl) {
                containerEl.insertBefore(section, footerEl);
            } else {
                containerEl.appendChild(section);
            }
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Restore Persisted Warnings into a Step Body on Re-open
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__RestoreWarningsFromAssembly(assembly, stepBodyEl) {
        if (!assembly || !stepBodyEl) return;
        var warningCfg      =  assembly['Assembly__Warnings__Config'] || {};
        var activeWarnings  =  warningCfg['Assembly__Warnings__Config__ActiveWarnings'] || [];
        ValeSpec__WarningSystem__RenderInlineWarnings(stepBodyEl, activeWarnings);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Modal Dialogs (Existing)
// -----------------------------------------------------------------------------

    // ------------------------------------------------------------
    // ------------------------------------------------------------


    // HELPER FUNCTION | Create Modal Overlay with Dialog
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__CreateModal(title, message) {
        var overlay  =  document.createElement('div');
        overlay.className  =  'ValeSpec__Modal__Overlay';

        var dialog  =  document.createElement('div');
        dialog.className  =  'ValeSpec__Modal__Dialog';

        var h3  =  document.createElement('h3');
        h3.textContent  =  title;

        var p  =  document.createElement('p');
        p.textContent  =  message;

        var actions  =  document.createElement('div');
        actions.className  =  'ValeSpec__Modal__Actions';

        var cancelBtn  =  document.createElement('button');
        cancelBtn.className    =  'ValeSpec__Modal__BtnCancel';
        cancelBtn.textContent  =  'Cancel';

        var confirmBtn  =  document.createElement('button');
        confirmBtn.className    =  'ValeSpec__Modal__BtnConfirm';
        confirmBtn.textContent  =  'Confirm';

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);

        dialog.appendChild(h3);
        dialog.appendChild(p);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);

        return { overlay: overlay, confirmBtn: confirmBtn, cancelBtn: cancelBtn };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show Modal and Return Promise
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__ShowModal(title, message) {
        return new Promise(function(resolve) {
            var modal      =  ValeSpec__WarningSystem__CreateModal(title, message);

            document.body.appendChild(modal.overlay);

            requestAnimationFrame(function() {
                modal.overlay.classList.add('ValeSpec__Modal__Overlay--visible');
            });

            function cleanup(result) {
                modal.overlay.classList.remove('ValeSpec__Modal__Overlay--visible');
                setTimeout(function() {
                    if (modal.overlay.parentNode) modal.overlay.parentNode.removeChild(modal.overlay);
                }, 250);
                resolve(result);
            }

            modal.confirmBtn.addEventListener('click', function() { cleanup(true);  });
            modal.cancelBtn.addEventListener('click',  function() { cleanup(false); });
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Show Hinge Projection Warning (8-inch)
    // ------------------------------------------------------------
    async function ValeSpec__WarningSystem__ShowHingeProjectionWarning() {
        await ValeSpec__WarningSystem__EnsureConfig();
        var msg  =  ValeSpec__WarningSystem__HingeWarningMsg || 'Non-standard hinge projection selected.';
        return ValeSpec__WarningSystem__ShowModal('Hinge Projection Warning', msg);
    }
    // ------------------------------------------------------------


    // FUNCTION | Show Height Mismatch Warning
    // ------------------------------------------------------------
    async function ValeSpec__WarningSystem__ShowHeightMismatchWarning(assemblies) {
        if (!assemblies || assemblies.length < 2) return false;

        var heights  =  [];
        for (var i = 0; i < assemblies.length; i++) {
            var h  =  assemblies[i]['Height_mm'];
            if (h !== undefined && h !== null) heights.push(h);
        }

        if (heights.length < 2) return false;

        var minH  =  Math.min.apply(null, heights);
        var maxH  =  Math.max.apply(null, heights);

        if ((maxH - minH) <= HEIGHT_THRESHOLD) return false;                   // <-- Within tolerance

        await ValeSpec__WarningSystem__EnsureConfig();
        var msg  =  ValeSpec__WarningSystem__HeightMismatchMsg || 'Assembly heights differ significantly.';
        return ValeSpec__WarningSystem__ShowModal('Height Mismatch Warning', msg);
    }
    // ------------------------------------------------------------


    // FUNCTION | Show Ironmongery Mismatch Warning
    // ------------------------------------------------------------
    async function ValeSpec__WarningSystem__ShowIronmongeryMismatchWarning() {
        await ValeSpec__WarningSystem__EnsureConfig();
        var msg  =  ValeSpec__WarningSystem__IronmongeryMismatchMsg || 'The Ironmongery for this assembly is different to the others on the project. Would you like to update all others to match this finish?';
        return ValeSpec__WarningSystem__ShowModal('Ironmongery Finish Mismatch', msg);
    }
    // ------------------------------------------------------------


    // FUNCTION | Show Lever Mismatch Warning
    // ------------------------------------------------------------
    async function ValeSpec__WarningSystem__ShowLeverMismatchWarning() {
        await ValeSpec__WarningSystem__EnsureConfig();
        var msg  =  ValeSpec__WarningSystem__LeverMismatchMsg || 'The Handle Type for this assembly is different to the others on the project. Would you like to update all others to match this handle?';
        return ValeSpec__WarningSystem__ShowModal('Handle Type Mismatch', msg);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Toast Notifications (Existing)
// -----------------------------------------------------------------------------

    // FUNCTION | Show Warning Toast Notification
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__ShowWarningToast(message, type) {
        var toast  =  document.createElement('div');
        toast.className  =  'ValeSpec__AssemblyEditor__Toast';

        if (type === 'warning') {
            toast.classList.add('ValeSpec__AssemblyEditor__Toast--warning');
        }

        toast.textContent  =  message;
        document.body.appendChild(toast);

        requestAnimationFrame(function() {
            toast.classList.add('ValeSpec__AssemblyEditor__Toast--visible');
        });

        setTimeout(function() {
            toast.classList.remove('ValeSpec__AssemblyEditor__Toast--visible');
            setTimeout(function() {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 350);
        }, TOAST_DURATION_MS);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__WarningSystem__EnsureConfig                      : ValeSpec__WarningSystem__EnsureConfig,
        ValeSpec__WarningSystem__EvaluateWarnings                  : ValeSpec__WarningSystem__EvaluateWarnings,
        ValeSpec__WarningSystem__ApplyWarningsToAssembly           : ValeSpec__WarningSystem__ApplyWarningsToAssembly,
        ValeSpec__WarningSystem__RestoreWarningsFromAssembly       : ValeSpec__WarningSystem__RestoreWarningsFromAssembly,
        ValeSpec__WarningSystem__GetWarningRules                   : ValeSpec__WarningSystem__GetWarningRules,
        ValeSpec__WarningSystem__ShowCentredNotification           : ValeSpec__WarningSystem__ShowCentredNotification,
        ValeSpec__WarningSystem__RenderInlineWarnings              : ValeSpec__WarningSystem__RenderInlineWarnings,
        ValeSpec__WarningSystem__ShowHingeProjectionWarning        : ValeSpec__WarningSystem__ShowHingeProjectionWarning,
        ValeSpec__WarningSystem__ShowHeightMismatchWarning         : ValeSpec__WarningSystem__ShowHeightMismatchWarning,
        ValeSpec__WarningSystem__ShowIronmongeryMismatchWarning    : ValeSpec__WarningSystem__ShowIronmongeryMismatchWarning,
        ValeSpec__WarningSystem__ShowLeverMismatchWarning          : ValeSpec__WarningSystem__ShowLeverMismatchWarning,
        ValeSpec__WarningSystem__ShowWarningToast                  : ValeSpec__WarningSystem__ShowWarningToast
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__WarningSystem  =  ValeSpec__AssemblyEditor__WarningSystem;
