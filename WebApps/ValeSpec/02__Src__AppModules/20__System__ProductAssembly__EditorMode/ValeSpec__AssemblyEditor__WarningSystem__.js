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
   - Uses #ValeSpec__Modal__Root for modal dialog DOM

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
    const CONFIG_PATH                         =  '02__Src__AppModules/20__System__ProductAssembly__EditorMode/Na__AssemblyEditor__Config.json';
    const HEIGHT_THRESHOLD                    =  15;                           // <-- Max mm difference before height mismatch warning
    const TOAST_DURATION_MS                   =  4000;                         // <-- Toast display duration
    const DEFAULT_CENTRED_NOTIFICATION_MS     =  4000;                         // <-- Centred notification auto-dismiss duration
    // ------------------------------------------------------------


    // MODULE VARIABLES | Cached Config Data
    // ------------------------------------------------------------
    let ValeSpec__WarningSystem__HingeWarningMsg              =  null;         // <-- 8-inch hinge warning text
    let ValeSpec__WarningSystem__HeightMismatchMsg             =  null;         // <-- Height mismatch warning text
    let ValeSpec__WarningSystem__ConfigLoaded                  =  false;        // <-- Config load flag
    let ValeSpec__WarningSystem__WarningRules                  =  [];           // <-- Cached warning rules array from config
    let ValeSpec__WarningSystem__CentredNotificationDurationMs =  DEFAULT_CENTRED_NOTIFICATION_MS;
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

            var rulesConfig  =  data['AssemblyEditor__WarningRules__Config'] || {};

            ValeSpec__WarningSystem__HingeWarningMsg    =  rulesConfig['AssemblyEditor__WarningRules__Config__HingeProjection8ModalMessage']
                                                        || 'Non-standard hinge projection selected.';
            ValeSpec__WarningSystem__HeightMismatchMsg   =  rulesConfig['AssemblyEditor__WarningRules__Config__HeightMismatchModalMessage']
                                                        || 'Assembly heights differ significantly.';

            var centredMs  =  parseInt(rulesConfig['AssemblyEditor__WarningRules__Config__CentredNotificationDurationMs'], 10);
            if (!isNaN(centredMs) && centredMs > 0) {
                ValeSpec__WarningSystem__CentredNotificationDurationMs  =  centredMs;
            }

            ValeSpec__WarningSystem__WarningRules  =  rulesConfig['AssemblyEditor__WarningRules__Config__Rules'] || [];

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

    // HELPER FUNCTION | Resolve Object Type Match Against Door Type String
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__MatchesObjectType(ruleObjectType, doorType) {
        if (!ruleObjectType || ruleObjectType === 'AnyDoor') return true;

        var lower  =  (doorType || '').toLowerCase();
        if (ruleObjectType === 'SingleDoor') {
            return lower.indexOf('single') !== -1;
        }
        if (ruleObjectType === 'DoubleDoor') {
            return lower.indexOf('double') !== -1 || lower.indexOf('bifold') !== -1;
        }
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Evaluate a Single Rule Condition Against Assembly Values
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__EvaluateCondition(rule, assemblyValues) {
        var condition  =  rule['Condition'] || '';

        if (condition === 'WidthOver') {
            var threshold  =  parseInt(rule['ThresholdMm'], 10);
            if (isNaN(threshold)) return false;
            return assemblyValues.widthMm >= threshold;
        }
        if (condition === 'WidthUnder') {
            var threshold  =  parseInt(rule['ThresholdMm'], 10);
            if (isNaN(threshold)) return false;
            return assemblyValues.widthMm <= threshold;
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
        if (condition === 'HingeProjectionEquals') {
            var thresholdVal  =  rule['ThresholdValue'];
            if (thresholdVal === undefined || thresholdVal === null) return false;
            return assemblyValues.hingeProjection == thresholdVal;             // <-- Loose equality for string/number interop
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

        return {
            doorType         :  doorCfg['Assembly__DoorType__Config__Type']         || '',
            widthMm          :  parseInt(dimsCfg['Assembly__Dimensions__Config__WidthMm'], 10)  || 0,
            heightMm         :  parseInt(dimsCfg['Assembly__Dimensions__Config__HeightMm'], 10) || 0,
            hingeProjection  :  hingeCfg['Assembly__Hinge__Config__Projection']     || null
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

            if (!ValeSpec__WarningSystem__MatchesObjectType(rule['ObjectType'], values.doorType)) continue;
            if (!ValeSpec__WarningSystem__EvaluateCondition(rule, values)) continue;

            var triggeredValue  =  0;
            var condition       =  rule['Condition'] || '';
            if (condition === 'WidthOver' || condition === 'WidthUnder')   triggeredValue  =  values.widthMm;
            if (condition === 'HeightOver' || condition === 'HeightUnder') triggeredValue  =  values.heightMm;
            if (condition === 'HingeProjectionEquals')                     triggeredValue  =  values.hingeProjection;

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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Modal Dialogs (Existing)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get or Create Modal Root Element
    // ------------------------------------------------------------
    function ValeSpec__WarningSystem__GetModalRoot() {
        var root  =  document.getElementById('ValeSpec__Modal__Root');
        if (!root) {
            root     =  document.createElement('div');
            root.id  =  'ValeSpec__Modal__Root';
            document.body.appendChild(root);
        }
        return root;
    }
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
            var modalRoot  =  ValeSpec__WarningSystem__GetModalRoot();
            var modal      =  ValeSpec__WarningSystem__CreateModal(title, message);

            modalRoot.appendChild(modal.overlay);

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
        ValeSpec__WarningSystem__EnsureConfig                  : ValeSpec__WarningSystem__EnsureConfig,
        ValeSpec__WarningSystem__EvaluateWarnings               : ValeSpec__WarningSystem__EvaluateWarnings,
        ValeSpec__WarningSystem__ApplyWarningsToAssembly        : ValeSpec__WarningSystem__ApplyWarningsToAssembly,
        ValeSpec__WarningSystem__GetWarningRules                : ValeSpec__WarningSystem__GetWarningRules,
        ValeSpec__WarningSystem__ShowCentredNotification        : ValeSpec__WarningSystem__ShowCentredNotification,
        ValeSpec__WarningSystem__RenderInlineWarnings           : ValeSpec__WarningSystem__RenderInlineWarnings,
        ValeSpec__WarningSystem__ShowHingeProjectionWarning     : ValeSpec__WarningSystem__ShowHingeProjectionWarning,
        ValeSpec__WarningSystem__ShowHeightMismatchWarning      : ValeSpec__WarningSystem__ShowHeightMismatchWarning,
        ValeSpec__WarningSystem__ShowWarningToast               : ValeSpec__WarningSystem__ShowWarningToast
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__WarningSystem  =  ValeSpec__AssemblyEditor__WarningSystem;
