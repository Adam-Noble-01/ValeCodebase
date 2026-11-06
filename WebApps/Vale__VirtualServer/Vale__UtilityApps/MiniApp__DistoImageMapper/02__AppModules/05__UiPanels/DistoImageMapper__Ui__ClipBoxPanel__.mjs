/* =============================================================================
   DISTO IMAGE MAPPER - UI PANELS | CLIPPING BOX
   =============================================================================

   FILE       : DistoImageMapper__Ui__ClipBoxPanel__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : UiPanels - ClipBoxPanel
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The panel's Clipping Box section: which points the box keeps, its
                turn and snap, Square to Points, the six faces by name with their
                views, and Export DXF
   CREATED    : 06-Nov-2026

   DESCRIPTION:
   - Every control writes straight to the box (Env3d - ClipBox); the box tells the
     app, which filters the scene and calls Show here to bring the controls level.
   - A face's name is free text (Adam: "add the ability to name an elevational
     view"), shown on its tab in the view, on its drawing and as its file's name.
     An empty name gives back the face's own.
   - Choosing Inside or Outside shows the box, so the cut can be seen.
   - Clip the View to the Box (on unless turned off): what the box leaves out is gone from
     the view, sheets, lines and the tripod included; off, everything round the box shows.
     In All points it keeps the inside while the box shows, and the count says so.

   ============================================================================= */

import { DistoImageMapper__Config__Section } from '../01__AppCore/DistoImageMapper__AppCore__Config__.mjs';
import {
    DistoImageMapper__Env3d__ClipBox__FaceKeys,
    DistoImageMapper__Env3d__ClipBox__IsClipView,
    DistoImageMapper__Env3d__ClipBox__SetClipView,
    DistoImageMapper__Env3d__ClipBox__SetMode,
    DistoImageMapper__Env3d__ClipBox__SetName,
    DistoImageMapper__Env3d__ClipBox__SetShown,
    DistoImageMapper__Env3d__ClipBox__SetSnap,
    DistoImageMapper__Env3d__ClipBox__SetYaw,
    DistoImageMapper__Env3d__ClipBox__Snap,
    DistoImageMapper__Env3d__ClipBox__State
} from '../04__Env3d/DistoImageMapper__Env3d__ClipBox__.mjs';


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Icons for the View Buttons
    // ------------------------------------------------------------
    const ICON_FOLDER  =  '01__AppAssets/UiIcons__MenuIcons__DistoMapper/';
    const FACE_ICON    =  { Front : 'Elevation', Back : 'Elevation', Left : 'Elevation', Right : 'Elevation', Top : 'Plan', Bottom : 'Plan' };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Elements and Callbacks
    // ------------------------------------------------------------
    let Elements   =  null;
    let Callbacks  =  null;                                                  // <-- { OnViewFace(key), OnSquare(), OnFit(), OnExport() }
    const FaceRows =  {};                                                    // <-- key -> { Row, Name, View }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building
