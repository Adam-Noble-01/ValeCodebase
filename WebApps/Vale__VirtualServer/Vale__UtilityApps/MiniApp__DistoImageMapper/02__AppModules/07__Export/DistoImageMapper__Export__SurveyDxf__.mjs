/* =============================================================================
   DISTO IMAGE MAPPER - EXPORT | SURVEY TO DXF
   =============================================================================

   FILE       : DistoImageMapper__Export__SurveyDxf__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Export - SurveyDxf
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The kept points as AutoCAD drawings: one in 3D, one per chosen face
                of the clipping box, with their photos, packed in one zip
   CREATED    : 06-Nov-2026

   DESCRIPTION:
   - 3D: every kept point at the DISTO's own X, Y, Z (mm), so it lies over the
     DISTO's 3D_ file; each photo stood up at its true size facing the tripod, as
     it was shot; the survey line, the tripod and its sight lines, the box's edges.
   - A FACE: the kept points as seen from outside that face looking in, in the
     face's own drawing coordinates (ClipBox__Face: at yaw 0 the Front is X across,
     Z up, the DISTO's own 2DW; the Top is X, Y, its 2DG). Each photo centred on its
     point at its true size, square to the view, drawn furthest first and before
     the points, so points and numbers lie on top.
   - A photo's true size: the DISTO's field of view F at distance D shows 2 D tan(F/2)
     across (the README's rule); with no tripod, the config's PhotoSizeMm.
   - THE BUNDLE: the drawings, the photos beside them (AutoCAD looks for a linked
     photo in the drawing's own folder), Points.csv and a README, in one flat zip.
     Photo names that are not plain ASCII are renamed, as the drawings name them.

   ============================================================================= */

