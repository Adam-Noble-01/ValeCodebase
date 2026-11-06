/* =============================================================================
   DISTO IMAGE MAPPER - 3D ENVIRONMENT | SURVEY LINES
   =============================================================================

   FILE       : DistoImageMapper__Env3d__SurveyLines__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Env3d - SurveyLines
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The survey line in 3D, the drop lines onto the sheets, the
                tripod and its sight lines, the axes, and the highlight
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - Survey line: from the 3D CAD file, drawn in orange.
   - Drop lines: each point straight onto the plan (along blue, model Z) and straight
     onto the elevation (along green, model Y). They end where the 2D CAD file says
     the point is, so if a file disagrees the line leans and you can see it.
   - Highlight: the focused point's three places, with solid lines between them, so
     one photo can be followed from the model to both drawings at a glance.

   ============================================================================= */

import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

import { DistoImageMapper__Config__Section } from '../01__AppCore/DistoImageMapper__AppCore__Config__.mjs';
import { DistoImageMapper__Coords__AxisToWorld, DistoImageMapper__Coords__MmToWorld, DistoImageMapper__Coords__ModelToWorld } from './DistoImageMapper__Env3d__Coordinates__.mjs';
import { DistoImageMapper__Env3d__AlignmentSheets__PointWorld } from './DistoImageMapper__Env3d__AlignmentSheets__.mjs';
import { DistoImageMapper__Env3d__SceneManager__Invalidate, DistoImageMapper__Env3d__SceneManager__Scene } from './DistoImageMapper__Env3d__SceneManager__.mjs';

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Built Objects
    // ------------------------------------------------------------
    let Survey         =  null;
    let Root           =  null;
    let ChainGroup     =  null;
    let MarkersObject  =  null;
    let ProjectorPlan  =  null;
    let ProjectorElev  =  null;
    let SightGroup     =  null;
    let AxesGroup      =  null;
    let Highlight      =  null;
    let Textures       =  [];
    let KeptMask       =  null;                                              // <-- Per point: false when the clipping box leaves it out
    let KeepTest       =  null;                                              // <-- (positionMm) => kept, for the survey line's own ends
    let ViewClip       =  null;                                              // <-- The clipping box's planes (ClipBox__ViewClip), or null
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Canvas Texture Holding a Marker Shape
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__SurveyLines__MarkerTexture(drawShape) {
        const size    =  128;
        const canvas  =  document.createElement('canvas');
        canvas.width  =  canvas.height = size;
        drawShape(canvas.getContext('2d'), size);

        const texture  =  new THREE.CanvasTexture(canvas);
        texture.colorSpace  =  THREE.SRGBColorSpace;
        Textures.push(texture);
        return texture;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Dot With a White Edge
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__SurveyLines__DotTexture(inkHex) {
        return DistoImageMapper__Env3d__SurveyLines__MarkerTexture((context, size) => {
            context.fillStyle  =  '#ffffff';
            context.beginPath();
            context.arc(size / 2, size / 2, size / 2 - 3, 0, Math.PI * 2);
            context.fill();
            context.fillStyle  =  inkHex;
            context.beginPath();
            context.arc(size / 2, size / 2, size / 2 - 18, 0, Math.PI * 2);
            context.fill();
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Ring With a White Edge
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__SurveyLines__RingTexture(inkHex) {
        return DistoImageMapper__Env3d__SurveyLines__MarkerTexture((context, size) => {
            context.lineWidth    =  20;
            context.strokeStyle  =  '#ffffff';
            context.beginPath();
            context.arc(size / 2, size / 2, size / 2 - 14, 0, Math.PI * 2);
            context.stroke();
            context.lineWidth    =  11;
            context.strokeStyle  =  inkHex;
            context.stroke();
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Screen-Width Lines
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__SurveyLines__FatLines(flatPositions, colour, widthPx, options = {}) {
        const geometry  =  new LineSegmentsGeometry();
        geometry.setPositions(flatPositions);
        return new LineSegments2(geometry, new LineMaterial({ color : colour, linewidth : widthPx, worldUnits : false, ...options }));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Markers That Keep One Size on Screen
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__SurveyLines__Markers(flatPositions, texture, sizePx, renderOrder) {
        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(flatPositions, 3));

        const markers  =  new THREE.Points(geometry, new THREE.PointsMaterial({
            size : sizePx, sizeAttenuation : false, map : texture, transparent : true, alphaTest : 0.05,
            depthTest : false, depthWrite : false, toneMapped : false
        }));
        markers.renderOrder    =  renderOrder;
        markers.frustumCulled  =  false;
        return markers;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Dashed Lines
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__SurveyLines__DashedLines(colour, config) {
        const lines  =  new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({
            color : colour, transparent : true, opacity : config.ProjectorOpacity, depthWrite : false, toneMapped : false,
            dashSize : DistoImageMapper__Coords__MmToWorld(config.ProjectorDashMm),
            gapSize  : DistoImageMapper__Coords__MmToWorld(config.ProjectorGapMm)
        }));
        lines.renderOrder    =  3;
        lines.frustumCulled  =  false;
        return lines;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building the Survey's Lines
// -----------------------------------------------------------------------------

    // SUB FUNCTION | The Survey Line and Its Points
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__SurveyLines__BuildChain(config, colours) {
        ChainGroup  =  new THREE.Group();
        ChainGroup.name  =  'Survey Line';

        const keeps  =  (x, y, z) => !KeepTest || KeepTest({ X : x, Y : y, Z : z });
        const flat  =  Survey.Chain.filter(segment => keeps(segment[0], segment[1], segment[2]) && keeps(segment[3], segment[4], segment[5])).flatMap(segment => [
            ...DistoImageMapper__Coords__ModelToWorld({ X : segment[0], Y : segment[1], Z : segment[2] }).toArray(),
            ...DistoImageMapper__Coords__ModelToWorld({ X : segment[3], Y : segment[4], Z : segment[5] }).toArray()
        ]);

        if (flat.length) ChainGroup.add(DistoImageMapper__Env3d__SurveyLines__FatLines(flat, colours.Chain, config.ChainWidthPx));

        MarkersObject  =  DistoImageMapper__Env3d__SurveyLines__Markers(
            Survey.Points.filter((point, index) => !KeptMask || KeptMask[index] !== false).flatMap(point => DistoImageMapper__Coords__ModelToWorld(point.PositionMm).toArray()),
            DistoImageMapper__Env3d__SurveyLines__DotTexture(colours.Chain),
            config.MarkerPx,
            40
        );
        ChainGroup.add(MarkersObject);
        Root.add(ChainGroup);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Tripod and Its Sight Lines
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__SurveyLines__BuildSight(config, colours) {
        SightGroup  =  new THREE.Group();
        SightGroup.name  =  'Tripod and Sight Lines';
        if (!Survey.Station) { Root.add(SightGroup); return; }

        const station  =  DistoImageMapper__Coords__ModelToWorld(Survey.Station.PositionMm);
        const flat     =  Survey.Points.filter((point, index) => !KeptMask || KeptMask[index] !== false).flatMap(point => [
            ...station.toArray(), ...DistoImageMapper__Coords__ModelToWorld(point.PositionMm).toArray()
        ]);

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
        const sightLines  =  new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
            color : colours.SightLine, transparent : true, opacity : config.SightLineOpacity, depthWrite : false, toneMapped : false
        }));
        sightLines.renderOrder  =  3;
        SightGroup.add(sightLines);

        const body  =  new THREE.Mesh(
            new THREE.OctahedronGeometry(DistoImageMapper__Coords__MmToWorld(config.TripodMarkerMm)),
            new THREE.MeshBasicMaterial({ color : colours.SightLine, toneMapped : false })
        );
        body.position.copy(station);
        SightGroup.add(body);

        Root.add(SightGroup);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Model's Axes at the Origin
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__SurveyLines__BuildAxes(config, colours) {
        AxesGroup  =  new THREE.Group();
        AxesGroup.name  =  'Axes';
        const length  =  DistoImageMapper__Coords__MmToWorld(config.AxisLengthMm);

        for (const [axis, colour] of [['X', colours.AxisX], ['Y', colours.AxisY], ['Z', colours.AxisZ]]) {
            const tip  =  DistoImageMapper__Coords__AxisToWorld(axis).multiplyScalar(length);
            AxesGroup.add(DistoImageMapper__Env3d__SurveyLines__FatLines([0, 0, 0, tip.x, tip.y, tip.z], colour, config.AxisWidthPx));
        }
        Root.add(AxesGroup);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Highlight: Three Rings and Two Solid Lines
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__SurveyLines__BuildHighlight(config, colours) {
        const ringTexture  =  DistoImageMapper__Env3d__SurveyLines__RingTexture(colours.Highlight);
        const rings        =  DistoImageMapper__Env3d__SurveyLines__Markers(new Array(9).fill(0), ringTexture, config.HighlightRingPx, 45);

        const lineGeometry  =  new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Array(12).fill(0), 3));
        const lines  =  new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({
            color : colours.Highlight, depthTest : false, depthWrite : false, transparent : true, toneMapped : false
        }));
        lines.renderOrder    =  44;
        lines.frustumCulled  =  false;

        Highlight  =  new THREE.Group();
        Highlight.add(lines, rings);
        Highlight.visible   =  false;
        Highlight.userData  =  { Rings : rings, Lines : lines };
        Root.add(Highlight);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Interface
// -----------------------------------------------------------------------------

    // FUNCTION | Build Everything for a Survey
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SurveyLines__Build(survey) {
        DistoImageMapper__Env3d__SurveyLines__Dispose();
        Survey    =  survey;
        KeptMask  =  null;
        KeepTest  =  null;
        ViewClip  =  null;

        const config   =  DistoImageMapper__Config__Section('Lines');
        const colours  =  DistoImageMapper__Config__Section('Colours');

        Root  =  new THREE.Group();
        Root.name  =  'Survey Lines';
        DistoImageMapper__Env3d__SceneManager__Scene().add(Root);

        DistoImageMapper__Env3d__SurveyLines__BuildChain(config, colours);
        DistoImageMapper__Env3d__SurveyLines__BuildSight(config, colours);
        DistoImageMapper__Env3d__SurveyLines__BuildAxes(config, colours);

        ProjectorPlan  =  DistoImageMapper__Env3d__SurveyLines__DashedLines(colours.AxisZ, config);
        ProjectorElev  =  DistoImageMapper__Env3d__SurveyLines__DashedLines(colours.AxisY, config);
        ProjectorPlan.name  =  'Drop Lines to the Plan';
        ProjectorElev.name  =  'Drop Lines to the Elevation';
        Root.add(ProjectorPlan, ProjectorElev);

        DistoImageMapper__Env3d__SurveyLines__BuildHighlight(config, colours);
    }
    // ------------------------------------------------------------


    // FUNCTION | Redraw the Drop Lines After a Sheet Moves
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SurveyLines__UpdateProjectors() {
        if (!Survey) return;

        for (const [key, lines] of [['Plan', ProjectorPlan], ['Elevation', ProjectorElev]]) {
            const flat  =  [];
            Survey.Points.forEach((point, index) => {
                if (KeptMask && KeptMask[index] === false) return;
                const onSheet  =  DistoImageMapper__Env3d__AlignmentSheets__PointWorld(key, index);
                if (onSheet) flat.push(...DistoImageMapper__Coords__ModelToWorld(point.PositionMm).toArray(), ...onSheet.toArray());
            });

            lines.geometry.dispose();
            lines.geometry  =  new THREE.BufferGeometry();
            lines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
            lines.computeLineDistances();
        }
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | Keep Only What the Clipping Box Keeps: the Points by mask, the Line's Ends by keepTest
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SurveyLines__SetKept(mask, keepTest) {
        if (!Root) return;
        KeptMask  =  mask;
        KeepTest  =  keepTest;
        const config   =  DistoImageMapper__Config__Section('Lines');
        const colours  =  DistoImageMapper__Config__Section('Colours');
        for (const [group, build] of [[ChainGroup, DistoImageMapper__Env3d__SurveyLines__BuildChain], [SightGroup, DistoImageMapper__Env3d__SurveyLines__BuildSight]]) {
            const wasVisible  =  group.visible;
            group.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            });
            group.removeFromParent();
            build(config, colours);
            (build === DistoImageMapper__Env3d__SurveyLines__BuildChain ? ChainGroup : SightGroup).visible  =  wasVisible;
        }
        DistoImageMapper__Env3d__SurveyLines__UpdateProjectors();
        DistoImageMapper__Env3d__SurveyLines__SetClip(ViewClip);             // <-- Lines drawn again are cut as before
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Give Every Material in an Object These Planes (null: whole)
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__SurveyLines__Cut(object, planes, intersection) {
        if (!object) return;
        object.traverse(child => {
            const materials  =  Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
            for (const material of materials) {
                material.clippingPlanes    =  planes;
                material.clipIntersection  =  Boolean(planes && intersection);
            }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Cut the Lines and the Tripod to the Clipping Box (null: whole)
    // ------------------------------------------------------------
    // A section box (Adam's pick, 1.5.1: the tripod and its sight lines too). The
    // survey line, the sight lines, the tripod and the axes are cut by the box itself;
    // each sheet's drop lines as that sheet is cut, so a kept point's line still reaches
    // its place on the sheet. Points go whole, by the mask, in SetKept.
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SurveyLines__SetClip(clip) {
        ViewClip  =  clip;
        if (!Root) return;
        const box3d        =  clip ? clip.Box3d : null;
        const intersection =  Boolean(clip && clip.Intersection);
        const sheetPlanes  =  key => {
            if (!clip) return null;
            const sheet  =  Survey.Sheets && Survey.Sheets[key];
            return sheet && sheet.Fit && sheet.Fit.NormalAxis ? clip.ForSheet(sheet.Fit.NormalAxis) : box3d;
        };
        for (const group of [ChainGroup, SightGroup, AxesGroup]) DistoImageMapper__Env3d__SurveyLines__Cut(group, box3d, intersection);
        DistoImageMapper__Env3d__SurveyLines__Cut(ProjectorPlan, sheetPlanes('Plan'), intersection);
        DistoImageMapper__Env3d__SurveyLines__Cut(ProjectorElev, sheetPlanes('Elevation'), intersection);
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | Show or Hide One Layer
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SurveyLines__SetVisible(layerKey, isVisible) {
        if (!Root) return;

        if (layerKey === 'Chain3d') ChainGroup.visible  =  isVisible;
        if (layerKey === 'Sight')   SightGroup.visible  =  isVisible;
        if (layerKey === 'Axes')    AxesGroup.visible   =  isVisible;
        if (layerKey === 'ProjectorPlan')      ProjectorPlan.visible  =  isVisible;
        if (layerKey === 'ProjectorElevation') ProjectorElev.visible  =  isVisible;

        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | Highlight One Point's Three Places
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SurveyLines__SetHighlight(pointIndex, showPlan, showElevation) {
        if (!Highlight) return;

        const point  =  pointIndex >= 0 ? Survey.Points[pointIndex] : null;
        Highlight.visible  =  Boolean(point);

        if (point) {
            const model    =  DistoImageMapper__Coords__ModelToWorld(point.PositionMm);
            const onPlan   =  (showPlan && DistoImageMapper__Env3d__AlignmentSheets__PointWorld('Plan', pointIndex)) || model;
            const onElev   =  (showElevation && DistoImageMapper__Env3d__AlignmentSheets__PointWorld('Elevation', pointIndex)) || model;

            const rings  =  Highlight.userData.Rings.geometry.attributes.position;
            rings.setXYZ(0, model.x, model.y, model.z);
            rings.setXYZ(1, onPlan.x, onPlan.y, onPlan.z);
            rings.setXYZ(2, onElev.x, onElev.y, onElev.z);
            rings.needsUpdate  =  true;

            const lines  =  Highlight.userData.Lines.geometry.attributes.position;
            lines.setXYZ(0, model.x, model.y, model.z);
            lines.setXYZ(1, onPlan.x, onPlan.y, onPlan.z);
            lines.setXYZ(2, model.x, model.y, model.z);
            lines.setXYZ(3, onElev.x, onElev.y, onElev.z);
            lines.needsUpdate  =  true;
        }

        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove Everything and Free Its Memory
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__SurveyLines__Dispose() {
        if (!Root) return;

        Root.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
        });
        Textures.forEach(texture => texture.dispose());
        Textures  =  [];

        Root.removeFromParent();
        Root       =  null;
        Survey     =  null;
        Highlight  =  null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
