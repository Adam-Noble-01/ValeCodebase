/* =============================================================================
   DISTO IMAGE MAPPER - DATA INTAKE | SURVEY BUILDER
   =============================================================================

   FILE       : DistoImageMapper__Intake__SurveyBuilder__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Intake - SurveyBuilder
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Joins the three CAD files, the log and the photos into one survey
                and proves that they line up
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - The photo's file name is the key: the CSV gives it per row and the DXF's TEXT
     gives it per point. Positions come from the 3D CAD file, shot data from the log.
   - Each 2D CAD file is tested, not assumed. Its points are compared against the
     3D points on every pairing of axes and the best fit says how the sheet maps
     into 3D space. On the DISTO, 2DG is (X, Y) and 2DW is (X, Z), and the axis left
     over says which way each sheet faces.
   - The tripod's position is solved from the log's angles and distances. With
     the tripod located, a photo can be placed exactly as it was taken.
   - Everything found goes on the Checks list, in plain words, for the panel.

   ---------------------------------------------------------------------------

   THE TRIPOD SOLVE:
   Each shot in the DISTO's own frame is
       D sin(V) cos(Hz),  D sin(V) sin(Hz),  D cos(V)
   with Hz running clockwise seen from above (the surveyor's habit: the 21-Jul-2026
   survey fits clockwise to 0.00 mm and anticlockwise to 3689 mm, so both are tried
   and the data decides). A 2D rotation about the vertical plus a translation
   carries those onto the log's X, Y and Z by least squares. The translation is
   the tripod's position.

   ---------------------------------------------------------------------------

   WHICH WAY A SHEET FACES:
   A sheet drawn with U to the right and V up is read from the side U x V points
   to. The plan's X x Y points up, so it is read from above and belongs below the
   model. The elevation's X x Z points to -Y, so it is read from the -Y side and
   belongs behind the model at the +Y extreme. Then the model never hides its own
   drawing, and neither drawing reads mirrored.

   ============================================================================= */

