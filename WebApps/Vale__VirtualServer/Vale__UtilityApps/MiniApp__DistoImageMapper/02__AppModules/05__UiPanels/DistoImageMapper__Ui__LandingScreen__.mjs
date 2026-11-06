/* =============================================================================
   DISTO IMAGE MAPPER - UI PANELS | LANDING SCREEN
   =============================================================================

   FILE       : DistoImageMapper__Ui__LandingScreen__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Ui - LandingScreen
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The first screen: choose a survey folder
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - Offers whichever way in the browser supports, and to reopen the last folder.
   - When the chosen folder holds several surveys, lists them to choose from.
   - Dragging a folder anywhere onto the window works, on this screen or later on.

   ============================================================================= */

import {
    DistoImageMapper__Intake__FolderReader__FromDrop,
    DistoImageMapper__Intake__FolderReader__FromFileList,
    DistoImageMapper__Intake__FolderReader__HasFolderPicker,
    DistoImageMapper__Intake__FolderReader__PickFolder,
    DistoImageMapper__Intake__FolderReader__RememberedHandle,
    DistoImageMapper__Intake__FolderReader__Reopen
} from '../03__DataIntake/DistoImageMapper__Intake__FolderReader__.mjs';

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Elements and Callback
    // ------------------------------------------------------------
    let Elements       =  null;
    let OnSessions     =  null;
    let OnProblem      =  null;
    let DragDepth      =  0;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Ways In
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Run a Way In, Reporting Anything That Goes Wrong
    // ------------------------------------------------------------
    async function DistoImageMapper__Ui__LandingScreen__Take(reader) {
        DistoImageMapper__Ui__LandingScreen__ShowError('');
        try {
            const sessions  =  await reader();
            if (sessions) OnSessions(sessions);
        } catch (error) {
            if (error && error.name === 'AbortError') return;                // <-- The person closed the picker: nothing to report
            OnProblem(`That folder could not be read: ${error.message}`);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Choose a Folder, Whichever Way This Browser Allows
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__LandingScreen__ChooseFolder() {
        if (DistoImageMapper__Intake__FolderReader__HasFolderPicker()) {
            DistoImageMapper__Ui__LandingScreen__Take(DistoImageMapper__Intake__FolderReader__PickFolder);
        } else {
            Elements.FolderInput.click();
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Offer to Reopen the Last Folder
    // ------------------------------------------------------------
    async function DistoImageMapper__Ui__LandingScreen__OfferReopen() {
        const handle  =  await DistoImageMapper__Intake__FolderReader__RememberedHandle();
        if (!handle) return;

        Elements.Reopen.hidden       =  false;
        Elements.Reopen.textContent  =  `Reopen ${handle.name}`;
        Elements.Reopen.addEventListener('click', () => DistoImageMapper__Ui__LandingScreen__Take(async () => {
            const sessions  =  await DistoImageMapper__Intake__FolderReader__Reopen(handle);
            if (!sessions.length) OnProblem(`Could not read ${handle.name}. Choose the folder again.`);
            return sessions.length ? sessions : null;
        }));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Dragging a Folder Onto the Window
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__LandingScreen__BindDrop() {
        const hasFiles  =  event => Array.from(event.dataTransfer ? event.dataTransfer.types : []).includes('Files');

        window.addEventListener('dragenter', event => {
            if (!hasFiles(event)) return;
            event.preventDefault();
            DragDepth++;
            Elements.DropVeil.hidden  =  false;
        });

        window.addEventListener('dragover', event => {
            if (!hasFiles(event)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect  =  'copy';
        });

        window.addEventListener('dragleave', event => {
            if (!hasFiles(event)) return;
            DragDepth  =  Math.max(DragDepth - 1, 0);
            if (DragDepth === 0) Elements.DropVeil.hidden  =  true;
        });

        window.addEventListener('drop', event => {
            if (!hasFiles(event)) return;
            event.preventDefault();
            DragDepth  =  0;
            Elements.DropVeil.hidden  =  true;

            const reading  =  DistoImageMapper__Intake__FolderReader__FromDrop(event.dataTransfer);  // <-- Must start before this event ends
            DistoImageMapper__Ui__LandingScreen__Take(() => reading);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Interface
// -----------------------------------------------------------------------------

    // FUNCTION | Wire the Landing Screen (Once)
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__LandingScreen__Mount(onSessions, onProblem) {
        const byId  =  id => document.getElementById(`DistoImageMapper__Landing__${id}`);
        OnSessions  =  onSessions;
        OnProblem   =  onProblem;

        Elements  =  {
            Root         :  document.getElementById('DistoImageMapper__Landing'),
            ChooseFolder :  byId('ChooseFolder'),
            ChooseFiles  :  byId('ChooseFiles'),
            Reopen       :  byId('Reopen'),
            FolderInput  :  byId('FolderInput'),
            FilesInput   :  byId('FilesInput'),
            Error        :  byId('Error'),
            Chooser      :  byId('Chooser'),
            ChooserList  :  byId('ChooserList'),
            ChooserCancel:  byId('ChooserCancel'),
            Actions      :  byId('Actions'),
            DropVeil     :  document.getElementById('DistoImageMapper__DropVeil')
        };

        Elements.ChooseFolder.addEventListener('click', DistoImageMapper__Ui__LandingScreen__ChooseFolder);
        Elements.ChooseFiles.addEventListener('click', () => Elements.FilesInput.click());

        const fromInput  =  input => input.addEventListener('change', () => {
            const sessions  =  DistoImageMapper__Intake__FolderReader__FromFileList(input.files);
            input.value     =  '';                                           // <-- Choosing the same folder again still fires
            OnSessions(sessions);
        });
        fromInput(Elements.FolderInput);
        fromInput(Elements.FilesInput);

        DistoImageMapper__Ui__LandingScreen__BindDrop();
        DistoImageMapper__Ui__LandingScreen__OfferReopen();
    }
    // ------------------------------------------------------------


    // FUNCTION | Show or Hide the Screen
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__LandingScreen__SetVisible(isVisible) {
        Elements.Root.hidden  =  !isVisible;
        if (isVisible) DistoImageMapper__Ui__LandingScreen__HideChooser();
    }
    // ------------------------------------------------------------


    // FUNCTION | Show a Message on the Screen
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__LandingScreen__ShowError(message) {
        Elements.Error.hidden       =  !message;
        Elements.Error.textContent  =  message;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Back to the Choose Buttons
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__LandingScreen__HideChooser() {
        Elements.Chooser.hidden  =  true;
        Elements.Actions.hidden  =  false;
    }
    // ------------------------------------------------------------


    // FUNCTION | List Several Surveys to Choose From
    // ------------------------------------------------------------
    // Over a survey already open, Cancel goes back to it. Otherwise, to the first screen.
    export function DistoImageMapper__Ui__LandingScreen__ShowChooser(sessions, onChoose, isSurveyOpen) {
        Elements.Root.hidden     =  false;
        Elements.Actions.hidden  =  true;
        Elements.Chooser.hidden  =  false;
        Elements.ChooserList.replaceChildren();

        Elements.ChooserCancel.onclick  =  () => {
            DistoImageMapper__Ui__LandingScreen__HideChooser();
            if (isSurveyOpen) Elements.Root.hidden  =  true;
        };

        for (const session of sessions) {
            const button  =  document.createElement('button');
            button.type       =  'button';
            button.className  =  'DistoImageMapper__Landing__ChooserItem';

            const name   =  document.createElement('strong');
            name.textContent  =  session.Name;
            const count  =  document.createElement('span');
            count.textContent =  `${session.Images.size} photos`;

            button.append(name, count);
            button.addEventListener('click', () => {
                DistoImageMapper__Ui__LandingScreen__HideChooser();
                onChoose(session);
            });
            Elements.ChooserList.appendChild(button);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
