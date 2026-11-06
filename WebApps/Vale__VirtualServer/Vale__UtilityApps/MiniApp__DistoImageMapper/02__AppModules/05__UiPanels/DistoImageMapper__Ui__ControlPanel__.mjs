/* =============================================================================
   DISTO IMAGE MAPPER - UI PANELS | CONTROL PANEL
   =============================================================================

   FILE       : DistoImageMapper__Ui__ControlPanel__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Ui - ControlPanel
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The left panel: the survey's figures and check, its layers, how the
                photos are arranged and where the sheets sit
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - Every control writes to the saved settings, then calls back so the 3D view
     follows. The settings persist between visits.

   ============================================================================= */

import { DistoImageMapper__Config__Section } from '../01__AppCore/DistoImageMapper__AppCore__Config__.mjs';
import { DistoImageMapper__Format__Fixed, DistoImageMapper__Format__Length } from '../01__AppCore/DistoImageMapper__AppCore__Format__.mjs';
import { DistoImageMapper__State, DistoImageMapper__State__SavePrefs } from '../01__AppCore/DistoImageMapper__AppCore__State__.mjs';

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Elements and Callbacks
    // ------------------------------------------------------------
    let Elements             =  null;
    let Callbacks            =  null;
    let IsArrangementLocked  =  false;                                       // <-- The Tripod view always shows photos as shot
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Showing Values
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Write Every Saved Setting Back to Its Control
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__ControlPanel__ShowPrefs() {
        const prefs  =  DistoImageMapper__State.Prefs;

        Elements.LayerBoxes.forEach(box => { box.checked  =  Boolean(prefs.Layers[box.dataset.layer]); });

        Elements.Arrangement.value  =  IsArrangementLocked ? 'AsShot' : prefs.Arrangement;
        Elements.Size.value         =  prefs.SizeScale;
        Elements.Opacity.value      =  prefs.PhotoOpacity;
        Elements.Lift.value         =  prefs.LiftPx;
        Elements.FieldOfView.value  =  prefs.FieldOfViewDegrees;
        Elements.PlanOffset.value   =  prefs.PlanOffsetMm;
        Elements.ElevOffset.value   =  prefs.ElevationOffsetMm;
        Elements.Parallel.checked   =  prefs.Parallel;

        Elements.SizeOut.textContent         =  `${Math.round(prefs.SizeScale * 100)}%`;
        Elements.OpacityOut.textContent      =  `${Math.round(prefs.PhotoOpacity * 100)}%`;
        Elements.LiftOut.textContent         =  `${prefs.LiftPx} px`;
        Elements.FieldOfViewOut.textContent  =  `${DistoImageMapper__Format__Fixed(prefs.FieldOfViewDegrees, 1)} deg`;
        Elements.PlanOffsetOut.textContent   =  DistoImageMapper__Format__Length(prefs.PlanOffsetMm);
        Elements.ElevOffsetOut.textContent   =  DistoImageMapper__Format__Length(prefs.ElevationOffsetMm);

        DistoImageMapper__Ui__ControlPanel__ShowArrangementRows();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Show Only the Sliders the Arrangement Uses
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__ControlPanel__ShowArrangementRows() {
        const arrangement  =  IsArrangementLocked ? 'AsShot' : Elements.Arrangement.value;

        Elements.LiftRow.hidden         =  arrangement !== 'Atlas';
        Elements.SizeRow.hidden         =  arrangement === 'AsShot';
        Elements.OpacityRow.hidden      =  arrangement === 'AsShot';
        Elements.FieldOfViewRow.hidden  =  arrangement !== 'AsShot';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Interface
// -----------------------------------------------------------------------------

    // FUNCTION | Wire the Panel (Once)
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__ControlPanel__Mount(callbacks) {
        const byId  =  id => document.getElementById(`DistoImageMapper__Panel__${id}`);
        Callbacks   =  callbacks;

        Elements  =  {
            Root            :  document.getElementById('DistoImageMapper__Panel'),
            SurveyName      :  byId('SurveyName'),
            Stats           :  byId('Stats'),
            Checks          :  byId('Checks'),
            OpenAnother     :  byId('OpenAnother'),
            LayerBoxes      :  Array.from(document.querySelectorAll('[data-layer]')),
            Arrangement     :  byId('Arrangement'),
            ArrangementHint :  byId('ArrangementHint'),
            AsShotOption    :  byId('ArrangementAsShot'),
            Size            :  byId('Size'),
            SizeOut         :  byId('SizeOut'),
            SizeRow         :  byId('SizeRow'),
            Opacity         :  byId('Opacity'),
            OpacityOut      :  byId('OpacityOut'),
            OpacityRow      :  byId('OpacityRow'),
            Lift            :  byId('Lift'),
            LiftOut         :  byId('LiftOut'),
            LiftRow         :  byId('LiftRow'),
            FieldOfView     :  byId('FieldOfView'),
            FieldOfViewOut  :  byId('FieldOfViewOut'),
            FieldOfViewRow  :  byId('FieldOfViewRow'),
            PlanOffset      :  byId('PlanOffset'),
            PlanOffsetOut   :  byId('PlanOffsetOut'),
            ElevOffset      :  byId('ElevationOffset'),
            ElevOffsetOut   :  byId('ElevationOffsetOut'),
            Parallel        :  byId('Parallel'),
            Version         :  byId('Version')
        };

        const sheets  =  DistoImageMapper__Config__Section('Sheets');
        const cards   =  DistoImageMapper__Config__Section('Cards');
        Elements.PlanOffset.max   =  sheets.OffsetMaximumMm;
        Elements.ElevOffset.max   =  sheets.OffsetMaximumMm;
        Elements.Lift.max         =  cards.LiftMaximumPx;
        Elements.FieldOfView.max  =  cards.FieldOfViewMaximumDegrees;

        const identity  =  DistoImageMapper__Config__Section('Identity');
        Elements.Version.textContent  =  `Version ${identity.AppVersion}`;

        const prefs  =  () => DistoImageMapper__State.Prefs;
        const commit =  callback => {
            DistoImageMapper__State__SavePrefs();
            DistoImageMapper__Ui__ControlPanel__ShowPrefs();
            callback();
        };

        Elements.OpenAnother.addEventListener('click', () => Callbacks.OnOpenAnother());

        Elements.LayerBoxes.forEach(box => box.addEventListener('change', () => {
            prefs().Layers[box.dataset.layer]  =  box.checked;
            commit(Callbacks.OnLayersChanged);
        }));

        Elements.Arrangement.addEventListener('change', () => {
            prefs().Arrangement  =  Elements.Arrangement.value;
            commit(Callbacks.OnPhotosChanged);
        });

        const bindRange  =  (input, key, callback) => input.addEventListener('input', () => {
            prefs()[key]  =  Number(input.value);
            commit(callback);
        });
        bindRange(Elements.Size, 'SizeScale', () => Callbacks.OnPhotosChanged());
        bindRange(Elements.Opacity, 'PhotoOpacity', () => Callbacks.OnPhotosChanged());
        bindRange(Elements.Lift, 'LiftPx', () => Callbacks.OnPhotosChanged());
        bindRange(Elements.FieldOfView, 'FieldOfViewDegrees', () => Callbacks.OnPhotosChanged());
        bindRange(Elements.PlanOffset, 'PlanOffsetMm', () => Callbacks.OnSheetsChanged());
        bindRange(Elements.ElevOffset, 'ElevationOffsetMm', () => Callbacks.OnSheetsChanged());

        Elements.Parallel.addEventListener('change', () => {
            prefs().Parallel  =  Elements.Parallel.checked;
            commit(Callbacks.OnParallelChanged);
        });

        DistoImageMapper__Ui__ControlPanel__ShowPrefs();
    }
    // ------------------------------------------------------------


    // FUNCTION | Show a Survey's Figures and Check
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__ControlPanel__ShowSurvey(survey) {
        Elements.SurveyName.textContent  =  survey.Name;

        const photoCount  =  survey.Points.filter(point => point.ImageFile).length;
        const rows        =  [
            ['Points', String(survey.Points.length)],
            ['Photos', String(photoCount)],
            ['Line length', DistoImageMapper__Format__Length(survey.PathLengthMm)],
            ['Extent X x Y x Z', survey.ExtentsText]
        ];

        Elements.Stats.replaceChildren();
        for (const [label, value] of rows) {
            const term  =  document.createElement('dt');
            term.textContent  =  label;
            const data  =  document.createElement('dd');
            data.textContent  =  value;
            Elements.Stats.append(term, data);
        }

        Elements.Checks.replaceChildren();
        for (const check of survey.Checks) {
            const item  =  document.createElement('li');
            item.className  =  `DistoImageMapper__Panel__Check DistoImageMapper__Panel__Check--${check.Level}`;

            const title  =  document.createElement('strong');
            title.textContent  =  check.Title;
            const text   =  document.createElement('span');
            text.textContent   =  check.Text;

            item.append(title, text);
            Elements.Checks.appendChild(item);
        }

        const hasTripod  =  Boolean(survey.Station);
        Elements.AsShotOption.disabled  =  !hasTripod;
        if (!hasTripod && DistoImageMapper__State.Prefs.Arrangement === 'AsShot') {
            DistoImageMapper__State.Prefs.Arrangement  =  'OnPoint';
        }

        DistoImageMapper__Ui__ControlPanel__ShowPrefs();
    }
    // ------------------------------------------------------------


    // FUNCTION | Lock the Arrangement While Standing at the Tripod
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__ControlPanel__LockArrangement(isLocked) {
        IsArrangementLocked               =  isLocked;
        Elements.Arrangement.value        =  isLocked ? 'AsShot' : DistoImageMapper__State.Prefs.Arrangement;  // <-- The list always says what the photos are doing
        Elements.Arrangement.disabled     =  isLocked;
        Elements.ArrangementHint.hidden   =  !isLocked;
        DistoImageMapper__Ui__ControlPanel__ShowArrangementRows();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
