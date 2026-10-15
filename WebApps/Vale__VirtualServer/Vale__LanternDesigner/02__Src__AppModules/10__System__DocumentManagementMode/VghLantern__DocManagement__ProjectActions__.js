/* =============================================================================
   VGHLANTERN - DOCUMENT MANAGEMENT PROJECT ACTIONS
   =============================================================================

   FILE       : VghLantern__DocManagement__ProjectActions__.js
   NAMESPACE  : VghLantern
   MODULE     : DocManagement - ProjectActions
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Action buttons and modal dialogs for lantern design CRUD
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Renders the "+ New Project" button into the actions container (Employee
     and up: an Affiliate's account can open designs but not start them)
   - EVERY DESIGN LIVES IN A PROJECT OF THE VALE PROJECTS MASTER LIBRARY
     (15-Oct-2026). New Project opens the job-number-first modal: a Vale job
     number is typed and validated in real time, then looked up in the Master
     Library (api/library) and in the Vale database placeholder (the client's
     details). The user picks the library project the design goes in, or adds
     the job to the library as a new project, and the design is created there.
   - The manual entry modal remains behind the "Not in the Database? Click
     Here" link: job number, name and client by hand. The job is added to the
     library, or the design goes into the library folder of that name if it is
     already there.
   - Open fetches the design from the library and switches to the Lantern Editor
   - Edit toggles inline row editing; Save persists metadata via ProjectFileManager
   - Delete removes the design only (never the library project, nor the other
     apps' work in it), after a confirmation modal; the API allows it for the
     design's creator and for Management and up
   - History (everyone signed in) shows who started the design and who saved it
     last, everyone who has worked on it, and one timeline, newest first: each
     person's editing sessions, and every change of status, project, document or
     client name (from what to what). The API keeps all of it in the design's
     server stamp, which the app can never write
   - Owns the single delegated click listener on the table container, covering
     both sortable headers and row action buttons
   - Coordinates with ProjectFileManager, StateManager, and ModeManager

   -----------------------------------------------------------------------------

   WHY DELEGATION LIVES HERE:
   ProjectList rewrites the table's innerHTML on every render, so per-element
   listeners would be lost. One delegated listener bound once to the container
   survives every redraw.

   -----------------------------------------------------------------------------

   DEVELOPMENT LOG:
   15-Oct-2026 - Version 2.1.0
   - History: a row button opening the design's ownership and edit timeline
     (Adam: "track users so people can see ownership and edits per project").

   15-Oct-2026 - Version 2.0.0 (the Vale app server)
   - Designs are created in Master Library projects (picked by job number, or
     added to the library), and opened, edited and deleted by library id through
     the Lantern Designer API. Rows carry the library id, not the job number:
     schemes of one job share the number.

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
    const NEW_PROJECT_CHOICE    =  '__new__';                                     // <-- The "add the job to the library" radio value
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


    // HELPER FUNCTION | Read One New Project Config String
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__NewProjectString(key) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireString(
            VghLantern__ProjectActions__NewProjectConfig(), key,
            'Na__DocManagement__Config.json -> VghLantern__DocManagement__Config__NewProject');
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
        html     +=      ' placeholder="' + VghLantern__ProjectActions__Escape(placeholderText) + '">';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Library Folder a Job Number and Name Become (as the API names it)
    // ------------------------------------------------------------
    // Mirrors Na__Library__NewProjectId in Server__Api/Api__Shared/ValeShared__Library__.py:
    // words joined in capitals, hyphens inside a word kept. Only for showing the user;
    // the server names the folder itself.
    function VghLantern__ProjectActions__PreviewFolderName(code, name) {
        var words   =  String(name || '').match(/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/g) || [];
        var joined  =  words.map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join('');
        return String(code || '').trim() + '__' + (joined || '<Name>');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show Inline Validation Message in the Modal
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__ShowValidationMessage(message) {
        var target  =  document.getElementById('VghLantern__Modal__ValidationMsg');
        if (target) target.textContent  =  message;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | New Design Flow - Job Number First (Master Library + Vale Database)
// -----------------------------------------------------------------------------
// The preferred way to start a design: type a Vale job number, pick that job's
// project in the Master Library (or add the job to the library), confirm, and
// the design builds itself there, with the client's details from the Vale
// database placeholder when it has them.

    // FUNCTION | Handle New Project Button Click - Open the Job Number Modal
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
                    VghLantern__ProjectActions__OnDbFetch();                  // <-- Enter looks up; OnDbFetch re-validates first
                }
            });
            codeInput.focus();
            VghLantern__ProjectActions__OnDbEntryInput();                     // <-- Prefilled Back-navigation re-arms the button
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
    // disables the button; the red message is reserved for characters that can
    // never become a valid Vale job number.
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


    // SUB FUNCTION | Toggle the Looking-Up State on the Entry Step
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


    // SUB FUNCTION | Look the Job Up (library and client database together), Then Advance
    // ------------------------------------------------------------
    async function VghLantern__ProjectActions__OnDbFetch() {
        var ClientLookup        =  window.VghLantern__ValeDatabase__ClientLookup;
        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        var codeInput           =  document.getElementById('VghLantern__Modal__InputJobNumber');
        if (!ClientLookup || !ProjectFileManager || !codeInput) return;

        var jobNumberText  =  codeInput.value.trim();
        var verdict        =  ClientLookup.VghLantern__ValeDatabase__ValidateJobNumber(jobNumberText);
        if (!verdict.IsValid) {
            VghLantern__ProjectActions__ShowValidationMessage(VghLantern__ProjectActions__DbReasonMessage(verdict.Reason));
            codeInput.classList.add('VghLantern__Modal__Input--invalid');
            return;                                                           // <-- Enter pressed on a not-yet-valid entry
        }

        VghLantern__ProjectActions__SetDbFetchingState(true);
        var lookups  =  await Promise.all([
            ProjectFileManager.VghLantern__ProjectFileManager__SearchLibrary({ code: jobNumberText }),
            ClientLookup.VghLantern__ValeDatabase__FetchClientRecord(jobNumberText)
        ]);

        // Belt and braces behind the frozen buttons above: if the entry step is
        // no longer on screen (dismissed, or replaced by another feature that
        // drives the shared modal root), the stale result is abandoned.
        var modalRoot  =  document.getElementById(MODAL_ROOT_ID);
        if (!document.getElementById('VghLantern__Modal__BtnDbFetch') ||
            !modalRoot || !modalRoot.classList.contains(MODAL_VISIBLE_CLASS)) {
            return;                                                           // <-- Entry step gone mid-lookup; nothing to update
        }

        var library  =  lookups[0];
        var client   =  lookups[1];
        if (!library.ok) {
            VghLantern__ProjectActions__SetDbFetchingState(false);
            VghLantern__ProjectActions__ShowValidationMessage(
                VghLantern__ProjectActions__DbCopy('LookupUnavailableMessage').replace('{Error}', library.error || ''));
            codeInput.focus();
            return;
        }

        await VghLantern__ProjectActions__ShowDbPreviewModal(jobNumberText, library.data, (client && client.Ok) ? client.Record : null);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Show the Job's Library Projects (and Client Record) for a Choice
    // ------------------------------------------------------------
    // One radio per library project of the job (those with a design already are
    // shown but cannot be picked), then "add the job to the library" with a name
    // field. Client rows render whatever columns the client table declares (minus
    // the job number), so a future database column appears without this changing.
    async function VghLantern__ProjectActions__ShowDbPreviewModal(jobNumberText, libraryProjects, clientRecord) {
        var ClientLookup  =  window.VghLantern__ValeDatabase__ClientLookup;
        var esc           =  VghLantern__ProjectActions__Escape;
        var columns       =  clientRecord ? await ClientLookup.VghLantern__ValeDatabase__GetColumns() : [];
        var available     =  libraryProjects.filter(function(p) { return !p.hasDesign; });
        var job           =  '<strong>' + esc(jobNumberText) + '</strong>';

        var bodyHtml  =  '<p class="VghLantern__DocManagement__DbIntro">';
        bodyHtml     +=      (libraryProjects.length ? esc(VghLantern__ProjectActions__DbCopy('LibraryIntro'))
                                                     : esc(VghLantern__ProjectActions__DbCopy('LibraryNoneIntro'))).replace('{JobNumber}', job);
        bodyHtml     +=  '</p>';
        bodyHtml     +=  '<div class="VghLantern__DocManagement__LibraryList">';

        libraryProjects.forEach(function(project, index) {
            var notes  =  [project.year];
            if (project.hasModel)  notes.push(VghLantern__ProjectActions__DbCopy('LibraryModelNote'));
            if (project.hasImages) notes.push(VghLantern__ProjectActions__DbCopy('LibraryImagesNote'));
            if (project.hasDesign) notes.push(VghLantern__ProjectActions__DbCopy('LibraryTakenNote'));
            var checked  =  (!project.hasDesign && available[0] === project) ? ' checked' : '';

            bodyHtml  +=  '<label class="VghLantern__DocManagement__LibraryOption' + (project.hasDesign ? ' VghLantern__DocManagement__LibraryOption--taken' : '') + '">';
            bodyHtml  +=      '<input type="radio" name="VghLantern__Modal__LibraryChoice" value="' + esc(project.id) + '"' + checked + (project.hasDesign ? ' disabled' : '') + '>';
            bodyHtml  +=      '<span><span class="VghLantern__DocManagement__LibraryOptionName">' + esc(project.id) + '</span>';
            bodyHtml  +=      '<span class="VghLantern__DocManagement__LibraryOptionMeta">' + esc(project.projectName || '') +
                              (notes.length ? ' &middot; ' + notes.map(esc).join(' &middot; ') : '') + '</span></span>';
            bodyHtml  +=  '</label>';
        });

        var defaultName  =  (clientRecord && clientRecord.SiteName) ? clientRecord.SiteName : '';
        bodyHtml     +=      '<label class="VghLantern__DocManagement__LibraryOption">';
        bodyHtml     +=          '<input type="radio" name="VghLantern__Modal__LibraryChoice" value="' + NEW_PROJECT_CHOICE + '"' + (available.length ? '' : ' checked') + '>';
        bodyHtml     +=          '<span><span class="VghLantern__DocManagement__LibraryOptionName">' +
                                 esc(VghLantern__ProjectActions__DbCopy('LibraryNewOptionLabel')).replace('{JobNumber}', esc(jobNumberText)) + '</span>';
        bodyHtml     +=          '<span class="VghLantern__DocManagement__LibraryOptionMeta" id="VghLantern__Modal__NewFolderHint"></span></span>';
        bodyHtml     +=      '</label>';
        bodyHtml     +=  '</div>';
        bodyHtml     +=  VghLantern__ProjectActions__BuildInputRow(
            esc(VghLantern__ProjectActions__DbCopy('LibraryNewNameLabel')), 'VghLantern__Modal__InputNewName',
            VghLantern__ProjectActions__DbCopy('LibraryNewNamePlaceholder'));

        if (clientRecord) {
            bodyHtml  +=  '<p class="VghLantern__DocManagement__DbIntro">' +
                          esc(VghLantern__ProjectActions__DbCopy('ClientIntro')).replace('{JobNumber}', job) + '</p>';
            bodyHtml  +=  '<div class="VghLantern__DocManagement__DbPreview">';
            for (var i = 0; i < columns.length; i++) {
                var column  =  columns[i];
                if (!column || column.Key === 'JobNumber') continue;          // <-- The intro line already names the job number
                var cellValue  =  clientRecord[column.Key];
                bodyHtml      +=  '<div class="VghLantern__DocManagement__DbPreviewRow">';
                bodyHtml      +=      '<span class="VghLantern__DocManagement__DbPreviewLabel">' + esc(column.Label || column.Key) + '</span>';
                bodyHtml      +=      '<span class="VghLantern__DocManagement__DbPreviewValue">' + esc(cellValue == null ? '' : cellValue) + '</span>';
                bodyHtml      +=  '</div>';
            }
            bodyHtml  +=  '</div>';
        } else {
            bodyHtml  +=  '<p class="VghLantern__DocManagement__DbHint">' + esc(VghLantern__ProjectActions__DbCopy('ClientNotFoundNote')) + '</p>';
        }

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
        var nameInput  =  document.getElementById('VghLantern__Modal__InputNewName');
        var hintEl     =  document.getElementById('VghLantern__Modal__NewFolderHint');

        var refreshNewRow  =  function() {
            var choice  =  document.querySelector('input[name="VghLantern__Modal__LibraryChoice"]:checked');
            var isNew   =  !!choice && choice.value === NEW_PROJECT_CHOICE;
            if (nameInput) nameInput.disabled  =  !isNew;
            if (hintEl) hintEl.textContent  =  VghLantern__ProjectActions__DbCopy('LibraryNewNameHint')
                .replace('{JobNumber}__{Name}', VghLantern__ProjectActions__PreviewFolderName(jobNumberText, nameInput ? nameInput.value : ''));
        };
        if (nameInput) {
            nameInput.value  =  defaultName;
            nameInput.addEventListener('input', refreshNewRow);
        }
        document.querySelectorAll('input[name="VghLantern__Modal__LibraryChoice"]').forEach(function(radio) {
            radio.addEventListener('change', function() {
                refreshNewRow();
                if (radio.value === NEW_PROJECT_CHOICE && nameInput) nameInput.focus();
            });
        });
        refreshNewRow();

        if (backBtn) {
            backBtn.addEventListener('click', function() {
                VghLantern__ProjectActions__ShowDbEntryModal(jobNumberText);  // <-- Back keeps the typed number
            });
        }

        if (acceptBtn) {
            acceptBtn.addEventListener('click', function() {
                VghLantern__ProjectActions__OnDbAcceptCreate(jobNumberText, libraryProjects, clientRecord);
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


    // SUB FUNCTION | Build the Design in the Chosen Library Project
    // ------------------------------------------------------------
    // Field mapping: the job number is the project code printed on the drawings,
    // the library project's name (or the new name typed) is the project name, and
    // the client record's document name, client name, address and account manager
    // land in their metadata slots when the Vale database has the job.
    async function VghLantern__ProjectActions__OnDbAcceptCreate(jobNumberText, libraryProjects, clientRecord) {
        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        var ClientLookup        =  window.VghLantern__ValeDatabase__ClientLookup;
        var acceptBtn           =  document.getElementById('VghLantern__Modal__BtnDbAccept');
        var choice              =  document.querySelector('input[name="VghLantern__Modal__LibraryChoice"]:checked');
        var nameInput           =  document.getElementById('VghLantern__Modal__InputNewName');

        if (!ProjectFileManager) {
            VghLantern__ProjectActions__ShowValidationMessage('Project storage is unavailable.');
            return;
        }
        if (!choice) {
            VghLantern__ProjectActions__ShowValidationMessage(VghLantern__ProjectActions__DbCopy('ErrorPickProject'));
            return;
        }

        var target       =  null;
        var projectName  =  '';
        if (choice.value === NEW_PROJECT_CHOICE) {
            projectName  =  nameInput ? nameInput.value.trim() : '';
            if (!projectName) {
                VghLantern__ProjectActions__ShowValidationMessage(VghLantern__ProjectActions__DbCopy('ErrorNewName'));
                if (nameInput) nameInput.focus();
                return;
            }
            target  =  { newProject: { code: jobNumberText, name: projectName } };
        } else {
            var picked   =  libraryProjects.find(function(p) { return p.id === choice.value; }) || {};
            projectName  =  picked.projectName || (clientRecord && clientRecord.SiteName) || choice.value;
            target       =  { id: choice.value };
        }

        if (acceptBtn) {
            acceptBtn.disabled     =  true;
            acceptBtn.textContent  =  VghLantern__ProjectActions__DbCopy('CreatingLabel');
        }

        var record  =  clientRecord || {};
        var result  =  await ProjectFileManager.VghLantern__ProjectFileManager__CreateProject(
            target,
            jobNumberText,
            projectName,
            record.DocumentName   || '',
            record.ClientName     || '',
            (clientRecord && ClientLookup) ? ClientLookup.VghLantern__ValeDatabase__ComposeSiteAddress(clientRecord) : '',
            record.AccountManager || '');

        if (!result.ok) {
            if (acceptBtn) {
                acceptBtn.disabled     =  false;
                acceptBtn.textContent  =  VghLantern__ProjectActions__DbCopy('AcceptButtonLabel');
            }
            VghLantern__ProjectActions__ShowValidationMessage(result.error || 'Could not create the design.');
            return;
        }

        VghLantern__ProjectActions__FinishCreate(result, clientRecord,
            'Lantern design started in ' + result.libraryId + (result.createdProject ? ' (added to the library).' : '.'));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | A Design Was Created: Make It Current, Seed the Letter, Open the Editor
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__FinishCreate(result, clientRecord, toastText) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var ModeManager   =  window.VghLantern__AppCore__ModeManager;
        var projectData   =  result.projectData;

        if (StateManager) {
            StateManager.VghLantern__StateManager__SetCurrentProject(projectData); // <-- Make the new design active
        }

        // The welcome letter's recipient block is per-project letter data, so the
        // record's postal address is seeded through the LetterModel, the letter's
        // one writer. SetField marks the project dirty, so the standard autosave
        // persists the seeding moments later through the one existing write path.
        var LetterModel  =  window.VghLantern__ClientDoc__LetterModel;
        if (clientRecord && LetterModel && LetterModel.VghLantern__ClientDoc__LetterModel__SetField) {
            LetterModel.VghLantern__ClientDoc__LetterModel__SetField(projectData, 'clientAddressLine1',    clientRecord.SiteName    || '');
            LetterModel.VghLantern__ClientDoc__LetterModel__SetField(projectData, 'clientAddressStreet',   clientRecord.SiteAddress || '');
            LetterModel.VghLantern__ClientDoc__LetterModel__SetField(projectData, 'clientAddressTownCity', clientRecord.PostTown    || '');
            LetterModel.VghLantern__ClientDoc__LetterModel__SetField(projectData, 'clientAddressPostCode', clientRecord.Postcode    || '');
        }

        VghLantern__ProjectActions__HideModal();
        VghLantern__ProjectActions__RefreshProjectList();
        VghLantern__ProjectActions__Toast(toastText, 'success');

        if (ModeManager) {
            ModeManager.VghLantern__ModeManager__SwitchToMode(VghLantern__ProjectActions__NewProjectString('LandingModeKey')); // <-- Straight into the Lantern Editor
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
// REGION | New Design Flow - Manual Entry Fallback
// -----------------------------------------------------------------------------

    // FUNCTION | Open the Manual New Project Modal
    // ------------------------------------------------------------
    // Reached via the "Not in the Database? Click Here" link, for jobs whose
    // number is not in the 4 or 5 digit form, and for testing without touching
    // client data. The job still lands in the Master Library: as a new project,
    // or in the library folder of that name if it is already there.
    function VghLantern__ProjectActions__OpenManualNewProjectModal() {
        var esc  =  VghLantern__ProjectActions__Escape;

        var bodyHtml  =  '<p class="VghLantern__DocManagement__DbHint">' + esc(VghLantern__ProjectActions__NewProjectString('ManualModalIntro')) + '</p>';
        bodyHtml     +=  VghLantern__ProjectActions__BuildInputRow(
            'Job Number',    'VghLantern__Modal__InputProjectCode',  VghLantern__ProjectActions__NewProjectString('PlaceholderProjectCode'));
        bodyHtml     +=  VghLantern__ProjectActions__BuildInputRow(
            'Project Name',  'VghLantern__Modal__InputProjectName',  VghLantern__ProjectActions__NewProjectString('PlaceholderProjectName'));
        bodyHtml     +=  VghLantern__ProjectActions__BuildInputRow(
            'Client Name',   'VghLantern__Modal__InputClientName',   VghLantern__ProjectActions__NewProjectString('PlaceholderClientName'));
        bodyHtml     +=  VghLantern__ProjectActions__BuildInputRow(
            'Document Name', 'VghLantern__Modal__InputDocumentName', VghLantern__ProjectActions__NewProjectString('PlaceholderDocumentName'));
        bodyHtml     +=  '<div id="VghLantern__Modal__ValidationMsg" class="VghLantern__Modal__ValidationMsg"></div>';

        var actionsHtml  =  '';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnCancel" class="VghLantern__Modal__BtnSecondary">Cancel</button>';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnConfirm" class="VghLantern__Modal__BtnPrimary">Create Lantern Design</button>';

        VghLantern__ProjectActions__ShowModal(VghLantern__ProjectActions__NewProjectString('ManualModalTitle'), bodyHtml, actionsHtml);

        var cancelBtn   =  document.getElementById('VghLantern__Modal__BtnCancel');
        var confirmBtn  =  document.getElementById('VghLantern__Modal__BtnConfirm');
        var codeInput   =  document.getElementById('VghLantern__Modal__InputProjectCode');

        if (cancelBtn)  cancelBtn.addEventListener('click', VghLantern__ProjectActions__HideModal);
        if (confirmBtn) confirmBtn.addEventListener('click', VghLantern__ProjectActions__OnConfirmNewProject);
        if (codeInput)  codeInput.focus();                                        // <-- Land the caret on the first field
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Confirm New Design From the Manual Modal
    // ------------------------------------------------------------
    // Asks for a new library project first. If the library already has that
    // folder (the server answers 409 with its id), the design goes into it.
    async function VghLantern__ProjectActions__OnConfirmNewProject() {
        var codeInput    =  document.getElementById('VghLantern__Modal__InputProjectCode');
        var nameInput    =  document.getElementById('VghLantern__Modal__InputProjectName');
        var clientInput  =  document.getElementById('VghLantern__Modal__InputClientName');
        var docInput     =  document.getElementById('VghLantern__Modal__InputDocumentName');
        var confirmBtn   =  document.getElementById('VghLantern__Modal__BtnConfirm');

        var projectCode   =  codeInput   ? codeInput.value.trim()   : '';
        var projectName   =  nameInput   ? nameInput.value.trim()   : '';
        var clientName    =  clientInput ? clientInput.value.trim() : '';
        var documentName  =  docInput    ? docInput.value.trim()    : '';

        if (!projectCode || !projectName) {
            VghLantern__ProjectActions__ShowValidationMessage('Job Number and Project Name are both required.');
            return;                                                               // <-- Abort while required fields are empty
        }

        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        if (!ProjectFileManager) {
            VghLantern__ProjectActions__ShowValidationMessage('Project storage is unavailable.');
            return;
        }

        if (confirmBtn) confirmBtn.disabled  =  true;
        var create  =  ProjectFileManager.VghLantern__ProjectFileManager__CreateProject;
        var result  =  await create({ newProject: { code: projectCode, name: projectName } }, projectCode, projectName, documentName, clientName);

        if (!result.ok && result.status === 409 && result.libraryId && /already in the library/.test(result.error || '')) {
            result  =  await create({ id: result.libraryId }, projectCode, projectName, documentName, clientName);
        }

        if (!result.ok) {
            if (confirmBtn) confirmBtn.disabled  =  false;
            VghLantern__ProjectActions__ShowValidationMessage(result.error || 'Could not create the design.');
            return;
        }

        VghLantern__ProjectActions__FinishCreate(result, null,
            'Lantern design started in ' + result.libraryId + (result.createdProject ? ' (added to the library).' : '.'));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Row Actions - Open, Edit, and Delete
// -----------------------------------------------------------------------------

    // FUNCTION | Handle Open Project Row Action
    // ------------------------------------------------------------
    async function VghLantern__ProjectActions__OpenProject(libraryId) {
        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        var StateManager        =  window.VghLantern__AppCore__StateManager;
        var ModeManager         =  window.VghLantern__AppCore__ModeManager;

        if (!ProjectFileManager) return;

        var projectData  =  await ProjectFileManager.VghLantern__ProjectFileManager__FetchProject(libraryId);
        if (!projectData) {
            VghLantern__ProjectActions__Toast('Could not load the design in ' + libraryId + '.', 'error');
            return;
        }

        if (StateManager) {
            StateManager.VghLantern__StateManager__SetCurrentProject(projectData); // <-- Publish to application state
        }

        if (ModeManager) {
            ModeManager.VghLantern__ModeManager__SwitchToMode(VghLantern__ProjectActions__NewProjectString('LandingModeKey'));
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Enter Inline Edit Mode for a Project Row
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__OnEditProjectClick(libraryId) {
        var ProjectList  =  window.VghLantern__DocManagement__ProjectList;
        if (ProjectList) ProjectList.VghLantern__ProjectList__SetEditingRow(libraryId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Cancel Inline Edit and Restore Display Mode
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__OnCancelEditClick(libraryId) {
        var ProjectList  =  window.VghLantern__DocManagement__ProjectList;
        if (ProjectList) ProjectList.VghLantern__ProjectList__ClearEditingRow();
    }
    // ------------------------------------------------------------


    // FUNCTION | Save Inline Edit Changes to Design Metadata
    // ------------------------------------------------------------
    async function VghLantern__ProjectActions__OnSaveEditClick(libraryId, saveButton) {
        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        var ProjectList         =  window.VghLantern__DocManagement__ProjectList;
        if (!ProjectFileManager || !libraryId) return;

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

        var projectData  =  await ProjectFileManager.VghLantern__ProjectFileManager__FetchProject(libraryId);
        if (!projectData) {
            VghLantern__ProjectActions__Toast('Could not load the design in ' + libraryId + '.', 'error');
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

        var serverResult  =  await ProjectFileManager.VghLantern__ProjectFileManager__SaveProject(projectData, 'manual:editMetadata');

        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (StateManager) {
            var current  =  StateManager.VghLantern__StateManager__GetCurrentProject();
            if (current && ProjectFileManager.VghLantern__ProjectFileManager__LibraryIdOf(current) === libraryId) {
                StateManager.VghLantern__StateManager__SetCurrentProject(projectData); // <-- Keep open project metadata live for drawings
            }
        }

        if (ProjectList) ProjectList.VghLantern__ProjectList__ClearEditingRow();
        VghLantern__ProjectActions__RefreshProjectList();

        if (serverResult && serverResult.ok) {
            VghLantern__ProjectActions__Toast('Design ' + libraryId + ' updated.', 'success');
        }                                                                         // <-- A failure has already said why (toast or conflict dialog)
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Delete Project Row Action
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__DeleteProject(libraryId) {
        var esc  =  VghLantern__ProjectActions__Escape;
        var bodyHtml  =  '<p>Delete the Lantern design in <strong>' + esc(libraryId) + '</strong>?</p>';
        bodyHtml     +=  '<p class="VghLantern__Modal__DangerNote">The design is removed for everyone. The project stays in the Master Library, ' +
                         'with any ValeVision work in it.</p>';

        var actionsHtml  =  '';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnCancel" class="VghLantern__Modal__BtnSecondary">Cancel</button>';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnConfirmDelete" class="VghLantern__Modal__BtnDanger">Delete</button>';

        VghLantern__ProjectActions__ShowModal('Delete Lantern Design', bodyHtml, actionsHtml);

        var cancelBtn   =  document.getElementById('VghLantern__Modal__BtnCancel');
        var confirmBtn  =  document.getElementById('VghLantern__Modal__BtnConfirmDelete');

        if (cancelBtn) cancelBtn.addEventListener('click', VghLantern__ProjectActions__HideModal);

        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                confirmBtn.disabled  =  true;
                VghLantern__ProjectActions__CommitDelete(libraryId);
            });
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Commit the Delete and Clear State If It Was Active
    // ------------------------------------------------------------
    async function VghLantern__ProjectActions__CommitDelete(libraryId) {
        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        var StateManager        =  window.VghLantern__AppCore__StateManager;
        if (!ProjectFileManager) return;

        var result  =  await ProjectFileManager.VghLantern__ProjectFileManager__DeleteProject(libraryId);
        VghLantern__ProjectActions__HideModal();

        if (!result.ok) {
            VghLantern__ProjectActions__Toast('Not deleted: ' + (result.error || 'the server refused.'), 'error');
            return;
        }

        if (StateManager) {
            var current  =  StateManager.VghLantern__StateManager__GetCurrentProject();
            if (current && ProjectFileManager.VghLantern__ProjectFileManager__LibraryIdOf(current) === libraryId) {
                StateManager.VghLantern__StateManager__SetCurrentProject(null);    // <-- Drop the deleted design from state
            }
        }

        VghLantern__ProjectActions__RefreshProjectList();
        VghLantern__ProjectActions__Toast('Lantern design deleted from ' + libraryId + '.', 'info');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | History - Who Started a Design, Who Has Worked on It, What Changed
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Metadata Changes the API Records, as History Words Them
    // ------------------------------------------------------------
    const HISTORY_FIELD_LABELS  =  {
        'DocumentStatus' : 'the status',
        'ProjectName'    : 'the project name',
        'DocumentName'   : 'the document name',
        'ClientName'     : 'the client name'
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | The Newest History Request (a late answer to an older one is dropped)
    // ------------------------------------------------------------
    let VghLantern__ProjectActions__HistoryToken  =  0;
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Server Time as "15 Oct 2026, 15:32" (local)
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__When(utcText) {
        var DateFormatter  =  window.VghLantern__AppUtils__DateFormatter;
        if (!utcText || !DateFormatter) return '';
        return DateFormatter.VghLantern__DateFormatter__FormatShortTime(utcText);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Session's Time Span: "15 Oct 2026, 14:02 - 14:35" (both dates when it crosses midnight)
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__Span(fromUtc, toUtc) {
        var DateFormatter  =  window.VghLantern__AppUtils__DateFormatter;
        if (!DateFormatter || !fromUtc) return VghLantern__ProjectActions__When(toUtc);
        if (!toUtc || toUtc === fromUtc) return VghLantern__ProjectActions__When(fromUtc);
        var sameDay  =  DateFormatter.VghLantern__DateFormatter__FormatShort(fromUtc) === DateFormatter.VghLantern__DateFormatter__FormatShort(toUtc);
        return VghLantern__ProjectActions__When(fromUtc) + ' &ndash; ' +
               (sameDay ? DateFormatter.VghLantern__DateFormatter__FormatTime(toUtc) : VghLantern__ProjectActions__When(toUtc));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Person's Initials for the Timeline ("Adam Noble" -> "AN")
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__Initials(name) {
        var parts  =  String(name || '').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '?';
        return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Timeline Entry
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__HistoryItem(kind, avatarText, whatHtml, metaHtml) {
        return '<li class="VghLantern__History__Item VghLantern__History__Item--' + kind + '">' +
                   '<span class="VghLantern__History__Avatar" aria-hidden="true">' + avatarText + '</span>' +
                   '<div class="VghLantern__History__Text">' +
                       '<div class="VghLantern__History__What">' + whatHtml + '</div>' +
                       (metaHtml ? '<div class="VghLantern__History__Meta">' + metaHtml + '</div>' : '') +
                   '</div>' +
               '</li>';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the History Panel From the API's Answer
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__BuildHistoryHtml(h) {
        var esc         =  VghLantern__ProjectActions__Escape;
        var when        =  VghLantern__ProjectActions__When;
        var created     =  h.createdBy  || {};
        var modified    =  h.modifiedBy || {};
        var sessions    =  Array.isArray(h.sessions) ? h.sessions : [];
        var events      =  Array.isArray(h.events)   ? h.events   : [];
        var editors     =  Array.isArray(h.editors)  ? h.editors  : [];
        var DateFormatter  =  window.VghLantern__AppUtils__DateFormatter;
        var muted       =  function(text) { return text ? ' <span class="VghLantern__History__Muted">' + text + '</span>' : ''; };

        var html  =  '<div class="VghLantern__History">';
        html     +=  '<div class="VghLantern__History__Design"><strong>' + esc(h.projectCode || '') + ' ' + esc(h.projectName || '') + '</strong>' +
                     (h.documentName ? ' &middot; ' + esc(h.documentName) : '') +
                     '<span class="VghLantern__DocManagement__LibraryId">' + esc(h.libraryId || '') + '</span></div>';

        // Facts: owner, last modifier, everyone who has worked on it
        var createdHtml  =  created.name
            ? esc(created.name) + muted(esc(when(h.createdUtc)))
            : (h.migrated
                ? 'The prototype app, before sign-in' + muted(h.prototypeDateCreated && DateFormatter
                    ? 'started ' + esc(DateFormatter.VghLantern__DateFormatter__FormatShort(h.prototypeDateCreated)) : '')
                : '&mdash;');
        var modifiedHtml =  modified.name ? esc(modified.name) + muted(esc(when(h.modifiedUtc))) : '&mdash;';
        var editorsHtml  =  editors.length
            ? editors.map(function(e) {
                  return esc(e.name || e.code || '?') + muted('(' + e.sessions + (e.sessions === 1 ? ' session' : ' sessions') + ')');
              }).join(', ')
            : '&mdash;';

        html  +=  '<dl class="VghLantern__History__Facts">';
        html  +=      '<dt>Created by</dt><dd>' + createdHtml + '</dd>';
        html  +=      '<dt>Last modified by</dt><dd>' + modifiedHtml + '</dd>';
        html  +=      '<dt>Worked on by</dt><dd>' + editorsHtml + '</dd>';
        html  +=  '</dl>';

        // Timeline: sessions, changes, the start (and the move from the prototype), newest first
        var items  =  [];
        var startShownInSession  =  false;
        sessions.forEach(function(s) {
            var isStart  =  !!(created.code && s.code === created.code && h.createdUtc && s.fromUtc === h.createdUtc);
            if (isStart) startShownInSession  =  true;
            items.push({ at: s.toUtc || s.fromUtc || '', rank: 1, html: VghLantern__ProjectActions__HistoryItem(
                'session', esc(VghLantern__ProjectActions__Initials(s.name)),
                '<strong>' + esc(s.name || s.code || 'Someone') + '</strong> ' + (isStart ? 'started the design' : 'edited the design'),
                VghLantern__ProjectActions__Span(s.fromUtc, s.toUtc) + (s.saves ? ' &middot; ' + s.saves + (s.saves === 1 ? ' save' : ' saves') : '')) });
        });
        events.forEach(function(e) {
            var label  =  HISTORY_FIELD_LABELS[e.field] || esc(e.field || 'a detail');
            var what   =  e.from && e.to ? 'changed ' + label + ' from <em>' + esc(e.from) + '</em> to <em>' + esc(e.to) + '</em>'
                       :  e.to           ? 'set ' + label + ' to <em>' + esc(e.to) + '</em>'
                       :                   'cleared ' + label + ' (it was <em>' + esc(e.from) + '</em>)';
            items.push({ at: e.utc || '', rank: 0, html: VghLantern__ProjectActions__HistoryItem(
                'change', esc(VghLantern__ProjectActions__Initials(e.name)),
                '<strong>' + esc(e.name || e.code || 'Someone') + '</strong> ' + what, esc(when(e.utc))) });
        });
        if (created.name && h.createdUtc && !startShownInSession) {
            items.push({ at: h.createdUtc, rank: 2, html: VghLantern__ProjectActions__HistoryItem(
                'session', esc(VghLantern__ProjectActions__Initials(created.name)),
                '<strong>' + esc(created.name) + '</strong> started the design', esc(when(h.createdUtc))) });
        }
        if (h.migrated && h.migratedUtc) {
            items.push({ at: h.migratedUtc, rank: 2, html: VghLantern__ProjectActions__HistoryItem(
                'system', '&#8682;', 'Moved from the prototype app into the Vale Projects Master Library', esc(when(h.migratedUtc))) });
        }
        items.sort(function(a, b) { return (b.at > a.at) - (b.at < a.at) || a.rank - b.rank; });  // <-- UTC text sorts as time; a change shows above the session it ended

        html  +=  '<h4 class="VghLantern__History__Heading">Activity</h4>';
        if (!items.length) {
            html  +=  '<p class="VghLantern__History__Empty">Nothing recorded yet: saves are tracked from 15 Oct 2026.</p>';
        } else {
            html  +=  '<ol class="VghLantern__History__List">' + items.map(function(item) { return item.html; }).join('') + '</ol>';
        }
        html  +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // FUNCTION | Show a Design's History
    // ------------------------------------------------------------
    async function VghLantern__ProjectActions__ShowHistory(libraryId) {
        var esc        =  VghLantern__ProjectActions__Escape;
        var token      =  ++VghLantern__ProjectActions__HistoryToken;
        var closeHtml  =  '<button id="VghLantern__Modal__BtnCloseHistory" class="VghLantern__Modal__BtnSecondary">Close</button>';
        var bindClose  =  function() {
            var closeBtn  =  document.getElementById('VghLantern__Modal__BtnCloseHistory');
            if (closeBtn) closeBtn.addEventListener('click', VghLantern__ProjectActions__HideModal);
        };

        VghLantern__ProjectActions__ShowModal('Project History',
            '<p class="VghLantern__History__Loading" data-history-token="' + token + '">Loading the history of ' + esc(libraryId) + '&hellip;</p>', closeHtml);
        bindClose();

        var FileManager  =  window.VghLantern__AppData__ProjectFileManager;
        var result  =  FileManager
            ? await FileManager.VghLantern__ProjectFileManager__FetchHistory(libraryId)
            : { ok: false, error: 'the project file manager is not loaded' };

        var root     =  document.getElementById(MODAL_ROOT_ID);
        var waiting  =  document.querySelector('.VghLantern__History__Loading[data-history-token="' + token + '"]');
        if (!waiting || !root || !root.classList.contains(MODAL_VISIBLE_CLASS)) return;   // <-- Closed, or another dialog took its place meanwhile

        VghLantern__ProjectActions__ShowModal('Project History', result.ok
            ? VghLantern__ProjectActions__BuildHistoryHtml(result.data)
            : '<p class="VghLantern__Modal__DangerNote">The history could not be loaded: ' + esc(result.error) + '</p>', closeHtml);
        bindClose();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render, Delegation, and Initialisation
// -----------------------------------------------------------------------------

    // FUNCTION | Render Action Buttons into DOM
    // ------------------------------------------------------------
    // No New Project button for an account that cannot create (Affiliate): the
    // API would refuse it, so offering it would only lead to an error.
    function VghLantern__ProjectActions__Render() {
        var container  =  document.getElementById(ACTIONS_CONTAINER_ID);
        if (!container) {
            console.warn('[VghLantern ProjectActions] Container not found: #' + ACTIONS_CONTAINER_ID);
            return;
        }

        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        if (!ProjectFileManager || !ProjectFileManager.VghLantern__ProjectFileManager__CanWrite()) {
            container.innerHTML  =  '';
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

        var action  =  btn.getAttribute('data-action');                           // <-- 'open', 'edit', 'history', 'save-edit', 'cancel-edit', or 'delete'
        var id      =  btn.getAttribute('data-code');                             // <-- The design's library id from the row
        if (!action || !id) return;

        if (action === 'open')        VghLantern__ProjectActions__OpenProject(id);
        if (action === 'edit')        VghLantern__ProjectActions__OnEditProjectClick(id);
        if (action === 'history')     VghLantern__ProjectActions__ShowHistory(id);
        if (action === 'save-edit')   VghLantern__ProjectActions__OnSaveEditClick(id, btn);
        if (action === 'cancel-edit') VghLantern__ProjectActions__OnCancelEditClick(id);
        if (action === 'delete')      VghLantern__ProjectActions__DeleteProject(id);
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
        VghLantern__ProjectActions__ShowHistory      : VghLantern__ProjectActions__ShowHistory,
        VghLantern__ProjectActions__HideModal        : VghLantern__ProjectActions__HideModal
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocManagement__ProjectActions  =  VghLantern__DocManagement__ProjectActions;
