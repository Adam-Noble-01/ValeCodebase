/* =============================================================================
   VALESPEC - ASSEMBLY EDITOR WARNING SYSTEM
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__WarningSystem__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - WarningSystem
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Modal dialogs, toast notifications, and validation warnings
   CREATED    : 2026

   DESCRIPTION:
   - ValeSpec__WarningSystem__ShowHingeProjectionWarning() for 8-inch projection approval
   - ValeSpec__WarningSystem__ShowHeightMismatchWarning() compares all assembly heights (>15mm diff)
   - ValeSpec__WarningSystem__ShowWarningToast() for non-blocking toast notifications
   - Uses #ValeSpec__Modal__Root for modal dialog DOM

   ============================================================================= */

// =============================================================================
// REGION | Assembly Editor Warning System Module
// =============================================================================

const ValeSpec__AssemblyEditor__WarningSystem = (function() {

    // MODULE CONSTANTS | Config Path
    // ------------------------------------------------------------
    const CONFIG_PATH        =  '02__Src__AppModules/20__System__ProductAssembly__EditorMode/Na__AssemblyEditor__Config.json';
    const HEIGHT_THRESHOLD   =  15;                                         // <-- Max mm difference before warning
    const TOAST_DURATION_MS  =  4000;                                       // <-- Toast display duration
    // ------------------------------------------------------------


    // MODULE VARIABLES | Cached Warning Messages
    // ------------------------------------------------------------
    let ValeSpec__WarningSystem__HingeWarningMsg    =  null;                // <-- 8-inch hinge warning text
    let ValeSpec__WarningSystem__HeightMismatchMsg  =  null;                // <-- Height mismatch warning text
    let ValeSpec__WarningSystem__ConfigLoaded       =  false;               // <-- Config load flag
    // ------------------------------------------------------------


    // HELPER FUNCTION | Load Warning Messages from Config
    // ------------------------------------------------------------
    async function ValeSpec__WarningSystem__EnsureConfig() {
        if (ValeSpec__WarningSystem__ConfigLoaded) return;
        try {
            var response  =  await fetch(CONFIG_PATH);
            if (!response.ok) return;
            var data      =  await response.json();
            var warnings  =  data['AssemblyEditor__Warnings__Config'] || {};
            ValeSpec__WarningSystem__HingeWarningMsg    =  warnings['HingeProjection8InchMessage']  || 'Non-standard hinge projection selected.';
            ValeSpec__WarningSystem__HeightMismatchMsg  =  warnings['HeightMismatchMessage']        || 'Assembly heights differ significantly.';
            ValeSpec__WarningSystem__ConfigLoaded       =  true;
        } catch (e) {
            console.warn('[ValeSpec__WarningSystem] Config load failed:', e);
        }
    }
    // ------------------------------------------------------------


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

        if ((maxH - minH) <= HEIGHT_THRESHOLD) return false;               // <-- Within tolerance

        await ValeSpec__WarningSystem__EnsureConfig();
        var msg  =  ValeSpec__WarningSystem__HeightMismatchMsg || 'Assembly heights differ significantly.';
        return ValeSpec__WarningSystem__ShowModal('Height Mismatch Warning', msg);
    }
    // ------------------------------------------------------------


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


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__WarningSystem__ShowHingeProjectionWarning  : ValeSpec__WarningSystem__ShowHingeProjectionWarning,
        ValeSpec__WarningSystem__ShowHeightMismatchWarning   : ValeSpec__WarningSystem__ShowHeightMismatchWarning,
        ValeSpec__WarningSystem__ShowWarningToast            : ValeSpec__WarningSystem__ShowWarningToast
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__WarningSystem  =  ValeSpec__AssemblyEditor__WarningSystem;
