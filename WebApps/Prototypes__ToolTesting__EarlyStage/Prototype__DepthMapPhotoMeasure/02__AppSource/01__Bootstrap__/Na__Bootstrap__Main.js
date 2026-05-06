// Na__Bootstrap__Main
// Single entry-point invoked by App.html. Loads AppConfig, wires every module,
// owns the application-level state, and orchestrates the
// load-image -> infer -> resolve-focal -> measure flow.

import { Na__OnnxRuntime__EnsureRuntimeLoaded }       from '../03__ModelInference__/Na__OnnxRuntime__SessionLoader.js';
import {
    Na__ModelRegistry__SetActiveModel,
    Na__ModelRegistry__RunActiveModel,
    Na__ModelRegistry__GetActiveModelId
}                                                      from '../03__ModelInference__/Na__ModelRegistry__SelectActiveModel.js';

import { Na__ExifReader__ParseFocalLength }            from '../04__CameraIntrinsics__/Na__ExifReader__ParseFocalLength.js';
import { Na__FocalLength__ComputePixelsFromExif }      from '../04__CameraIntrinsics__/Na__FocalLength__ComputePixelsFromExif.js';
import {
    Na__FocalLength__ResolveWithFallback
}                                                      from '../04__CameraIntrinsics__/Na__FocalLength__ResolveWithFallback.js';
import {
    Na__Calibration__FromKnownReference,
    Na__Calibration__InspectPairDepths
}                                                      from '../04__CameraIntrinsics__/Na__Calibration__FromKnownReference.js';

import { Na__DepthSampler__SampleAroundPixel }         from '../05__Measurement__/Na__DepthSampler__SampleAtPixel.js';
import { Na__Distance__FrontoparallelPlanar }          from '../05__Measurement__/Na__Distance__FrontoparallelPlanar.js';
import {
    Na__Measurement__StoreSubscribe,
    Na__Measurement__StoreAdd,
    Na__Measurement__StoreRemove,
    Na__Measurement__StoreClear
}                                                      from '../05__Measurement__/Na__Measurement__StoreModel.js';
import { Na__Measurement__FormatLabel }                from '../05__Measurement__/Na__Measurement__FormatLabel.js';

import { Na__ImageLoader__FileInputHandler_Wire }      from '../06__UserInterface__/Na__ImageLoader__FileInputHandler.js';
import {
    Na__ImageCanvas__RenderBaseImage,
    Na__ImageCanvas__ClearAll
}                                                      from '../06__UserInterface__/Na__ImageCanvas__RenderBaseImage.js';
import {
    Na__DepthOverlay__RenderColorMap,
    Na__DepthOverlay__SetOpacity,
    Na__DepthOverlay__SetVisible
}                                                      from '../06__UserInterface__/Na__DepthOverlay__RenderColorMap.js';
import { Na__PointPicker__Create }                     from '../06__UserInterface__/Na__PointPicker__InteractiveClick.js';
import { Na__MeasurementOverlay__RenderLines }         from '../06__UserInterface__/Na__MeasurementOverlay__RenderLines.js';
import { Na__MeasurementList__SidebarPanel_Wire }      from '../06__UserInterface__/Na__MeasurementList__SidebarPanel.js';
import { Na__FocalControls__SliderAndInput_Wire }      from '../06__UserInterface__/Na__FocalControls__SliderAndInput.js';
import { Na__CalibrationModal__ReferenceFlow_Wire }    from '../06__UserInterface__/Na__CalibrationModal__ReferenceFlow.js';
import { Na__ModelToggle__SelectorButtons_Wire }       from '../06__UserInterface__/Na__ModelToggle__SelectorButtons.js';
import { Na__StatusBar__Create }                       from '../06__UserInterface__/Na__StatusBar__ProgressIndicator.js';
import { Na__CanvasViewport__Create }                  from '../06__UserInterface__/Na__CanvasViewport__ZoomPanController.js';
import { Na__ExportPng__Wire }                         from '../06__UserInterface__/Na__ExportPng__DownloadComposite.js';
import { Na__DepthHud__CursorReadout_Create }          from '../06__UserInterface__/Na__DepthHud__CursorReadout.js';

const Na__Bootstrap__AppConfigPath = '02__AppSource/02__AppData__/Na__AppConfig__Main.json';

const Na__Bootstrap__State = {
    appConfig:               null,
    sourceImageBitmap:       null,
    sourceImageFile:         null,
    depthResult:             null,
    exifResolved:            null,
    manualFocalPx:           null,
    calibrationFocalPx:      null,
    resolvedFocal:           null,
    pendingHover:            null,
    pendingFirstClick:       null,
    pickerMode:              'measure',
    activeCalibrationRef:    null,
    primaryCalibrationRefOverlay:   null,
    secondaryCalibrationRefOverlay: null,
    wallRefPrimary:          null,
    wallRefSecondary:        null,
    measurementsCache:       [],
    diagnosticsLog:          []
};

let Na__Bootstrap__Picker          = null;
let Na__Bootstrap__StatusBar       = null;
let Na__Bootstrap__FocalControls   = null;
let Na__Bootstrap__ModelToggle     = null;
let Na__Bootstrap__CalibrationCtl  = null;
let Na__Bootstrap__MeasurementList = null;
let Na__Bootstrap__Viewport        = null;
let Na__Bootstrap__ExportPng       = null;
let Na__Bootstrap__DepthHud        = null;
let Na__Bootstrap__LoadedFileName  = null;

