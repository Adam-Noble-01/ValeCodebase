/* =============================================================================
   DISTO IMAGE MAPPER - 3D ENVIRONMENT | ALIGNMENT SHEETS
   =============================================================================

   FILE       : DistoImageMapper__Env3d__AlignmentSheets__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Env3d - AlignmentSheets
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Puts the plan and the elevation on their planes in 3D space
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - The plan (2DG) lies flat below the model. The elevation (2DW) stands behind it.
     Together they make the corner of a glass box, with the survey in the middle
     and each point projecting straight out onto both drawings.
   - Each sheet is a sheet of paper: a canvas texture with a metre grid, a title, the
     point numbers and the tripod's position. The DXF's own lines sit on it as
     real geometry, so they stay sharp however far you zoom.
   - The lines and points drawn come from the 2D CAD file, not from the 3D points.
     If a file disagrees with the others, the drop lines visibly lean.

   ============================================================================= */

import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

import { DistoImageMapper__Config__Section } from '../01__AppCore/DistoImageMapper__AppCore__Config__.mjs';
import { DistoImageMapper__Format__Fixed } from '../01__AppCore/DistoImageMapper__AppCore__Format__.mjs';
import {
    DistoImageMapper__Coords__AxisToWorld,
    DistoImageMapper__Coords__MmToWorld,
    DistoImageMapper__Coords__ModelToWorld,
    DistoImageMapper__Coords__SheetPlaneMm,
    DistoImageMapper__Coords__SheetToModel
} from './DistoImageMapper__Env3d__Coordinates__.mjs';
import {
    DistoImageMapper__Env3d__SceneManager__Invalidate,
    DistoImageMapper__Env3d__SceneManager__Renderer,
    DistoImageMapper__Env3d__SceneManager__Scene
} from './DistoImageMapper__Env3d__SceneManager__.mjs';

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Sheet Titles and Fonts
    // ------------------------------------------------------------
    const SHEET_TITLES   =  { Plan : 'PLAN', Elevation : 'ELEVATION' };
    const FONT_FAMILY    =  '"Open Sans", sans-serif';
    const LABEL_NEIGHBOURS = [[1, 1], [0, 1.25], [1, 0], [-1, 1], [1, -1], [-1, 0], [0, -1.25], [-1, -1]];   // <-- Tried in order round a point
    // ------------------------------------------------------------


    // MODULE VARIABLES | Built Sheets
    // ------------------------------------------------------------
    const Sheets  =  { Plan : null, Elevation : null };
    let   Survey  =  null;
    let   KeptMask  =  null;                                                 // <-- Per point: false when the clipping box leaves it out
    let   ViewClip  =  null;                                                 // <-- The clipping box's planes (ClipBox__ViewClip), or null
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing the Paper
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Metre Grid and Its Labels
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__AlignmentSheets__DrawGrid(context, frame, config, colours) {
        const { UMin, UMax, VMin, VMax, Scale, WidthPx, HeightPx }  =  frame;
        const toX  =  value => (value - UMin) * Scale;
        const toY  =  value => (VMax - value) * Scale;

        const drawLines  =  (stepMm, style, lineWidth) => {
            context.strokeStyle  =  style;
            context.lineWidth    =  lineWidth;
            context.beginPath();
            for (let u = Math.ceil(UMin / stepMm) * stepMm; u <= UMax; u += stepMm) {
                context.moveTo(toX(u), 0);
                context.lineTo(toX(u), HeightPx);
            }
            for (let v = Math.ceil(VMin / stepMm) * stepMm; v <= VMax; v += stepMm) {
                context.moveTo(0, toY(v));
                context.lineTo(WidthPx, toY(v));
            }
            context.stroke();
        };

        const hairline  =  Math.max(WidthPx, HeightPx) / 2000;               // <-- Fine at full size, and still there seen from across the model
        drawLines(config.GridMinorMm, 'rgba(23, 43, 58, 0.11)', hairline);
        drawLines(config.GridMajorMm, 'rgba(23, 43, 58, 0.28)', hairline * 1.7);

        const fontPx  =  Math.max(config.PointLabelHeightMm * 0.72 * Scale, 9);
        context.font          =  `400 ${fontPx}px ${FONT_FAMILY}`;
        context.fillStyle     =  'rgba(23, 43, 58, 0.62)';
        context.textBaseline  =  'bottom';
        context.textAlign     =  'center';

        for (let u = Math.ceil(UMin / config.GridMajorMm) * config.GridMajorMm; u <= UMax; u += config.GridMajorMm) {
            context.fillText(`${DistoImageMapper__Format__Fixed(u / 1000, 0)} m`, toX(u), HeightPx - fontPx * 0.35);
        }

        context.textAlign     =  'left';
        context.textBaseline  =  'middle';
        for (let v = Math.ceil(VMin / config.GridMajorMm) * config.GridMajorMm; v <= VMax; v += config.GridMajorMm) {
            context.fillText(`${DistoImageMapper__Format__Fixed(v / 1000, 0)} m`, fontPx * 0.45, toY(v));
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Sheet's Title
    // ------------------------------------------------------------
    // Bottom right, where a drawing's title block goes. Photos lift upward off their
    // points, so the bottom of a sheet is also the part they leave clear.
    function DistoImageMapper__Env3d__AlignmentSheets__DrawTitle(context, frame, sheet, config, colours) {
        const { Scale, WidthPx, HeightPx }  =  frame;
        const margin    =  Math.max(WidthPx * 0.014, 12);
        const titlePx   =  Math.max(config.TitleHeightMm * Scale, 16);
        const detailPx  =  Math.max(titlePx * 0.36, 10);
        const baseline  =  HeightPx - margin - Math.max(config.PointLabelHeightMm * Scale, 9) * 0.9;

        const axes  =  `${sheet.Fit.USign < 0 ? '-' : ''}${sheet.Fit.UAxis} and ${sheet.Fit.VSign < 0 ? '-' : ''}${sheet.Fit.VAxis}`;
        const file  =  sheet.FileName || 'Drawn from the 3D points';

        context.textAlign     =  'right';
        context.textBaseline  =  'alphabetic';

        context.font       =  `400 ${detailPx}px ${FONT_FAMILY}`;
        context.fillStyle  =  'rgba(23, 43, 58, 0.72)';
        context.fillText(`${file}  |  ${axes}`, WidthPx - margin, baseline);

        context.font       =  `600 ${titlePx}px ${FONT_FAMILY}`;
        context.fillStyle  =  colours.Ink;
        context.fillText(SHEET_TITLES[sheet.Key], WidthPx - margin, baseline - detailPx * 1.35);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Point Numbers, Each in the First Clear Spot Round Its Point
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__AlignmentSheets__DrawPointNumbers(context, frame, sheet, points, config, colours) {
        const { UMin, VMax, Scale }  =  frame;
        const fontPx   =  Math.max(config.PointLabelHeightMm * Scale, 9);
        const reach    =  fontPx * 1.05;
        const placed   =  [];
        const fit      =  sheet.Fit;

        const screenPoints  =  sheet.Coordinates.map((coordinate, index) => {
            if (!coordinate || (KeptMask && KeptMask[index] === false)) return null;
            const model  =  DistoImageMapper__Coords__SheetToModel(fit, coordinate.U, coordinate.V, 0);
            return { X : (model[fit.UAxis] - UMin) * Scale, Y : (VMax - model[fit.VAxis]) * Scale };
        });

        context.font          =  `600 ${fontPx}px ${FONT_FAMILY}`;
        context.textAlign     =  'center';
        context.textBaseline  =  'middle';

        const overlaps  =  (a, b) => a.X0 < b.X1 && a.X1 > b.X0 && a.Y0 < b.Y1 && a.Y1 > b.Y0;
        const dotRadius =  fontPx * 0.35;
        const dotRects  =  screenPoints.filter(Boolean).map(p => ({ X0 : p.X - dotRadius, X1 : p.X + dotRadius, Y0 : p.Y - dotRadius, Y1 : p.Y + dotRadius }));

        screenPoints.forEach((screenPoint, index) => {
            if (!screenPoint) return;

            const text       =  String(points[index].Number);
            const halfWidth  =  context.measureText(text).width / 2 + fontPx * 0.12;
            const halfHeight =  fontPx * 0.56;
            let chosen       =  null;

            for (const ring of [1, 1.7, 2.6]) {                              // <-- Further out when a cluster fills the near spots
                for (const [dx, dy] of LABEL_NEIGHBOURS) {
                    const x     =  screenPoint.X + dx * (reach * ring + halfWidth * Math.abs(dx));
                    const y     =  screenPoint.Y - dy * (reach * ring);
                    const rect  =  { X0 : x - halfWidth, X1 : x + halfWidth, Y0 : y - halfHeight, Y1 : y + halfHeight };
                    if (!placed.some(other => overlaps(rect, other)) && !dotRects.some(other => overlaps(rect, other))) {
                        chosen  =  { X : x, Y : y, Rect : rect, Ring : ring };
                        break;
                    }
                }
                if (chosen) break;
            }

            if (!chosen) {
                const x  =  screenPoint.X + reach;
                const y  =  screenPoint.Y - reach;
                chosen   =  { X : x, Y : y, Rect : { X0 : x - halfWidth, X1 : x + halfWidth, Y0 : y - halfHeight, Y1 : y + halfHeight }, Ring : 1 };
            }

            placed.push(chosen.Rect);

            if (chosen.Ring > 1) {                                           // <-- A label pushed out gets a short tick back to its point
                context.strokeStyle  =  'rgba(23, 43, 58, 0.4)';
                context.lineWidth    =  Math.max(fontPx * 0.05, 1);
                context.beginPath();
                context.moveTo(screenPoint.X, screenPoint.Y);
                context.lineTo(chosen.X, chosen.Y);
                context.stroke();
            }

            context.fillStyle  =  '#ffffff';
            context.fillRect(chosen.Rect.X0, chosen.Rect.Y0, chosen.Rect.X1 - chosen.Rect.X0, chosen.Rect.Y1 - chosen.Rect.Y0);
            context.fillStyle  =  colours.Ink;
            context.fillText(text, chosen.X, chosen.Y);
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Where the Tripod Stood
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__AlignmentSheets__DrawTripod(context, frame, sheet, station, config, colours) {
        if (!station) return;

        const { UMin, VMax, Scale }  =  frame;
        const fit     =  sheet.Fit;
        const x       =  (station.PositionMm[fit.UAxis] - UMin) * Scale;
        const y       =  (VMax - station.PositionMm[fit.VAxis]) * Scale;
        const fontPx  =  Math.max(config.PointLabelHeightMm * 0.9 * Scale, 9);
        const size    =  fontPx * 0.72;

        context.fillStyle  =  colours.SightLine;
        context.beginPath();
        context.moveTo(x, y - size);
        context.lineTo(x + size * 0.9, y + size * 0.62);
        context.lineTo(x - size * 0.9, y + size * 0.62);
        context.closePath();
        context.fill();

        context.font          =  `600 ${fontPx}px ${FONT_FAMILY}`;
        context.textAlign     =  'center';
        context.textBaseline  =  'top';
        context.fillText('Tripod', x, y + size * 0.85);
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw One Sheet's Paper to a Canvas Texture
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__AlignmentSheets__PaperTexture(frame, sheet) {
        const config   =  DistoImageMapper__Config__Section('Sheets');
        const colours  =  DistoImageMapper__Config__Section('Colours');
        const canvas   =  document.createElement('canvas');
        canvas.width   =  frame.WidthPx;
        canvas.height  =  frame.HeightPx;

        const context  =  canvas.getContext('2d');
        context.fillStyle  =  '#ffffff';
        context.fillRect(0, 0, frame.WidthPx, frame.HeightPx);

        DistoImageMapper__Env3d__AlignmentSheets__DrawGrid(context, frame, config, colours);
        DistoImageMapper__Env3d__AlignmentSheets__DrawTitle(context, frame, sheet, config, colours);
        DistoImageMapper__Env3d__AlignmentSheets__DrawTripod(context, frame, sheet, Survey.Station, config, colours);
        DistoImageMapper__Env3d__AlignmentSheets__DrawPointNumbers(context, frame, sheet, Survey.Points, config, colours);

        const texture  =  new THREE.CanvasTexture(canvas);
        texture.colorSpace       =  THREE.SRGBColorSpace;
        texture.anisotropy       =  DistoImageMapper__Env3d__SceneManager__Renderer().capabilities.getMaxAnisotropy();
        texture.generateMipmaps  =  true;
        texture.minFilter        =  THREE.LinearMipmapLinearFilter;
        return texture;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building a Sheet
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Round Dot Texture for Markers
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__AlignmentSheets__DotTexture() {
        const size    =  64;
        const canvas  =  document.createElement('canvas');
        canvas.width  =  canvas.height = size;

        const context  =  canvas.getContext('2d');
        context.fillStyle  =  '#ffffff';
        context.beginPath();
        context.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
        context.fill();

        const texture  =  new THREE.CanvasTexture(canvas);
        texture.colorSpace  =  THREE.SRGBColorSpace;
        return texture;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Sheet's Extent and Texture Scale
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__AlignmentSheets__Frame(fit, config) {
        const bounds   =  Survey.ContentBoundsMm;
        const outward  =  (value, direction) => (direction < 0
            ? Math.floor((value - config.PaddingMm) / config.SnapMm) * config.SnapMm
            : Math.ceil((value + config.PaddingMm) / config.SnapMm) * config.SnapMm);

        const uMin  =  outward(bounds.Min[fit.UAxis], -1);
        const uMax  =  outward(bounds.Max[fit.UAxis], 1);
        const vMin  =  outward(bounds.Min[fit.VAxis], -1);
        const vMax  =  outward(bounds.Max[fit.VAxis], 1);

        const textureLimit  =  Math.min(config.TextureMaximumPx, DistoImageMapper__Env3d__SceneManager__Renderer().capabilities.maxTextureSize);
        const scale         =  textureLimit / Math.max(uMax - uMin, vMax - vMin);

        return {
            UMin : uMin, UMax : uMax, VMin : vMin, VMax : vMax, Scale : scale,
            WidthPx  :  Math.max(Math.round((uMax - uMin) * scale), 2),
            HeightPx :  Math.max(Math.round((vMax - vMin) * scale), 2)
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Paper as a Mesh
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__AlignmentSheets__PaperMesh(frame, fit, texture, opacity) {
        const cornerWorld  =  (u, v) => {
            const positionMm  =  { X : 0, Y : 0, Z : 0 };
            positionMm[fit.UAxis]  =  u;
            positionMm[fit.VAxis]  =  v;
            return DistoImageMapper__Coords__ModelToWorld(positionMm);
        };

        const corners  =  [
            cornerWorld(frame.UMin, frame.VMin), cornerWorld(frame.UMax, frame.VMin),
            cornerWorld(frame.UMax, frame.VMax), cornerWorld(frame.UMin, frame.VMax)
        ];

        const geometry  =  new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners.flatMap(corner => corner.toArray()), 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
        geometry.setIndex([0, 1, 2, 0, 2, 3]);

        const material  =  new THREE.MeshBasicMaterial({
            map : texture, side : THREE.DoubleSide, transparent : true, opacity : opacity,
            depthWrite : false, toneMapped : false,
            polygonOffset : true, polygonOffsetFactor : 1, polygonOffsetUnits : 1
        });

        return new THREE.Mesh(geometry, material);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Sheet's Edge, One Width on Screen at Any Distance
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__AlignmentSheets__EdgeLines(frame, fit, config, colours, lift) {
        const cornerWorld  =  (u, v) => {
            const positionMm  =  { X : 0, Y : 0, Z : 0 };
            positionMm[fit.UAxis]  =  u;
            positionMm[fit.VAxis]  =  v;
            return DistoImageMapper__Coords__ModelToWorld(positionMm).add(lift).toArray();
        };

        const a  =  cornerWorld(frame.UMin, frame.VMin);
        const b  =  cornerWorld(frame.UMax, frame.VMin);
        const c  =  cornerWorld(frame.UMax, frame.VMax);
        const d  =  cornerWorld(frame.UMin, frame.VMax);

        const geometry  =  new LineSegmentsGeometry();
        geometry.setPositions([...a, ...b, ...b, ...c, ...c, ...d, ...d, ...a]);
        return new LineSegments2(geometry, new LineMaterial({ color : colours.Ink, linewidth : config.EdgeWidthPx, worldUnits : false }));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The DXF's Own Lines and Points
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__AlignmentSheets__Linework(sheet, config, colours, lift, dotTexture) {
        const fit       =  sheet.Fit;
        const toWorld   =  (u, v) => DistoImageMapper__Coords__ModelToWorld(DistoImageMapper__Coords__SheetToModel(fit, u, v, 0)).add(lift);
        const flat      =  [];

        for (const segment of sheet.Segments) {
            flat.push(...toWorld(segment[0], segment[1]).toArray(), ...toWorld(segment[2], segment[3]).toArray());
        }

        const group  =  new THREE.Group();

        if (flat.length) {
            const geometry  =  new LineSegmentsGeometry();
            geometry.setPositions(flat);
            const material  =  new LineMaterial({ color : colours.Ink, linewidth : config.LineWidthPx, worldUnits : false });
            const lines     =  new LineSegments2(geometry, material);
            lines.renderOrder  =  1;
            group.add(lines);
        }

        const markerPositions  =  sheet.Coordinates.filter((coordinate, index) => coordinate && (!KeptMask || KeptMask[index] !== false)).flatMap(coordinate => toWorld(coordinate.U, coordinate.V).toArray());
        const markerGeometry   =  new THREE.BufferGeometry();
        markerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(markerPositions, 3));

        const markers  =  new THREE.Points(markerGeometry, new THREE.PointsMaterial({
            color : colours.Ink, size : config.MarkerPx, sizeAttenuation : false, map : dotTexture,
            transparent : true, alphaTest : 0.4, depthWrite : false, toneMapped : false
        }));
        markers.renderOrder  =  2;
        group.add(markers);

        return group;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build One Sheet
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__AlignmentSheets__BuildSheet(sheet) {
        const config   =  DistoImageMapper__Config__Section('Sheets');
        const colours  =  DistoImageMapper__Config__Section('Colours');
        const fit      =  sheet.Fit;

        const frame    =  DistoImageMapper__Env3d__AlignmentSheets__Frame(fit, config);
        const texture  =  DistoImageMapper__Env3d__AlignmentSheets__PaperTexture(frame, sheet);
        const normal   =  DistoImageMapper__Coords__AxisToWorld(fit.NormalAxis);
        const lift     =  normal.clone().multiplyScalar(fit.ViewerSign * DistoImageMapper__Coords__MmToWorld(config.LineLiftMm));  // <-- Linework sits just off the paper, toward its reader
        const dots     =  DistoImageMapper__Env3d__AlignmentSheets__DotTexture();

        const group    =  new THREE.Group();
        group.name     =  `Sheet ${sheet.Key}`;
        group.add(DistoImageMapper__Env3d__AlignmentSheets__PaperMesh(frame, fit, texture, config.PaperOpacity));
        group.add(DistoImageMapper__Env3d__AlignmentSheets__EdgeLines(frame, fit, config, colours, lift));
        group.add(DistoImageMapper__Env3d__AlignmentSheets__Linework(sheet, config, colours, lift, dots));

        DistoImageMapper__Env3d__SceneManager__Scene().add(group);

        return { Data : sheet, Frame : frame, Group : group, Normal : normal, PlaneMm : 0, Disposables : [texture, dots] };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Interface
// -----------------------------------------------------------------------------

    // FUNCTION | Build Both Sheets for a Survey
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__AlignmentSheets__Build(survey) {
        DistoImageMapper__Env3d__AlignmentSheets__Dispose();
        Survey    =  survey;
        KeptMask  =  null;

        Sheets.Plan       =  DistoImageMapper__Env3d__AlignmentSheets__BuildSheet(survey.Sheets.Plan);
        Sheets.Elevation  =  DistoImageMapper__Env3d__AlignmentSheets__BuildSheet(survey.Sheets.Elevation);
    }
    // ------------------------------------------------------------


    // FUNCTION | Move the Sheets Away From or Toward the Model
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__AlignmentSheets__SetOffsets(planOffsetMm, elevationOffsetMm) {
        for (const [key, offsetMm] of [['Plan', planOffsetMm], ['Elevation', elevationOffsetMm]]) {
            const sheet  =  Sheets[key];
            if (!sheet) continue;
            sheet.PlaneMm  =  DistoImageMapper__Coords__SheetPlaneMm(sheet.Data.Fit, Survey.ContentBoundsMm, offsetMm);
            sheet.Group.position.copy(sheet.Normal).multiplyScalar(DistoImageMapper__Coords__MmToWorld(sheet.PlaneMm));
        }
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | Keep Only What the Clipping Box Keeps: the Sheets Drawn Again Where They Stand
    // ------------------------------------------------------------
    // The paper is a canvas up to 4096 px, so this runs when a drag settles, not
    // while it moves.
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__AlignmentSheets__SetKept(mask) {
        const before  =  KeptMask || [];
        const after   =  mask || [];
        const length  =  Math.max(before.length, after.length);
        let changed   =  false;
        for (let i = 0; i < length; i++) {
            if ((before[i] !== false) !== (after[i] !== false)) { changed  =  true; break; }
        }
        KeptMask  =  mask ? mask.slice() : null;
        if (!changed || !Survey) return;

        for (const key of ['Plan', 'Elevation']) {
            const old  =  Sheets[key];
            if (!old) continue;
            const isVisible  =  old.Group.visible;
            const planeMm    =  old.PlaneMm;
            old.Group.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            });
            old.Disposables.forEach(item => item.dispose());
            old.Group.removeFromParent();
            const sheet  =  DistoImageMapper__Env3d__AlignmentSheets__BuildSheet(Survey.Sheets[key]);
            sheet.PlaneMm  =  planeMm;
            sheet.Group.position.copy(sheet.Normal).multiplyScalar(DistoImageMapper__Coords__MmToWorld(planeMm));
            sheet.Group.visible  =  isVisible;
            Sheets[key]  =  sheet;
        }
        DistoImageMapper__Env3d__AlignmentSheets__SetClip(ViewClip);       // <-- A redrawn sheet is cut as the one before it was
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | Cut Each Sheet to the Clipping Box as That Sheet Sees It (null: whole)
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__AlignmentSheets__SetClip(clip) {
        ViewClip  =  clip;
        for (const key of ['Plan', 'Elevation']) {
            const sheet  =  Sheets[key];
            if (!sheet) continue;
            const planes  =  clip ? clip.ForSheet(sheet.Data.Fit.NormalAxis) : null;
            sheet.Group.traverse(object => {
                const materials  =  Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
                for (const material of materials) {
                    material.clippingPlanes    =  planes;
                    material.clipIntersection  =  Boolean(clip && clip.Intersection);
                }
            });
        }
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | Show or Hide a Sheet
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__AlignmentSheets__SetVisible(sheetKey, isVisible) {
        if (Sheets[sheetKey]) Sheets[sheetKey].Group.visible  =  isVisible;
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // FUNCTION | A Survey Point's Place on a Sheet, From That Sheet's Own File
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__AlignmentSheets__PointWorld(sheetKey, pointIndex) {
        const sheet       =  Sheets[sheetKey];
        const coordinate  =  sheet && sheet.Data.Coordinates[pointIndex];
        if (!coordinate) return null;
        return DistoImageMapper__Coords__ModelToWorld(
            DistoImageMapper__Coords__SheetToModel(sheet.Data.Fit, coordinate.U, coordinate.V, sheet.PlaneMm)
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | A Sheet's Extent in World Space
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__AlignmentSheets__Box(sheetKey) {
        const sheet  =  Sheets[sheetKey];
        const fit    =  sheet.Data.Fit;
        const frame  =  sheet.Frame;
        const box    =  new THREE.Box3();

        for (const [u, v] of [[frame.UMin, frame.VMin], [frame.UMax, frame.VMax]]) {
            const positionMm  =  { X : 0, Y : 0, Z : 0 };
            positionMm[fit.UAxis]       =  u;
            positionMm[fit.VAxis]       =  v;
            positionMm[fit.NormalAxis]  =  sheet.PlaneMm;
            box.expandByPoint(DistoImageMapper__Coords__ModelToWorld(positionMm));
        }
        return box;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove the Sheets and Free Their Memory
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__AlignmentSheets__Dispose() {
        for (const key of ['Plan', 'Elevation']) {
            const sheet  =  Sheets[key];
            if (!sheet) continue;

            sheet.Group.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            });
            sheet.Disposables.forEach(item => item.dispose());
            sheet.Group.removeFromParent();
            Sheets[key]  =  null;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