// -----------------------------------------------------------------------------

    // SUB FUNCTION | One Row per Face: Its Colour, Its Kind, Its Name, a View Button
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__ClipBoxPanel__BuildFaces() {
        const colours  =  DistoImageMapper__Config__Section('ClipBox').FaceColours;
        Elements.Faces.replaceChildren();
        for (const key of DistoImageMapper__Env3d__ClipBox__FaceKeys) {
            const row  =  document.createElement('div');
            row.className  =  'DistoImageMapper__Box__Face';
            row.dataset.face  =  key;

            const swatch  =  document.createElement('span');
            swatch.className  =  'DistoImageMapper__Box__Swatch';
            swatch.style.background  =  colours[key];

            const kind  =  document.createElement('span');
            kind.className    =  'DistoImageMapper__Box__FaceKey';
            kind.textContent  =  key;

            const name  =  document.createElement('input');
            name.type          =  'text';
            name.maxLength     =  60;
            name.className     =  'DistoImageMapper__Box__FaceName';
            name.placeholder   =  key;
            name.spellcheck    =  false;
            name.setAttribute('aria-label', `Name of the ${key} face`);
            name.addEventListener('change', () => DistoImageMapper__Env3d__ClipBox__SetName(key, name.value));
            name.addEventListener('keydown', event => { if (event.key === 'Enter') name.blur(); });

            const view  =  document.createElement('button');
            view.type       =  'button';
            view.className  =  'DistoImageMapper__Box__View';
            view.title      =  `View the ${key} face, from outside the box`;
            view.setAttribute('aria-label', `View the ${key} face`);
            const icon  =  document.createElement('img');
            icon.className  =  'DistoImageMapper__Icon';
            icon.alt        =  '';
            icon.src        =  `${ICON_FOLDER}Icon__DistoMapper__${FACE_ICON[key]}__.svg`;
            view.appendChild(icon);
            view.addEventListener('click', () => Callbacks.OnViewFace(key));

            row.append(swatch, kind, name, view);
            Elements.Faces.appendChild(row);
            FaceRows[key]  =  { Row : row, Name : name, View : view };
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Snap's Choices: Off, Then the Config's Increments
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__ClipBoxPanel__BuildSnap() {
        const increments  =  DistoImageMapper__Config__Section('ClipBox').SnapIncrementsMm;
        Elements.Snap.replaceChildren();
        const off  =  document.createElement('option');
        off.value        =  'Off';
        off.textContent  =  'Off: to the millimetre';
        Elements.Snap.appendChild(off);
        for (const increment of increments) {
            const option  =  document.createElement('option');
            option.value        =  String(increment);
            option.textContent  =  `${increment} mm grid`;
            Elements.Snap.appendChild(option);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Interface
// -----------------------------------------------------------------------------

    // FUNCTION | Wire the Section (Once)
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__ClipBoxPanel__Mount(callbacks) {
        Callbacks  =  callbacks;
        const byId  =  id => document.getElementById(`DistoImageMapper__Box__${id}`);
        Elements  =  {
            Mode    :  byId('Mode'),
            Count   :  byId('Count'),
            Shown   :  byId('Shown'),
            ClipView:  byId('ClipView'),
            Square  :  byId('Square'),
            Fit     :  byId('Fit'),
            Yaw     :  byId('Yaw'),
            YawOut  :  byId('YawOut'),
            Snap    :  byId('Snap'),
            Faces   :  byId('Faces'),
            Export  :  byId('Export')
        };
        DistoImageMapper__Ui__ClipBoxPanel__BuildFaces();
        DistoImageMapper__Ui__ClipBoxPanel__BuildSnap();

        Elements.Mode.addEventListener('change', () => {
            const mode  =  Elements.Mode.value;
            if (mode !== 'All' && !DistoImageMapper__Env3d__ClipBox__State().Shown) DistoImageMapper__Env3d__ClipBox__SetShown(true);
            DistoImageMapper__Env3d__ClipBox__SetMode(mode);
        });
        Elements.Shown.addEventListener('change', () => DistoImageMapper__Env3d__ClipBox__SetShown(Elements.Shown.checked));
        Elements.ClipView.addEventListener('change', () => DistoImageMapper__Env3d__ClipBox__SetClipView(Elements.ClipView.checked));
        Elements.Square.addEventListener('click', () => Callbacks.OnSquare());
        Elements.Fit.addEventListener('click', () => Callbacks.OnFit());
        Elements.Yaw.addEventListener('input', () => {
            Elements.YawOut.textContent  =  `${Number(Elements.Yaw.value).toFixed(1)} deg`;
            DistoImageMapper__Env3d__ClipBox__SetYaw(Number(Elements.Yaw.value), true);
        });
        Elements.Yaw.addEventListener('change', () => DistoImageMapper__Env3d__ClipBox__SetYaw(Number(Elements.Yaw.value), false));
        Elements.Snap.addEventListener('change', () => {
            const value  =  Elements.Snap.value;
            const snap   =  DistoImageMapper__Env3d__ClipBox__Snap();
            DistoImageMapper__Env3d__ClipBox__SetSnap(value === 'Off' ? { Enabled : false, IncrementMm : snap.IncrementMm } : { Enabled : true, IncrementMm : Number(value) });
        });
        Elements.Export.addEventListener('click', () => Callbacks.OnExport());
    }
    // ------------------------------------------------------------


    // FUNCTION | Bring the Controls Level With the Box
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__ClipBoxPanel__Show() {
        if (!Elements) return;
        const box   =  DistoImageMapper__Env3d__ClipBox__State();
        const snap  =  DistoImageMapper__Env3d__ClipBox__Snap();
        Elements.Mode.value       =  box.Mode;
        Elements.Shown.checked    =  box.Shown;
        Elements.ClipView.checked =  DistoImageMapper__Env3d__ClipBox__IsClipView();
        Elements.Yaw.value        =  String(box.YawDeg);
        Elements.YawOut.textContent  =  `${Number(box.YawDeg).toFixed(1)} deg`;
        Elements.Snap.value       =  snap.Enabled ? String(snap.IncrementMm) : 'Off';
        for (const key of DistoImageMapper__Env3d__ClipBox__FaceKeys) {
            const row   =  FaceRows[key];
            const name  =  box.Names[key] || key;
            if (document.activeElement !== row.Name) row.Name.value  =  name === key ? '' : name;   // <-- Never while it is being typed in
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | How Many Points the Box Keeps (mode: the Points list; acting: ClipBox__ActingMode)
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__ClipBoxPanel__ShowCount(kept, total, mode, acting = mode) {
        if (!Elements) return;
        let text  =  `${kept} of ${total} points kept, ${acting === 'Inside' ? 'inside' : 'outside'} the box.`;
        if (acting === 'All')     text  =  `All ${total} points shown. The box frames the faces for their views and drawings.`;
        else if (mode === 'All')  text  =  `${kept} of ${total} points inside the box, in the view and the drawings while it shows. Hide it or untick Clip the View for all ${total}.`;
        Elements.Count.textContent  =  text;
    }
    // ------------------------------------------------------------


    // FUNCTION | Light the Face Whose View Is Open ('' for none)
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__ClipBoxPanel__SetActiveFace(key) {
        for (const faceKey of DistoImageMapper__Env3d__ClipBox__FaceKeys) {
            if (FaceRows[faceKey]) FaceRows[faceKey].Row.classList.toggle('is-active', faceKey === key);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Light Square to Points While It Waits for Two Clicks
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__ClipBoxPanel__SetSquaring(isOn) {
        if (Elements) Elements.Square.classList.toggle('is-active', isOn);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