// ============================== ENTRY ==============================
async function Na__Bootstrap__Main() {
    try {
        Na__Bootstrap__GuardAgainstFileProtocol();
        Na__Bootstrap__State.appConfig = await Na__Bootstrap__LoadConfig();
        const cfg = Na__Bootstrap__State.appConfig;

        Na__Bootstrap__StatusBar = Na__StatusBar__Create({
            modelEl:    document.getElementById('Na__StatusBar__Model'),
            imageEl:    document.getElementById('Na__StatusBar__Image'),
            focalEl:    document.getElementById('Na__StatusBar__Focal'),
            progressEl: document.getElementById('Na__StatusBar__Progress')
        });
        Na__Bootstrap__StatusBar.setProgress('Loading runtime...', true);

        await Na__OnnxRuntime__EnsureRuntimeLoaded(cfg.externalLibraries);
        Na__Bootstrap__StatusBar.setProgress('Runtime ready.', false);

        Na__ModelRegistry__SetActiveModel(cfg.modelDefault, cfg);
        Na__Bootstrap__StatusBar.setModel(cfg.models[cfg.modelDefault].displayName);

        Na__Bootstrap__Picker = Na__PointPicker__Create(document.getElementById('Na__Measurement__Canvas'));

        Na__Bootstrap__ModelToggle = Na__ModelToggle__SelectorButtons_Wire(
            document.getElementById('Na__ModelToggle__Group'), cfg, Na__Bootstrap__SwitchActiveModel);
        Na__Bootstrap__ModelToggle.rebuild(cfg.modelDefault);

        Na__Bootstrap__FocalControls = Na__FocalControls__SliderAndInput_Wire({
            fovSlider:    document.getElementById('Na__FocalControls__FovSlider'),
            fovValueEl:   document.getElementById('Na__FocalControls__FovValue'),
            focalPxInput: document.getElementById('Na__FocalControls__FocalPxInput'),
            sourceTagEl:  document.getElementById('Na__FocalControls__SourceTag'),
            hintEl:       document.getElementById('Na__FocalControls__Hint')
        });
        Na__Bootstrap__FocalControls.on('onChange', (focalPx, source) => {
            Na__Bootstrap__State.manualFocalPx = focalPx;
            Na__Bootstrap__RecomputeFocalAndMeasurements();
        });

        Na__Bootstrap__CalibrationCtl = Na__CalibrationModal__ReferenceFlow_Wire({
            startButton:          document.getElementById('Na__Calibration__StartButton'),
            startSecondaryButton: document.getElementById('Na__Calibration__StartSecondaryButton'),
            inlineForm:           document.getElementById('Na__Calibration__InlineForm'),
            lengthInput:          document.getElementById('Na__Calibration__LengthMm'),
            applyButton:          document.getElementById('Na__Calibration__ApplyButton'),
            cancelButton:         document.getElementById('Na__Calibration__CancelButton'),
            divergenceBanner:     document.getElementById('Na__Calibration__DivergenceBanner'),
            captureModeLabel:     document.getElementById('Na__Calibration__CaptureModeLabel'),
            summaryReadout:       document.getElementById('Na__Calibration__SummaryReadout')
        }, Na__Bootstrap__Picker);
        Na__Bootstrap__CalibrationCtl.on('onApplied', Na__Bootstrap__ApplyReferenceCalibration);
        Na__Bootstrap__CalibrationCtl.on('onSecondaryApplied', Na__Bootstrap__ApplySecondaryWallReference);
        Na__Bootstrap__CalibrationCtl.on('onStarted', (mode) => {
            if (mode !== 'secondary') {
                Na__Bootstrap__State.activeCalibrationRef            = null;
                Na__Bootstrap__State.primaryCalibrationRefOverlay    = null;
                Na__Bootstrap__State.secondaryCalibrationRefOverlay  = null;
            } else {
                Na__Bootstrap__State.secondaryCalibrationRefOverlay  = null;
            }
            Na__Bootstrap__Log(`Calibration: armed (${mode || 'primary'}) - click two reference points on the photo.`);
            Na__Bootstrap__RedrawMeasurementOverlay();
        });
        Na__Bootstrap__CalibrationCtl.on('onCancelled', (mode) => {
            Na__Bootstrap__Log(`Calibration: cancelled (${mode || 'primary'}).`);
            Na__Bootstrap__RedrawMeasurementOverlay();
        });
        Na__Bootstrap__CalibrationCtl.on('onPairCaptured', (a, b, mode) => {
            if (mode !== 'secondary') {
                Na__Bootstrap__State.activeCalibrationRef = {
                    pointA:        a,
                    pointB:        b,
                    lengthMeters:  null,
                    status:        'pending'
                };
                Na__Bootstrap__State.primaryCalibrationRefOverlay =
                    Na__Bootstrap__BuildCalibrationOverlayReference(a, b, null, 'pending', 'REF1');
                Na__Bootstrap__State.secondaryCalibrationRefOverlay = null;
            } else {
                Na__Bootstrap__State.secondaryCalibrationRefOverlay =
                    Na__Bootstrap__BuildCalibrationOverlayReference(a, b, null, 'pending', 'REF2');
            }
            const depthA = Na__Bootstrap__SampleDepth(a);
            const depthB = Na__Bootstrap__SampleDepth(b);
            const inspect = Na__Calibration__InspectPairDepths(
                depthA, depthB,
                cfg.calibration && cfg.calibration.depthDivergence
            );
            Na__Bootstrap__CalibrationCtl.showDivergenceResult(depthA, depthB, inspect);
            Na__Bootstrap__Log(`Calibration: points captured (${mode || 'primary'}) - A(${a.x.toFixed(0)},${a.y.toFixed(0)})d=${depthA?.toFixed(2)}m  B(${b.x.toFixed(0)},${b.y.toFixed(0)})d=${depthB?.toFixed(2)}m  divergence=${inspect.status} ratio=${inspect.ratio.toFixed(2)}x`);
            Na__Bootstrap__RedrawMeasurementOverlay();
        });

        Na__Bootstrap__MeasurementList = Na__MeasurementList__SidebarPanel_Wire(
            {
                listEl:      document.getElementById('Na__MeasurementList__List'),
                clearButton: document.getElementById('Na__MeasurementList__ClearButton')
            },
            { remove: Na__Measurement__StoreRemove, clear: Na__Measurement__StoreClear },
            cfg.ui
        );

        Na__Measurement__StoreSubscribe((items) => {
            Na__Bootstrap__State.measurementsCache = items;
            Na__Bootstrap__MeasurementList.render(items);
            Na__Bootstrap__RedrawMeasurementOverlay();
        });

        Na__Bootstrap__Picker.on('onPair',            Na__Bootstrap__OnMeasurementPair);
        Na__Bootstrap__Picker.on('onCalibrationPair', (a, b) => Na__Bootstrap__CalibrationCtl.handleCalibrationPair(a, b));
        Na__Bootstrap__Picker.on('onPreview',         (hover, pendingFirst, mode, mouseClient) => {
            Na__Bootstrap__State.pendingHover        = hover;
            Na__Bootstrap__State.pendingFirstClick   = pendingFirst;
            Na__Bootstrap__State.pickerMode          = mode || 'measure';
            if (Na__Bootstrap__DepthHud) Na__Bootstrap__DepthHud.update(hover, mouseClient);
            Na__Bootstrap__RedrawMeasurementOverlay();
        });

        Na__Bootstrap__DepthHud = Na__DepthHud__CursorReadout_Create({
            chipElement:  document.getElementById('Na__DepthHud__Chip'),
            stageElement: document.getElementById('Na__Stage__Region'),
            hudConfig:    (cfg.calibration && cfg.calibration.depthHud) || {}
        });

        Na__Bootstrap__Viewport = Na__CanvasViewport__Create({
            stageElement:   document.getElementById('Na__Stage__Region'),
            frameElement:   document.getElementById('Na__Stage__ViewportFrame'),
            hudElements:    {
                zoomReadout: document.getElementById('Na__Viewport__ZoomReadout'),
                fitButton:   document.getElementById('Na__Viewport__FitButton')
            },
            viewportConfig: cfg.viewport
        });

        Na__Bootstrap__ExportPng = Na__ExportPng__Wire({
            openButton:     document.getElementById('Na__ExportPng__OpenButton'),
            downloadAnchor: document.getElementById('Na__ExportPng__DownloadAnchor'),
            modalElements: {
                backdrop:        document.getElementById('Na__ExportPng__ModalBackdrop'),
                filenameInput:   document.getElementById('Na__ExportPng__FilenameInput'),
                statusEl:        document.getElementById('Na__ExportPng__Status'),
                cancelButton:    document.getElementById('Na__ExportPng__CancelButton'),
                downloadButton:  document.getElementById('Na__ExportPng__DownloadButton'),
                layerCheckboxes: {
                    base:         document.getElementById('Na__ExportPng__Layer__Base'),
                    depth:        document.getElementById('Na__ExportPng__Layer__Depth'),
                    measurements: document.getElementById('Na__ExportPng__Layer__Measurements')
                }
            },
            getExportContext: Na__Bootstrap__GetExportContext,
            exportConfig:     cfg.export
        });

        Na__Bootstrap__BindOverlayControls();
        Na__Bootstrap__BindImageLoading();

        Na__Bootstrap__Log(`Ready. Default model: ${cfg.modelDefault}.`);
        Na__Bootstrap__StatusBar.setProgress('Idle', false);
    } catch (err) {
        console.error('[Na__Bootstrap] init failed:', err);
        Na__Bootstrap__Log(`INIT FAILED: ${err.message}`);
        if (Na__Bootstrap__StatusBar) Na__Bootstrap__StatusBar.setProgress('Init failed', false);
    }
}

