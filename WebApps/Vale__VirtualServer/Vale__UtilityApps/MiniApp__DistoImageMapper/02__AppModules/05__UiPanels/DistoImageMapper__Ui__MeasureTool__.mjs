/* =============================================================================
   DISTO IMAGE MAPPER - UI PANELS | MEASURE TOOL
   =============================================================================

   FILE       : DistoImageMapper__Ui__MeasureTool__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Ui - MeasureTool
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Point to point distance between any two shots
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - With Measure on, clicking two photos (in the model or the filmstrip) draws the
     line between their points and reads the true distance, the run on plan and the
     rise. Numbers come from the survey's millimetres, never from the screen.
   - A third click starts a new measurement. The line is never saved.

   ============================================================================= */

import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

import { DistoImageMapper__Config__Section } from '../01__AppCore/DistoImageMapper__AppCore__Config__.mjs';
import { DistoImageMapper__Format__Length } from '../01__AppCore/DistoImageMapper__AppCore__Format__.mjs';
import { DistoImageMapper__Coords__ModelToWorld } from '../04__Env3d/DistoImageMapper__Env3d__Coordinates__.mjs';
import { DistoImageMapper__Env3d__CameraRig__ActiveCamera } from '../04__Env3d/DistoImageMapper__Env3d__CameraRig__.mjs';
import {
    DistoImageMapper__Env3d__SceneManager__AddFrameTask,
    DistoImageMapper__Env3d__SceneManager__Canvas,
    DistoImageMapper__Env3d__SceneManager__Invalidate,
    DistoImageMapper__Env3d__SceneManager__Scene
} from '../04__Env3d/DistoImageMapper__Env3d__SceneManager__.mjs';

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Drawing
    // ------------------------------------------------------------
    const LINE_WIDTH_PX  =  3;
    const ORDER_LINE     =  960;                                             // <-- Above the leaders and photos it joins
    // ------------------------------------------------------------


    // MODULE VARIABLES | Elements and Current Measurement
    // ------------------------------------------------------------
    let Survey       =  null;
    let Label        =  null;
    let Hint         =  null;
    let Line         =  null;
    let IsActiveNow  =  false;
    let FirstIndex   =  -1;
    let Midpoint     =  null;
    const Projected  =  new THREE.Vector3();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Remove the Line and Its Label
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__MeasureTool__ClearLine() {
        Midpoint      =  null;
        Label.hidden  =  true;
        if (Line) {
            Line.geometry.dispose();
            Line.material.dispose();
            Line.removeFromParent();
            Line  =  null;
        }
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw the Line Between Two Points
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__MeasureTool__DrawLine(a, b) {
        const start  =  DistoImageMapper__Coords__ModelToWorld(a.PositionMm);
        const end    =  DistoImageMapper__Coords__ModelToWorld(b.PositionMm);

        const geometry  =  new LineSegmentsGeometry();
        geometry.setPositions([...start.toArray(), ...end.toArray()]);

        Line  =  new LineSegments2(geometry, new LineMaterial({
            color : DistoImageMapper__Config__Section('Colours').Measure, linewidth : LINE_WIDTH_PX, worldUnits : false,
            depthTest : false, depthWrite : false, transparent : true
        }));
        Line.renderOrder    =  ORDER_LINE;
        Line.frustumCulled  =  false;
        DistoImageMapper__Env3d__SceneManager__Scene().add(Line);

        Midpoint  =  start.clone().lerp(end, 0.5);

        const dx    =  a.PositionMm.X - b.PositionMm.X;
        const dy    =  a.PositionMm.Y - b.PositionMm.Y;
        const dz    =  a.PositionMm.Z - b.PositionMm.Z;

        Label.replaceChildren();
        const heading  =  document.createElement('strong');
        heading.textContent  =  `${a.Number} to ${b.Number}: ${DistoImageMapper__Format__Length(Math.hypot(dx, dy, dz))}`;
        const detail   =  document.createElement('span');
        detail.textContent   =  `On plan ${DistoImageMapper__Format__Length(Math.hypot(dx, dy))}, rise ${DistoImageMapper__Format__Length(Math.abs(dz))}`;
        Label.append(heading, detail);
        Label.hidden  =  false;

        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Each Frame: Keep the Label on the Line
    // ------------------------------------------------------------
    function DistoImageMapper__Ui__MeasureTool__FrameTask() {
        if (!Midpoint) return false;

        const canvas  =  DistoImageMapper__Env3d__SceneManager__Canvas();
        Projected.copy(Midpoint).project(DistoImageMapper__Env3d__CameraRig__ActiveCamera());

        const isInFront  =  Projected.z < 1;
        Label.style.opacity    =  isInFront ? '1' : '0';
        Label.style.transform  =  `translate(-50%, -50%) translate(${(Projected.x + 1) / 2 * canvas.clientWidth}px, ${(1 - Projected.y) / 2 * canvas.clientHeight}px)`;
        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Interface
// -----------------------------------------------------------------------------

    // FUNCTION | Wire the Tool to the Draw Loop (Once)
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__MeasureTool__Mount(labelElement, hintElement) {
        Label  =  labelElement;
        Hint   =  hintElement;
        DistoImageMapper__Env3d__SceneManager__AddFrameTask(DistoImageMapper__Ui__MeasureTool__FrameTask);
    }
    // ------------------------------------------------------------


    // FUNCTION | Prepare for a Survey
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__MeasureTool__Reset(survey) {
        Survey  =  survey;
        DistoImageMapper__Ui__MeasureTool__SetActive(false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch Measuring On or Off
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__MeasureTool__SetActive(isActive) {
        IsActiveNow  =  isActive;
        FirstIndex   =  -1;
        DistoImageMapper__Ui__MeasureTool__ClearLine();

        Hint.hidden       =  !isActive;
        Hint.textContent  =  'Click the first photo';
    }
    // ------------------------------------------------------------


    // FUNCTION | Is Measuring On
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__MeasureTool__IsActive() {
        return IsActiveNow;
    }
    // ------------------------------------------------------------


    // FUNCTION | Take a Clicked Point as the Next End of the Line
    // ------------------------------------------------------------
    export function DistoImageMapper__Ui__MeasureTool__Pick(index) {
        if (FirstIndex < 0 || Midpoint) {                                    // <-- First click, or starting over after a finished line
            DistoImageMapper__Ui__MeasureTool__ClearLine();
            FirstIndex        =  index;
            Hint.textContent  =  `From point ${Survey.Points[index].Number}: click the second photo`;
            return;
        }

        if (index === FirstIndex) return;

        DistoImageMapper__Ui__MeasureTool__DrawLine(Survey.Points[FirstIndex], Survey.Points[index]);
        FirstIndex        =  index;
        Hint.textContent  =  'Click another photo to start again';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
