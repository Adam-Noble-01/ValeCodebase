/* =============================================================================
   PAINTERLYNPR - HUD | INTERFACE - WIRE
   =============================================================================

   FILE       : PainterlyNPR__Interface__Wire__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - Interface - Wire
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Wire the whole interface once, at boot: folds, tabs, ranges,
                selects, presets, cameras, the seed, points, the keyboard, the
                pointer on the sheet, export
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Every listener the interface has is added here, once.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Interface
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : the view badge keeps its presses from the sheet, so "Back to
                   the drawing" works: in Experiment 01 the sheet took the pointer
                   on any press inside it, Edge gave the sheet the click, and the
                   button never fired (found by the parity test at v0.5.0);
                   v0.6.0 wires the work mode's switch; v0.5.4 hands the
                   sheet's camera (drags, wheel, fingers, + - 0) to
                   74__Camera__Navigation; otherwise none

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Engine__MAX_POINTS as MAX_POINTS } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__Maths__Clamp as Clamp } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__DeriveSeed,
    PainterlyNPR__SeededRandom__MintSeed,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_CLASSES as MATERIAL_CLASSES } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import {
    PainterlyNPR__RenderGraph__Bump,
    PainterlyNPR__RenderGraph__Request,
} from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import {
    PainterlyNPR__ArtDirection__AnchorAt,
    PainterlyNPR__ArtDirection__MakePoint,
    PainterlyNPR__ArtDirection__INDICATED_MATERIALS  as  INDICATED_MATERIALS,
    PainterlyNPR__ArtDirection__POINT_TYPES          as  POINT_TYPES,
} from '../65__ArtDirection__InfluencePoints/PainterlyNPR__ArtDirection__Points__.mjs';
import {
    PainterlyNPR__Interface__DuplicatePoint,
    PainterlyNPR__Interface__PointById,
    PainterlyNPR__Interface__PointChanged,
    PainterlyNPR__Interface__PointNumber,
    PainterlyNPR__Interface__RemovePoint,
    PainterlyNPR__Interface__SelectPoint,
    PainterlyNPR__Interface__SetPointValue,
    PainterlyNPR__Interface__TogglePoint,
} from '../65__ArtDirection__InfluencePoints/PainterlyNPR__Interface__PointControls__.mjs';
import { PainterlyNPR__Interface__UpdateOverlay } from '../65__ArtDirection__InfluencePoints/PainterlyNPR__Interface__PointOverlay__.mjs';
import { PainterlyNPR__CameraRig__ApplyPreset } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';
import { PainterlyNPR__Navigation__Attach } from '../74__Camera__Navigation/PainterlyNPR__Navigation__OrbitMode__.mjs';
import {
    PainterlyNPR__Interface__Hover,
    PainterlyNPR__Interface__ResetCameraZoom,
    PainterlyNPR__Interface__SheetMm,
    PainterlyNPR__Interface__ToggleViewLock,
    PainterlyNPR__Interface__UpdateZoomReadout,
    PainterlyNPR__Interface__ViewLockedNote,
    PainterlyNPR__Interface__ZoomCamera,
} from './PainterlyNPR__Interface__CameraControls__.mjs';
import {
    PainterlyNPR__Interface__ApplyPenPreset,
    PainterlyNPR__Interface__ApplyVegPreset,
    PainterlyNPR__Interface__SetChoice,
    PainterlyNPR__Interface__SetControl,
    PainterlyNPR__Interface__SyncControls,
    PainterlyNPR__Interface__CONTROLS  as  CONTROLS,
} from './PainterlyNPR__Interface__Controls__.mjs';
import {
    PainterlyNPR__Interface__Status,
    PainterlyNPR__Interface__Query      as  $,
    PainterlyNPR__Interface__QueryAll   as  $$,
    PainterlyNPR__Interface__Ui         as  Ui,
    PainterlyNPR__Interface__ZOOM_STEP  as  ZOOM_STEP,
} from './PainterlyNPR__Interface__Dom__.mjs';
import {
    PainterlyNPR__Interface__CloseInfo,
    PainterlyNPR__Interface__InfoBubbles,
    PainterlyNPR__Interface__RestoreFolds,
    PainterlyNPR__Interface__SetFold,
} from './PainterlyNPR__Interface__Folds__.mjs';
import { PainterlyNPR__Interface__WireWorkMode } from './PainterlyNPR__Interface__WorkMode__.mjs';
import { PainterlyNPR__SceneEdit__Tap } from '../83__Hud__SceneEditing/PainterlyNPR__SceneEdit__Actions__.mjs';
import { PainterlyNPR__Interface__SelectPass } from '../81__Hud__PassViewer/PainterlyNPR__Interface__GraphStrip__.mjs';
import {
    PainterlyNPR__Interface__ApplySettingsJson,
    PainterlyNPR__Interface__UpdateSettingsJson,
} from '../85__System__ProjectPersistence/PainterlyNPR__Interface__SettingsJson__.mjs';
import { PainterlyNPR__Saves__Wire } from '../85__System__ProjectPersistence/PainterlyNPR__Saves__SavedSettings__.mjs';
import { PainterlyNPR__UndoHistory__Wire } from '../84__System__UndoHistory/PainterlyNPR__Interface__UndoHistory__.mjs';
import { PainterlyNPR__Export__Png } from '../86__Export__StillRender/PainterlyNPR__Export__Png__.mjs';
import { PainterlyNPR__TypeIn__Register, PainterlyNPR__TypeIn__Wire } from './PainterlyNPR__Interface__TypeIn__.mjs';

// =============================================================================
// REGION | Interface - Wire
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Interface
// -----------------------------------------------------------------------------

    // FUNCTION | Wire the Whole Interface
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__Wire() {
        Ui.Root    =  $('#PainterlyNPR__App__Root');
        Ui.Canvas  =  $('#PainterlyNPR__App__Canvas');
        Ui.Points  =  $('#PainterlyNPR__App__PointLayer');
        Ui.Status  =  $('#PainterlyNPR__App__Status');
        Ui.Hover   =  $('#PainterlyNPR__App__Hover');

        // Info bubbles: every group's descriptions behind an eye
        PainterlyNPR__Interface__InfoBubbles(document);
        document.addEventListener('click', (e) => { if (!e.target.closest('.PainterlyNPR__Info')) PainterlyNPR__Interface__CloseInfo(); });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape') PainterlyNPR__Interface__CloseInfo(); });

        // Folds: the panel and the render graph give their room to the sheet
        for (const button of $$('[data-fold]')) {
            button.addEventListener('click', () => {
                const which  =  button.dataset.fold;
                PainterlyNPR__Interface__SetFold(which, !Ui.Root.classList.contains(`PainterlyNPR--fold${which}`));
            });
        }
        PainterlyNPR__Interface__RestoreFolds();
        if (window.ResizeObserver) new ResizeObserver(() => PainterlyNPR__Interface__UpdateOverlay()).observe($('.PainterlyNPR__Desk'));

        // Sections - AURA's fold-downs (v0.7.2), where the tabs were. Ui.ActiveTab
        // keeps its name for the point overlay and the wrappers: it reads
        // 'ArtDirection' while that section is open, as it did while its tab was
        const art  =  $('[data-panel="ArtDirection"]');
        const sectionsChanged  =  () => {
            Ui.ActiveTab  =  art && art.open ? 'ArtDirection' : 'Scene';
            PainterlyNPR__Interface__UpdateOverlay();
        };
        // One fold open at a time at each level (v0.8.4): opening a section, or
        // a group or fold inside one, folds its open siblings, so the panel never
        // grows into a list too long to use
        for (const fold of $$('.PainterlyNPR__Section[data-panel], .PainterlyNPR__Fold')) {
            fold.addEventListener('toggle', () => {
                if (fold.open) for (const other of fold.parentElement.children) if (other !== fold && other.tagName === 'DETAILS' && other.open) other.open = false;
                if (fold.matches('.PainterlyNPR__Section')) sectionsChanged();
            });
        }
        sectionsChanged();

        // Ranges - each readout can be typed into as well as dragged
        PainterlyNPR__TypeIn__Wire();
        for (const [key, spec] of Object.entries(CONTROLS)) {
            const input  =  $(`[data-control="${key}"]`);
            if (!input) continue;
            PainterlyNPR__TypeIn__Register(input, spec.Format);
            input.addEventListener('input', () => {
                const value  =  parseFloat(input.value);
                const output  =  $(`[data-readout="${key}"]`);
                if (output) output.textContent = spec.Format(value);
                PainterlyNPR__Interface__SetControl(key, value);                // <-- Controls' own, which a wrapper's sliders call too (v0.8.1)
            });
        }

        // Selects and toggles - a menu's choice is Controls' SetChoice, which a wrapper's panel calls too (v0.8.1)
        $('[data-select="InkFamily"]').addEventListener('change', (e) => PainterlyNPR__Interface__SetChoice('data-select', 'InkFamily', e.target.value));

        // Pen presets
        for (const button of $$('[data-pen-preset]')) button.addEventListener('click', () => PainterlyNPR__Interface__ApplyPenPreset(button.dataset.penPreset));

        // The vegetation's presets, and its outline hand and leaf marks
        for (const chip of $$('[data-veg-preset]')) chip.addEventListener('click', () => PainterlyNPR__Interface__ApplyVegPreset(chip.dataset.vegPreset));
        for (const select of $$('[data-pen-select]')) select.addEventListener('change', () => PainterlyNPR__Interface__SetChoice('data-pen-select', select.dataset.penSelect, select.value));
        $('[data-select="PaperPreset"]').addEventListener('change', (e) => PainterlyNPR__Interface__SetChoice('data-select', 'PaperPreset', e.target.value));
        $('[data-select="CloudType"]').addEventListener('change', (e) => PainterlyNPR__Interface__SetChoice('data-select', 'CloudType', e.target.value));
        $('[data-toggle="ShowInfluence"]').addEventListener('change', (e) => { State.ShowInfluence = e.target.checked; PainterlyNPR__RenderGraph__Bump('Overlay'); PainterlyNPR__Interface__UpdateOverlay(); PainterlyNPR__RenderGraph__Request('Refine'); });

        // Cameras
        for (const button of $$('[data-camera]')) {
            button.addEventListener('click', () => {
                if (Ui.ViewLocked) { PainterlyNPR__Interface__ViewLockedNote(); return; }
                PainterlyNPR__CameraRig__ApplyPreset(button.dataset.camera);
                Ui.LastCamera  =  button.dataset.camera;
                PainterlyNPR__RenderGraph__Bump('Camera');
                PainterlyNPR__Interface__SyncControls();
                PainterlyNPR__RenderGraph__Request('Navigate');
            });
        }

        // Seed
        $('#PainterlyNPR__App__NewSeed').addEventListener('click', () => {
            State.Seed  =  PainterlyNPR__SeededRandom__MintSeed();
            for (const p of State.Points) p.Seed = PainterlyNPR__SeededRandom__DeriveSeed(State.Seed, 'point:' + p.Id) % 997;
            PainterlyNPR__RenderGraph__Bump('Seed', 'ArtDirection');
            PainterlyNPR__Interface__SyncControls();
            PainterlyNPR__RenderGraph__Request('Refine');
        });

        // Art direction: add points by clicking the sheet
        for (const button of $$('[data-add-point]')) {
            button.addEventListener('click', () => {
                if (State.Points.length >= MAX_POINTS) { PainterlyNPR__Interface__Status(`The field holds ${MAX_POINTS} points at most.`); return; }
                Ui.Placing  =  button.dataset.addPoint;
                Ui.Root.classList.add('PainterlyNPR--placing');
                PainterlyNPR__Interface__Status(`Click the sheet to place ${POINT_TYPES[Ui.Placing].Label.toLowerCase()}. Esc cancels.`);
            });
        }
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && Ui.Placing) { e.preventDefault(); Ui.Placing = null; Ui.Root.classList.remove('PainterlyNPR--placing'); PainterlyNPR__Interface__Status('Placement cancelled.'); } });

        // The selected point from the keyboard, while its handles are on the sheet:
        // Delete removes, Ctrl+D duplicates, [ and ] size it (Shift: by 10 mm), H
        // switches it off and on, Esc lets go. A slider keeps its arrow keys.
        window.addEventListener('keydown', (e) => {
            const point   =  PainterlyNPR__Interface__PointById(Ui.SelectedPointId);
            const focus   =  document.activeElement;
            const typing  =  focus && (/^(TEXTAREA|SELECT)$/.test(focus.tagName) || (focus.tagName === 'INPUT' && focus.type !== 'range'));
            if (!point || Ui.Placing || typing || Ui.Points.hidden || e.defaultPrevented) return;
            const key  =  e.key.toLowerCase();
            if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); PainterlyNPR__Interface__RemovePoint(point.Id); }
            else if (key === 'd' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); PainterlyNPR__Interface__DuplicatePoint(point.Id); }
            else if ((e.key === '[' || e.key === ']' || e.key === '{' || e.key === '}') && !e.ctrlKey && !e.metaKey) {
                const step  =  (e.shiftKey ? 10 : 2) * (e.key === '[' || e.key === '{' ? -1 : 1);
                PainterlyNPR__Interface__SetPointValue(point, 'RadiusMm', Clamp(point.RadiusMm + step, 10, 140), null);
            }
            else if (key === 'h' && !e.ctrlKey && !e.metaKey && !e.altKey) PainterlyNPR__Interface__TogglePoint(point.Id);
            else if (e.key === 'Escape') PainterlyNPR__Interface__SelectPoint(null);
        });

        // The sheet: place a point, name what lies under the pointer. The camera
        // is the navigation's (74__Camera__Navigation, ValeVision 3D's orbit mode):
        // attached after the placing listener, so a press that placed a point
        // (taken with preventDefault) never also orbits.
        const sheet  =  $('#PainterlyNPR__App__Sheet');
        sheet.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 || !Ui.Placing) return;
            e.preventDefault();
            const [x, y]  =  PainterlyNPR__Interface__SheetMm(e);
            const type    =  Ui.Placing;
            const point   =  PainterlyNPR__ArtDirection__MakePoint(type, x, y, { Anchor: type === 'Fade' ? 'Paper' : 'Object', Target: type === 'LineControl' ? 'Object' : 'Area' });
            PainterlyNPR__ArtDirection__AnchorAt(point, x, y);
            if (point.ObjectId < 0) { point.Anchor = 'Paper'; point.Target = 'Area'; }
            else if (type === 'Indication' && INDICATED_MATERIALS.includes(MATERIAL_CLASSES[point.MaterialId].Key)) point.Target = 'Material';   // <-- Dropped on brick: all the brick it reaches
            State.Points.push(point);
            Ui.Placing  =  null;
            Ui.Root.classList.remove('PainterlyNPR--placing');
            PainterlyNPR__Interface__SelectPoint(point.Id, true);                    // <-- The point just placed is the point being edited
            PainterlyNPR__Interface__PointChanged();
            PainterlyNPR__Interface__Status(`${POINT_TYPES[type].Label} placed as point ${PainterlyNPR__Interface__PointNumber(point)} - its sliders are on the point.`);
        });
        sheet.addEventListener('pointermove', (e) => PainterlyNPR__Interface__Hover(e));
        sheet.addEventListener('pointerleave', () => { if (Ui.Hover) Ui.Hover.textContent = ''; });
        PainterlyNPR__Navigation__Attach(sheet, {
            Canvas    :  Ui.Canvas,
            Allowed   :  () => !Ui.Placing,
            Locked    :  () => Ui.ViewLocked,                                   // <-- The padlock: a drag is still a drag (it lets no point go), never an orbit
            OnLocked  :  () => PainterlyNPR__Interface__ViewLockedNote(),
            OnMove    :  () => { for (const button of $$('[data-camera]')) button.classList.remove('PainterlyNPR__Button--active'); PainterlyNPR__Interface__UpdateZoomReadout(); },
            OnSettle  :  () => PainterlyNPR__Interface__UpdateSettingsJson(),
            OnTap     :  (e) => { if (Ui.SelectedPointId !== null && !Ui.Points.hidden) PainterlyNPR__Interface__SelectPoint(null); PainterlyNPR__SceneEdit__Tap(e); },   // <-- A click on bare paper lets the point go; it selects what it lands on, or paints with the brush (83, v0.7.0)
            OnReset   :  (key) => { Ui.LastCamera = key; PainterlyNPR__Interface__SyncControls(); },
            Home      :  () => Ui.LastCamera,
        });

        // Back to the final composite
        $('#PainterlyNPR__App__ViewBack').addEventListener('click', () => PainterlyNPR__Interface__SelectPass('Composite'));
        $('#PainterlyNPR__App__ViewBadge').addEventListener('pointerdown', (e) => e.stopPropagation());   // <-- A press on the badge is not the sheet's: the sheet would take the pointer, and the click with it

        // Export
        for (const button of $$('[data-export]')) button.addEventListener('click', () => PainterlyNPR__Export__Png(button.dataset.export));
        $('#PainterlyNPR__App__ApplyJson').addEventListener('click', () => {
            try { PainterlyNPR__Interface__ApplySettingsJson($('#PainterlyNPR__App__SettingsJson').value); }
            catch (error) { PainterlyNPR__Interface__Status(`Settings not applied - ${error.message}`); }
        });
        $('#PainterlyNPR__App__CopyJson').addEventListener('click', async () => {
            const area  =  $('#PainterlyNPR__App__SettingsJson');
            try { await navigator.clipboard.writeText(area.value); PainterlyNPR__Interface__Status('Settings copied.'); }
            catch (error) { area.select(); PainterlyNPR__Interface__Status('Select-all done - press Ctrl+C to copy.'); }
        });

        PainterlyNPR__Saves__Wire();                                            // <-- Saved settings: this browser, and 21__Generated__UserProjects when served

        window.addEventListener('resize', () => PainterlyNPR__Interface__UpdateOverlay());

        // The camera's zoom bar, and L for the view lock (+ - 0, R and the moving
        // keys are the navigation's)
        for (const button of $$('[data-camera-zoom]')) {
            button.addEventListener('click', () => {
                const how  =  button.dataset.cameraZoom;
                if (how === 'Reset') PainterlyNPR__Interface__ResetCameraZoom();
                else PainterlyNPR__Interface__ZoomCamera(how === 'In' ? -ZOOM_STEP : ZOOM_STEP);
            });
        }
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName)) return;
            if (e.key === 'l' || e.key === 'L') PainterlyNPR__Interface__ToggleViewLock();
        });
        $('#PainterlyNPR__App__ViewLock').addEventListener('click', () => PainterlyNPR__Interface__ToggleViewLock());
        PainterlyNPR__Interface__ToggleViewLock(false, true);

        PainterlyNPR__Interface__WireWorkMode();                                // <-- The header's Rendered / Proxy switch, and P (v0.6.0)
        PainterlyNPR__UndoHistory__Wire();                                      // <-- Undo and redo: Ctrl + Z, Ctrl + Y and the meta strip's arrows (v0.7.4); last, so it starts from the drawing as wired
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Interface__Wire,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