async function Na__Bootstrap__LoadConfig() {
    const response = await fetch(Na__Bootstrap__AppConfigPath);
    if (!response.ok) throw new Error(`Failed to load AppConfig (HTTP ${response.status}). Are you serving via http://?`);
    return response.json();
}

function Na__Bootstrap__GuardAgainstFileProtocol() {
    if (location.protocol !== 'file:') return;
    const stage = document.getElementById('Na__Stage__Region');
    if (stage) {
        stage.innerHTML = `
            <div style="padding:32px; max-width:720px; margin:32px auto; color:#e6edf3; font-family:'Segoe UI',system-ui,sans-serif; line-height:1.5;">
                <h2 style="color:#fbbf24; margin-top:0;">This app cannot run from <code>file://</code></h2>
                <p>Browsers block ES modules and ONNX model fetches when an HTML file is opened directly from disk.</p>
                <p>Start the bundled dev server (which also adds the cross-origin-isolation headers needed for multi-threaded WASM) and open the served URL instead:</p>
                <pre style="background:#0f1722; padding:14px; border-radius:8px; border:1px solid #243042; overflow:auto;">cd Prototype__DepthMapPhotoMeasure
python Na__DevServer__CoiHeaders.py 8766

# then open in your browser:
http://127.0.0.1:8766/App.html</pre>
                <p style="color:#9aa7b6; font-size:12px;">See <code>Readme.md</code> for the full quick-start.</p>
            </div>
        `;
    }
    throw new Error('App opened via file:// - serve through the dev server instead.');
}

// ============================== IMAGE LOAD ==============================
function Na__Bootstrap__BindImageLoading() {
    const stage = document.getElementById('Na__Stage__Region');
    Na__ImageLoader__FileInputHandler_Wire(
        {
            fileInput:    document.getElementById('Na__ImageInput__File'),
            sampleButton: document.getElementById('Na__SamplePhoto__Button'),
            dropTarget:   stage
        },
        Na__Bootstrap__State.appConfig.samplePhoto,
        Na__Bootstrap__OnImageReady,
        (err) => Na__Bootstrap__Log(`IMAGE LOAD ERROR: ${err.message}`)
    );
}

async function Na__Bootstrap__OnImageReady({ file, bitmap, fileName }) {
    Na__Bootstrap__State.sourceImageBitmap     = bitmap;
    Na__Bootstrap__State.sourceImageFile       = file;
    Na__Bootstrap__State.depthResult           = null;
    Na__Bootstrap__State.exifResolved          = null;
    Na__Bootstrap__State.manualFocalPx         = null;
    Na__Bootstrap__State.calibrationFocalPx    = null;
    Na__Bootstrap__State.activeCalibrationRef  = null;
    Na__Bootstrap__State.primaryCalibrationRefOverlay   = null;
    Na__Bootstrap__State.secondaryCalibrationRefOverlay = null;
    Na__Bootstrap__State.wallRefPrimary        = null;
    Na__Bootstrap__State.wallRefSecondary      = null;
    Na__Measurement__StoreClear();
    Na__Bootstrap__FocalControls.clearManualOverride();
    if (Na__Bootstrap__DepthHud) Na__Bootstrap__DepthHud.setDepthResult(null);

    Na__Bootstrap__LoadedFileName                                  = fileName;
    document.getElementById('Na__Stage__EmptyState').style.display = 'none';
    Na__Bootstrap__StatusBar.setImage(`${fileName} (${bitmap.width}x${bitmap.height})`);
    Na__Bootstrap__FocalControls.setImageWidth(bitmap.width);

    Na__Bootstrap__StatusBar.setProgress('Drawing image...', true);
    Na__ImageCanvas__RenderBaseImage(Na__Bootstrap__GetCanvases(), bitmap);

    if (Na__Bootstrap__Viewport) {
        Na__Bootstrap__Viewport.setImageSize(bitmap.width, bitmap.height);
        const hud = document.getElementById('Na__Viewport__Hud');
        if (hud) hud.hidden = false;
    }
    if (Na__Bootstrap__ExportPng) {
        Na__Bootstrap__ExportPng.setEnabled(true);
    }

    Na__Bootstrap__StatusBar.setProgress('Reading EXIF...', true);
    try {
        const exif       = await Na__ExifReader__ParseFocalLength(file, Na__Bootstrap__State.appConfig.externalLibraries);
        Na__Bootstrap__State.exifResolved = Na__FocalLength__ComputePixelsFromExif(
            exif, bitmap.width, bitmap.height, Na__Bootstrap__State.appConfig.intrinsics.knownSensorPresetsMm);
        Na__Bootstrap__Log(`EXIF: focal_mm=${exif.focalLengthMm}, focal_35mm=${exif.focalLengthIn35mmFilm}, make=${exif.make}, model=${exif.model}`);
        if (Na__Bootstrap__State.exifResolved.method) {
            Na__Bootstrap__Log(`EXIF -> focalPx=${Math.round(Na__Bootstrap__State.exifResolved.focalPx)} via ${Na__Bootstrap__State.exifResolved.method}`);
        }
    } catch (err) {
        Na__Bootstrap__Log(`EXIF parse failed: ${err.message}`);
    }

    await Na__Bootstrap__RunActiveModelInference();
}

// ============================== INFERENCE ==============================
async function Na__Bootstrap__RunActiveModelInference() {
    const cfg = Na__Bootstrap__State.appConfig;
    if (!Na__Bootstrap__State.sourceImageBitmap) return;

    Na__Bootstrap__StatusBar.setProgress('Running depth model... (first run loads ONNX into VRAM)', true);
    try {
        const result = await Na__ModelRegistry__RunActiveModel(
            Na__Bootstrap__State.sourceImageBitmap, cfg, Na__Bootstrap__OnInferenceProgress);
        Na__Bootstrap__State.depthResult = result;
        Na__Bootstrap__Log(`Inference: model=${result.modelId} depthRange=${result.depthMin?.toFixed(2)}-${result.depthMax?.toFixed(2)}m focalPxModel=${result.focalPxImageSpace ? Math.round(result.focalPxImageSpace) : '-'} took ${result.inferenceMs?.toFixed(0)}ms`);

        if (Na__Bootstrap__DepthHud) Na__Bootstrap__DepthHud.setDepthResult(result);
        Na__DepthOverlay__RenderColorMap(document.getElementById('Na__DepthOverlay__Canvas'), result);

        Na__Bootstrap__RecomputeFocalAndMeasurements();
        Na__Bootstrap__StatusBar.setProgress(`Done in ${result.inferenceMs?.toFixed(0)} ms`, false);
    } catch (err) {
        const msg = err?.message || (typeof err === 'string' ? err : (err?.toString && err.toString()) || JSON.stringify(err));
        console.error('[Na__Bootstrap] Inference error:', err);
        Na__Bootstrap__Log(`INFERENCE FAILED: ${msg}`);
        Na__Bootstrap__StatusBar.setProgress('Inference failed', false);
    }
}

let Na__Bootstrap__SessionCreateTimerId = null;