import { DistoImageMapper__Config__Section } from '../01__AppCore/DistoImageMapper__AppCore__Config__.mjs';
import { DistoImageMapper__Format__Fixed, DistoImageMapper__Format__Length } from '../01__AppCore/DistoImageMapper__AppCore__Format__.mjs';
import { DistoImageMapper__Intake__DxfParser__Parse, DistoImageMapper__Intake__DxfParser__LabelledPoints } from './DistoImageMapper__Intake__DxfParser__.mjs';
import { DistoImageMapper__Intake__CsvParser__Parse } from './DistoImageMapper__Intake__CsvParser__.mjs';

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Axis Names and Default Sheet Mappings
    // ------------------------------------------------------------
    const AXES            =  ['X', 'Y', 'Z'];
    const SHEET_DEFAULTS  =  {
        Plan      :  { U : 'X', V : 'Y' },                                   // <-- Used when a CAD file is missing
        Elevation :  { U : 'X', V : 'Z' }
    };
    const DEG_TO_RAD      =  Math.PI / 180;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Joining Points
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Shot Number From a Photo Name (IMG_..._12.jpg)
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__SurveyBuilder__NumberFromName(imageName) {
        const match  =  /_(\d+)\.[a-z0-9]+$/i.exec(imageName || '');
        return match ? Number(match[1]) : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Root Mean Square of a List
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__SurveyBuilder__Rms(values) {
        if (!values.length) return 0;
        return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | One Point List From the Log and the 3D CAD File
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__SurveyBuilder__JoinPoints(logRows, dxfPoints, lengthFactor) {
        const dxfByKey  =  new Map();
        dxfPoints.forEach(point => { if (point.Label) dxfByKey.set(point.Label.toLowerCase(), point); });

        const toMm       =  point => ({ X : point.X * lengthFactor, Y : point.Y * lengthFactor, Z : point.Z * lengthFactor });
        const residuals  =  [];
        const used       =  new Set();
        const points     =  [];

        logRows.forEach((row, rowIndex) => {
            const fromDxf  =  dxfByKey.get(row.ImageKey) || (dxfPoints.length === logRows.length ? dxfPoints[rowIndex] : null);
            if (fromDxf) used.add(fromDxf);

            const positionMm  =  fromDxf ? toMm(fromDxf) : row.PositionMm;
            if (!positionMm) return;

            if (fromDxf && row.PositionMm) {
                residuals.push(Math.hypot(positionMm.X - row.PositionMm.X, positionMm.Y - row.PositionMm.Y, positionMm.Z - row.PositionMm.Z));
            }

            points.push({
                Number      :  row.Number ?? DistoImageMapper__Intake__SurveyBuilder__NumberFromName(row.ImageName) ?? rowIndex + 1,
                ImageName   :  row.ImageName || (fromDxf && fromDxf.Label) || '',
                ImageKey    :  (row.ImageName || (fromDxf && fromDxf.Label) || '').toLowerCase(),
                PositionMm  :  positionMm,
                DateText    :  row.DateText,
                TimeText    :  row.TimeText,
                HzDegrees   :  row.HzDegrees,
                VDegrees    :  row.VDegrees,
                DistanceMm  :  row.DistanceMm
            });
        });

        dxfPoints.forEach((point, pointIndex) => {                           // <-- Points only the CAD file knows about
            if (used.has(point)) return;
            points.push({
                Number      :  DistoImageMapper__Intake__SurveyBuilder__NumberFromName(point.Label) ?? pointIndex + 1,
                ImageName   :  point.Label || '',
                ImageKey    :  (point.Label || '').toLowerCase(),
                PositionMm  :  toMm(point),
                DateText    :  '',
                TimeText    :  '',
                HzDegrees   :  null,
                VDegrees    :  null,
                DistanceMm  :  null
            });
        });

        points.sort((a, b) => a.Number - b.Number);
        points.forEach((point, index) => { point.Index = index; });

        return { Points : points, LogResidualRmsMm : residuals.length ? DistoImageMapper__Intake__SurveyBuilder__Rms(residuals) : null };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fitting Sheets to the 3D Points
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Which Way a Sheet Is Read From, Along Its Normal
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__SurveyBuilder__ViewerSign(uAxis, uSign, vAxis, vSign, normalAxis) {
        const cyclic  =  ['XYZ', 'YZX', 'ZXY'].includes(uAxis + vAxis + normalAxis) ? 1 : -1;
        return cyclic * uSign * vSign;                                       // <-- The sign of U x V along the leftover axis
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build a Fit Record
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__SurveyBuilder__MakeFit(uAxis, uSign, vAxis, vSign, uOffset, vOffset, rms, matched) {
        const normalAxis  =  AXES.find(axis => axis !== uAxis && axis !== vAxis);
        return {
            UAxis       :  uAxis,
            USign       :  uSign,
            UOffsetMm   :  uOffset,
            VAxis       :  vAxis,
            VSign       :  vSign,
            VOffsetMm   :  vOffset,
            NormalAxis  :  normalAxis,
            ViewerSign  :  DistoImageMapper__Intake__SurveyBuilder__ViewerSign(uAxis, uSign, vAxis, vSign, normalAxis),
            RmsMm       :  rms,
            MatchedCount:  matched
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Try Every Signed Pairing of Axes and Keep the Best
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__SurveyBuilder__FitSheet(coordinates, points, sheetKey) {
        const pairs  =  coordinates
            .map((coordinate, index) => (coordinate ? { U : coordinate.U, V : coordinate.V, Model : points[index].PositionMm } : null))
            .filter(Boolean);

        const fallback  =  SHEET_DEFAULTS[sheetKey];
        if (pairs.length < 2) {
            return DistoImageMapper__Intake__SurveyBuilder__MakeFit(fallback.U, 1, fallback.V, 1, 0, 0, null, pairs.length);
        }

        let best  =  null;
        for (const uAxis of AXES) {
            for (const vAxis of AXES) {
                if (uAxis === vAxis) continue;
                for (const uSign of [1, -1]) {
                    for (const vSign of [1, -1]) {
                        const uOffset  =  pairs.reduce((sum, pair) => sum + (pair.U - uSign * pair.Model[uAxis]), 0) / pairs.length;
                        const vOffset  =  pairs.reduce((sum, pair) => sum + (pair.V - vSign * pair.Model[vAxis]), 0) / pairs.length;
                        const rms      =  DistoImageMapper__Intake__SurveyBuilder__Rms(pairs.map(pair =>
                            Math.hypot(pair.U - uSign * pair.Model[uAxis] - uOffset, pair.V - vSign * pair.Model[vAxis] - vOffset)
                        ));

                        const isDefault  =  uAxis === fallback.U && vAxis === fallback.V && uSign === 1 && vSign === 1;
                        const beatsBest  =  !best || rms < best.RmsMm - 1e-6 || (Math.abs(rms - best.RmsMm) <= 1e-6 && isDefault);
                        if (beatsBest) best  =  DistoImageMapper__Intake__SurveyBuilder__MakeFit(uAxis, uSign, vAxis, vSign, uOffset, vOffset, rms, pairs.length);
                    }
                }
            }
        }
        return best;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build One Sheet: From Its CAD File, or Derived From the 3D Points
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__SurveyBuilder__BuildSheet(sheetKey, file, parsed, points, lengthFactor) {
        if (!parsed) {
            const axes  =  SHEET_DEFAULTS[sheetKey];
            return {
                Key          :  sheetKey,
                FileName     :  null,
                IsDerived    :  true,
                Coordinates  :  points.map(point => ({ U : point.PositionMm[axes.U], V : point.PositionMm[axes.V] })),
                Segments     :  points.slice(1).map((point, index) => [
                    points[index].PositionMm[axes.U], points[index].PositionMm[axes.V], point.PositionMm[axes.U], point.PositionMm[axes.V]
                ]),
                Fit          :  DistoImageMapper__Intake__SurveyBuilder__MakeFit(axes.U, 1, axes.V, 1, 0, 0, 0, points.length)
            };
        }

        const labelled  =  DistoImageMapper__Intake__DxfParser__LabelledPoints(parsed);
        const byKey     =  new Map();
        labelled.forEach(item => { if (item.Label) byKey.set(item.Label.toLowerCase(), item); });

        const coordinates  =  points.map((point, index) => {
            const match  =  byKey.get(point.ImageKey) || (labelled.length === points.length ? labelled[index] : null);
            return match ? { U : match.X * lengthFactor, V : match.Y * lengthFactor } : null;
        });

        return {
            Key          :  sheetKey,
            FileName     :  file.name,
            IsDerived    :  false,
            Coordinates  :  coordinates,
            Segments     :  parsed.Segments.map(segment => [
                segment.A.X * lengthFactor, segment.A.Y * lengthFactor, segment.B.X * lengthFactor, segment.B.Y * lengthFactor
            ]),
            Fit          :  DistoImageMapper__Intake__SurveyBuilder__FitSheet(coordinates, points, sheetKey)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Locating the Tripod
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Fit the Tripod's Frame Onto the Model for One Hz Direction
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__SurveyBuilder__SolveStationFor(shots, hzSign) {
        const local  =  shots.map(shot => {
            const hz  =  hzSign * shot.HzDegrees * DEG_TO_RAD;
            const v   =  shot.VDegrees * DEG_TO_RAD;
            return { X : shot.DistanceMm * Math.sin(v) * Math.cos(hz), Y : shot.DistanceMm * Math.sin(v) * Math.sin(hz), Z : shot.DistanceMm * Math.cos(v) };
        });

        const count     =  shots.length;
        const mean      =  (list, key) => list.reduce((sum, item) => sum + item[key], 0) / count;
        const model     =  shots.map(shot => shot.PositionMm);
        const localMeanX =  mean(local, 'X');
        const localMeanY =  mean(local, 'Y');
        const modelMeanX =  mean(model, 'X');
        const modelMeanY =  mean(model, 'Y');

        let dot    =  0;
        let cross  =  0;
        for (let i = 0; i < count; i++) {
            const ax  =  local[i].X - localMeanX;
            const ay  =  local[i].Y - localMeanY;
            const bx  =  model[i].X - modelMeanX;
            const by  =  model[i].Y - modelMeanY;
            dot    += ax * bx + ay * by;
            cross  += ax * by - ay * bx;
        }

        const angle  =  Math.atan2(cross, dot);
        const cos    =  Math.cos(angle);
        const sin    =  Math.sin(angle);
        const tx     =  modelMeanX - (cos * localMeanX - sin * localMeanY);
        const ty     =  modelMeanY - (sin * localMeanX + cos * localMeanY);
        const tz     =  mean(model, 'Z') - mean(local, 'Z');

        const residuals  =  local.map((item, i) => Math.hypot(
            cos * item.X - sin * item.Y + tx - model[i].X,
            sin * item.X + cos * item.Y + ty - model[i].Y,
            item.Z + tz - model[i].Z
        ));

        return { PositionMm : { X : tx, Y : ty, Z : tz }, RmsMm : DistoImageMapper__Intake__SurveyBuilder__Rms(residuals), HzClockwise : hzSign < 0 };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Tripod's Position, or Null if the Log Cannot Give It
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__SurveyBuilder__SolveStation(points) {
        const shots  =  points.filter(point => point.HzDegrees !== null && point.VDegrees !== null && point.DistanceMm !== null);
        if (shots.length < 3) return null;

        const clockwise      =  DistoImageMapper__Intake__SurveyBuilder__SolveStationFor(shots, -1);
        const anticlockwise  =  DistoImageMapper__Intake__SurveyBuilder__SolveStationFor(shots, 1);
        return clockwise.RmsMm <= anticlockwise.RmsMm ? clockwise : anticlockwise;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bounds and Survey Figures
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Bounds of a List of Model Positions
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__SurveyBuilder__Bounds(positions) {
        const bounds  =  { Min : { X : Infinity, Y : Infinity, Z : Infinity }, Max : { X : -Infinity, Y : -Infinity, Z : -Infinity } };
        for (const position of positions) {
            for (const axis of AXES) {
                bounds.Min[axis]  =  Math.min(bounds.Min[axis], position[axis]);
                bounds.Max[axis]  =  Math.max(bounds.Max[axis], position[axis]);
            }
        }
        return bounds;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Survey Line in 3D
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__SurveyBuilder__Chain(parsed3d, points, lengthFactor) {
        if (parsed3d && parsed3d.Segments.length) {
            return parsed3d.Segments.map(segment => [
                segment.A.X * lengthFactor, segment.A.Y * lengthFactor, segment.A.Z * lengthFactor,
                segment.B.X * lengthFactor, segment.B.Y * lengthFactor, segment.B.Z * lengthFactor
            ]);
        }
        return points.slice(1).map((point, index) => {
            const a  =  points[index].PositionMm;
            const b  =  point.PositionMm;
            return [a.X, a.Y, a.Z, b.X, b.Y, b.Z];
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Survey Check
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Axes a Fit Uses, as Words
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__SurveyBuilder__AxisWords(fit) {
        return `${fit.USign < 0 ? '-' : ''}${fit.UAxis}, ${fit.VSign < 0 ? '-' : ''}${fit.VAxis}`;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Check One Sheet
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__SurveyBuilder__CheckSheet(checks, sheet, label, tolerance) {
        if (sheet.IsDerived) {
            checks.push({ Level : 'Warn', Title : `${label}: no CAD file`, Text : 'Drawn from the 3D points instead.' });
            return;
        }
        if (sheet.Fit.RmsMm === null) {
            checks.push({ Level : 'Warn', Title : `${label}: could not be tested`, Text : `${sheet.FileName} has too few points that match the survey, so it is placed on the usual axes.` });
            return;
        }
        const isAligned  =  sheet.Fit.RmsMm <= tolerance;
        checks.push({
            Level : isAligned ? 'Ok' : 'Warn',
            Title : isAligned ? `${label} lines up` : `${label} does not line up`,
            Text  : `${sheet.FileName}: axes ${DistoImageMapper__Intake__SurveyBuilder__AxisWords(sheet.Fit)}, ${DistoImageMapper__Format__Fixed(sheet.Fit.RmsMm, 2)} mm RMS over ${sheet.Fit.MatchedCount} points.`
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Everything Found, in Plain Words
    // ------------------------------------------------------------
    function DistoImageMapper__Intake__SurveyBuilder__BuildChecks(survey, session, logResidual, stationSolve) {
        const rules   =  DistoImageMapper__Config__Section('Checks');
        const checks  =  [];

        const points   =  survey.Points;
        const missing  =  points.filter(point => !point.ImageFile);
        const usedKeys =  new Set(points.map(point => point.ImageKey));
        const spare    =  Array.from(session.Images.keys()).filter(key => !usedKeys.has(key));

        checks.push(missing.length
            ? { Level : 'Warn', Title : `${missing.length} of ${points.length} photos missing`, Text : missing.slice(0, 4).map(point => point.ImageName || `Point ${point.Number}`).join(', ') + (missing.length > 4 ? ' and more.' : '.') }
            : { Level : 'Ok', Title : `All ${points.length} photos found`, Text : 'Every point has its photo.' });

        if (spare.length) {
            checks.push({ Level : 'Warn', Title : `${spare.length} photos have no point`, Text : 'They are in the folder but no shot names them, so they are left out.' });
        }

        checks.push(session.Dxf3d
            ? { Level : 'Ok', Title : '3D space loaded', Text : `${session.Dxf3d.name}: ${points.length} points, ${survey.Chain.length} lines.` }
            : { Level : 'Warn', Title : '3D space: no CAD file', Text : 'Positions come from the log\'s X, Y and Z instead.' });

        DistoImageMapper__Intake__SurveyBuilder__CheckSheet(checks, survey.Sheets.Plan, 'Plan', rules.SheetToleranceMm);
        DistoImageMapper__Intake__SurveyBuilder__CheckSheet(checks, survey.Sheets.Elevation, 'Elevation', rules.SheetToleranceMm);

        if (logResidual !== null) {
            checks.push(logResidual <= rules.LogToleranceMm
                ? { Level : 'Ok', Title : 'Log agrees with the 3D space', Text : `${session.Csv.name}: ${DistoImageMapper__Format__Fixed(logResidual, 2)} mm RMS.` }
                : { Level : 'Warn', Title : 'Log differs from the 3D space', Text : `${session.Csv.name}: ${DistoImageMapper__Format__Fixed(logResidual, 1)} mm RMS. The CAD file's positions are used.` });
        } else if (!session.Csv) {
            checks.push({ Level : 'Warn', Title : 'No CSV log', Text : 'No angles or distances, so the tripod cannot be located.' });
        }

        if (survey.Station) {
            const position  =  survey.Station.PositionMm;
            checks.push({ Level : 'Ok', Title : 'Tripod located', Text : `X ${DistoImageMapper__Format__Fixed(position.X, 0)}, Y ${DistoImageMapper__Format__Fixed(position.Y, 0)}, Z ${DistoImageMapper__Format__Fixed(position.Z, 0)} mm, solved to ${DistoImageMapper__Format__Fixed(survey.Station.RmsMm, 2)} mm RMS.` });
        } else if (stationSolve) {
            checks.push({ Level : 'Warn', Title : 'Tripod not located', Text : `Its angles fit only to ${DistoImageMapper__Format__Fixed(stationSolve.RmsMm, 0)} mm, so it probably moved during the survey. The Tripod view is off.` });
        }

        if (points.length > 2) {
            const first  =  points[0].PositionMm;
            const last   =  points[points.length - 1].PositionMm;
            const gap    =  Math.hypot(first.X - last.X, first.Y - last.Y, first.Z - last.Z);
            if (gap <= rules.RepeatShotToleranceMm) {
                checks.push({ Level : 'Ok', Title : 'Survey closes', Text : `Point ${points[points.length - 1].Number} repeats point ${points[0].Number} to ${DistoImageMapper__Format__Fixed(gap, 2)} mm.` });
            }
        }

        return checks;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Build the Survey
// -----------------------------------------------------------------------------

    // FUNCTION | Read a Session's Files Into a Survey
    // ------------------------------------------------------------
    export async function DistoImageMapper__Intake__SurveyBuilder__Build(session) {
        const readDxf  =  async file => (file ? DistoImageMapper__Intake__DxfParser__Parse(await file.text()) : null);

        const log            =  session.Csv ? DistoImageMapper__Intake__CsvParser__Parse(await session.Csv.text()) : { Rows : [] };
        const parsed3d       =  await readDxf(session.Dxf3d);
        const parsedPlan     =  await readDxf(session.DxfPlan);
        const parsedElev     =  await readDxf(session.DxfElevation);
        const lengthFactor   =  log.Rows.length ? log.Rows[0].LengthFactor : 1;  // <-- The CAD files share the log's unit
        const dxfPoints      =  parsed3d ? DistoImageMapper__Intake__DxfParser__LabelledPoints(parsed3d) : [];

        const { Points : points, LogResidualRmsMm }  =  DistoImageMapper__Intake__SurveyBuilder__JoinPoints(log.Rows, dxfPoints, lengthFactor);
        if (!points.length) throw new Error('No survey points were found in this folder.');

        points.forEach(point => { point.ImageFile  =  session.Images.get(point.ImageKey) || null; });

        const stationSolve  =  DistoImageMapper__Intake__SurveyBuilder__SolveStation(points);
        const station       =  stationSolve && stationSolve.RmsMm <= DistoImageMapper__Config__Section('Checks').StationToleranceMm ? stationSolve : null;

        const boundsMm         =  DistoImageMapper__Intake__SurveyBuilder__Bounds(points.map(point => point.PositionMm));
        const contentBoundsMm  =  DistoImageMapper__Intake__SurveyBuilder__Bounds(
            points.map(point => point.PositionMm).concat(station ? [station.PositionMm] : [])
        );

        const chain  =  DistoImageMapper__Intake__SurveyBuilder__Chain(parsed3d, points, lengthFactor);

        const survey  =  {
            Name             :  session.Name,
            Points           :  points,
            Chain            :  chain,
            Station          :  station,
            BoundsMm         :  boundsMm,
            ContentBoundsMm  :  contentBoundsMm,
            PathLengthMm     :  chain.reduce((sum, s) => sum + Math.hypot(s[3] - s[0], s[4] - s[1], s[5] - s[2]), 0),
            Sheets           :  {
                Plan       :  DistoImageMapper__Intake__SurveyBuilder__BuildSheet('Plan', session.DxfPlan, parsedPlan, points, lengthFactor),
                Elevation  :  DistoImageMapper__Intake__SurveyBuilder__BuildSheet('Elevation', session.DxfElevation, parsedElev, points, lengthFactor)
            },
            ExtentsText      :  ''
        };

        survey.ExtentsText  =  AXES.map(axis => DistoImageMapper__Format__Length(boundsMm.Max[axis] - boundsMm.Min[axis])).join(' x ');
        survey.Checks       =  DistoImageMapper__Intake__SurveyBuilder__BuildChecks(survey, session, LogResidualRmsMm, stationSolve);

        return survey;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
