/* =============================================================================
   VGHLANTERN - DOCUMENT MANAGEMENT PROJECT ACTIONS
   =============================================================================

   FILE       : VghLantern__DocManagement__ProjectActions__.js
   NAMESPACE  : VghLantern
   MODULE     : DocManagement - ProjectActions
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Action buttons and modal dialogs for lantern project CRUD
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Renders the "+ New Project" button into the actions container
   - New Project opens the database-first modal: a Vale job number is typed,
     validated in real time, fetched from the Vale database placeholder and
     previewed for confirmation before the project is built from the record
   - The previous manual entry modal remains as the fallback behind the
     "Not in the Database? Click Here" link for ad hoc and test projects
   - Open action loads a project and switches to the Lantern Editor mode
   - Edit action toggles inline row editing; Save persists metadata via ProjectFileManager
   - Delete action shows a confirmation modal before removing a project
   - Owns the single delegated click listener on the table container, covering
     both sortable headers and row action buttons
   - Coordinates with ProjectFileManager, StateManager, and ModeManager

   -----------------------------------------------------------------------------

   WHY DELEGATION LIVES HERE:
   ProjectList rewrites the table's innerHTML on every render, so per-element
   listeners would be lost. One delegated listener bound once to the container
   survives every redraw.

   ============================================================================= */

// =============================================================================
// REGION | Project Actions Module
// =============================================================================