function Na__Bootstrap__OnInferenceProgress(progress) {
    const { phase, status, loaded, total, durationMs, modelId } = progress;
    if (phase === 'fetch' && status === 'progress' && total) {
        const pct = ((loaded / total) * 100).toFixed(1);
        Na__Bootstrap__StatusBar.setProgress(`Fetching model ${modelId}: ${pct}% (${(loaded/1e6).toFixed(0)}/${(total/1e6).toFixed(0)} MB)`, true);
    } else if (phase === 'create-session' && status === 'starting') {
        const startedAt = performance.now();
        Na__Bootstrap__StatusBar.setProgress('Creating inference session...', true);
        if (Na__Bootstrap__SessionCreateTimerId) clearInterval(Na__Bootstrap__SessionCreateTimerId);
        Na__Bootstrap__SessionCreateTimerId = setInterval(() => {
            const secs = ((performance.now() - startedAt) / 1000).toFixed(0);
            Na__Bootstrap__StatusBar.setProgress(`Creating inference session... ${secs}s (large models can take 1-3 min)`, true);
        }, 1000);
    } else if (phase === 'create-session' && status === 'done') {
        if (Na__Bootstrap__SessionCreateTimerId) {
            clearInterval(Na__Bootstrap__SessionCreateTimerId);
            Na__Bootstrap__SessionCreateTimerId = null;
        }
        Na__Bootstrap__StatusBar.setProgress('Session ready', false);
    } else if (phase === 'preprocess' && status === 'starting') {
        Na__Bootstrap__StatusBar.setProgress('Preprocessing image...', true);
    } else if (phase === 'inference' && status === 'starting') {
        Na__Bootstrap__StatusBar.setProgress('Running model...', true);
    } else if (phase === 'inference' && status === 'done') {
        Na__Bootstrap__StatusBar.setProgress(`Inference done (${durationMs?.toFixed(0)} ms)`, false);
    }
}

async function Na__Bootstrap__SwitchActiveModel(newId) {
    const cfg = Na__Bootstrap__State.appConfig;
    Na__ModelRegistry__SetActiveModel(newId, cfg);
    Na__Bootstrap__ModelToggle.setActive(newId);
    Na__Bootstrap__StatusBar.setModel(cfg.models[newId].displayName);
    Na__Bootstrap__Log(`Active model -> ${newId}`);

    Na__Bootstrap__State.calibrationFocalPx   = null;
    Na__Bootstrap__State.activeCalibrationRef = null;
    Na__Bootstrap__State.primaryCalibrationRefOverlay   = null;
    Na__Bootstrap__State.secondaryCalibrationRefOverlay = null;
    Na__Bootstrap__State.wallRefPrimary       = null;
    Na__Bootstrap__State.wallRefSecondary     = null;
    Na__Measurement__StoreClear();
    if (Na__Bootstrap__State.sourceImageBitmap) {
        await Na__Bootstrap__RunActiveModelInference();
    }
}

// ============================== FOCAL + MEASUREMENT RECOMPUTE ==============================
function Na__Bootstrap__RecomputeFocalAndMeasurements() {
    const cfg    = Na__Bootstrap__State.appConfig;
    const bitmap = Na__Bootstrap__State.sourceImageBitmap;
    if (!bitmap) return;

    const resolved = Na__FocalLength__ResolveWithFallback({
        modelFocalPx:        Na__Bootstrap__State.depthResult ? Na__Bootstrap__State.depthResult.focalPxImageSpace : null,
        exifResolved:        Na__Bootstrap__State.exifResolved,
        manualFocalPx:       Na__Bootstrap__State.manualFocalPx,
        calibrationFocalPx:  Na__Bootstrap__State.calibrationFocalPx,
        imageWidthPx:        bitmap.width,
        defaultFovDegrees:   cfg.intrinsics.defaultFovDegrees
    });
    Na__Bootstrap__State.resolvedFocal = resolved;

    const hint = Na__Bootstrap__BuildFocalHint(resolved);
    Na__Bootstrap__FocalControls.setResolved(resolved.focalPx, resolved.source, bitmap.width, hint);

    Na__Bootstrap__StatusBar.setFocal(`${Math.round(resolved.focalPx)} px (${resolved.fovDegrees.toFixed(1)}\u00B0, ${resolved.source})`);
    Na__Bootstrap__Log(`Focal resolved -> ${Math.round(resolved.focalPx)} px / ${resolved.fovDegrees.toFixed(1)}\u00B0 [${resolved.source}]`);

    Na__Bootstrap__RecomputeAllMeasurements();
}

function Na__Bootstrap__BuildFocalHint(resolved) {
    const lines = [`Source: ${resolved.source}`];
    switch (resolved.source) {
        case 'MODEL':       lines.push('Estimated by Depth Pro from the image.'); break;
        case 'EXIF':        lines.push('Read from EXIF metadata of the photo.'); break;
        case 'MANUAL':      lines.push('Manual override active. Drag the slider to adjust.'); break;
        case 'CALIBRATION': lines.push('Solved from your reference dimension.'); break;
        case 'DEFAULT':     lines.push('No camera info available - using default 60deg FOV. Calibrate for accurate results.'); break;
    }
    return lines.join('\n');
}

function Na__Bootstrap__RecomputeAllMeasurements() {
    const items = Na__Bootstrap__State.measurementsCache;
    if (!items.length) {
        Na__Bootstrap__RedrawMeasurementOverlay();
        return;
    }
    for (const item of items) Na__Bootstrap__RecomputeOneMeasurement(item);
    Na__Bootstrap__MeasurementList.render(Na__Bootstrap__State.measurementsCache);
    Na__Bootstrap__RedrawMeasurementOverlay();
}

function Na__Bootstrap__RecomputeOneMeasurement(item) {
    const focal = Na__Bootstrap__State.resolvedFocal;
    if (!focal) return;
    if (!Na__Bootstrap__State.sourceImageBitmap) return;

    const depthA = Na__Bootstrap__SampleDepth(item.pointA);
    const depthB = Na__Bootstrap__SampleDepth(item.pointB);
    if (!isFinite(depthA) || !isFinite(depthB) || depthA <= 0 || depthB <= 0) return;
    const depthMid = Na__Bootstrap__SampleDepthAtSegmentMidpoint(item.pointA, item.pointB);
    const depthForMeasure = (isFinite(depthMid) && depthMid > 0) ? depthMid : 0.5 * (depthA + depthB);

    const measurement = Na__Bootstrap__ComputeMeasurementDistance(
        item.pointA, item.pointB,
        depthForMeasure, depthForMeasure,
        focal.focalPx
    );

    item.depthA             = depthA;
    item.depthB             = depthB;
    item.distanceMeters     = measurement.distanceMeters;
    item.deltaMeters        = {
        horizontal: measurement.horizontalMeters,
        vertical:   measurement.verticalMeters
    };
    item.intrinsicsSource   = focal.source;
    item.focalPx            = focal.focalPx;
    item.measurementMode    = measurement.mode;
    item.wallS              = measurement.wallS;
    item.wallPpm            = measurement.wallPpm;
    item.angleToWallDeg     = measurement.angleToWallDeg;
}

