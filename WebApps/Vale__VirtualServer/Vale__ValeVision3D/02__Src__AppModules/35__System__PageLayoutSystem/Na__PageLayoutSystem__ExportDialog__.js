// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - EXPORT DIALOG (NAME IT, SAVE IT, THEN THE PDF)
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__ExportDialog__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Export Dialog
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The dialog both Export buttons open: it asks for the scheme name or
//              reference, shows the sheet, the version it becomes and the file
//              name, then makes the PDF, saves the drawing as a version for the
//              job, and only then downloads the PDF
// CREATED    : 11-Nov-2026
//
// DESCRIPTION:
// - WHY (Adam, 11-Nov-2026): Amy made and exported a drawing that was never saved,
//   so nobody, Amy included, could ever get that view and its settings back. "A
//   version should always be saved when exported ... Bring up a custom modal when
//   export is hit asking for a scheme name / reference and add that to a file
//   name like {{ProjectNo}}__{{ProjectName}}__{{UsersNaming}}__ValeVisionLayour__11-Nov-2026__.pdf".
//   The word is written ValeVisionLayout (the config's patterns hold it).
// - WHAT IT SHOWS: the sheet as the PDF will hold it (title block or not), the
//   version it becomes ("Version 3", "Version 2 (exported again)", "New drawing:
//   version 1"), the scheme name or reference (it names the drawing too), Full
//   layout or Image only, the file name with the reference marked, and three
//   steps that tick as they happen: Make the PDF, Save version N to the Vale
//   Cloud, Download the PDF.
// - THE ORDER: the PDF is made in memory first (a device that cannot make it
//   saves nothing), then the save (Na__PageLayoutSystem__SavedLayouts__Controls__
//   SaveForExport: the server freezes the version), then the download and the
//   activity ledger. The PDF never leaves before its version is on the Vale Cloud.
// - WHEN THE SAVE FAILS (Adam, 11-Nov-2026: offer Export Without Saving): the step
//   turns red with the reason, and the dialog offers Try Again (or, when someone
//   saved or deleted the drawing meanwhile, Save as New Drawing and Export) and
//   Export Without Saving, which downloads it and marks the ledger "Saved: No".
//   The recovery copy on this computer still holds the drawing.
// - SOMEONE WHO CANNOT SAVE (an Affiliate, signed out) is told so on the save
//   step and exports with Export PDF; the ledger says why it was not saved.
// - Download Again saves the export again too (the same version, one more
//   export), so every PDF given out is on the version's list.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Nov-2026 - Version 1.0.0 (ValeVision3D v2.94.0)
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The PDF, Its Name, the Sheet's Picture Layer
    // ------------------------------------------------------------
    import {
        Na__PageLayout__Pdf__Build,
        Na__PageLayout__Pdf__FileName,
        Na__PageLayout__Pdf__Download,
        Na__PageLayout__Pdf__Report
    } from './Na__PageLayoutSystem__PdfExport__A3__.js';
    import {
        Na__PageLayout__Naming__KIND,
        Na__PageLayout__Naming__Parts,
        Na__PageLayout__Naming__Slug,
        Na__PageLayout__Naming__IsPlaceholder
    } from './Na__PageLayoutSystem__ExportNaming__.js';
    import { Na__PageLayout__DrawImageLayer } from './Na__PageLayoutSystem__CanvasRenderPipeline__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Save, the Versions, Who Is Here, the Page's Events
    // ------------------------------------------------------------
    import { Na__PageLayout__Store__ResolveConfig } from './Na__PageLayoutSystem__LayoutStore__.js';
    import { Na__PageLayout__SavedLayouts__SaveForExport, Na__PageLayout__SavedLayouts__IsBusy } from './Na__PageLayoutSystem__SavedLayouts__Controls__.js';
    import { Na__PageLayout__SavedList__Versions } from './Na__PageLayoutSystem__SavedList__.js';
    import { Na__PageLayout__User, Na__PageLayout__CanSave } from './Na__PageLayoutSystem__UserSession__.js';
    import { Na__PageLayout__Toast, Na__PageLayout__SyncedToast, Na__PageLayout__Emit } from './Na__PageLayoutSystem__UiNotify__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Ids (Na__PageLayoutSystem__Layout__.html)
    // ------------------------------------------------------------
    const Na__PageLayout__Export__IDS = Object.freeze({
        dialog    : 'naExportDialog',
        title     : 'naExportTitle',
        subtitle  : 'naExportSubtitle',
        close     : 'naExportClose',
        preview   : 'naExportPreview',
        badge     : 'naExportBadge',
        reference : 'naExportReference',
        hint      : 'naExportReferenceHint',
        asNewRow  : 'naExportAsNewRow',
        asNew     : 'naExportAsNew',
        asNewText : 'naExportAsNewText',
        kinds     : 'naExportKinds',
        fileName  : 'naExportFileName',
        steps     : 'naExportSteps',
        status    : 'naExportStatus',
        cancel    : 'naExportCancel',
        without   : 'naExportWithout',
        go        : 'naExportGo',
        openFull  : 'naLayoutExportFull',
        openImage : 'naLayoutExportImageOnly',
        stepPdf          : 'naExportStepPdf',
        stepPdfNote      : 'naExportStepPdfNote',
        stepSave         : 'naExportStepSave',
        stepSaveNote     : 'naExportStepSaveNote',
        stepDownload     : 'naExportStepDownload',
        stepDownloadNote : 'naExportStepDownloadNote'
    });
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Words
    // ------------------------------------------------------------
    const Na__PageLayout__Export__WORDS = Object.freeze({
        title           : 'Export Drawing PDF',
        titleFailed     : 'Not saved yet',
        titleDone       : 'Saved and exported',
        titleUnsaved    : 'Exported, not saved',
        subtitleSave    : 'Saved for the job first, so anyone can open it again exactly as exported.',
        subtitleNoSave  : 'This export will not be saved for the job.',
        goSave          : 'Save and Export PDF',
        goPlain         : 'Export PDF',
        goRetry         : 'Try Again',
        goAsNew         : 'Save as New Drawing and Export',
        goWorking       : 'Working...',
        done            : 'Done',
        cancel          : 'Cancel',
        again           : 'Download Again',
        placeholderRef  : 'Your Reference',
        hint            : 'Names the drawing in Saved Drawings and the PDF\'s file name.',
        hintEmpty       : 'Type a scheme name or reference first.'
    });
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Preview's Width on Screen (CSS px)
    // ------------------------------------------------------------
    const Na__PageLayout__Export__PREVIEW_MIN_PX = 200;
    const Na__PageLayout__Export__PREVIEW_MAX_PX = 420;
    // ------------------------------------------------------------

    // MODULE VARIABLES | Open From Elsewhere (Set by Init)
    // ------------------------------------------------------------
    let Na__PageLayout__Export__OpenFn = null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Element by Key
    // ------------------------------------------------------------
    function Na__PageLayout__Export__El(key) {
        return document.getElementById(Na__PageLayout__Export__IDS[key]);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wait for the Browser to Paint (a Spinner Shows Before Heavy Work)
    // ------------------------------------------------------------
    function Na__PageLayout__Export__Frames(count) {
        return new Promise((resolve) => {
            let left = Math.max(1, count || 1);
            const tick = () => { left -= 1; if (left <= 0) resolve(); else requestAnimationFrame(tick); };
            requestAnimationFrame(tick);
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Job's Id in Words ('60795__Brown__Scheme-2a' -> '60795 Brown Scheme-2a')
    // ------------------------------------------------------------
    function Na__PageLayout__Export__JobWords(state) {
        return String((state.project && state.project.id) || '').split('/').pop().replace(/__/g, ' ').trim();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Export Dialog Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize: Wire Both Export Buttons to the Dialog
    // ------------------------------------------------------------
    function Na__PageLayout__InitExportDialog(state) {
        const dialog = Na__PageLayout__Export__El('dialog');
        if (!state || !dialog) return;
        const panel  = dialog.querySelector('.na-export__panel');
        const input  = Na__PageLayout__Export__El('reference');
        const asNew  = Na__PageLayout__Export__El('asNew');
        const go     = Na__PageLayout__Export__El('go');
        const cancel = Na__PageLayout__Export__El('cancel');
        const without = Na__PageLayout__Export__El('without');
        const W      = Na__PageLayout__Export__WORDS;

        let mode          = 'closed';                                       // <-- closed | ready | working | save-failed | done | done-unsaved
        let kind          = 'full';                                         // <-- full | image
        let doc           = null;                                           // <-- The PDF made, kept for a retry or Download Again
        let docKind       = '';
        let fileName      = '';
        let forceNew      = false;                                          // <-- Someone saved or deleted it meanwhile: save a new drawing
        let lastSaveError = '';
        let lastRun       = { saved : false };


        // SUB FUNCTION | Who Can Save, and Why Not
        // ------------------------------------------------------------
        const canSave = () => Na__PageLayout__CanSave() && !!(state.project && state.project.id);
        const whyNot  = () => !(state.project && state.project.id)
            ? 'Opened without a job'
            : !Na__PageLayout__User() ? 'Not signed in' : 'This account cannot save drawings';
        const reference = () => String(input ? input.value : '').replace(/\s+/g, ' ').trim();
        const isFull    = () => kind !== 'image';
        // ------------------------------------------------------------


        // SUB FUNCTION | Which Version the Export Becomes
        // ------------------------------------------------------------
        const predict = () => {
            if (!canSave()) return { text : 'Not saved for the job', tone : 'unsaved', number : 0, again : false };
            const record = state.layout.record;
            if (!record || forceNew || (asNew && asNew.checked)) return { text : 'New drawing: version 1', tone : 'new', number : 1, again : false };
            const versions = Na__PageLayout__SavedList__Versions(record);
            const last     = versions[0] || null;
            const renamed  = reference() !== String(record.PageLayouts__Layout__Name || '').replace(/\s+/g, ' ').trim();
            const shownOld = !!(state.layout.version && !state.layout.version.isCurrent);
            const changed  = state.layout.dirty === true || renamed || shownOld;
            if (last && !changed && last.Version__LayoutRev === record.PageLayouts__Layout__Rev) {
                return { text : `Version ${last.Version__Number} (exported again)`, tone : 'again', number : last.Version__Number, again : true };
            }
            const next = (last ? last.Version__Number : 0) + 1;
            return { text : `Version ${next}`, tone : 'new', number : next, again : false };
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | One Step's State, Title and Note ('' | active | done | failed | skipped; null keeps it)
        // ------------------------------------------------------------
        const setStep = (name, status, title, note) => {
            const steps = Na__PageLayout__Export__El('steps');
            const item  = steps ? steps.querySelector(`[data-step="${name}"]`) : null;
            if (!item) return;
            if (status !== null) {
                ['is-active', 'is-done', 'is-failed', 'is-skipped'].forEach((cls) => item.classList.remove(cls));
                if (status) item.classList.add('is-' + status);
            }
            const key = name === 'pdf' ? 'stepPdf' : (name === 'save' ? 'stepSave' : 'stepDownload');
            if (typeof title === 'string') { const t = Na__PageLayout__Export__El(key); if (t) t.textContent = title; }
            if (typeof note  === 'string') { const n = Na__PageLayout__Export__El(key + 'Note'); if (n) n.textContent = note; }
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | The Line Under the Steps ('' | error | warn | ok)
        // ------------------------------------------------------------
        const setStatus = (text, tone) => {
            const status = Na__PageLayout__Export__El('status');
            if (!status) return;
            status.textContent = text || '';
            status.className   = 'na-export__status' + (tone ? ' na-export__status--' + tone : '');
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | The Sheet as the PDF Will Hold It
        // ------------------------------------------------------------
        const drawPreview = () => {
            const canvas = Na__PageLayout__Export__El('preview');
            if (!canvas || !state.a3) return;
            const holder = canvas.parentElement;
            const cssW   = Math.max(Na__PageLayout__Export__PREVIEW_MIN_PX, Math.min(Na__PageLayout__Export__PREVIEW_MAX_PX, (holder && holder.clientWidth) || 320));
            const dpr    = Math.min(2, window.devicePixelRatio || 1);
            const width  = Math.round(cssW * dpr);
            const ppm    = width / state.a3.widthMm;
            const height = Math.round(state.a3.heightMm * ppm);
            canvas.width        = width;
            canvas.height       = height;
            canvas.style.width  = cssW + 'px';
            canvas.style.height = Math.round(height / dpr) + 'px';
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            if (isFull() && state.titleBlockImage) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(state.titleBlockImage, 0, 0, width, height);
            }
            Na__PageLayout__DrawImageLayer(ctx, state, ppm);                // <-- The screen's own routine: the PDF's picture exactly
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | The File Name, the Reference Marked (a Placeholder While None Is Typed)
        // ------------------------------------------------------------
        const drawFileName = () => {
            const box = Na__PageLayout__Export__El('fileName');
            if (!box) return;
            const typed = reference();
            const shown = typed || W.placeholderRef;
            const name  = Na__PageLayout__Pdf__FileName(state, shown, isFull(), new Date());
            box.textContent = '';
            Na__PageLayout__Naming__Parts(name, shown).forEach((part) => {
                const span = document.createElement('span');
                span.className = part.isSeparator ? 'na-export__file-sep'
                    : (part.isReference ? ('na-export__file-ref' + (typed ? '' : ' is-placeholder')) : 'na-export__file-part');
                span.textContent = part.text;
                box.appendChild(span);
                if (part.isSeparator) box.appendChild(document.createElement('wbr'));   // <-- A long name wraps after a "__", never inside one
            });
            box.title = name;
            if (mode === 'ready' || mode === 'save-failed') fileName = typed ? name : '';
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Everything That Follows the Reference, the Kind and Save as New
        // ------------------------------------------------------------
        const refresh = () => {
            const badge  = Na__PageLayout__Export__El('badge');
            const hint   = Na__PageLayout__Export__El('hint');
            const guess  = predict();
            const typed  = !!Na__PageLayout__Naming__Slug(reference());
            if (badge) {
                badge.textContent = guess.text;
                badge.className   = 'na-export__badge na-export__badge--' + guess.tone;
            }
            if (hint) {
                const missing = !typed && !!(input && input.dataset.touched);   // <-- Said only once they have been in the box
                hint.textContent = missing ? W.hintEmpty : W.hint;
                hint.classList.toggle('is-error', missing);
            }
            const job = Na__PageLayout__Export__JobWords(state);
            if (canSave()) {
                setStep('save', mode === 'ready' ? '' : null, guess.again ? `Add this export to version ${guess.number}` : `Save version ${guess.number} to the Vale Cloud`,
                    `For job ${job || 'this job'}, as ${(Na__PageLayout__User() || {}).name || 'you'}`);
            } else {
                setStep('save', 'skipped', 'Not saved for the job', whyNot());
            }
            setStep('pdf', mode === 'ready' ? '' : null, 'Make the PDF', isFull() ? 'A3, with the title block' : 'A3, the picture alone');
            drawFileName();
            if (mode === 'ready' || mode === 'save-failed') go.disabled = !typed;
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | The Dialog's Mode: Buttons, Words, What Can Be Changed
        // ------------------------------------------------------------
        const setMode = (next) => {
            mode = next;
            if (panel) panel.dataset.state = next;
            const title    = Na__PageLayout__Export__El('title');
            const subtitle = Na__PageLayout__Export__El('subtitle');
            const editable = next === 'ready' || next === 'save-failed';
            const finished = next === 'done' || next === 'done-unsaved';
            if (title) title.textContent = next === 'save-failed' ? W.titleFailed : next === 'done' ? W.titleDone : next === 'done-unsaved' ? W.titleUnsaved : W.title;
            if (subtitle) subtitle.textContent = canSave() ? W.subtitleSave : W.subtitleNoSave;

            if (input) input.disabled = !editable;
            if (asNew) asNew.disabled = !editable;
            dialog.querySelectorAll('.na-export__kind').forEach((button) => { button.disabled = !editable; });
            const close = Na__PageLayout__Export__El('close');
            if (close) close.disabled = next === 'working';

            without.hidden   = next !== 'save-failed';
            without.disabled = next !== 'save-failed';
            cancel.disabled  = next === 'working';
            cancel.textContent = finished ? W.again : W.cancel;
            go.classList.toggle('is-working', next === 'working');
            go.textContent = next === 'working' ? W.goWorking
                : finished ? W.done
                    : next === 'save-failed' ? (forceNew ? W.goAsNew : W.goRetry)
                        : (canSave() ? W.goSave : W.goPlain);
            go.disabled = next === 'working' || (editable && !Na__PageLayout__Naming__Slug(reference()));
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Full Layout or Image Only
        // ------------------------------------------------------------
        const setKind = (next) => {
            kind = next === 'image' ? 'image' : 'full';
            dialog.querySelectorAll('.na-export__kind').forEach((button) => {
                const on = button.getAttribute('data-kind') === kind;
                button.setAttribute('aria-checked', on ? 'true' : 'false');
                button.classList.toggle('is-active', on);
            });
            drawPreview();
            refresh();
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Open the Dialog (kind: 'full' | 'image')
        // ------------------------------------------------------------
        const open = (startKind) => {
            if (mode !== 'closed') return;
            if (!state.viewportImage) {
                Na__PageLayout__Toast('There is no picture on the sheet yet: open a saved drawing or press Create Drawing first', true);
                return;
            }
            const cfg    = Na__PageLayout__Store__ResolveConfig(state);
            const name   = String(state.layout.name || '').trim();
            const record = state.layout.record;
            doc = null; docKind = ''; fileName = ''; forceNew = false; lastSaveError = ''; lastRun = { saved : false };

            if (input) {
                input.value = Na__PageLayout__Naming__IsPlaceholder(name, cfg.defaultName) ? '' : name;   // <-- "Drawing Layout" is no reference
                delete input.dataset.touched;
            }
            const asNewRow  = Na__PageLayout__Export__El('asNewRow');
            const asNewText = Na__PageLayout__Export__El('asNewText');
            if (asNewRow) asNewRow.hidden = !(record && canSave());
            if (asNew) asNew.checked = false;
            if (asNewText && record) asNewText.textContent = `Save as a new drawing (keeps ${record.PageLayouts__Layout__Name || 'the open one'} as it is)`;

            ['pdf', 'save', 'download'].forEach((step) => setStep(step, ''));
            setStep('download', '', 'Download the PDF', 'To this computer\'s downloads');
            setStatus('');
            setMode('ready');
            dialog.hidden = false;
            setKind(startKind);                                             // <-- Draws the preview now the dialog has its size
            if (input) {
                input.focus();
                input.select();
            }
        };
        Na__PageLayout__Export__OpenFn = open;
        // ------------------------------------------------------------


        // SUB FUNCTION | Close (Never While Working)
        // ------------------------------------------------------------
        const close = () => {
            if (mode === 'working' || mode === 'closed') return;
            dialog.hidden = true;
            mode = 'closed';
            doc  = null;                                                    // <-- A 40 MP sheet's PDF is not kept longer than needed
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Make the PDF, Save the Version, Download, Report
        // ------------------------------------------------------------
        // withoutSaving: the person chose Export Without Saving after a failed save.
        // ------------------------------------------------------------
        const run = async (withoutSaving) => {
            if (mode === 'working') return;
            const ref = reference();
            if (!Na__PageLayout__Naming__Slug(ref)) {
                if (input) { input.dataset.touched = '1'; input.focus(); }
                refresh();
                setStatus(W.hintEmpty, 'error');
                return;
            }
            if (Na__PageLayout__SavedLayouts__IsBusy()) {
                setStatus('A save is still running: try again in a moment', 'warn');
                return;
            }
            const saving = withoutSaving !== true && canSave();
            const full   = isFull();
            const guess  = predict();

            // THE NAME | The reference names the drawing (a change is a change like any other)
            // ------------------------------------------------------------
            if (ref !== String(state.layout.name || '').trim()) {
                state.layout.name = ref;
                Na__PageLayout__Emit('changed', { what : 'name' });
            }
            fileName = Na__PageLayout__Pdf__FileName(state, ref, full, new Date());

            setMode('working');
            setStatus('Making the PDF...');
            setStep('pdf', 'active');
            setStep('save', saving ? '' : 'skipped', saving ? undefined : 'Not saved for the job', saving ? undefined : (withoutSaving ? 'Exported without saving' : whyNot()));
            setStep('download', '');
            await Na__PageLayout__Export__Frames(2);                         // <-- The spinner shows before the heavy flatten

            // 1. THE PDF | In memory: a device that cannot make it saves nothing
            // ------------------------------------------------------------
            try {
                if (!doc || docKind !== kind) {
                    doc     = Na__PageLayout__Pdf__Build(state, full);
                    docKind = kind;
                }
            } catch (error) {
                doc = null;
                setStep('pdf', 'failed', 'The PDF could not be made', error.message || '');
                setStatus(error.message || 'The PDF could not be made', 'error');
                setMode('ready');
                return;
            }
            setStep('pdf', 'done', 'PDF made');

            // 2. THE VERSION | Saved for the job before the PDF leaves
            // ------------------------------------------------------------
            let saved = false, layoutId = '', versionNumber = null, answer = null;
            if (saving) {
                setStep('save', 'active');
                setStatus('Saving to the Vale Cloud...');
                const result = await Na__PageLayout__SavedLayouts__SaveForExport({
                    asNew : forceNew || !!(asNew && asNew.checked),
                    issue : { kind : full ? Na__PageLayout__Naming__KIND.full : Na__PageLayout__Naming__KIND.image, fileName : fileName }
                });
                if (!result.ok) {
                    const error = result.error || new Error('The server refused the save');
                    lastSaveError = error.message || 'The save failed';
                    if (error.conflict || error.missing) {
                        forceNew = true;                                    // <-- Theirs stays; this one can only be a drawing of its own
                        if (asNew) { asNew.checked = true; }
                    }
                    setMode('save-failed');
                    refresh();
                    setStep('save', 'failed', 'Not saved', lastSaveError);  // <-- The server's own words, once, on the step
                    setStatus(forceNew
                        ? 'The drawing on the sheet is safe. Save it as a new drawing to keep it beside theirs, or export without saving.'
                        : 'The drawing was not saved. Try again, or export without saving: it stays recoverable on this computer.', 'error');
                    if (asNew) asNew.disabled = forceNew;
                    return;
                }
                answer        = result.answer || {};
                saved         = true;
                layoutId      = (answer.layout && answer.layout.PageLayouts__Layout__Id) || '';
                versionNumber = answer.version ? answer.version.Version__Number : null;
                forceNew      = false;
                if (asNew) asNew.checked = false;
                const badge = Na__PageLayout__Export__El('badge');
                if (badge) {                                                // <-- What the server kept, in place of the guess
                    badge.textContent = `Version ${versionNumber} saved`;
                    badge.className   = 'na-export__badge na-export__badge--saved';
                }
                setStep('save', 'done',
                    answer.newVersion ? `Saved as version ${versionNumber}` : `Added to version ${versionNumber}`,
                    answer.newVersion
                        ? (answer.created ? `A new drawing for job ${Na__PageLayout__Export__JobWords(state)}` : `For job ${Na__PageLayout__Export__JobWords(state)}`)
                        : 'Nothing had changed since that version was exported');
            }

            // 3. THE DOWNLOAD | Then the activity ledger, with the version's address
            // ------------------------------------------------------------
            setStep('download', 'active');
            const handed = Na__PageLayout__Pdf__Download(doc, fileName);
            setStep('download', handed ? 'done' : 'failed', handed ? 'PDF downloaded' : 'The browser did not take the PDF', fileName);
            Na__PageLayout__Pdf__Report(state, {
                isFullLayout  : full,
                fileName      : fileName,
                reference     : ref,
                layoutId      : layoutId,
                versionNumber : versionNumber,
                saved         : saved,
                notSavedWhy   : saved ? '' : (withoutSaving ? lastSaveError || 'the save failed' : whyNot())
            });
            lastRun = { saved, withoutSaving : withoutSaving === true };

            // 4. WHERE IT STANDS
            // ------------------------------------------------------------
            const job = Na__PageLayout__Export__JobWords(state);
            if (saved) {
                setMode('done');
                setStatus(`${guess.again && !answer.newVersion ? 'This export is recorded on' : 'Saved as'} version ${versionNumber} of ${ref}${job ? ' for job ' + job : ''}. Anyone on the job can open it again from Saved Drawings, exactly as exported.`, 'ok');
                Na__PageLayout__SyncedToast(`Version ${versionNumber} of ${ref}${job ? ' saved to job ' + job : ' saved'}, exported as ${fileName}`, 'Saved and exported');
            } else {
                setMode('done-unsaved');
                setStatus(!withoutSaving
                    ? `This PDF is not saved for the job (${whyNot().toLowerCase()}).`
                    : forceNew
                        ? 'This PDF is not saved for the job. The drawing is still on the sheet and kept on this computer: Save as New in Drawing Layout keeps it as a drawing of its own.'
                        : 'This PDF is not saved for the job. The drawing is still on the sheet and kept on this computer: save it when the Vale Cloud can be reached.', 'warn');
            }
            if (!handed) setStatus('The browser did not take the PDF: press Download Again.', 'error');
        };
        // ------------------------------------------------------------


        // Wire the dialog
        // ------------------------------------------------------------
        if (input) {
            input.addEventListener('input', () => { input.dataset.touched = '1'; refresh(); if (mode === 'ready') setStatus(''); });
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') { event.preventDefault(); if (!go.disabled) go.click(); }
            });
        }
        if (asNew) asNew.addEventListener('change', refresh);
        dialog.querySelectorAll('.na-export__kind').forEach((button) => {
            button.addEventListener('click', () => {
                if (mode !== 'ready' && mode !== 'save-failed') return;
                setKind(button.getAttribute('data-kind'));
            });
        });
        go.addEventListener('click', () => {
            if (mode === 'done' || mode === 'done-unsaved') { close(); return; }
            run(false);
        });
        without.addEventListener('click', () => { if (mode === 'save-failed') run(true); });
        cancel.addEventListener('click', () => {
            if (mode === 'done' || mode === 'done-unsaved') {               // <-- Download Again: saved again too, so the version lists it
                setMode('ready');
                run(lastRun.withoutSaving === true);
                return;
            }
            close();
        });
        const closeButton = Na__PageLayout__Export__El('close');
        if (closeButton) closeButton.addEventListener('click', close);
        dialog.addEventListener('click', (event) => {
            if (event.target && event.target.hasAttribute('data-export-dismiss')) close();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && mode !== 'closed') { event.preventDefault(); close(); }
        });
        window.addEventListener('resize', () => { if (mode !== 'closed') drawPreview(); });

        // The menu's two Export buttons
        // ------------------------------------------------------------
        const openFull  = Na__PageLayout__Export__El('openFull');
        const openImage = Na__PageLayout__Export__El('openImage');
        if (openFull)  openFull.addEventListener('click', () => open('full'));
        if (openImage) openImage.addEventListener('click', () => open('image'));
    }
    // ------------------------------------------------------------


    // FUNCTION | Open the Export Dialog From Elsewhere ('full' | 'image')
    // ------------------------------------------------------------
    function Na__PageLayout__ExportDialog__Open(kind) {
        if (Na__PageLayout__Export__OpenFn) Na__PageLayout__Export__OpenFn(kind);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Export Dialog API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__InitExportDialog,
        Na__PageLayout__ExportDialog__Open
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