const VghLantern__DocManagement__ProjectActions = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants - DOM Target IDs
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Target IDs
    // ------------------------------------------------------------
    const ACTIONS_CONTAINER_ID  =  'VghLantern__DocManagement__Actions';          // <-- Button bar container
    const TABLE_CONTAINER_ID    =  'VghLantern__DocManagement__TableContainer';   // <-- Delegation root
    const MODAL_ROOT_ID         =  'VghLantern__Modal__Root';                     // <-- Modal overlay element
    const MODAL_TITLE_ID        =  'VghLantern__Modal__TitleEl';                  // <-- Modal title element
    const MODAL_BODY_ID         =  'VghLantern__Modal__BodyEl';                   // <-- Modal body element
    const MODAL_ACTIONS_ID      =  'VghLantern__Modal__ActionsEl';                // <-- Modal button row element
    const MODAL_VISIBLE_CLASS   =  'VghLantern__Modal__Overlay--visible';         // <-- Shown-state class
    // ------------------------------------------------------------


    // MODULE VARIABLES | Delegation Bind Guard
    // ------------------------------------------------------------
    let VghLantern__ProjectActions__IsDelegationBound  =  false;                  // <-- Prevents duplicate listeners
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access and Modal Dialog Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the New Project Config Block
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__NewProjectConfig() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return {};

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return {};

        return appConfig['VghLantern__DocManagement__Config__NewProject'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Database New Project Config Block
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__DbConfig() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return {};

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return {};

        return appConfig['VghLantern__DocManagement__Config__NewProjectDatabase'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Database Modal Copy String
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__DbCopy(key) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireString(
            VghLantern__ProjectActions__DbConfig(), key,
            'Na__DocManagement__Config.json -> VghLantern__DocManagement__Config__NewProjectDatabase');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for HTML Interpolation
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__Escape(textValue) {
        return String(textValue == null ? '' : textValue)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show Modal Dialog
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__ShowModal(title, bodyHtml, actionsHtml) {
        var root       =  document.getElementById(MODAL_ROOT_ID);
        var titleEl    =  document.getElementById(MODAL_TITLE_ID);
        var bodyEl     =  document.getElementById(MODAL_BODY_ID);
        var actionsEl  =  document.getElementById(MODAL_ACTIONS_ID);

        if (!root || !titleEl || !bodyEl || !actionsEl) return;

        titleEl.textContent  =  title;
        bodyEl.innerHTML     =  bodyHtml;
        actionsEl.innerHTML  =  actionsHtml;

        root.classList.add(MODAL_VISIBLE_CLASS);                                  // <-- Display the modal overlay
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hide Modal Dialog
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__HideModal() {
        var root  =  document.getElementById(MODAL_ROOT_ID);
        if (root) root.classList.remove(MODAL_VISIBLE_CLASS);                     // <-- Hide the modal overlay
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Re-render Project List Table
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__RefreshProjectList() {
        var ProjectList  =  window.VghLantern__DocManagement__ProjectList;
        if (ProjectList) ProjectList.VghLantern__ProjectList__Render();            // <-- Delegate to the list module
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Raise a Toast Notification When Available
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__Toast(message, variantKey) {
        var Toast  =  window.VghLantern__AppNotifications__Toast;
        if (Toast && Toast.VghLantern__Toast__Show) {
            Toast.VghLantern__Toast__Show(message, variantKey);
            return;
        }
        console.info('[VghLantern ProjectActions] ' + message);                    // <-- Console fallback
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Labelled Modal Text Input Row
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__BuildInputRow(labelText, inputId, placeholderText) {
        var html  =  '<label class="VghLantern__Modal__Label" for="' + inputId + '">' + labelText + '</label>';
        html     +=  '<input id="' + inputId + '" class="VghLantern__Modal__Input" type="text"';
        html     +=      ' autocomplete="off" data-vghlantern-noautofill="true"';
        html     +=      ' placeholder="' + placeholderText + '">';
        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | New Project Flow - Vale Database First
// -----------------------------------------------------------------------------
// The preferred way to create a project: type a Vale job number, fetch the
// client record behind it, confirm the details, and the project builds itself.
// The manual form below survives as the fallback for ad hoc projects.

    // FUNCTION | Handle New Project Button Click - Open the Database Modal
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__OnNewProjectClick() {
        VghLantern__ProjectActions__ShowDbEntryModal('');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Show the Job Number Entry Step
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__ShowDbEntryModal(prefillCode) {
        var esc  =  VghLantern__ProjectActions__Escape;

        var bodyHtml  =  '';
        bodyHtml     +=  '<label class="VghLantern__Modal__Label" for="VghLantern__Modal__InputJobNumber">';
        bodyHtml     +=      esc(VghLantern__ProjectActions__DbCopy('JobNumberLabel'));
        bodyHtml     +=  '</label>';
        bodyHtml     +=  '<input id="VghLantern__Modal__InputJobNumber" class="VghLantern__Modal__Input" type="text"';
        bodyHtml     +=      ' inputmode="numeric" autocomplete="off" data-vghlantern-noautofill="true"';
        bodyHtml     +=      ' placeholder="' + esc(VghLantern__ProjectActions__DbCopy('JobNumberPlaceholder')) + '"';
        bodyHtml     +=      ' value="' + esc(prefillCode || '') + '">';
        bodyHtml     +=  '<div id="VghLantern__Modal__ValidationMsg" class="VghLantern__Modal__ValidationMsg"></div>';
        bodyHtml     +=  '<p class="VghLantern__DocManagement__DbHint">' + esc(VghLantern__ProjectActions__DbCopy('JobNumberHint')) + '</p>';
        bodyHtml     +=  '<div class="VghLantern__DocManagement__DbManualRow">';
        bodyHtml     +=      '<button type="button" id="VghLantern__Modal__BtnManualEntry" class="VghLantern__DocManagement__DbManualLink">';
        bodyHtml     +=          esc(VghLantern__ProjectActions__DbCopy('ManualEntryLinkText'));
        bodyHtml     +=      '</button>';
        bodyHtml     +=  '</div>';

        var actionsHtml  =  '';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnCancel" class="VghLantern__Modal__BtnSecondary">';
        actionsHtml     +=      esc(VghLantern__ProjectActions__DbCopy('CancelButtonLabel'));
        actionsHtml     +=  '</button>';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnDbFetch" class="VghLantern__Modal__BtnPrimary" disabled>';
        actionsHtml     +=      esc(VghLantern__ProjectActions__DbCopy('FetchButtonLabel'));
        actionsHtml     +=  '</button>';

        VghLantern__ProjectActions__ShowModal(VghLantern__ProjectActions__DbCopy('ModalTitle'), bodyHtml, actionsHtml);

        var cancelBtn   =  document.getElementById('VghLantern__Modal__BtnCancel');
        var fetchBtn    =  document.getElementById('VghLantern__Modal__BtnDbFetch');
        var manualBtn   =  document.getElementById('VghLantern__Modal__BtnManualEntry');
        var codeInput   =  document.getElementById('VghLantern__Modal__InputJobNumber');

        if (cancelBtn)  cancelBtn.addEventListener('click', VghLantern__ProjectActions__HideModal);
        if (fetchBtn)   fetchBtn.addEventListener('click', VghLantern__ProjectActions__OnDbFetch);
        if (manualBtn)  manualBtn.addEventListener('click', VghLantern__ProjectActions__OpenManualNewProjectModal);

        if (codeInput) {
            codeInput.addEventListener('input', VghLantern__ProjectActions__OnDbEntryInput);
            codeInput.addEventListener('keydown', function(keyEvent) {
                if (keyEvent.key === 'Enter' && !keyEvent.repeat) {
                    keyEvent.preventDefault();
                    VghLantern__ProjectActions__OnDbFetch();                  // <-- Enter fetches; OnDbFetch re-validates first
                }
            });
            codeInput.focus();
            VghLantern__ProjectActions__OnDbEntryInput();                     // <-- Prefilled Back-navigation re-arms the fetch button
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Map a Validation Reason to Its User-Facing Copy
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__DbReasonMessage(reasonKey) {
        if (reasonKey === 'nonNumeric')   return VghLantern__ProjectActions__DbCopy('ErrorNonNumeric');
        if (reasonKey === 'leadingZero')  return VghLantern__ProjectActions__DbCopy('ErrorLeadingZero');
        if (reasonKey === 'tooLong')      return VghLantern__ProjectActions__DbCopy('ErrorWrongLength');
        if (reasonKey === 'tooShort')     return VghLantern__ProjectActions__DbCopy('ErrorWrongLength');
        return '';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Live-Validate the Job Number as It Is Typed
    // ------------------------------------------------------------
    // A short entry is a prefix in progress rather than a mistake, so it only
    // disables the fetch button; the red message is reserved for characters
    // that can never become a valid Vale job number.
    function VghLantern__ProjectActions__OnDbEntryInput() {
        var ClientLookup  =  window.VghLantern__ValeDatabase__ClientLookup;
        var codeInput     =  document.getElementById('VghLantern__Modal__InputJobNumber');
        var fetchBtn      =  document.getElementById('VghLantern__Modal__BtnDbFetch');
        if (!ClientLookup || !codeInput) return;

        var verdict  =  ClientLookup.VghLantern__ValeDatabase__ValidateJobNumber(codeInput.value);
        var isTypingPrefix  =  (verdict.Reason === 'empty' || verdict.Reason === 'tooShort');

        if (fetchBtn) fetchBtn.disabled  =  !verdict.IsValid;

        if (verdict.IsValid || isTypingPrefix) {
            VghLantern__ProjectActions__ShowValidationMessage('');
            codeInput.classList.remove('VghLantern__Modal__Input--invalid');
            return;
        }

        VghLantern__ProjectActions__ShowValidationMessage(VghLantern__ProjectActions__DbReasonMessage(verdict.Reason));
        codeInput.classList.add('VghLantern__Modal__Input--invalid');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Toggle the Fetching State on the Entry Step
    // ------------------------------------------------------------
    // Cancel and the manual-entry link are frozen too: leaving the entry step
    // while a lookup is in flight would let the resolved lookup re-open a
    // dismissed modal or stomp the manual form the user had switched to.
    function VghLantern__ProjectActions__SetDbFetchingState(isFetching) {
        var codeInput  =  document.getElementById('VghLantern__Modal__InputJobNumber');
        var fetchBtn   =  document.getElementById('VghLantern__Modal__BtnDbFetch');
        var cancelBtn  =  document.getElementById('VghLantern__Modal__BtnCancel');
        var manualBtn  =  document.getElementById('VghLantern__Modal__BtnManualEntry');
        var msgEl      =  document.getElementById('VghLantern__Modal__ValidationMsg');

        if (codeInput) codeInput.disabled  =  isFetching;
        if (cancelBtn) cancelBtn.disabled  =  isFetching;
        if (manualBtn) manualBtn.disabled  =  isFetching;
        if (fetchBtn) {
            fetchBtn.disabled     =  isFetching;
            fetchBtn.textContent  =  VghLantern__ProjectActions__DbCopy(isFetching ? 'FetchingLabel' : 'FetchButtonLabel');
        }
        if (msgEl) {
            msgEl.classList.toggle('VghLantern__Modal__ValidationMsg--info', isFetching);
            msgEl.textContent  =  isFetching ? VghLantern__ProjectActions__DbCopy('FetchingMessage') : '';
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Fetch the Client Record and Advance to the Preview
    // ------------------------------------------------------------
    async function VghLantern__ProjectActions__OnDbFetch() {
        var ClientLookup  =  window.VghLantern__ValeDatabase__ClientLookup;
        var codeInput     =  document.getElementById('VghLantern__Modal__InputJobNumber');
        if (!ClientLookup || !codeInput) return;

        var jobNumberText  =  codeInput.value.trim();
        var verdict        =  ClientLookup.VghLantern__ValeDatabase__ValidateJobNumber(jobNumberText);
        if (!verdict.IsValid) {
            VghLantern__ProjectActions__ShowValidationMessage(VghLantern__ProjectActions__DbReasonMessage(verdict.Reason));
            codeInput.classList.add('VghLantern__Modal__Input--invalid');
            return;                                                           // <-- Enter pressed on a not-yet-valid entry
        }

        VghLantern__ProjectActions__SetDbFetchingState(true);
        var result  =  await ClientLookup.VghLantern__ValeDatabase__FetchClientRecord(jobNumberText);

        // Belt and braces behind the frozen buttons above: if the entry step is
        // no longer on screen (dismissed, or replaced by another feature that
        // drives the shared modal root), the stale result is abandoned.
        var modalRoot  =  document.getElementById(MODAL_ROOT_ID);
        if (!document.getElementById('VghLantern__Modal__BtnDbFetch') ||
            !modalRoot || !modalRoot.classList.contains(MODAL_VISIBLE_CLASS)) {
            return;                                                           // <-- Entry step gone mid-fetch; nothing to update
        }

        if (result && result.Ok) {
            await VghLantern__ProjectActions__ShowDbPreviewModal(jobNumberText, result.Record);
            return;                                                           // <-- The preview replaced the entry step's DOM
        }

        VghLantern__ProjectActions__SetDbFetchingState(false);
        var messageKey  =  (result && result.Error === 'unavailable') ? 'LookupUnavailableMessage' : 'NotFoundMessage';
        VghLantern__ProjectActions__ShowValidationMessage(
            VghLantern__ProjectActions__DbCopy(messageKey).replace('{JobNumber}', jobNumberText));
        codeInput.focus();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Show the Fetched Client Record for Confirmation
    // ------------------------------------------------------------
    // Rows render whatever columns the client table declares (minus the job
    // number, which the intro line carries), so a future database column
    // appears here without this modal changing.
    async function VghLantern__ProjectActions__ShowDbPreviewModal(jobNumberText, clientRecord) {
        var ClientLookup  =  window.VghLantern__ValeDatabase__ClientLookup;
        var esc           =  VghLantern__ProjectActions__Escape;
        var columns       =  await ClientLookup.VghLantern__ValeDatabase__GetColumns();

        var bodyHtml  =  '';
        bodyHtml     +=  '<p class="VghLantern__DocManagement__DbIntro">';
        bodyHtml     +=      esc(VghLantern__ProjectActions__DbCopy('PreviewIntro')).replace('{JobNumber}', '<strong>' + esc(jobNumberText) + '</strong>');
        bodyHtml     +=  '</p>';
        bodyHtml     +=  '<div class="VghLantern__DocManagement__DbPreview">';

        for (var i = 0; i < columns.length; i++) {
            var column  =  columns[i];
            if (!column || column.Key === 'JobNumber') continue;              // <-- The intro line already names the job number

            var cellValue  =  clientRecord[column.Key];
            bodyHtml      +=  '<div class="VghLantern__DocManagement__DbPreviewRow">';
            bodyHtml      +=      '<span class="VghLantern__DocManagement__DbPreviewLabel">' + esc(column.Label || column.Key) + '</span>';
            bodyHtml      +=      '<span class="VghLantern__DocManagement__DbPreviewValue">' + esc(cellValue == null ? '' : cellValue) + '</span>';
            bodyHtml      +=  '</div>';
        }

        bodyHtml     +=  '</div>';
        bodyHtml     +=  '<p class="VghLantern__DocManagement__DbQuestion">' + esc(VghLantern__ProjectActions__DbCopy('PreviewQuestion')) + '</p>';
        bodyHtml     +=  '<div id="VghLantern__Modal__ValidationMsg" class="VghLantern__Modal__ValidationMsg"></div>';

        var actionsHtml  =  '';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnDbBack" class="VghLantern__Modal__BtnSecondary">';
        actionsHtml     +=      esc(VghLantern__ProjectActions__DbCopy('BackButtonLabel'));
        actionsHtml     +=  '</button>';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnDbAccept" class="VghLantern__Modal__BtnPrimary">';
        actionsHtml     +=      esc(VghLantern__ProjectActions__DbCopy('AcceptButtonLabel'));
        actionsHtml     +=  '</button>';

        VghLantern__ProjectActions__ShowModal(VghLantern__ProjectActions__DbCopy('ConfirmTitle'), bodyHtml, actionsHtml);

        var backBtn    =  document.getElementById('VghLantern__Modal__BtnDbBack');
        var acceptBtn  =  document.getElementById('VghLantern__Modal__BtnDbAccept');

        if (backBtn) {
            backBtn.addEventListener('click', function() {
                VghLantern__ProjectActions__ShowDbEntryModal(jobNumberText);  // <-- Back keeps the typed number
            });
        }

        if (acceptBtn) {
            acceptBtn.addEventListener('click', function() {
                VghLantern__ProjectActions__OnDbAcceptCreate(jobNumberText, clientRecord);
            });
            acceptBtn.addEventListener('keydown', function(keyEvent) {
                if (keyEvent.key === 'Enter' && keyEvent.repeat) {
                    keyEvent.preventDefault();                                // <-- A held Enter from the entry step must not auto-accept
                }
            });
            acceptBtn.focus();                                                // <-- A fresh Enter press accepts via the focused button
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Project from the Confirmed Client Record
    // ------------------------------------------------------------
    // Field mapping: the job number is the project code, the site name is the
    // project name (matching the house-name style of manually created
    // projects), and the record's document name and client name land in their
    // metadata slots. SiteAddress and Author are the two schema fields no UI
    // collected before this flow existed; the database record fills both.
    function VghLantern__ProjectActions__OnDbAcceptCreate(jobNumberText, clientRecord) {
        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        var StateManager        =  window.VghLantern__AppCore__StateManager;
        var ModeManager         =  window.VghLantern__AppCore__ModeManager;
        var ClientLookup        =  window.VghLantern__ValeDatabase__ClientLookup;

        if (!ProjectFileManager) {
            VghLantern__ProjectActions__ShowValidationMessage('Project storage is unavailable.');
            return;
        }

        var existing  =  ProjectFileManager.VghLantern__ProjectFileManager__LoadProject(jobNumberText);
        if (existing) {
            VghLantern__ProjectActions__ShowValidationMessage('Project code ' + jobNumberText + ' already exists.');
            return;                                                           // <-- Never silently overwrite
        }

        var composedAddress  =  ClientLookup
            ? ClientLookup.VghLantern__ValeDatabase__ComposeSiteAddress(clientRecord)
            : '';

        var projectData  =  ProjectFileManager.VghLantern__ProjectFileManager__CreateProject(
            jobNumberText,
            clientRecord.SiteName       || '',
            clientRecord.DocumentName   || '',
            clientRecord.ClientName     || '',
            composedAddress,
            clientRecord.AccountManager || '');

        if (!projectData) {
            VghLantern__ProjectActions__ShowValidationMessage('Could not create the project. See the console for detail.');
            return;
        }

        if (StateManager) {
            StateManager.VghLantern__StateManager__SetCurrentProject(projectData); // <-- Make the new project active
        }

        // The welcome letter's recipient block is per-project letter data, so the
        // record's postal address is seeded through the LetterModel, the letter's
        // one writer. SetField marks the project dirty, so the standard autosave
        // persists the seeding moments later through the one existing write path.
        var LetterModel  =  window.VghLantern__ClientDoc__LetterModel;
        if (LetterModel && LetterModel.VghLantern__ClientDoc__LetterModel__SetField) {
            LetterModel.VghLantern__ClientDoc__LetterModel__SetField(projectData, 'clientAddressLine1',    clientRecord.SiteName    || '');
            LetterModel.VghLantern__ClientDoc__LetterModel__SetField(projectData, 'clientAddressStreet',   clientRecord.SiteAddress || '');
            LetterModel.VghLantern__ClientDoc__LetterModel__SetField(projectData, 'clientAddressTownCity', clientRecord.PostTown    || '');
            LetterModel.VghLantern__ClientDoc__LetterModel__SetField(projectData, 'clientAddressPostCode', clientRecord.Postcode    || '');
        }

        VghLantern__ProjectActions__HideModal();
        VghLantern__ProjectActions__RefreshProjectList();
        VghLantern__ProjectActions__Toast(
            'Project ' + jobNumberText + ' created for ' + (clientRecord.ClientName || 'the client') + '.', 'success');

        if (ModeManager) {
            var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
            var config      =  VghLantern__ProjectActions__NewProjectConfig();
            var landingMode =  ConfigLoader.VghLantern__ConfigLoader__RequireString(
                config, 'LandingModeKey', 'Na__DocManagement__Config.json -> VghLantern__DocManagement__Config__NewProject');
            ModeManager.VghLantern__ModeManager__SwitchToMode(landingMode);    // <-- Straight into the Lantern Editor
        }

        // The Creation Wizard pops over the freshly opened editor exactly as
        // it does for the manual flow, prefilled project metadata and all.
        var CreationWizard  =  window.VghLantern__CreationWizard__Controller;
        if (CreationWizard) CreationWizard.VghLantern__CreationWizard__Controller__BeginFirstLantern();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | New Project Flow - Manual Entry Fallback
// -----------------------------------------------------------------------------

    // FUNCTION | Open the Manual New Project Modal
    // ------------------------------------------------------------
    // The original pre-database form, now reached via the "Not in the
    // Database? Click Here" link. Kept for ad hoc projects and for testing
    // without touching client data.
    function VghLantern__ProjectActions__OpenManualNewProjectModal() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var NEW_PROJECT_LABEL  =  'Na__DocManagement__Config.json -> VghLantern__DocManagement__Config__NewProject';
        var config  =  VghLantern__ProjectActions__NewProjectConfig();

        var bodyHtml  =  '';
        bodyHtml     +=  VghLantern__ProjectActions__BuildInputRow(
            'Project Code',  'VghLantern__Modal__InputProjectCode',  ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'PlaceholderProjectCode',  NEW_PROJECT_LABEL));
        bodyHtml     +=  VghLantern__ProjectActions__BuildInputRow(
            'Project Name',  'VghLantern__Modal__InputProjectName',  ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'PlaceholderProjectName',  NEW_PROJECT_LABEL));
        bodyHtml     +=  VghLantern__ProjectActions__BuildInputRow(
            'Client Name',   'VghLantern__Modal__InputClientName',   ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'PlaceholderClientName',   NEW_PROJECT_LABEL));
        bodyHtml     +=  VghLantern__ProjectActions__BuildInputRow(
            'Document Name', 'VghLantern__Modal__InputDocumentName', ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'PlaceholderDocumentName', NEW_PROJECT_LABEL));
        bodyHtml     +=  '<div id="VghLantern__Modal__ValidationMsg" class="VghLantern__Modal__ValidationMsg"></div>';

        var actionsHtml  =  '';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnCancel" class="VghLantern__Modal__BtnSecondary">Cancel</button>';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnConfirm" class="VghLantern__Modal__BtnPrimary">Create Project</button>';

        VghLantern__ProjectActions__ShowModal('New Lantern Project', bodyHtml, actionsHtml);

        var cancelBtn   =  document.getElementById('VghLantern__Modal__BtnCancel');
        var confirmBtn  =  document.getElementById('VghLantern__Modal__BtnConfirm');
        var codeInput   =  document.getElementById('VghLantern__Modal__InputProjectCode');

        if (cancelBtn)  cancelBtn.addEventListener('click', VghLantern__ProjectActions__HideModal);
        if (confirmBtn) confirmBtn.addEventListener('click', VghLantern__ProjectActions__OnConfirmNewProject);
        if (codeInput)  codeInput.focus();                                        // <-- Land the caret on the first field
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Show Inline Validation Message in the Modal
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__ShowValidationMessage(message) {
        var target  =  document.getElementById('VghLantern__Modal__ValidationMsg');
        if (target) target.textContent  =  message;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Confirm New Project Creation from Modal
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__OnConfirmNewProject() {
        var codeInput    =  document.getElementById('VghLantern__Modal__InputProjectCode');
        var nameInput    =  document.getElementById('VghLantern__Modal__InputProjectName');
        var clientInput  =  document.getElementById('VghLantern__Modal__InputClientName');
        var docInput     =  document.getElementById('VghLantern__Modal__InputDocumentName');

        var projectCode   =  codeInput   ? codeInput.value.trim()   : '';
        var projectName   =  nameInput   ? nameInput.value.trim()   : '';
        var clientName    =  clientInput ? clientInput.value.trim() : '';
        var documentName  =  docInput    ? docInput.value.trim()    : '';

        if (!projectCode || !projectName) {
            VghLantern__ProjectActions__ShowValidationMessage('Project Code and Project Name are both required.');
            return;                                                               // <-- Abort while required fields are empty
        }

        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        var StateManager        =  window.VghLantern__AppCore__StateManager;
        var ModeManager         =  window.VghLantern__AppCore__ModeManager;

        if (!ProjectFileManager) {
            VghLantern__ProjectActions__ShowValidationMessage('Project storage is unavailable.');
            return;
        }

        var existing  =  ProjectFileManager.VghLantern__ProjectFileManager__LoadProject(projectCode);
        if (existing) {
            VghLantern__ProjectActions__ShowValidationMessage('Project code ' + projectCode + ' already exists.');
            return;                                                               // <-- Never silently overwrite
        }

        var projectData  =  ProjectFileManager.VghLantern__ProjectFileManager__CreateProject(
            projectCode, projectName, documentName, clientName);

        if (!projectData) {
            VghLantern__ProjectActions__ShowValidationMessage('Could not create the project. See the console for detail.');
            return;
        }

        if (StateManager) {
            StateManager.VghLantern__StateManager__SetCurrentProject(projectData); // <-- Make the new project active
        }

        VghLantern__ProjectActions__HideModal();
        VghLantern__ProjectActions__RefreshProjectList();
        VghLantern__ProjectActions__Toast('Project ' + projectCode + ' created.', 'success');

        if (ModeManager) {
            var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
            var config      =  VghLantern__ProjectActions__NewProjectConfig();
            var landingMode =  ConfigLoader.VghLantern__ConfigLoader__RequireString(
                config, 'LandingModeKey', 'Na__DocManagement__Config.json -> VghLantern__DocManagement__Config__NewProject');
            ModeManager.VghLantern__ModeManager__SwitchToMode(landingMode);        // <-- Straight into the Lantern Editor
        }

        // The Creation Wizard pops over the freshly opened editor to shape the
        // seeded first lantern. It declines by itself (returning false, needing
        // no handling here) when disabled in config or unavailable, leaving the
        // seed lantern standing exactly as before the wizard existed.
        var CreationWizard  =  window.VghLantern__CreationWizard__Controller;
        if (CreationWizard) CreationWizard.VghLantern__CreationWizard__Controller__BeginFirstLantern();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Row Actions - Open, Edit, and Delete
// -----------------------------------------------------------------------------

    // FUNCTION | Handle Open Project Row Action
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__OpenProject(projectCode) {
        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        var StateManager        =  window.VghLantern__AppCore__StateManager;
        var ModeManager         =  window.VghLantern__AppCore__ModeManager;

        if (!ProjectFileManager) return;

        var projectData  =  ProjectFileManager.VghLantern__ProjectFileManager__LoadProject(projectCode);
        if (!projectData) {
            VghLantern__ProjectActions__Toast('Could not load project ' + projectCode + '.', 'error');
            return;
        }

        if (StateManager) {
            StateManager.VghLantern__StateManager__SetCurrentProject(projectData); // <-- Publish to application state
        }

        if (ModeManager) {
            var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
            var config      =  VghLantern__ProjectActions__NewProjectConfig();
            var landingMode =  ConfigLoader.VghLantern__ConfigLoader__RequireString(
                config, 'LandingModeKey', 'Na__DocManagement__Config.json -> VghLantern__DocManagement__Config__NewProject');
            ModeManager.VghLantern__ModeManager__SwitchToMode(landingMode);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Enter Inline Edit Mode for a Project Row
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__OnEditProjectClick(projectCode) {
        var ProjectList  =  window.VghLantern__DocManagement__ProjectList;
        if (ProjectList) ProjectList.VghLantern__ProjectList__SetEditingRow(projectCode);
    }
    // ------------------------------------------------------------


    // FUNCTION | Cancel Inline Edit and Restore Display Mode
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__OnCancelEditClick(projectCode) {
        var ProjectList  =  window.VghLantern__DocManagement__ProjectList;
        if (ProjectList) ProjectList.VghLantern__ProjectList__ClearEditingRow();
    }
    // ------------------------------------------------------------


    // FUNCTION | Save Inline Edit Changes to Project Metadata
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__OnSaveEditClick(projectCode, saveButton) {
        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        var ProjectList         =  window.VghLantern__DocManagement__ProjectList;
        if (!ProjectFileManager || !projectCode) return;

        var row  =  saveButton ? saveButton.closest('tr') : null;
        if (!row) {
            VghLantern__ProjectActions__Toast('Could not find the editing row.', 'error');
            return;
        }

        var nameInput    =  row.querySelector('[data-field="projectName"]');
        var clientInput  =  row.querySelector('[data-field="clientName"]');
        var docInput     =  row.querySelector('[data-field="documentName"]');
        var statusSel    =  row.querySelector('[data-field="status"]');

        var projectName   =  nameInput   ? nameInput.value.trim()   : '';
        var clientName    =  clientInput ? clientInput.value.trim() : '';
        var documentName  =  docInput    ? docInput.value.trim()    : '';
        var statusValue   =  statusSel   ? statusSel.value.trim()   : 'Draft';

        if (!projectName) {
            VghLantern__ProjectActions__Toast('Project Name is required.', 'error');
            if (nameInput) nameInput.focus();
            return;                                                               // <-- Keep edit mode open on validation failure
        }

        var projectData  =  ProjectFileManager.VghLantern__ProjectFileManager__LoadProject(projectCode);
        if (!projectData) {
            VghLantern__ProjectActions__Toast('Could not load project ' + projectCode + '.', 'error');
            return;
        }

        var metadata  =  projectData['VghLantern__ProjectFile__Metadata'];
        if (!metadata) {
            VghLantern__ProjectActions__Toast('Project metadata is missing.', 'error');
            return;
        }

        metadata['VghLantern__ProjectFile__Metadata__ProjectName']     =  projectName;
        metadata['VghLantern__ProjectFile__Metadata__ClientName']      =  clientName;
        metadata['VghLantern__ProjectFile__Metadata__DocumentName']    =  documentName;
        metadata['VghLantern__ProjectFile__Metadata__DocumentStatus']  =  statusValue || 'Draft';

        ProjectFileManager.VghLantern__ProjectFileManager__SaveProject(projectData, 'manual:editMetadata')
            .then(function(serverResult) {
                var StateManager  =  window.VghLantern__AppCore__StateManager;
                if (StateManager) {
                    var current  =  StateManager.VghLantern__StateManager__GetCurrentProject();
                    var currentMeta  =  current ? current['VghLantern__ProjectFile__Metadata'] : null;
                    var currentCode  =  currentMeta
                        ? currentMeta['VghLantern__ProjectFile__Metadata__ProjectCode']
                        : '';
                    if (currentCode === projectCode) {
                        StateManager.VghLantern__StateManager__SetCurrentProject(projectData); // <-- Keep open project metadata live for drawings
                    }
                }

                if (ProjectList) ProjectList.VghLantern__ProjectList__ClearEditingRow();
                VghLantern__ProjectActions__RefreshProjectList();

                if (serverResult && serverResult.ok) {
                    VghLantern__ProjectActions__Toast('Project ' + projectCode + ' updated.', 'success');
                } else {
                    VghLantern__ProjectActions__Toast(
                        'Project ' + projectCode + ' saved locally' +
                        (serverResult && serverResult.error ? ' (' + serverResult.error + ')' : '.') +
                        ' Disk sync may have failed.',
                        'info'
                    );
                }
            });
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Delete Project Row Action
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__DeleteProject(projectCode) {
        var bodyHtml  =  '<p>Delete project <strong>' + projectCode + '</strong>?</p>';
        bodyHtml     +=  '<p class="VghLantern__Modal__DangerNote">This removes the project file and cannot be undone.</p>';

        var actionsHtml  =  '';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnCancel" class="VghLantern__Modal__BtnSecondary">Cancel</button>';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnConfirmDelete" class="VghLantern__Modal__BtnDanger">Delete</button>';

        VghLantern__ProjectActions__ShowModal('Delete Project', bodyHtml, actionsHtml);

        var cancelBtn   =  document.getElementById('VghLantern__Modal__BtnCancel');
        var confirmBtn  =  document.getElementById('VghLantern__Modal__BtnConfirmDelete');

        if (cancelBtn) cancelBtn.addEventListener('click', VghLantern__ProjectActions__HideModal);

        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                VghLantern__ProjectActions__CommitDelete(projectCode);
            });
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Commit the Delete and Clear State If It Was Active
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__CommitDelete(projectCode) {
        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        var StateManager        =  window.VghLantern__AppCore__StateManager;

        if (ProjectFileManager) {
            ProjectFileManager.VghLantern__ProjectFileManager__DeleteProject(projectCode);
        }

        if (StateManager) {
            var current  =  StateManager.VghLantern__StateManager__GetCurrentProject();
            var currentCode  =  current && current['VghLantern__ProjectFile__Metadata']
                ? current['VghLantern__ProjectFile__Metadata']['VghLantern__ProjectFile__Metadata__ProjectCode']
                : '';

            if (currentCode === projectCode) {
                StateManager.VghLantern__StateManager__SetCurrentProject(null);    // <-- Drop the deleted project from state
            }
        }

        VghLantern__ProjectActions__HideModal();
        VghLantern__ProjectActions__RefreshProjectList();
        VghLantern__ProjectActions__Toast('Project ' + projectCode + ' deleted.', 'info');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render, Delegation, and Initialisation
// -----------------------------------------------------------------------------

    // FUNCTION | Render Action Buttons into DOM
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__Render() {
        var container  =  document.getElementById(ACTIONS_CONTAINER_ID);
        if (!container) {
            console.warn('[VghLantern ProjectActions] Container not found: #' + ACTIONS_CONTAINER_ID);
            return;
        }

        container.innerHTML  =
            '<button id="VghLantern__DocManagement__BtnNewProject" class="VghLantern__DocManagement__BtnPrimary">+ New Project</button>';

        var newBtn  =  document.getElementById('VghLantern__DocManagement__BtnNewProject');
        if (newBtn) newBtn.addEventListener('click', VghLantern__ProjectActions__OnNewProjectClick);
    }
    // ------------------------------------------------------------


    // FUNCTION | Bind One Delegated Click Listener on the Table Container
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__BindTableRowActions() {
        if (VghLantern__ProjectActions__IsDelegationBound) return;                // <-- Bind exactly once

        var tableContainer  =  document.getElementById(TABLE_CONTAINER_ID);
        if (!tableContainer) return;

        tableContainer.addEventListener('click', VghLantern__ProjectActions__OnTableClick);
        VghLantern__ProjectActions__IsDelegationBound  =  true;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Route a Delegated Table Click to Sort or Row Action
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__OnTableClick(event) {
        var sortableHeader  =  event.target.closest('.VghLantern__DocManagement__SortableHeader');
        if (sortableHeader) {
            var sortField    =  sortableHeader.getAttribute('data-sort-field');
            var ProjectList  =  window.VghLantern__DocManagement__ProjectList;
            if (ProjectList && sortField) {
                ProjectList.VghLantern__ProjectList__ToggleSortByField(sortField);
            }
            return;
        }

        var btn  =  event.target.closest('.VghLantern__DocManagement__RowBtn');
        if (!btn) return;

        var action  =  btn.getAttribute('data-action');                           // <-- 'open', 'edit', 'save-edit', 'cancel-edit', or 'delete'
        var code    =  btn.getAttribute('data-code');                             // <-- Project code from the row
        if (!action || !code) return;

        if (action === 'open')        VghLantern__ProjectActions__OpenProject(code);
        if (action === 'edit')        VghLantern__ProjectActions__OnEditProjectClick(code);
        if (action === 'save-edit')   VghLantern__ProjectActions__OnSaveEditClick(code, btn);
        if (action === 'cancel-edit') VghLantern__ProjectActions__OnCancelEditClick(code);
        if (action === 'delete')      VghLantern__ProjectActions__DeleteProject(code);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Buttons, Delegation, and First Table Render
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__Init() {
        VghLantern__ProjectActions__Render();
        VghLantern__ProjectActions__BindTableRowActions();
        VghLantern__ProjectActions__RefreshProjectList();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ProjectActions__Init                : VghLantern__ProjectActions__Init,
        VghLantern__ProjectActions__Render              : VghLantern__ProjectActions__Render,
        VghLantern__ProjectActions__OnNewProjectClick   : VghLantern__ProjectActions__OnNewProjectClick,
        VghLantern__ProjectActions__OpenProject         : VghLantern__ProjectActions__OpenProject,
        VghLantern__ProjectActions__OnEditProjectClick  : VghLantern__ProjectActions__OnEditProjectClick,
        VghLantern__ProjectActions__OnSaveEditClick     : VghLantern__ProjectActions__OnSaveEditClick,
        VghLantern__ProjectActions__OnCancelEditClick   : VghLantern__ProjectActions__OnCancelEditClick,
        VghLantern__ProjectActions__DeleteProject    : VghLantern__ProjectActions__DeleteProject,
        VghLantern__ProjectActions__HideModal        : VghLantern__ProjectActions__HideModal
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocManagement__ProjectActions  =  VghLantern__DocManagement__ProjectActions;