// ============================== POINT PICKING ==============================
function Na__Bootstrap__OnMeasurementPair(pointA, pointB) {
    const depthResult = Na__Bootstrap__State.depthResult;
    if (!depthResult) {
        Na__Bootstrap__Log('Cannot measure: depth map not yet computed.');
        return;
    }
    const focal = Na__Bootstrap__State.resolvedFocal;
    if (!focal) return;

    const depthA = Na__Bootstrap__SampleDepth(pointA);
    const depthB = Na__Bootstrap__SampleDepth(pointB);
    if (!isFinite(depthA) || !isFinite(depthB) || depthA <= 0 || depthB <= 0) {
        Na__Bootstrap__Log(`Invalid depth at one of the points (a=${depthA}, b=${depthB}).`);
        return;
    }
    const depthMid = Na__Bootstrap__SampleDepthAtSegmentMidpoint(pointA, pointB);
    const depthForMeasure = (isFinite(depthMid) && depthMid > 0) ? depthMid : 0.5 * (depthA + depthB);

    const measurement = Na__Bootstrap__ComputeMeasurementDistance(
        pointA, pointB,
        depthForMeasure, depthForMeasure,
        focal.focalPx
    );

    Na__Measurement__StoreAdd({
        pointA, pointB,
        depthA, depthB,
        distanceMeters:   measurement.distanceMeters,
        deltaMeters:      {
            horizontal: measurement.horizontalMeters,
            vertical:   measurement.verticalMeters
        },
        intrinsicsSource: focal.source,
        focalPx:          focal.focalPx,
        measurementMode:  measurement.mode,
        wallS:            measurement.wallS,
        wallPpm:          measurement.wallPpm,
        angleToWallDeg:   measurement.angleToWallDeg,
        modelId:          Na__ModelRegistry__GetActiveModelId(),
        createdAt:        Date.now()
    });
    let detail = `dA=${depthA.toFixed(2)} dB=${depthB.toFixed(2)} dMid=${measurement.depthMid.toFixed(2)}m`;
    if (measurement.mode === 'wallPlane') {
        detail = `s=${measurement.wallS.toFixed(0)}px ppm=${measurement.wallPpm.toFixed(2)} angle=${measurement.angleToWallDeg.toFixed(1)}\u00B0`;
    } else if (measurement.mode === 'wallDepthVertical') {
        detail = `s=${measurement.wallS.toFixed(0)}px angle=${measurement.angleToWallDeg.toFixed(1)}\u00B0 dWall=${measurement.depthWallMid.toFixed(2)}m dLocal=${measurement.depthLocalMid.toFixed(2)}m dUsed=${measurement.depthMid.toFixed(2)}m`;
    }
    Na__Bootstrap__Log(`Measure: ${Na__Measurement__FormatLabel(measurement.distanceMeters)} (deltaPx=${measurement.deltaPx2D.toFixed(0)} ${detail} mode=${measurement.mode} focal ${Math.round(focal.focalPx)}px ${focal.source})`);
}

// Raw model depth at a sub-pixel coordinate, averaged over a small kernel for
// noise robustness. This is the only depth input downstream code ever sees -
// scale correction is applied later as a single multiplier on the displayed
// dimension text, not on depth itself, so this stays trivially simple.
function Na__Bootstrap__SampleDepth(point) {
    const r = Na__Bootstrap__State.depthResult;
    if (!r) return NaN;
    const cfg = Na__Bootstrap__State.appConfig;
    const k   = (cfg.calibration && cfg.calibration.depthSampleKernelRadius) ?? 2;
    return Na__DepthSampler__SampleAroundPixel(r.depth, r.depthWidth, r.depthHeight, point.x, point.y, k);
}

function Na__Bootstrap__SampleDepthAtSegmentMidpoint(pointA, pointB) {
    const r = Na__Bootstrap__State.depthResult;
    if (!r) return NaN;
    const cfg = Na__Bootstrap__State.appConfig;
    const baseK = (cfg.calibration && cfg.calibration.depthSampleKernelRadius) ?? 2;
    const k = Math.max(4, baseK);
    const mx = (pointA.x + pointB.x) * 0.5;
    const my = (pointA.y + pointB.y) * 0.5;
    return Na__DepthSampler__SampleAroundPixel(r.depth, r.depthWidth, r.depthHeight, mx, my, k);
}

// Hybrid measurement dispatcher.
// When a wall-plane calibration is active and the segment is near-parallel to
// the wall axis (within configured threshold), use the 1D pixels-per-meter
// model derived from the primary (and optionally secondary) wall reference.
// Otherwise fall back to the depth-led path that scales a frontoparallel
// projection by the active reference's depth/length ratio.
function Na__Bootstrap__ComputeMeasurementDistance(pointA, pointB, depthA, depthB, focalPx) {
    const dx        = pointB.x - pointA.x;
    const dy        = pointB.y - pointA.y;
    const deltaPx2D = Math.sqrt(dx * dx + dy * dy);
    const depthMid  = 0.5 * (depthA + depthB);
    const horizontalMetersFrontoparallel = Math.abs(dx * depthMid / focalPx);
    const verticalMetersFrontoparallel   = Math.abs(dy * depthMid / focalPx);
    const distanceFrontoparallel         = deltaPx2D * depthMid / focalPx;

    const wallResult = Na__Bootstrap__TryWallPlaneMeasurement(pointA, pointB, dx, dy, deltaPx2D);
    if (wallResult) return Object.assign(wallResult, { depthMid });

    const wallVerticalResult = Na__Bootstrap__TryWallDepthAnchoredVerticalMeasurement(
        pointA, pointB, dx, dy, deltaPx2D, depthMid, focalPx
    );
    if (wallVerticalResult) return wallVerticalResult;

    const scaleInfo = Na__Bootstrap__ResolveCalibrationScale(focalPx);
    if (scaleInfo.hasScale) {
        const distanceMeters = distanceFrontoparallel * scaleInfo.scale;
        return {
            mode: 'depthModel',
            distanceMeters,
            horizontalMeters: horizontalMetersFrontoparallel * scaleInfo.scale,
            verticalMeters:   verticalMetersFrontoparallel   * scaleInfo.scale,
            deltaPx2D,
            depthMid,
            depthLocalMid:    depthMid,
            depthWallMid:     null,
            wallS:            null,
            wallPpm:          null,
            angleToWallDeg:   null
        };
    }

    const proj = Na__Distance__FrontoparallelPlanar(pointA, pointB, depthA, depthB, focalPx);
    return {
        mode: 'frontoparallel',
        distanceMeters: proj.distance,
        horizontalMeters: horizontalMetersFrontoparallel,
        verticalMeters:   verticalMetersFrontoparallel,
        deltaPx2D: proj.deltaPx2D,
        depthMid: proj.dAvg,
        depthLocalMid:    proj.dAvg,
        depthWallMid:     null,
        wallS:            null,
        wallPpm:          null,
        angleToWallDeg:   null
    };
}

function Na__Bootstrap__ResolveCalibrationScale(focalPx) {
    const ref = Na__Bootstrap__State.activeCalibrationRef;
    const refDistance = ref && ref.status === 'applied' ? ref.lengthMeters : null;
    const refDeltaPx  = ref && isFinite(ref.deltaPx2D) ? ref.deltaPx2D : null;
    const refDepthMid = ref && isFinite(ref.depthMid)  ? ref.depthMid  : null;
    if (!isFinite(refDistance) || refDistance <= 0 || !isFinite(refDeltaPx) || refDeltaPx <= 0 || !isFinite(refDepthMid) || refDepthMid <= 0) {
        return { hasScale: false, scale: 1.0 };
    }
    const refFrontoparallelDistance = (refDeltaPx * refDepthMid) / focalPx;
    if (!(refFrontoparallelDistance > 0)) return { hasScale: false, scale: 1.0 };
    return {
        hasScale: true,
        scale:    refDistance / refFrontoparallelDistance
    };
}

