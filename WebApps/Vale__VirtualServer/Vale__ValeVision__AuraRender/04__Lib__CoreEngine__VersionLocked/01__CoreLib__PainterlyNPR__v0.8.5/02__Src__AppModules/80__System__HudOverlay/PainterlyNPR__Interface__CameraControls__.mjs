/* =============================================================================
   PAINTERLYNPR - HUD | INTERFACE - CAMERA CONTROLS
   =============================================================================

   FILE       : PainterlyNPR__Interface__CameraControls__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - Interface - CameraControls
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The sheet under the pointer, the camera's zoom and its view lock,
                and the hover readout from the truth buffers
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - The padlock holds the view still while points are set.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Interface
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import CameraControlsConfig from './Na__Interface__CameraControls__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Engine__SHEET_HEIGHT_MM  as  SHEET_HEIGHT_MM,
    PainterlyNPR__Engine__SHEET_WIDTH_MM   as  SHEET_WIDTH_MM,
} from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_CLASSES as MATERIAL_CLASSES } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import {
    PainterlyNPR__RenderGraph__Bump,
    PainterlyNPR__RenderGraph__Request,
} from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import {
    PainterlyNPR__GpuResources__Cpu  as  Cpu,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__GeometryBuffers__Index } from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import { PainterlyNPR__CameraRig__Zoom } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';
import { PainterlyNPR__CameraRig__CAMERA_PRESETS as CAMERA_PRESETS } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Presets__.mjs';
import {
    PainterlyNPR__Interface__Status,
    PainterlyNPR__Interface__Query     as  $,
    PainterlyNPR__Interface__QueryAll  as  $$,
    PainterlyNPR__Interface__Ui        as  Ui,
} from './PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__Interface__UpdateSettingsJson } from '../85__System__ProjectPersistence/PainterlyNPR__Interface__SettingsJson__.mjs';

// =============================================================================
// REGION | Interface - Camera Controls
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__Interface__CameraControls__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const LOCK_ICONS  =  PainterlyNPR__ConfigAccess__Section(CameraControlsConfig, 'PainterlyNPR__InterfaceCamera__Config', 'Icons', ['Closed', 'Open']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Interface
// -----------------------------------------------------------------------------

    // FUNCTION | Sheet Coordinates From a Pointer Event
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__SheetMm(event) {
        const rect  =  Ui.Canvas.getBoundingClientRect();
        return [((event.clientX - rect.left) / rect.width) * SHEET_WIDTH_MM, (1 - (event.clientY - rect.top) / rect.height) * SHEET_HEIGHT_MM];
    }
    // ------------------------------------------------------------


    // FUNCTION | Zoom the Camera - nearer the model, or further back
    // ------------------------------------------------------------
    // The wheel, a trackpad pinch, two fingers, the zoom bar and + / - all move
    // the camera: a perspective camera's distance, an elevation's scale. The page
    // and the sheet keep their size. Reset returns to the camera preset's own
    // framing, keeping the angle the camera has been orbited to.
    // A lock for the view while points are being set: a temporary hold, not a
    // saved view. Locked, nothing moves the camera - no orbit, zoom, reset or
    // preset - and a try says so; the points still place, drag and size.
    function PainterlyNPR__Interface__ToggleViewLock(locked, quiet) {
        Ui.ViewLocked  =  locked == null ? !Ui.ViewLocked : locked;
        const button  =  $('#PainterlyNPR__App__ViewLock');
        if (!button) return;
        button.classList.toggle('PainterlyNPR__LockButton--locked', Ui.ViewLocked);
        button.setAttribute('aria-pressed', String(Ui.ViewLocked));
        button.title  =  Ui.ViewLocked ? 'View locked - click (or L) to unlock' : 'Lock the view - stops orbit, zoom and camera presets while you set points (L)';
        button.innerHTML  =  Ui.ViewLocked ? VIEW_LOCK_CLOSED : VIEW_LOCK_OPEN;
        if (!quiet) PainterlyNPR__Interface__Status(Ui.ViewLocked ? 'View locked.' : 'View unlocked.');
    }

    function PainterlyNPR__Interface__ViewLockedNote() {
        PainterlyNPR__Interface__Status('The view is locked - the padlock by the zoom (or L) unlocks it.');
        const button  =  $('#PainterlyNPR__App__ViewLock');
        if (!button) return;
        button.classList.remove('PainterlyNPR__LockButton--nudge');
        void button.offsetWidth;                                               // <-- Restart the nudge if it is already running
        button.classList.add('PainterlyNPR__LockButton--nudge');
    }

    const VIEW_LOCK_CLOSED  =  LOCK_ICONS.Closed;
    const VIEW_LOCK_OPEN    =  LOCK_ICONS.Open;

    function PainterlyNPR__Interface__ZoomCamera(delta) {
        if (Ui.ViewLocked) { PainterlyNPR__Interface__ViewLockedNote(); return; }
        PainterlyNPR__CameraRig__Zoom(delta);
        PainterlyNPR__RenderGraph__Bump('Camera');
        for (const button of $$('[data-camera]')) button.classList.remove('PainterlyNPR__Button--active');
        PainterlyNPR__Interface__UpdateZoomReadout();
        PainterlyNPR__Interface__UpdateSettingsJson();
        PainterlyNPR__RenderGraph__Request('Navigate');
    }

    function PainterlyNPR__Interface__ResetCameraZoom() {
        if (Ui.ViewLocked) { PainterlyNPR__Interface__ViewLockedNote(); return; }
        const base  =  CAMERA_PRESETS[Ui.LastCamera] || CAMERA_PRESETS[State.CameraPreset] || CAMERA_PRESETS.ThreeQuarter;
        State.Camera.Distance    =  base.Distance;
        State.Camera.HalfHeight  =  base.HalfHeight;
        PainterlyNPR__Interface__ZoomCamera(0);
    }

    function PainterlyNPR__Interface__UpdateZoomReadout() {
        const value  =  $('#PainterlyNPR__App__ZoomValue');
        const c      =  State.Camera;
        if (!value || !c) return;
        value.textContent  =  c.Mode === 'Ortho' ? `1:${Math.round(c.HalfHeight * 2000 / SHEET_HEIGHT_MM)}` : `${c.Distance.toFixed(c.Distance < 20 ? 1 : 0)} m`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Hover - name what lies under the pointer, from the truth buffers
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__Hover(event) {
        if (!Cpu.Valid) return;
        const [mmX, mmY]  =  PainterlyNPR__Interface__SheetMm(event);
        const i  =  PainterlyNPR__GeometryBuffers__Index(mmX * Gpu.PxPerMm, mmY * Gpu.PxPerMm);
        if (i < 0) { Ui.Hover.textContent = ''; return; }
        const object  =  Scene.ObjectById.get(Math.round(Cpu.Geo[i + 1]));
        if (!object) { Ui.Hover.textContent = `Sky - reserved paper · ${mmX.toFixed(0)}, ${mmY.toFixed(0)} mm`; return; }
        Ui.Hover.textContent  =  `${object.Name} · object ${object.Id} · ${MATERIAL_CLASSES[object.MaterialId].Label.toLowerCase()} · ${object.Role.toLowerCase()} · ${Cpu.Geo[i].toFixed(1)} m · light ${Cpu.Geo[i + 3].toFixed(2)}`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Interface__Hover,
        PainterlyNPR__Interface__ResetCameraZoom,
        PainterlyNPR__Interface__SheetMm,
        PainterlyNPR__Interface__ToggleViewLock,
        PainterlyNPR__Interface__UpdateZoomReadout,
        PainterlyNPR__Interface__ViewLockedNote,
        PainterlyNPR__Interface__ZoomCamera,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
