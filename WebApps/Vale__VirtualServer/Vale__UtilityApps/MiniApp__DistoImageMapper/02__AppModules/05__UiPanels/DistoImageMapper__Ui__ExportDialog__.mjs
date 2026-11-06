/* =============================================================================
   DISTO IMAGE MAPPER - UI PANELS | EXPORT DIALOG
   =============================================================================

   FILE       : DistoImageMapper__Ui__ExportDialog__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : UiPanels - ExportDialog
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Choose which drawings to export (the 3D and each face, by name),
                with or without the photos, then save the zip
   CREATED    : 06-Nov-2026

   DESCRIPTION:
   - Adam, 06-Nov-2026: "Add all sides but at export time show toggles for the user
     to select which they want". The ticks are the settings file's Export block.
   - The zip is built in the browser (Export - SurveyDxf) and saved like Save Image
     saves its picture: nothing leaves the device.

   ============================================================================= */

import { DistoImageMapper__Config__Section } from '../01__AppCore/DistoImageMapper__AppCore__Config__.mjs';
import { DistoImageMapper__UserConfig__Get, DistoImageMapper__UserConfig__Set } from '../01__AppCore/DistoImageMapper__AppCore__UserConfig__.mjs';
import { DistoImageMapper__Env3d__ClipBox__ActingMode, DistoImageMapper__Env3d__ClipBox__FaceKeys, DistoImageMapper__Env3d__ClipBox__State } from '../04__Env3d/DistoImageMapper__Env3d__ClipBox__.mjs';
import { DistoImageMapper__Export__SurveyDxf__Bundle } from '../07__Export/DistoImageMapper__Export__SurveyDxf__.mjs';


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Elements and the Job in Hand
    // ------------------------------------------------------------
    let Elements  =  null;
    let Job       =  null;                                                   // <-- { Survey, Mask, FieldOfViewDegrees, OnDone }
    let IsBusy    =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Choice
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Last Choice, Else the Config's
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__ExportDialog__ReadChoice() {
        const defaults  =  DistoImageMapper__Config__Section('Export').DefaultChoice;
        const stored    =  DistoImageMapper__UserConfig__Get('Export');
        if (stored && stored.Faces && typeof stored.Include3d === 'boolean') return { ...defaults, ...stored, Faces : { ...defaults.Faces, ...stored.Faces } };
        return defaults;
    }

    function DistoImageMapper__Ui__ExportDialog__SaveChoice(choice) {
        DistoImageMapper__UserConfig__Set('Export', choice);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What the Ticks Say Now
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__ExportDialog__Choice() {
        const faces  =  {};
        Elements.Faces.querySelectorAll('input[data-face]').forEach(box => { faces[box.dataset.face]  =  box.checked; });
        return { Include3d : Elements.Include3d.checked, Photos : Elements.Photos.checked, Faces : faces };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Export Is Possible Only With a Drawing Ticked
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__ExportDialog__Refresh() {
        const choice   =  DistoImageMapper__Ui__ExportDialog__Choice();
        const drawings =  (choice.Include3d ? 1 : 0) + Object.values(choice.Faces).filter(Boolean).length;
        Elements.Go.disabled  =  IsBusy || drawings === 0;
        Elements.Go.textContent  =  drawings === 1 ? 'Export 1 Drawing' : `Export ${drawings} Drawings`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Opening, Exporting, Closing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Close (never while the zip is being built)
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__ExportDialog__Close() {
        if (IsBusy) return;
        Elements.Root.hidden  =  true;
        Job  =  null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Save Bytes as a File, as Save Image Does
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__ExportDialog__Download(bytes, fileName) {
        const link  =  document.createElement('a');
        link.href      =  URL.createObjectURL(new Blob([bytes], { type : 'application/zip' }));
        link.download  =  fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(link.href), 10000);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Zip and Save It
    // ------------------------------------------------------------
    async function DistoImageMapper__Ui__ExportDialog__Run() {
        if (!Job || IsBusy) return;
        const choice  =  DistoImageMapper__Ui__ExportDialog__Choice();
        DistoImageMapper__Ui__ExportDialog__SaveChoice(choice);
        const faces   =  DistoImageMapper__Env3d__ClipBox__FaceKeys.filter(key => choice.Faces[key]);

        IsBusy  =  true;
        Elements.Root.classList.add('is-busy');
        DistoImageMapper__Ui__ExportDialog__Refresh();
        Elements.Status.textContent  =  'Starting';
        try {
            const result  =  await DistoImageMapper__Export__SurveyDxf__Bundle({
                Survey             :  Job.Survey,
                Mask               :  Job.Mask,
                Faces              :  faces,
                Include3d          :  choice.Include3d,
                IncludePhotos      :  choice.Photos,
                FieldOfViewDegrees :  Job.FieldOfViewDegrees,
                OnProgress         :  text => { Elements.Status.textContent  =  text; }
            });
            DistoImageMapper__Ui__ExportDialog__Download(result.Bytes, result.FileName);
            const summary  =  result.Summary;
            const done     =  `${result.FileName}: ${summary.Drawings} drawing${summary.Drawings === 1 ? '' : 's'}, ${summary.Points} points, ${summary.Photos} photo${summary.Photos === 1 ? '' : 's'}, ${summary.SizeText}`;
            if (Job.OnDone) Job.OnDone(done);
            IsBusy  =  false;
            Elements.Root.classList.remove('is-busy');
            DistoImageMapper__Ui__ExportDialog__Close();
        } catch (error) {
            IsBusy  =  false;
            Elements.Root.classList.remove('is-busy');
            Elements.Status.textContent  =  `The export stopped: ${error && error.message ? error.message : error}`;
            DistoImageMapper__Ui__ExportDialog__Refresh();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire the Dialog (Once)
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__ExportDialog__Mount() {
        const byId  =  id => document.getElementById(`DistoImageMapper__Export__${id}`);
        Elements  =  {
            Root      :  document.getElementById('DistoImageMapper__Export'),
            Summary   :  byId('Summary'),
            Include3d :  byId('Include3d'),
            Faces     :  byId('Faces'),
            Photos    :  byId('Photos'),
            Status    :  byId('Status'),
            Cancel    :  byId('Cancel'),
            Go        :  byId('Go')
        };
        Elements.Cancel.addEventListener('click', DistoImageMapper__Ui__ExportDialog__Close);
        Elements.Go.addEventListener('click', DistoImageMapper__Ui__ExportDialog__Run);
        Elements.Include3d.addEventListener('change', DistoImageMapper__Ui__ExportDialog__Refresh);
        Elements.Faces.addEventListener('change', DistoImageMapper__Ui__ExportDialog__Refresh);
        Elements.Root.addEventListener('click', event => { if (event.target === Elements.Root) DistoImageMapper__Ui__ExportDialog__Close(); });
        window.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || Elements.Root.hidden) return;
            event.stopImmediatePropagation();
            DistoImageMapper__Ui__ExportDialog__Close();
        }, true);
    }
    // ------------------------------------------------------------


    // FUNCTION | Open for a Survey: { Survey, Mask, FieldOfViewDegrees, OnDone(text) }
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__ExportDialog__Open(job) {
        Job  =  job;
        const box     =  DistoImageMapper__Env3d__ClipBox__State();
        const choice  =  DistoImageMapper__Ui__ExportDialog__ReadChoice();
        const kept    =  job.Survey.Points.filter((point, index) => !job.Mask || job.Mask[index] !== false);
        const photos  =  kept.filter(point => point.ImageFile).length;
        const which   =  { All : 'every point', Inside : 'the points inside the clipping box', Outside : 'the points outside the clipping box' }[DistoImageMapper__Env3d__ClipBox__ActingMode()];

        Elements.Summary.textContent  =  `${kept.length} of ${job.Survey.Points.length} points: ${which}. ${photos} photo${photos === 1 ? '' : 's'}.`;
        Elements.Include3d.checked  =  choice.Include3d;
        Elements.Photos.checked     =  choice.Photos;
        Elements.Faces.replaceChildren();
        for (const key of DistoImageMapper__Env3d__ClipBox__FaceKeys) {
            const label  =  document.createElement('label');
            label.className  =  'DistoImageMapper__Export__Face';
            const tick   =  document.createElement('input');
            tick.type          =  'checkbox';
            tick.dataset.face  =  key;
            tick.checked       =  Boolean(choice.Faces[key]);
            const name   =  box.Names[key] || key;
            label.append(tick, ` ${name === key ? key : `${name} (${key})`}`);
            Elements.Faces.appendChild(label);
        }
        Elements.Status.textContent  =  '';
        Elements.Root.hidden  =  false;
        DistoImageMapper__Ui__ExportDialog__Refresh();
        Elements.Go.focus();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