// Returns a wall-plane measurement result if conditions are met, otherwise
// null so the caller falls through to the depth-led path.
function Na__Bootstrap__TryWallPlaneMeasurement(pointA, pointB, dx, dy, deltaPx2D) {
    const cfg = Na__Bootstrap__State.appConfig;
    const hybridCfg = cfg && cfg.measurementHybrid;
    if (!hybridCfg || hybridCfg.enableWallPlaneClamp === false) return null;
    const primary = Na__Bootstrap__State.wallRefPrimary;
    if (!primary || !isFinite(primary.pixelLengthPx) || primary.pixelLengthPx <= 0) return null;

    const angleDeg = Na__Bootstrap__ComputeSegmentAngleToWallAxisDeg(dx, dy, primary.axis);
    const threshold = isFinite(hybridCfg.wallParallelAngleDeg) ? hybridCfg.wallParallelAngleDeg : 12;
    if (!isFinite(angleDeg) || angleDeg > threshold) return null;

    const midpoint = { x: (pointA.x + pointB.x) * 0.5, y: (pointA.y + pointB.y) * 0.5 };
    const sCoord = Na__Bootstrap__ProjectOntoWallAxis(midpoint, primary);
    const ppm = Na__Bootstrap__WallPixelsPerMeterAtS(sCoord);
    if (!isFinite(ppm) || ppm <= 0) return null;

    const distanceMeters = deltaPx2D / ppm;
    const horizontalMeters = Math.abs(dx) / ppm;
    const verticalMeters   = Math.abs(dy) / ppm;
    return {
        mode: 'wallPlane',
        distanceMeters,
        horizontalMeters,
        verticalMeters,
        deltaPx2D,
        depthLocalMid:    null,
        depthWallMid:     null,
        wallS:          sCoord,
        wallPpm:        ppm,
        angleToWallDeg: angleDeg
    };
}

function Na__Bootstrap__TryWallDepthAnchoredVerticalMeasurement(pointA, pointB, dx, dy, deltaPx2D, depthMidLocal, focalPx) {
    const cfg = Na__Bootstrap__State.appConfig;
    const hybridCfg = cfg && cfg.measurementHybrid;
    if (!hybridCfg || hybridCfg.enableDepthAnchoredVertical === false) return null;
    const primary = Na__Bootstrap__State.wallRefPrimary;
    if (!primary || !primary.axis) return null;

    const angleDeg = Na__Bootstrap__ComputeSegmentAngleToWallAxisDeg(dx, dy, primary.axis);
    const threshold = isFinite(hybridCfg.verticalWallAngleDeg) ? hybridCfg.verticalWallAngleDeg : 12;
    if (!Na__Bootstrap__IsNearPerpendicularToWallAxis(angleDeg, threshold)) return null;

    const midpoint = { x: (pointA.x + pointB.x) * 0.5, y: (pointA.y + pointB.y) * 0.5 };
    const sCoord = Na__Bootstrap__ProjectOntoWallAxis(midpoint, primary);
    if (!isFinite(sCoord)) return null;

    const depthWallMid = Na__Bootstrap__WallDepthMetersAtS(sCoord);
    if (!isFinite(depthWallMid) || depthWallMid <= 0) return null;
    const depthAnchoredMid = Na__Bootstrap__ClampDepthToLocalShift(depthWallMid, depthMidLocal);
    if (!isFinite(depthAnchoredMid) || depthAnchoredMid <= 0) return null;

    const scaleInfo = Na__Bootstrap__ResolveCalibrationScale(focalPx);
    const scale = scaleInfo.hasScale ? scaleInfo.scale : 1.0;
    const ppm = Na__Bootstrap__WallPixelsPerMeterAtS(sCoord);

    return {
        mode: 'wallDepthVertical',
        distanceMeters:   deltaPx2D * depthAnchoredMid / focalPx * scale,
        horizontalMeters: Math.abs(dx) * depthAnchoredMid / focalPx * scale,
        verticalMeters:   Math.abs(dy) * depthAnchoredMid / focalPx * scale,
        deltaPx2D,
        depthMid:         depthAnchoredMid,
        depthLocalMid:    depthMidLocal,
        depthWallMid,
        wallS:          sCoord,
        wallPpm:        (isFinite(ppm) && ppm > 0) ? ppm : null,
        angleToWallDeg: angleDeg
    };
}

// Vector subtract for image-space points.
function Na__Bootstrap__VecSub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}

// Builds the cached wall-axis bundle (origin, unit vector, pixel length) for
// the primary reference. Subsequent helpers rely on the unit vector and origin
// already being attached to wallRefPrimary.
function Na__Bootstrap__BuildWallAxisFromRef(refRecord) {
    const dx = refRecord.pointB.x - refRecord.pointA.x;
    const dy = refRecord.pointB.y - refRecord.pointA.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (!(len > 0)) return null;
    return {
        origin: { x: refRecord.pointA.x, y: refRecord.pointA.y },
        unit:   { x: dx / len, y: dy / len },
        normal: { x: -dy / len, y: dx / len },
        lengthPx: len
    };
}

// Scalar coordinate of an arbitrary image-space point along the wall axis,
// measured in pixels from the primary ref's pointA.
function Na__Bootstrap__ProjectOntoWallAxis(point, primary) {
    if (!primary || !primary.axis) return NaN;
    const v = Na__Bootstrap__VecSub(point, primary.axis.origin);
    return v.x * primary.axis.unit.x + v.y * primary.axis.unit.y;
}

// Linear interpolation of pixels-per-meter along the wall axis. Falls back to
// the primary ref's ppm when no secondary ref is set; otherwise interpolates
// between the two ref midpoints.
function Na__Bootstrap__WallPixelsPerMeterAtS(sCoord) {
    const primary   = Na__Bootstrap__State.wallRefPrimary;
    const secondary = Na__Bootstrap__State.wallRefSecondary;
    if (!primary) return NaN;
    if (!secondary) return primary.ppm;

    const s1 = primary.sCoord;
    const s2 = secondary.sCoord;
    const denom = s2 - s1;
    if (!isFinite(denom) || Math.abs(denom) < 1) return primary.ppm;

    const t = (sCoord - s1) / denom;
    return primary.ppm + (secondary.ppm - primary.ppm) * t;
}

function Na__Bootstrap__WallDepthMetersAtS(sCoord) {
    const primary   = Na__Bootstrap__State.wallRefPrimary;
    const secondary = Na__Bootstrap__State.wallRefSecondary;
    if (!primary || !isFinite(primary.depthMid) || primary.depthMid <= 0) return NaN;
    if (!secondary || !isFinite(secondary.depthMid) || secondary.depthMid <= 0) return primary.depthMid;

    const s1 = primary.sCoord;
    const s2 = secondary.sCoord;
    const denom = s2 - s1;
    if (!isFinite(denom) || Math.abs(denom) < 1) return primary.depthMid;

    const t = (sCoord - s1) / denom;
    return primary.depthMid + (secondary.depthMid - primary.depthMid) * t;
}