import { DistoImageMapper__Config__Section } from '../01__AppCore/DistoImageMapper__AppCore__Config__.mjs';
import {
    DistoImageMapper__Env3d__ClipBox__ActingMode,
    DistoImageMapper__Env3d__ClipBox__Edges,
    DistoImageMapper__Env3d__ClipBox__Face,
    DistoImageMapper__Env3d__ClipBox__FormatMm,
    DistoImageMapper__Env3d__ClipBox__IsKept,
    DistoImageMapper__Env3d__ClipBox__Project
} from '../04__Env3d/DistoImageMapper__Env3d__ClipBox__.mjs';
import { DistoImageMapper__Export__DxfWriter__Create } from './DistoImageMapper__Export__DxfWriter__.mjs';
import { DistoImageMapper__Export__ZipWriter__Pack } from './DistoImageMapper__Export__ZipWriter__.mjs';


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Layer Names and Months
    // ------------------------------------------------------------
    const LAYER  =  {
        Photos  :  'DISTO_PHOTOS',
        Points  :  'DISTO_POINTS',
        Labels  :  'DISTO_LABELS',
        Line    :  'DISTO_SURVEY_LINE',
        Tripod  :  'DISTO_TRIPOD',
        Sight   :  'DISTO_SIGHT_LINES',
        Box     :  'DISTO_BOX',
        Title   :  'DISTO_TITLE'
    };
    const MONTHS      =  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DEG_TO_RAD  =  Math.PI / 180;
    const READ_AT_ONCE=  6;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Vectors as Arrays
    // ------------------------------------------------------------
    const Sub    =  (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const Add    =  (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const Scale  =  (a, k) => [a[0] * k, a[1] * k, a[2] * k];
    const Dot    =  (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const Cross  =  (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const Unit   =  a => { const length = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / length, a[1] / length, a[2] / length]; };
    const Xyz    =  positionMm => [positionMm.X, positionMm.Y, positionMm.Z];
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Name Safe for Any File System (the zip keeps UTF-8 names)
    // ------------------------------------------------------------
    function DistoImageMapper__Export__SurveyDxf__FileName(name) {
        return String(name || '').replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '_').replace(/\s+/g, ' ').replace(/^[ .]+|[ .]+$/g, '').slice(0, 80) || 'Survey';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Today as 06-Nov-2026 10:42
    // ------------------------------------------------------------
    function DistoImageMapper__Export__SurveyDxf__Stamp(date) {
        const pad  =  value => String(value).padStart(2, '0');
        return `${pad(date.getDate())}-${MONTHS[date.getMonth()]}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A CSV Cell
    // ------------------------------------------------------------
    function DistoImageMapper__Export__SurveyDxf__Cell(value) {
        const text  =  String(value ?? '');
        return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Photos
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Read Each Kept Point's Photo: Its Bytes, Its Pixels, and the Name the Drawings Give It
    // ------------------------------------------------------------
    async function DistoImageMapper__Export__SurveyDxf__ReadPhotos(points, onProgress) {
        const photos  =  new Map();                                          // <-- point index -> { FileName, Width, Height, Bytes }
        const used    =  new Set();
        const queue   =  points.filter(item => item.Point.ImageFile);
        let   done    =  0;

        const nameFor  =  item => {
            const original  =  item.Point.ImageFile.name || '';
            const extension =  (/\.[A-Za-z0-9]+$/.exec(original) || ['.jpg'])[0].toLowerCase();
            let name  =  /^[A-Za-z0-9 _.()+-]+$/.test(original) ? original : `IMG_Point_${item.Point.Number}${extension}`;   // <-- AutoCAD must find it by name: plain ASCII only
            for (let n = 2; used.has(name.toLowerCase()); n++) name  =  name.replace(/(\.[^.]+)?$/, `_${n}$1`);
            used.add(name.toLowerCase());
            return name;
        };
        queue.forEach(item => { item.ExportName  =  nameFor(item); });

        const worker  =  async () => {
            while (queue.length) {
                const item  =  queue.shift();
                try {
                    const file    =  item.Point.ImageFile;
                    const bytes   =  new Uint8Array(await file.arrayBuffer());
                    const bitmap  =  await createImageBitmap(file);
                    photos.set(item.Index, { FileName : item.ExportName, Width : bitmap.width, Height : bitmap.height, Bytes : bytes });
                    if (typeof bitmap.close === 'function') bitmap.close();
                } catch (error) {
                    // <-- An unreadable photo: its point is still drawn, without a picture
                }
                done++;
                if (onProgress) onProgress(`Reading photos: ${done} of ${points.filter(entry => entry.Point.ImageFile).length}`);
            }
        };
        await Promise.all(Array.from({ length : READ_AT_ONCE }, worker));
        return photos;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Photo's Width and Height in mm at Its True Size
    // ------------------------------------------------------------
    function DistoImageMapper__Export__SurveyDxf__PhotoSize(photo, positionMm, stationMm, fieldOfViewDegrees, config) {
        const across  =  stationMm
            ? 2 * Math.hypot(positionMm.X - stationMm.X, positionMm.Y - stationMm.Y, positionMm.Z - stationMm.Z) * Math.tan(fieldOfViewDegrees * DEG_TO_RAD / 2)
            : config.PhotoSizeMm;
        const aspect  =  photo.Width / Math.max(photo.Height, 1);
        return aspect >= 1 ? { Width : across, Height : across / aspect } : { Width : across * aspect, Height : across };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Drawings
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A New Drawing With the Survey's Layers
    // ------------------------------------------------------------
    function DistoImageMapper__Export__SurveyDxf__NewDrawing(config) {
        const dxf     =  DistoImageMapper__Export__DxfWriter__Create();
        const colours =  config.LayerColours;
        for (const [key, name] of Object.entries(LAYER)) dxf.Layer(name, colours[key]);
        return dxf;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The 3D Drawing
    // ------------------------------------------------------------
    function DistoImageMapper__Export__SurveyDxf__Drawing3d(job) {
        const { Config, Kept, Photos, Survey, Station, Front } = job;
        const dxf  =  DistoImageMapper__Export__SurveyDxf__NewDrawing(Config);

        if (job.IncludePhotos) {                                             // <-- Photos first: points and numbers draw over them
            for (const item of Kept) {
                const photo  =  Photos.get(item.Index);
                if (!photo) continue;
                const p     =  Xyz(item.Point.PositionMm);
                const size  =  DistoImageMapper__Export__SurveyDxf__PhotoSize(photo, item.Point.PositionMm, Station, job.FieldOfViewDegrees, Config);
                const toward=  Station ? Unit(Sub(Xyz(Station), p)) : Scale(Front.View, -1);   // <-- Faces the tripod, as shot; else out of the Front
                let   up    =  Sub([0, 0, 1], Scale(toward, toward[2]));
                if (Math.hypot(...up) < 1e-6) up  =  Front.Up;
                up  =  Unit(up);
                const right  =  Unit(Cross(Scale(toward, -1), up));          // <-- As seen from the tripod looking at the photo
                const corner =  Sub(Sub(p, Scale(right, size.Width / 2)), Scale(up, size.Height / 2));
                dxf.Image(LAYER.Photos, photo.FileName, photo.Width, photo.Height, corner,
                    Scale(right, size.Width / photo.Width), Scale(up, size.Height / photo.Height));
            }
        }

        for (const [a, b] of DistoImageMapper__Env3d__ClipBox__Edges()) dxf.Line(LAYER.Box, Xyz(a), Xyz(b));
        for (const segment of job.Chain) dxf.Line(LAYER.Line, segment.slice(0, 3), segment.slice(3, 6));

        if (Station) {
            const s  =  Xyz(Station);
            for (const item of Kept) dxf.Line(LAYER.Sight, s, Xyz(item.Point.PositionMm));
            dxf.Point(LAYER.Tripod, s);
            dxf.Text(LAYER.Tripod, Add(s, [Config.LabelHeightMm * 0.6, Config.LabelHeightMm * 0.6, 0]), Config.LabelHeightMm, 'Tripod');
        }

        for (const item of Kept) {
            const p  =  Xyz(item.Point.PositionMm);
            dxf.Point(LAYER.Points, p);
            dxf.Text(LAYER.Labels, Add(p, [Config.LabelHeightMm * 0.4, Config.LabelHeightMm * 0.4, 0]), Config.LabelHeightMm, String(item.Point.Number));
        }

        const corners  =  DistoImageMapper__Env3d__ClipBox__Edges().flat();
        const lowX     =  Math.min(...corners.map(c => c.X));
        const lowY     =  Math.min(...corners.map(c => c.Y));
        const lowZ     =  Math.min(...corners.map(c => c.Z));
        dxf.Text(LAYER.Title, [lowX, lowY - Config.TitleHeightMm * 2, lowZ], Config.TitleHeightMm, `${job.SurveyName}  |  3D  |  The DISTO's own X, Y, Z in mm`);
        dxf.Text(LAYER.Title, [lowX, lowY - Config.TitleHeightMm * 3.4, lowZ], Config.NoteHeightMm, job.Note);
        return dxf.ToText({ PointMode : Config.PointMode, PointSizeMm : Config.PointSizeMm });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | One Face's Drawing
    // ------------------------------------------------------------
    function DistoImageMapper__Export__SurveyDxf__DrawingFace(job, key) {
        const { Config, Kept, Photos, Station } = job;
        const face  =  DistoImageMapper__Env3d__ClipBox__Face(key);
        const dxf   =  DistoImageMapper__Export__SurveyDxf__NewDrawing(Config);
        const flat  =  positionMm => {
            const projected  =  DistoImageMapper__Env3d__ClipBox__Project(face, positionMm);
            return [projected.U, projected.V, 0];
        };

        if (job.IncludePhotos) {                                             // <-- Furthest first, so nearer photos lie over them
            const placed  =  Kept
                .filter(item => Photos.get(item.Index))
                .map(item => ({ Item : item, Depth : DistoImageMapper__Env3d__ClipBox__Project(face, item.Point.PositionMm).Depth }))
                .sort((a, b) => b.Depth - a.Depth);
            for (const { Item } of placed) {
                const photo  =  Photos.get(Item.Index);
                const size   =  DistoImageMapper__Export__SurveyDxf__PhotoSize(photo, Item.Point.PositionMm, Station, job.FieldOfViewDegrees, Config);
                const at     =  flat(Item.Point.PositionMm);
                dxf.Image(LAYER.Photos, photo.FileName, photo.Width, photo.Height,
                    [at[0] - size.Width / 2, at[1] - size.Height / 2, 0], [size.Width / photo.Width, 0, 0], [0, size.Height / photo.Height, 0]);
            }
        }

        dxf.Polyline(LAYER.Box, [[face.U[0], face.V[0]], [face.U[1], face.V[0]], [face.U[1], face.V[1]], [face.U[0], face.V[1]]], true);
        for (const segment of job.Chain) {
            dxf.Line(LAYER.Line, flat({ X : segment[0], Y : segment[1], Z : segment[2] }), flat({ X : segment[3], Y : segment[4], Z : segment[5] }));
        }
        if (Station && (key === 'Top' || key === 'Bottom')) {                // <-- On plan the tripod's place reads; on a side it would only be a height
            const s  =  flat(Station);
            dxf.Point(LAYER.Tripod, s);
            dxf.Text(LAYER.Tripod, Add(s, [Config.LabelHeightMm * 0.6, Config.LabelHeightMm * 0.6, 0]), Config.LabelHeightMm, 'Tripod');
        }
        for (const item of Kept) {
            const p  =  flat(item.Point.PositionMm);
            dxf.Point(LAYER.Points, p);
            dxf.Text(LAYER.Labels, Add(p, [Config.LabelHeightMm * 0.4, Config.LabelHeightMm * 0.4, 0]), Config.LabelHeightMm, String(item.Point.Number));
        }

        const heading  =  face.Name === key ? key.toUpperCase() : `${face.Name.toUpperCase()} (${key.toUpperCase()})`;
        const across   =  key === 'Top' || key === 'Bottom' ? 'up the sheet: in from the Front' : 'up the sheet: height';
        dxf.Text(LAYER.Title, [face.U[0], face.V[0] - Config.TitleHeightMm * 2, 0], Config.TitleHeightMm, `${job.SurveyName}  |  ${heading}`);
        dxf.Text(LAYER.Title, [face.U[0], face.V[0] - Config.TitleHeightMm * 3.4, 0], Config.NoteHeightMm,
            `Seen from outside the clipping box, looking in. Across: along the face, left to right; ${across}. Millimetres.`);
        dxf.Text(LAYER.Title, [face.U[0], face.V[0] - Config.TitleHeightMm * 4.4, 0], Config.NoteHeightMm, job.Note);
        return dxf.ToText({ PointMode : Config.PointMode, PointSizeMm : Config.PointSizeMm });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Points.csv: Every Kept Point, With Its Place on Each Face Drawn
    // ------------------------------------------------------------
    function DistoImageMapper__Export__SurveyDxf__Csv(job) {
        const faces   =  job.Faces.map(key => DistoImageMapper__Env3d__ClipBox__Face(key));
        const header  =  ['Point', 'Photo', 'X_mm', 'Y_mm', 'Z_mm', ...faces.flatMap(face => [`${face.Key}_Across_mm`, `${face.Key}_Up_mm`, `${face.Key}_Depth_mm`])];
        const fixed   =  value => (Math.round(value * 10) / 10).toFixed(1);
        const rows    =  job.Kept.map(item => {
            const p      =  item.Point.PositionMm;
            const photo  =  job.Photos.get(item.Index);
            return [
                item.Point.Number, photo ? photo.FileName : (item.Point.ImageName || ''), fixed(p.X), fixed(p.Y), fixed(p.Z),
                ...faces.flatMap(face => {
                    const projected  =  DistoImageMapper__Env3d__ClipBox__Project(face, p);
                    return [fixed(projected.U), fixed(projected.V), fixed(projected.Depth)];
                })
            ];
        });
        return [header, ...rows].map(row => row.map(DistoImageMapper__Export__SurveyDxf__Cell).join(',')).join('\r\n') + '\r\n';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | README.txt: How to Open Them, and What Is on Each Layer
    // ------------------------------------------------------------
    function DistoImageMapper__Export__SurveyDxf__Readme(job, drawingNames) {
        return [
            'Disto Image Mapper: DXF export',
            `Survey: ${job.SurveyName}`,
            `Exported: ${job.Stamp}, Disto Image Mapper ${job.Version}`,
            `Points: ${job.Note}`,
            '',
            'TO OPEN THEM',
            '1. Extract the whole zip into one folder first. A DXF opened straight from inside the zip',
            '   cannot find its photos.',
            '2. Open a DXF in AutoCAD, BricsCAD, DraftSight or DWG TrueView.',
            '3. The photos are linked, not inside the drawings: no DXF can hold a picture. AutoCAD finds',
            '   each one beside the drawing, so keep the photos and the drawings together when the folder',
            '   is moved or sent. A photo showing as an empty frame has lost its file: open External',
            '   References (XREF) and point it at the photo.',
            '',
            'THE DRAWINGS',
            ...drawingNames.map(name => `- ${name}`),
            '',
            '- 3D: every kept point at the DISTO\'s own X, Y, Z, so it lies over the DISTO\'s 3D_ file.',
            '  The photos stand at true size, each facing the tripod as it was shot. It opens on plan:',
            '  use View, SW Isometric, or 3DORBIT, to see it in 3D.',
            '- Each face: the kept points as seen from outside that face of the clipping box, looking in.',
            '  Across: along the face, left to right. Up: height (on Top and Bottom, in from the Front).',
            '  Each photo is centred on its point at its true size, furthest first.',
            '- Millimetres throughout. Points.csv lists every kept point, with its place on each face.',
            '',
            'LAYERS',
            'DISTO_PHOTOS       the photos (freeze it to see the points under them)',
            'DISTO_POINTS       the measured points',
            'DISTO_LABELS       point numbers',
            'DISTO_SURVEY_LINE  the survey line',
            'DISTO_TRIPOD       where the DISTO stood (3D, Top and Bottom)',
            'DISTO_SIGHT_LINES  from the tripod to each point (3D)',
            'DISTO_BOX          the clipping box (3D) or the face (each face)',
            'DISTO_TITLE        title and notes',
            ''
        ].join('\r\n');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Interface
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Bundle: { Bytes (the zip), FileName, Summary }
    // ------------------------------------------------------------
    // options: { Survey, Mask (per point), Faces (keys), Include3d, IncludePhotos,
    //            FieldOfViewDegrees, OnProgress (text) }
    // ------------------------------------------------------------
    export async function DistoImageMapper__Export__SurveyDxf__Bundle(options) {
        const config   =  DistoImageMapper__Config__Section('Export');
        const identity =  DistoImageMapper__Config__Section('Identity');
        const survey   =  options.Survey;
        const acting   =  DistoImageMapper__Env3d__ClipBox__ActingMode();    // <-- All points keeps the inside while the box shows and the view is clipped
        const kept     =  survey.Points.map((point, index) => ({ Point : point, Index : index })).filter(item => !options.Mask || options.Mask[item.Index] !== false);
        const keepsEnd =  (x, y, z) => DistoImageMapper__Env3d__ClipBox__IsKept({ X : x, Y : y, Z : z });   // <-- The survey line as the app draws it
        const modeWords  =  { All : 'the box keeps them all', Inside : 'those inside the clipping box', Outside : 'those outside the clipping box' }[acting];
        const date       =  new Date();
        const baseName   =  DistoImageMapper__Export__SurveyDxf__FileName(survey.Name);
        const progress   =  options.OnProgress || (() => {});

        const photos  =  options.IncludePhotos ? await DistoImageMapper__Export__SurveyDxf__ReadPhotos(kept, progress) : new Map();
        progress('Writing the drawings');

        const job  =  {
            Config              :  config,
            Survey              :  survey,
            SurveyName          :  survey.Name,
            Kept                :  kept,
            Photos              :  photos,
            Station             :  survey.Station ? survey.Station.PositionMm : null,
            Front               :  DistoImageMapper__Env3d__ClipBox__Face('Front'),
            Faces               :  options.Faces.slice(),
            IncludePhotos       :  Boolean(options.IncludePhotos),
            FieldOfViewDegrees  :  options.FieldOfViewDegrees,
            Chain               :  (survey.Chain || []).filter(s => keepsEnd(s[0], s[1], s[2]) && keepsEnd(s[3], s[4], s[5])),
            Stamp               :  DistoImageMapper__Export__SurveyDxf__Stamp(date),
            Version             :  identity.AppVersion,
            Note                :  `${kept.length} of ${survey.Points.length} points (${modeWords}). Exported ${DistoImageMapper__Export__SurveyDxf__Stamp(date)} by Disto Image Mapper ${identity.AppVersion}.`
        };

        const files      =  [];
        const usedNames  =  new Set();
        const encoder    =  new TextEncoder();
        const addText    =  (name, text) => { usedNames.add(name.toLowerCase()); files.push({ Name : name, Bytes : encoder.encode(text) }); };

        if (options.Include3d) addText(`${baseName}__3D.dxf`, DistoImageMapper__Export__SurveyDxf__Drawing3d(job));
        for (const key of options.Faces) {
            const face  =  DistoImageMapper__Env3d__ClipBox__Face(key);
            let   name  =  `${baseName}__${DistoImageMapper__Export__SurveyDxf__FileName(face.Name)}.dxf`;
            if (usedNames.has(name.toLowerCase())) name  =  `${baseName}__${DistoImageMapper__Export__SurveyDxf__FileName(face.Name)}__${key}.dxf`;
            addText(name, DistoImageMapper__Export__SurveyDxf__DrawingFace(job, key));
        }
        const drawingNames  =  files.map(file => file.Name);
        addText(`${baseName}__Points.csv`, DistoImageMapper__Export__SurveyDxf__Csv(job));
        addText('README.txt', DistoImageMapper__Export__SurveyDxf__Readme(job, drawingNames));
        for (const item of kept) {
            const photo  =  photos.get(item.Index);
            if (photo && !usedNames.has(photo.FileName.toLowerCase())) {
                usedNames.add(photo.FileName.toLowerCase());
                files.push({ Name : photo.FileName, Bytes : photo.Bytes });
            }
        }

        progress('Packing the zip');
        const bytes  =  DistoImageMapper__Export__ZipWriter__Pack(files, date);
        return {
            Bytes     :  bytes,
            FileName  :  `${baseName}__DXF.zip`,
            Summary   :  {
                Drawings :  drawingNames.length,
                Photos   :  photos.size,
                Points   :  kept.length,
                Total    :  survey.Points.length,
                SizeText :  `${DistoImageMapper__Env3d__ClipBox__FormatMm(bytes.length / 1024)} KB`
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