function Na__Bootstrap__ClampDepthToLocalShift(anchoredDepthMid, localDepthMid) {
    const hybridCfg = Na__Bootstrap__State.appConfig && Na__Bootstrap__State.appConfig.measurementHybrid;
    const maxShift = hybridCfg && isFinite(hybridCfg.verticalDepthMaxRelativeShift)
        ? hybridCfg.verticalDepthMaxRelativeShift : null;
    if (!isFinite(maxShift) || maxShift <= 0) return anchoredDepthMid;
    if (!isFinite(localDepthMid) || localDepthMid <= 0) return anchoredDepthMid;
    const minDepth = Math.max(0.01, localDepthMid * (1 - maxShift));
    const maxDepth = localDepthMid * (1 + maxShift);
    return Math.max(minDepth, Math.min(maxDepth, anchoredDepthMid));
}

function Na__Bootstrap__IsNearPerpendicularToWallAxis(angleDeg, threshold) {
    return isFinite(angleDeg) && Math.abs(90 - angleDeg) <= threshold;
}

// Angle in degrees between an image-space segment vector and the wall axis.
// Returns the unsigned acute angle; pure parallel = 0, perpendicular = 90.
function Na__Bootstrap__ComputeSegmentAngleToWallAxisDeg(dx, dy, axis) {
    if (!axis) return NaN;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (!(len > 0)) return NaN;
    const cosTheta = (dx * axis.unit.x + dy * axis.unit.y) / len;
    const clamped  = Math.max(-1, Math.min(1, cosTheta));
    const angleRad = Math.acos(Math.abs(clamped));
    return angleRad * 180.0 / Math.PI;
}

// ============================== CALIBRATION ==============================
// Primary reference calibration:
//   1. Solves a focal length via the frontoparallel solver so the reference
//      evaluates to L_typed under the depth-led measurement path.
//   2. Builds the wall-plane primary anchor (axis, ppm, midpoint, sCoord)
//      for the hybrid measurement path. Wall-parallel segments will use this
//      directly; non-parallel segments fall back to the depth-led path.
function Na__Bootstrap__ApplyReferenceCalibration(pointA, pointB, lengthMeters) {
    console.info('[Na__Bootstrap] ApplyReferenceCalibration ENTERED', { pointA, pointB, lengthMeters });
    const depthResult = Na__Bootstrap__State.depthResult;
    if (!depthResult) {
        Na__Bootstrap__Log('Cannot calibrate: depth map not yet computed.');
        return;
    }
    const depthA    = Na__Bootstrap__SampleDepth(pointA);
    const depthB    = Na__Bootstrap__SampleDepth(pointB);
    const bitmap    = Na__Bootstrap__State.sourceImageBitmap;
    const principal = { x: bitmap.width / 2, y: bitmap.height / 2 };
    const pixelDist = Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);

    Na__Bootstrap__Log(`Calibration inputs (primary): pixelDist=${pixelDist.toFixed(0)}px  depthA=${depthA?.toFixed(2)}m  depthB=${depthB?.toFixed(2)}m  L=${(lengthMeters*1000).toFixed(0)}mm`);

    const result = Na__Calibration__FromKnownReference(
        { pixelX: pointA.x, pixelY: pointA.y, depth: depthA },
        { pixelX: pointB.x, pixelY: pointB.y, depth: depthB },
        lengthMeters,
        principal,
        { strategy: 'auto' }
    );
    console.info('[Na__Bootstrap] Calibration solver result:', result);

    if (!result.success) {
        Na__Bootstrap__Log(`Calibration FAILED (${result.strategy}): ${result.reason}`);
        Na__Bootstrap__State.activeCalibrationRef            = null;
        Na__Bootstrap__State.primaryCalibrationRefOverlay    = null;
        Na__Bootstrap__State.secondaryCalibrationRefOverlay  = null;
        Na__Bootstrap__RedrawMeasurementOverlay();
        return;
    }

    Na__Bootstrap__State.calibrationFocalPx = result.focalPx;
    Na__Bootstrap__State.manualFocalPx      = null;
    Na__Bootstrap__FocalControls.clearManualOverride();
    const refDeltaPx2D = pixelDist;
    const refDepthSampleMid = Na__Bootstrap__SampleDepthAtSegmentMidpoint(pointA, pointB);
    const refDepthMid  = (isFinite(refDepthSampleMid) && refDepthSampleMid > 0)
        ? refDepthSampleMid
        : 0.5 * (depthA + depthB);

    Na__Bootstrap__State.activeCalibrationRef = {
        pointA, pointB,
        lengthMeters,
        depthA, depthB,
        deltaPx2D:      refDeltaPx2D,
        depthMid:       refDepthMid,
        focalPx:        result.focalPx,
        strategy:       result.strategy,
        status:         'applied'
    };
    Na__Bootstrap__State.primaryCalibrationRefOverlay =
        Na__Bootstrap__BuildCalibrationOverlayReference(pointA, pointB, lengthMeters, 'applied', 'REF1');
    Na__Bootstrap__State.secondaryCalibrationRefOverlay = null;

    const primaryRef = Na__Bootstrap__BuildWallReferenceRecord(pointA, pointB, lengthMeters, refDepthMid);
    if (primaryRef) {
        primaryRef.sCoord = 0;
        Na__Bootstrap__State.wallRefPrimary   = primaryRef;
        Na__Bootstrap__State.wallRefSecondary = null;
        Na__Bootstrap__CalibrationCtl.showSecondaryAvailable(true);
        Na__Bootstrap__Log(`Wall plane primary: ppm=${primaryRef.ppm.toFixed(2)}px/m at midpoint (${primaryRef.midpoint.x.toFixed(0)},${primaryRef.midpoint.y.toFixed(0)})`);
    } else {
        Na__Bootstrap__State.wallRefPrimary   = null;
        Na__Bootstrap__State.wallRefSecondary = null;
        Na__Bootstrap__CalibrationCtl.showSecondaryAvailable(false);
    }
    Na__Bootstrap__RefreshCalibrationSummary();

    Na__Bootstrap__Log(`Calibration applied (${result.strategy}): focalPx=${Math.round(result.focalPx)} refDeltaPx=${refDeltaPx2D.toFixed(0)} refDepthMid=${refDepthMid.toFixed(2)}m (typed ${(lengthMeters*1000).toFixed(0)}mm).`);
    Na__Bootstrap__RecomputeFocalAndMeasurements();
}

// Secondary wall reference: a second known length on the same wall used to
// stabilise the wall-plane interpolation across x-position.
function Na__Bootstrap__ApplySecondaryWallReference(pointA, pointB, lengthMeters) {
    console.info('[Na__Bootstrap] ApplySecondaryWallReference ENTERED', { pointA, pointB, lengthMeters });
    const primary = Na__Bootstrap__State.wallRefPrimary;
    if (!primary) {
        const reason = 'Cannot add secondary wall reference: primary is not set.';
        Na__Bootstrap__Log(reason);
        return { success: false, reason };
    }
    const cfg = Na__Bootstrap__State.appConfig;
    const minSepPx = (cfg.measurementHybrid && isFinite(cfg.measurementHybrid.minRefSeparationPx))
        ? cfg.measurementHybrid.minRefSeparationPx : 50;

    const depthSampleMid = Na__Bootstrap__SampleDepthAtSegmentMidpoint(pointA, pointB);
    const fallbackDepth = 0.5 * (Na__Bootstrap__SampleDepth(pointA) + Na__Bootstrap__SampleDepth(pointB));
    const secondaryDepthMid = (isFinite(depthSampleMid) && depthSampleMid > 0) ? depthSampleMid : fallbackDepth;
    const secondary = Na__Bootstrap__BuildWallReferenceRecord(pointA, pointB, lengthMeters, secondaryDepthMid);
    if (!secondary) {
        const reason = 'Secondary wall reference invalid (zero pixel length).';
        Na__Bootstrap__Log(reason);
        return { success: false, reason };
    }
    secondary.sCoord = Na__Bootstrap__ProjectOntoWallAxis(secondary.midpoint, primary);
    if (!isFinite(secondary.sCoord) || Math.abs(secondary.sCoord - primary.sCoord) < minSepPx) {
        const reason = `Secondary too close to primary along wall axis (|ds|=${Math.abs(secondary.sCoord - primary.sCoord).toFixed(0)}px < min ${minSepPx}px). Re-pick further away.`;
        Na__Bootstrap__Log(reason);
        return { success: false, reason };
    }

    Na__Bootstrap__State.wallRefSecondary = secondary;
    Na__Bootstrap__State.secondaryCalibrationRefOverlay =
        Na__Bootstrap__BuildCalibrationOverlayReference(pointA, pointB, lengthMeters, 'applied', 'REF2');
    Na__Bootstrap__Log(`Wall plane secondary: ppm=${secondary.ppm.toFixed(2)}px/m at sCoord=${secondary.sCoord.toFixed(0)}px (deltaS=${(secondary.sCoord - primary.sCoord).toFixed(0)}px from primary).`);
    Na__Bootstrap__RefreshCalibrationSummary();
    Na__Bootstrap__RecomputeFocalAndMeasurements();
    return { success: true };
}

// Builds an immutable wall-reference record from a pair of clicks plus the
// surveyor's known length. Returns null if the pixel separation is degenerate.
function Na__Bootstrap__BuildWallReferenceRecord(pointA, pointB, lengthMeters, depthMid) {
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;
    const pixelLengthPx = Math.sqrt(dx * dx + dy * dy);
    if (!(pixelLengthPx > 0) || !(lengthMeters > 0)) return null;
    const record = {
        pointA:        { x: pointA.x, y: pointA.y },
        pointB:        { x: pointB.x, y: pointB.y },
        lengthMeters,
        pixelLengthPx,
        ppm:           pixelLengthPx / lengthMeters,
        midpoint:      { x: (pointA.x + pointB.x) * 0.5, y: (pointA.y + pointB.y) * 0.5 },
        depthMid:      (isFinite(depthMid) && depthMid > 0) ? depthMid : NaN,
        sCoord:        0,
        axis:          null
    };
    record.axis = Na__Bootstrap__BuildWallAxisFromRef(record);
    return record;
}

function Na__Bootstrap__BuildCalibrationOverlayReference(pointA, pointB, lengthMeters, status, refTag) {
    return {
        pointA:       { x: pointA.x, y: pointA.y },
        pointB:       { x: pointB.x, y: pointB.y },
        lengthMeters: isFinite(lengthMeters) ? lengthMeters : null,
        status:       status || 'pending',
        refTag:       refTag || 'REF'
    };
}

// Updates the calibration sidebar summary block with current wall-plane state.
function Na__Bootstrap__RefreshCalibrationSummary() {
    if (!Na__Bootstrap__CalibrationCtl) return;
    const primary   = Na__Bootstrap__State.wallRefPrimary;
    const secondary = Na__Bootstrap__State.wallRefSecondary;
    if (!primary) {
        Na__Bootstrap__CalibrationCtl.showSummary('');
        return;
    }
    const lines = [
        `Primary  : ${(primary.lengthMeters * 1000).toFixed(0)} mm  ppm=${primary.ppm.toFixed(2)}`,
    ];
    if (secondary) {
        const ds = secondary.sCoord - primary.sCoord;
        lines.push(`Secondary: ${(secondary.lengthMeters * 1000).toFixed(0)} mm  ppm=${secondary.ppm.toFixed(2)}  ds=${ds.toFixed(0)}px`);
        const ratio = secondary.ppm / primary.ppm;
        lines.push(`Wall ppm interpolated linearly along axis (ratio sec/pri = ${ratio.toFixed(3)}).`);
    } else {
        lines.push('Secondary: --  add one for perspective-aware wall scaling.');
    }
    Na__Bootstrap__CalibrationCtl.showSummary(lines.join('\n'));
}

// ============================== OVERLAY CONTROLS ==============================
function Na__Bootstrap__BindOverlayControls() {
    const overlayCanvas = document.getElementById('Na__DepthOverlay__Canvas');
    const opacitySlider = document.getElementById('Na__DepthOverlay__OpacitySlider');
    const visibleToggle = document.getElementById('Na__DepthOverlay__VisibleCheckbox');

    opacitySlider.value = String(Na__Bootstrap__State.appConfig.ui.depthOverlayDefaultOpacity);
    Na__DepthOverlay__SetOpacity(overlayCanvas, parseFloat(opacitySlider.value));

    opacitySlider.addEventListener('input', () => {
        Na__DepthOverlay__SetOpacity(overlayCanvas, parseFloat(opacitySlider.value));
    });
    visibleToggle.addEventListener('change', () => {
        Na__DepthOverlay__SetVisible(overlayCanvas, visibleToggle.checked);
    });
}

// ============================== OVERLAY REDRAW ==============================
function Na__Bootstrap__RedrawMeasurementOverlay() {
    const canvas       = document.getElementById('Na__Measurement__Canvas');
    if (!Na__Bootstrap__State.appConfig) return;
    const uiConfig     = Na__Bootstrap__State.appConfig.ui;
    const items        = Na__Bootstrap__State.measurementsCache;
    const pendingFirst = Na__Bootstrap__State.pendingFirstClick || null;
    const hoverPoint   = Na__Bootstrap__State.pendingHover      || null;
    const calibrationRefs = [
        Na__Bootstrap__State.primaryCalibrationRefOverlay,
        Na__Bootstrap__State.secondaryCalibrationRefOverlay
    ].filter(Boolean);
    Na__MeasurementOverlay__RenderLines(canvas, items, pendingFirst, hoverPoint, uiConfig, {
        calibrationRefs,
        pickerMode:     Na__Bootstrap__State.pickerMode
    });
}

function Na__Bootstrap__GetCanvases() {
    return {
        base:        document.getElementById('Na__BaseImage__Canvas'),
        depth:       document.getElementById('Na__DepthOverlay__Canvas'),
        measurement: document.getElementById('Na__Measurement__Canvas')
    };
}

function Na__Bootstrap__GetExportContext() {
    const hasImage = !!Na__Bootstrap__State.sourceImageBitmap;
    return {
        hasImage,
        canvases:           Na__Bootstrap__GetCanvases(),
        suggestedFileStem:  Na__Bootstrap__StripFileExtension(Na__Bootstrap__LoadedFileName)
    };
}

function Na__Bootstrap__StripFileExtension(name) {
    if (!name) return 'image';
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
}

// ============================== DIAGNOSTICS ==============================
function Na__Bootstrap__Log(text) {
    const stamp = new Date().toLocaleTimeString('en-GB');
    Na__Bootstrap__State.diagnosticsLog.push(`[${stamp}] ${text}`);
    if (Na__Bootstrap__State.diagnosticsLog.length > 200) Na__Bootstrap__State.diagnosticsLog.shift();
    const el = document.getElementById('Na__Diagnostics__Output');
    if (el) {
        el.textContent = Na__Bootstrap__State.diagnosticsLog.join('\n');
        el.scrollTop   = el.scrollHeight;
    }
}

Na__Bootstrap__Main();
