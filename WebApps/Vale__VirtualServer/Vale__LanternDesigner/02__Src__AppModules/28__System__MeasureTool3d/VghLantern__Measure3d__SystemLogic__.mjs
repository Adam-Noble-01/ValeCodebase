/* =============================================================================
   VGHLANTERN - 3D MEASURE TOOL | SYSTEM LOGIC
   =============================================================================

   FILE       : VghLantern__Measure3d__SystemLogic__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Measure3d - SystemLogic
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Own the 3D View's measure tool: which tool is on, the dimensions, the pointer and the keys
   CREATED    : 21-Oct-2026

   DESCRIPTION:
   - THE PUBLIC FACE of the measure system, reached by the rest of the app only
     through Env3d__RenderPipeline (as the cross section is). Adam: "Add a
     dimension tool section to the 3D Tab menu - Vertex to vertex measurement
     tool - Face to face measurement tool ... I need this to aduit the test models
     to ensure dimensions are correct."
   - TWO TOOLS. Vertex to Vertex boxes the corner nearest the cursor, AutoCAD
     style, and measures between two corners; Face to Face rides a reticle over
     the faces and measures between two faces. Both use Polycam's axis guides and
     straight line nudge (SnapSolver__SolveEnd), in SketchUp's colours.
   - THE DIMENSIONS belong to the surface for the session: they survive orbits,
     presets, element views, display modes, cuts and leaving the tab, and are
     cleared when the lantern itself changes (an edit, or another lantern), so a
     dimension never describes a model that is no longer on screen. Never saved,
     printed or exported.
   - ONE CALLBACK OUT. The mode module receives a composed payload (the bar's
     words, the list's rows) and never touches three.js.

   ---------------------------------------------------------------------------

   INTERACTION MODEL (while a tool is on):
       move            snap under the cursor, at most once per animation frame
       drag            an orbit, never a point (past ClickMoveTolerancePx)
       click           first point, then the second, which finishes the dimension
       click a value   selects that dimension (grips, and a red delete chip)
       Arrow keys      lock: Right red, Left green, Up blue, Down square to face
                       (SketchUp's arrows); again to release
       Shift (held)    the nearest axis whatever the angle (TrueVision's ortho)
       Alt (held)      free, no axis snap (TrueVision's)
       Escape          cancel the point in progress, then deselect, then tool off
       Delete          remove the selected dimension (Backspace too)

   While a tool is on the hover inspector is suspended - no highlight, no pin - so
   a click places a point and never pins a member as well.

   ============================================================================= */

import * as THREE from 'three';

import { VghLantern__Env3d__PickIndex__Resolve } from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__PickIndex__.mjs';
import { VghLantern__Env3d__InspectStats__Describe } from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__InspectStats__.mjs';
import { VghLantern__Env3d__HoverInspector__SetSuspended } from '../06__Env3d__ThreeRenderPipeline/VghLantern__Env3d__HoverInspector__.mjs';

import {
    VghLantern__Measure3d__ConfigAccess__Section,
    VghLantern__Measure3d__ConfigAccess__RequireNumber,
    VghLantern__Measure3d__ConfigAccess__RequireString,
    VghLantern__Measure3d__ConfigAccess__RequireBoolean,
    VghLantern__Measure3d__ConfigAccess__RequireArray,
    VghLantern__Measure3d__ConfigAccess__RequireObject
} from './VghLantern__Measure3d__ConfigAccess__.mjs';

import {
    VghLantern__Measure3d__Axis,
    VghLantern__Measure3d__SnapSolver__CollectMeshes,
    VghLantern__Measure3d__SnapSolver__CastRay,
    VghLantern__Measure3d__SnapSolver__FindVertex,
    VghLantern__Measure3d__SnapSolver__RayAt,
    VghLantern__Measure3d__SnapSolver__SolveEnd,
    VghLantern__Measure3d__SnapSolver__SquareDirection,
    VghLantern__Measure3d__SnapSolver__SquareLockKey,
    VghLantern__Measure3d__SnapSolver__WorldToMm,
    VghLantern__Measure3d__SnapSolver__ModelPartsMm,
    VghLantern__Measure3d__SnapSolver__FormatMm,
    VghLantern__Measure3d__SnapSolver__FormatNumber
} from './VghLantern__Measure3d__SnapSolver__.mjs';

import {
    VghLantern__Measure3d__Overlay__Render,
    VghLantern__Measure3d__Overlay__Remove,
    VghLantern__Measure3d__Overlay__View
} from './VghLantern__Measure3d__Overlay__.mjs';

// =============================================================================
// REGION | Measure Tool System Logic Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Tool Keys
    // ------------------------------------------------------------
    export const VghLantern__Measure3d__ToolOff     =  '';
    export const VghLantern__Measure3d__ToolVertex  =  'vertex';
    export const VghLantern__Measure3d__ToolFace    =  'face';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Classes, Keys and Small Thresholds
    // ------------------------------------------------------------
    const CSS_HOST_MEASURING   =  'VghLantern__Measure3d__Host--measuring';   // <-- Crosshair over the canvas while a tool is on
    const CSS_HOST_OVER_LABEL  =  'VghLantern__Measure3d__Host--overLabel';   // <-- Pointer over a dimension's value: a click selects it

    const LOCK_KEYS  =  {                                                     // <-- SketchUp's arrow keys
        ArrowRight : 'x',
        ArrowLeft  : 'y',
        ArrowUp    : 'z',
        ArrowDown  : 'square'
    };

    const MIN_COMMIT_MM      =  0.001;                                        // <-- A second click on the first point is not a dimension
    const FLASH_MS           =  2500;                                         // <-- How long a notice ("No corner under the cursor") holds the bar
    const LABEL_HIT_SLOP_PX  =  3;
    const CHIP_HIT_SLOP_PX   =  2;
    const SIGNATURE_IGNORED  =  ['Lantern__ProjectedLinework__Data'];          // <-- Stored drawing linework: a cache, not the lantern
    // ------------------------------------------------------------


    // MODULE VARIABLES | List Revisions, Counted Across Every Surface
    // ------------------------------------------------------------
    // One counter for the session rather than one per surface, so a surface torn
    // down and mounted again can never report a revision the menu already holds.
    let VghLantern__Measure3d__RevisionCounter  =  0;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Reads
// -----------------------------------------------------------------------------

    // FUNCTION | Whether the Measure Tool Is Switched On in Config
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__IsEnabled() {
        return VghLantern__Measure3d__ConfigAccess__RequireBoolean('Feature', 'Enabled');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Icon Folder, Relative to the App Page
    // ------------------------------------------------------------
    function VghLantern__Measure3d__IconUrl(fileName) {
        return fileName ? VghLantern__Measure3d__ConfigAccess__RequireString('Icons', 'Folder') + fileName : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Tools the Menu Offers, With Their Icons
    // ------------------------------------------------------------
    // Empty when the feature is switched off, which is what removes the Measure
    // section from the 3D View menu rather than leaving inert buttons on screen.
    // Returns [{ Key, Label, Icon, FirstStep, SecondStep, NothingHere }].
    export function VghLantern__Measure3d__ListTools() {
        if (!VghLantern__Measure3d__IsEnabled()) return [];

        const tools  =  VghLantern__Measure3d__ConfigAccess__Section('Tools');
        const list   =  [];
        if (!Array.isArray(tools)) return list;

        for (let i = 0; i < tools.length; i++) {
            const tool  =  tools[i];
            if (!tool || typeof tool.Key !== 'string' || typeof tool.Label !== 'string') continue;

            list.push({
                Key         : tool.Key,
                Label       : tool.Label,
                Icon        : VghLantern__Measure3d__IconUrl(tool.Icon),
                FirstStep   : tool.FirstStep   || '',
                SecondStep  : tool.SecondStep  || '',
                NothingHere : tool.NothingHere || ''
            });
        }
        return list;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Tool's Record, or Null
    // ------------------------------------------------------------
    function VghLantern__Measure3d__ToolRecord(toolKey) {
        const tools  =  VghLantern__Measure3d__ListTools();
        for (let i = 0; i < tools.length; i++) {
            if (tools[i].Key === toolKey) return tools[i];
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Precision Choices: [{ Key, Label, Decimals }]
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__ListPrecisions() {
        if (!VghLantern__Measure3d__IsEnabled()) return [];

        const options  =  VghLantern__Measure3d__ConfigAccess__RequireArray('Precision', 'Options');
        const list     =  [];
        for (let i = 0; i < options.length; i++) {
            const option  =  options[i];
            if (!option || typeof option.Key !== 'string') continue;
            list.push({ Key : option.Key, Label : option.Label || option.Key, Decimals : Number(option.Decimals) || 0 });
        }
        return list;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Clear All Icon
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__ClearIcon() {
        if (!VghLantern__Measure3d__IsEnabled()) return '';
        return VghLantern__Measure3d__IconUrl(VghLantern__Measure3d__ConfigAccess__RequireString('Icons', 'Clear'));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Words From the Copy Block: One Line, or a Table Keyed by Axis
    // ------------------------------------------------------------
    function VghLantern__Measure3d__CopyText(fieldName) {
        return VghLantern__Measure3d__ConfigAccess__RequireString('Copy', fieldName);
    }

    function VghLantern__Measure3d__CopyTable(fieldName) {
        return VghLantern__Measure3d__ConfigAccess__RequireObject('Copy', fieldName);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fill a {token} Template
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Fill(template, values) {
        return String(template || '').replace(/\{(\w+)\}/g, function(match, name) {
            return Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : '';
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Surface State
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Lantern's Fingerprint, for Knowing When It Changed
    // ------------------------------------------------------------
    // The whole design block bar its stored drawing linework (a cache of the
    // drawings, not the lantern). Any other change clears the dimensions: being
    // conservative costs a re-measure, being lax would leave a dimension
    // describing a model that is no longer on screen.
    function VghLantern__Measure3d__Signature(lantern) {
        if (!lantern) return '';
        try {
            return JSON.stringify(lantern, function(key, value) {
                return SIGNATURE_IGNORED.indexOf(key) !== -1 ? undefined : value;
            });
        } catch (error) {
            return 'unreadable:' + Date.now();                                // <-- Cannot fingerprint it: treat it as changed
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Decimals the Chosen Precision Prints
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Decimals(state) {
        const options  =  VghLantern__Measure3d__ListPrecisions();
        for (let i = 0; i < options.length; i++) {
            if (options[i].Key === state.PrecisionKey) return options[i].Decimals;
        }
        return options.length ? options[0].Decimals : 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Meshes a Dimension Can Land On, Collected Once per Model and View
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Meshes(surface) {
        const state  =  surface.Measure3dState;
        if (!state.Meshes) {
            state.Meshes  =  VghLantern__Measure3d__SnapSolver__CollectMeshes(surface,
                VghLantern__Measure3d__ConfigAccess__RequireBoolean('Feature', 'MeasureSectionCuts'));
        }
        return state.Meshes;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Name the Part a Hit Landed On (the inspector's own words)
    // ------------------------------------------------------------
    // Cached per instance until the model is rebuilt: the inspector composes a
    // whole description to answer, and the name is all this needs.
    function VghLantern__Measure3d__NameOf(surface, mesh, faceIndex) {
        if (!mesh) return '';
        if (mesh.userData && mesh.userData.VghLantern__CrossSection__Helper) {
            return VghLantern__Measure3d__CopyText('SectionCutName') || '';
        }

        const pick  =  VghLantern__Env3d__PickIndex__Resolve({ object : mesh, faceIndex : faceIndex });
        if (!pick) return '';

        const state  =  surface.Measure3dState;
        const key    =  pick.Object3d.id + '#' + pick.EntryIndex;
        if (state.NameCache.has(key)) return state.NameCache.get(key);

        let name  =  '';
        try {
            const described  =  VghLantern__Env3d__InspectStats__Describe(pick, surface.LastSkeleton, surface.LastLantern);
            name  =  (described && described.TypeLabel) ? described.TypeLabel : '';
        } catch (error) {
            name  =  '';                                                      // <-- A name is a courtesy: never let it stop a measurement
        }
        state.NameCache.set(key, name);
        return name;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Outward Reporting
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Bar's Reading of the Live Line
    // ------------------------------------------------------------
    // "On Red Axis (X)" snapped, "Locked to ..." under an arrow key or Shift, and
    // "Free, 3.4 deg off Green (Y)" otherwise - how far off is the point of the
    // free line, so the reader can bring it on.
    function VghLantern__Measure3d__LiveState(live) {
        if (!live) return '';

        if (live.AxisKey !== VghLantern__Measure3d__Axis.Free) {
            const table  =  VghLantern__Measure3d__CopyTable(live.IsLocked ? 'LockedText' : 'SnappedText') || {};
            return table[live.AxisKey] || '';
        }
        if (!live.NearestKey) return '';

        const names  =  VghLantern__Measure3d__CopyTable('AxisNames') || {};
        return VghLantern__Measure3d__Fill(VghLantern__Measure3d__CopyText('FreeText'), {
            angle : live.AngleOffDegrees.toFixed(1),
            axis  : names[live.NearestKey] || live.NearestKey
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Row of the Menu's List
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Row(measure, state, decimals) {
        const chips    =  VghLantern__Measure3d__CopyTable('AxisChips') || {};
        const between  =  (measure.FromName && measure.ToName)
            ? VghLantern__Measure3d__Fill(VghLantern__Measure3d__CopyText('BetweenText'), { from : measure.FromName, to : measure.ToName })
            : (measure.FromName || measure.ToName || '');

        // A free dimension's X, Y and Z parts are the forensic reading: how far off
        // square two corners really are. A snapped one is all one part.
        const parts  =  (measure.AxisKey === VghLantern__Measure3d__Axis.Free)
            ? VghLantern__Measure3d__Fill(VghLantern__Measure3d__CopyText('PartsText'), {
                x : VghLantern__Measure3d__SnapSolver__FormatNumber(measure.PartsMm.X, decimals),
                y : VghLantern__Measure3d__SnapSolver__FormatNumber(measure.PartsMm.Y, decimals),
                z : VghLantern__Measure3d__SnapSolver__FormatNumber(measure.PartsMm.Z, decimals)
            })
            : '';

        return {
            Id         : measure.Id,
            Number     : measure.Number,
            Tool       : measure.Tool,
            AxisKey    : measure.AxisKey,
            AxisChip   : chips[measure.AxisKey] || measure.AxisKey,
            ValueText  : VghLantern__Measure3d__SnapSolver__FormatMm(measure.LengthMm, decimals),
            Between    : between,
            Parts      : parts,
            IsSelected : measure.Id === state.SelectedId
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Menu's List of Dimensions, as Plain Rows
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__ListMeasurements(surface) {
        const state  =  surface ? surface.Measure3dState : null;
        if (!state) return [];

        const decimals  =  VghLantern__Measure3d__Decimals(state);
        const rows      =  [];
        for (let i = 0; i < state.Measures.length; i++) {
            rows.push(VghLantern__Measure3d__Row(state.Measures[i], state, decimals));
        }
        return rows;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hand the Composed Payload to the Mode Module
    // ------------------------------------------------------------
    // ListRevision moves only when the list itself changes (a dimension added,
    // removed or selected, the precision), so the menu repaints its rows on those
    // and not on every frame of a live line.
    function VghLantern__Measure3d__Notify(surface) {
        const state  =  surface.Measure3dState;
        if (!state || typeof state.OnChanged !== 'function') return;

        const tool      =  VghLantern__Measure3d__ToolRecord(state.Tool);
        const decimals  =  VghLantern__Measure3d__Decimals(state);
        const live      =  state.Draft ? state.Live : null;

        let instruction  =  '';
        if (tool) instruction  =  state.Flash || (state.Draft ? tool.SecondStep : tool.FirstStep);

        state.OnChanged({
            Tool         : state.Tool,
            ToolLabel    : tool ? tool.Label : '',
            ToolIcon     : tool ? tool.Icon  : '',
            PrecisionKey : state.PrecisionKey,
            Instruction  : instruction,
            IsFlash      : !!(tool && state.Flash),
            LiveText     : live ? VghLantern__Measure3d__SnapSolver__FormatMm(live.LengthMm, decimals) : '',
            LiveState    : VghLantern__Measure3d__LiveState(live),
            LiveAxisKey  : live ? live.AxisKey : '',
            CanUndo      : !!state.Draft || state.Measures.length > 0,
            ListRevision : state.ListRevision,
            Rows         : VghLantern__Measure3d__ListMeasurements(surface),
            SelectedId   : state.SelectedId
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mark the List Changed, Then Report
    // ------------------------------------------------------------
    function VghLantern__Measure3d__ListChanged(surface) {
        surface.Measure3dState.ListRevision  =  ++VghLantern__Measure3d__RevisionCounter;
        VghLantern__Measure3d__Notify(surface);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hold a Short Notice in the Bar
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Flash(surface, text) {
        const state  =  surface.Measure3dState;
        if (!text) return;

        if (state.FlashTimer) clearTimeout(state.FlashTimer);
        state.Flash       =  text;
        state.FlashTimer  =  setTimeout(function() {
            if (!surface.Measure3dState) return;
            state.Flash       =  '';
            state.FlashTimer  =  0;
            VghLantern__Measure3d__Notify(surface);
        }, FLASH_MS);
        VghLantern__Measure3d__Notify(surface);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Overlay's Scene From the State
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Scene(state) {
        const draft  =  state.Draft;

        return {
            Measures   : state.Measures,
            SelectedId : state.SelectedId,                                    // <-- A row picked in the menu's list shows on the model, tool on or off
            ShowChip   : !!state.Tool,                                        // <-- The delete chip only when a click can reach it
            HoverId    : state.Tool ? state.HoverId : '',
            Decimals   : VghLantern__Measure3d__Decimals(state),
            Hover      : state.Tool ? state.Hover : null,
            Draft      : draft ? {
                Tool            : draft.Tool,
                Start           : draft.Start,
                StartNormal     : draft.StartNormal,
                SquareDirection : draft.SquareDirection,
                Target          : state.Hover ? state.Hover.Point : null,
                Live            : state.Live,
                LengthMm        : state.Live ? state.Live.LengthMm : 0
            } : null
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Draw the Overlay Now, and Keep the Cursor in Step
    // ------------------------------------------------------------
    // Called after every frame the model is drawn (SceneManager's OnAfterDraw),
    // so the dimensions follow an orbit frame for frame, and after a hover pass.
    function VghLantern__Measure3d__DrawNow(surface) {
        const state  =  surface.Measure3dState;
        if (!state || surface.IsDestroyed) return;

        if (state.DrawFrame) cancelAnimationFrame(state.DrawFrame);
        state.DrawFrame  =  0;

        // Nothing to draw and nothing drawn: an orbit with no dimensions and no
        // tool on must not rewrite an empty overlay every frame.
        const hasContent  =  state.Measures.length > 0 || !!state.Draft || !!(state.Tool && state.Hover);
        if (hasContent || !state.OverlayIsEmpty) {
            state.Hits            =  VghLantern__Measure3d__Overlay__Render(surface, VghLantern__Measure3d__Scene(state));
            state.OverlayIsEmpty  =  !hasContent;
        }

        const host  =  surface.HostElement;
        if (host) {
            host.classList.toggle(CSS_HOST_MEASURING,  !!state.Tool);
            host.classList.toggle(CSS_HOST_OVER_LABEL, !!(state.Tool && state.HoverId));
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Draw the Overlay on the Next Animation Frame
    // ------------------------------------------------------------
    function VghLantern__Measure3d__ScheduleDraw(surface) {
        const state  =  surface.Measure3dState;
        if (!state || state.DrawFrame) return;

        state.DrawFrame  =  requestAnimationFrame(function() {
            state.DrawFrame  =  0;
            VghLantern__Measure3d__DrawNow(surface);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hover and the Live Line
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Re-solve the Live Line Against the Snap Under the Cursor
    // ------------------------------------------------------------
    function VghLantern__Measure3d__SolveLive(state) {
        const draft  =  state.Draft;
        const hover  =  state.Hover;
        if (!draft || !hover) { state.Live = null; return; }

        const answer  =  VghLantern__Measure3d__SnapSolver__SolveEnd({
            Tool         : draft.Tool,
            Start        : draft.Start,
            StartNormal  : draft.StartNormal,
            Target       : hover.Point,
            TargetNormal : hover.Kind === 'face' ? hover.Normal : null,
            LockKey      : state.LockKey,
            HoldNearest  : state.Shift,
            Free         : state.Alt
        });
        answer.LengthMm  =  VghLantern__Measure3d__SnapSolver__WorldToMm(answer.LengthWorld);
        state.Live  =  answer;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Which Dimension's Value the Cursor Is Over
    // ------------------------------------------------------------
    // Each label is a box turned along its line; the cursor is turned into the
    // box's own frame to test it. Last drawn wins, as it is on top.
    function VghLantern__Measure3d__LabelAt(hits, x, y) {
        const labels  =  hits ? hits.Labels : null;
        if (!labels) return '';

        for (let i = labels.length - 1; i >= 0; i--) {
            const box   =  labels[i].Box;
            const turn  =  -(box.Deg || 0) * Math.PI / 180;
            const dx    =  x - box.X;
            const dy    =  y - box.Y;
            const lx    =  dx * Math.cos(turn) - dy * Math.sin(turn);
            const ly    =  dx * Math.sin(turn) + dy * Math.cos(turn);
            if (Math.abs(lx) <= box.W / 2 + LABEL_HIT_SLOP_PX && Math.abs(ly) <= box.H / 2 + LABEL_HIT_SLOP_PX) return labels[i].Id;
        }
        return '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find the Snap Under the Cursor, Re-solve, Redraw, Report
    // ------------------------------------------------------------
    function VghLantern__Measure3d__RunHover(surface) {
        const state  =  surface.Measure3dState;
        if (!state || surface.IsDestroyed) return;

        if (state.HoverFrame) cancelAnimationFrame(state.HoverFrame);
        state.HoverFrame  =  0;

        const pointer  =  state.Pointer;
        const view     =  VghLantern__Measure3d__Overlay__View(surface);

        if (!state.Tool || !pointer.Inside || !view || !surface.Camera) {
            state.Hover    =  null;
            state.HoverId  =  '';
            state.Live     =  null;
            VghLantern__Measure3d__DrawNow(surface);
            VghLantern__Measure3d__Notify(surface);
            return;
        }

        // Over a finished dimension's value (with no point being placed) the click
        // selects it, so nothing is snapped beneath it.
        state.HoverId  =  state.Draft ? '' : VghLantern__Measure3d__LabelAt(state.Hits, pointer.X, pointer.Y);

        if (state.HoverId) {
            state.Hover  =  null;
        } else {
            const meshes  =  VghLantern__Measure3d__Meshes(surface);
            const camera  =  surface.Camera;

            if (state.Tool === VghLantern__Measure3d__ToolVertex) {
                const corner  =  VghLantern__Measure3d__SnapSolver__FindVertex(surface, meshes, camera, state.Raycaster, view, { X : pointer.X, Y : pointer.Y });
                state.Hover  =  corner ? {
                    Kind  : 'vertex',
                    Point : corner.Point,
                    Name  : VghLantern__Measure3d__NameOf(surface, corner.Mesh, corner.FaceIndex) || VghLantern__Measure3d__CopyText('VertexName') || ''
                } : null;
            } else {
                const ray  =  VghLantern__Measure3d__SnapSolver__RayAt(state.Raycaster, camera, view, pointer.X, pointer.Y);
                const hit  =  VghLantern__Measure3d__SnapSolver__CastRay(surface, meshes, ray, null);
                state.Hover  =  hit ? {
                    Kind   : 'face',
                    Point  : hit.Point,
                    Normal : hit.Normal,
                    Name   : VghLantern__Measure3d__NameOf(surface, hit.Mesh, hit.FaceIndex)
                } : null;
            }
        }

        VghLantern__Measure3d__SolveLive(state);
        VghLantern__Measure3d__DrawNow(surface);
        VghLantern__Measure3d__Notify(surface);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Queue a Hover Pass for the Next Animation Frame
    // ------------------------------------------------------------
    // A pointermove burst can fire a dozen events between two painted frames, and
    // a corner search is real work: one pass per frame is what the screen shows.
    function VghLantern__Measure3d__ScheduleHover(surface) {
        const state  =  surface.Measure3dState;
        if (!state || state.HoverFrame) return;

        state.HoverFrame  =  requestAnimationFrame(function() {
            state.HoverFrame  =  0;
            VghLantern__Measure3d__RunHover(surface);
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Re-solve and Redraw Without Picking Again (a key changed)
    // ------------------------------------------------------------
    function VghLantern__Measure3d__RefreshLive(surface) {
        VghLantern__Measure3d__SolveLive(surface.Measure3dState);
        VghLantern__Measure3d__DrawNow(surface);
        VghLantern__Measure3d__Notify(surface);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Placing Points
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fix the First Point
    // ------------------------------------------------------------
    // Face to Face keeps the first face's normal: it is the square the draft may
    // snap to, and the plane of the small ring left on it.
    function VghLantern__Measure3d__StartDraft(surface) {
        const state        =  surface.Measure3dState;
        const hover        =  state.Hover;
        const startNormal  =  (hover.Kind === 'face' && hover.Normal) ? hover.Normal.clone() : null;

        state.Draft  =  {
            Tool            : state.Tool,
            Start           : hover.Point.clone(),
            StartNormal     : startNormal,
            StartName       : hover.Name || '',
            SquareDirection : VghLantern__Measure3d__SnapSolver__SquareDirection(state.Tool, startNormal),
            SquareLockKey   : VghLantern__Measure3d__SnapSolver__SquareLockKey(state.Tool, startNormal)
        };
        state.SelectedId  =  '';
        state.LockKey     =  '';

        VghLantern__Measure3d__SolveLive(state);
        VghLantern__Measure3d__DrawNow(surface);
        VghLantern__Measure3d__ListChanged(surface);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Finish the Dimension at the Second Point
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Commit(surface) {
        const state  =  surface.Measure3dState;
        const draft  =  state.Draft;
        const live   =  state.Live;
        if (!draft || !live || !state.Hover) return;

        if (live.LengthMm < MIN_COMMIT_MM) {
            VghLantern__Measure3d__Flash(surface, VghLantern__Measure3d__CopyText('SamePointText') || '');
            return;
        }

        const number  =  state.NextNumber++;
        const end     =  live.End.clone();

        state.Measures.push({
            Id       : 'M' + number,
            Number   : number,
            Tool     : draft.Tool,
            Start    : draft.Start.clone(),
            End      : end,
            Target   : state.Hover.Point.clone(),
            AxisKey  : live.AxisKey,
            IsLocked : live.IsLocked,
            LengthMm : live.LengthMm,
            PartsMm  : VghLantern__Measure3d__SnapSolver__ModelPartsMm(draft.Start, end),
            FromName : draft.StartName,
            ToName   : state.Hover.Name || ''
        });

        state.Draft    =  null;
        state.Live     =  null;
        state.LockKey  =  '';

        VghLantern__Measure3d__DrawNow(surface);
        VghLantern__Measure3d__ListChanged(surface);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle a Click That Was Not an Orbit
    // ------------------------------------------------------------
    // The delete chip first, then a dimension's value (only with no point being
    // placed), then a point. The snap is re-found at the click itself rather than
    // trusted from the last frame, so a quick click lands where it was made.
    function VghLantern__Measure3d__HandleClick(surface) {
        const state    =  surface.Measure3dState;
        const pointer  =  state.Pointer;
        const chip     =  state.Hits ? state.Hits.Chip : null;

        if (chip && Math.hypot(pointer.X - chip.X, pointer.Y - chip.Y) <= chip.R + CHIP_HIT_SLOP_PX) {
            VghLantern__Measure3d__Delete(surface, chip.Id);
            return;
        }

        if (!state.Draft) {
            const labelId  =  VghLantern__Measure3d__LabelAt(state.Hits, pointer.X, pointer.Y);
            if (labelId) {
                VghLantern__Measure3d__Select(surface, state.SelectedId === labelId ? '' : labelId);
                return;
            }
        }

        VghLantern__Measure3d__RunHover(surface);
        if (!state.Hover) {
            const tool  =  VghLantern__Measure3d__ToolRecord(state.Tool);
            VghLantern__Measure3d__Flash(surface, tool ? tool.NothingHere : '');
            return;
        }

        if (!state.Draft) VghLantern__Measure3d__StartDraft(surface);
        else              VghLantern__Measure3d__Commit(surface);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Lock (or Release) a Direction With an Arrow Key
    // ------------------------------------------------------------
    // Only while a point is being placed, as in SketchUp. The Down arrow locks
    // square to the first face, which resolves to the axis it coincides with, or to
    // nothing at all in Vertex to Vertex.
    function VghLantern__Measure3d__ToggleLock(surface, lockKey) {
        const state  =  surface.Measure3dState;
        if (!state.Draft) return;

        const target  =  (lockKey === VghLantern__Measure3d__Axis.Square) ? state.Draft.SquareLockKey : lockKey;
        if (!target) return;

        state.LockKey  =  (state.LockKey === target) ? '' : target;
        VghLantern__Measure3d__RefreshLive(surface);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Drop the Point in Progress
    // ------------------------------------------------------------
    function VghLantern__Measure3d__CancelDraft(surface) {
        const state  =  surface.Measure3dState;
        state.Draft    =  null;
        state.Live     =  null;
        state.LockKey  =  '';
        VghLantern__Measure3d__DrawNow(surface);
        VghLantern__Measure3d__ListChanged(surface);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pointer and Key Binding
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Register a Listener and Remember It for Detach
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Listen(state, target, type, handler, options) {
        target.addEventListener(type, handler, options);
        state.Listeners.push({ Target : target, Type : type, Handler : handler, Options : options });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether Keys Are Being Typed Into a Field
    // ------------------------------------------------------------
    function VghLantern__Measure3d__IsTyping(target) {
        if (!target || !target.tagName) return false;
        const tag  =  target.tagName.toLowerCase();
        return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable === true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether This Surface Is the One on Screen
    // ------------------------------------------------------------
    // The 3D View is kept alive while another mode is shown (display none), and
    // its keys must not reach into that mode.
    function VghLantern__Measure3d__IsOnScreen(state) {
        if (!state.Canvas || !state.Canvas.isConnected) return false;
        const rect  =  state.Canvas.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Pointer's Place on the Canvas
    // ------------------------------------------------------------
    function VghLantern__Measure3d__TrackPointer(state, ev) {
        const rect  =  state.Canvas.getBoundingClientRect();
        state.Pointer.X  =  ev.clientX - rect.left;
        state.Pointer.Y  =  ev.clientY - rect.top;
        state.Shift      =  !!ev.shiftKey;
        state.Alt        =  !!ev.altKey;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Every Interaction Listener for a Surface
    // ------------------------------------------------------------
    function VghLantern__Measure3d__Bind(surface) {
        const state      =  surface.Measure3dState;
        const canvas     =  state.Canvas;
        const clickSlop  =  VghLantern__Measure3d__ConfigAccess__RequireNumber('Snap', 'ClickMoveTolerancePx');

        VghLantern__Measure3d__Listen(state, canvas, 'pointermove', function(ev) {
            VghLantern__Measure3d__TrackPointer(state, ev);
            state.Pointer.Inside  =  true;

            if (state.Pointer.IsDown) {
                const travelled  =  Math.abs(ev.clientX - state.Pointer.DownClientX) + Math.abs(ev.clientY - state.Pointer.DownClientY);
                if (travelled > clickSlop) state.Pointer.IsDragging  =  true;
                return;                                                      // <-- Orbiting: the after-draw redraw follows the camera
            }
            if (state.Tool) VghLantern__Measure3d__ScheduleHover(surface);
        });

        VghLantern__Measure3d__Listen(state, canvas, 'pointerdown', function(ev) {
            VghLantern__Measure3d__TrackPointer(state, ev);
            state.Pointer.Inside       =  true;
            state.Pointer.IsDown       =  true;
            state.Pointer.IsDragging   =  false;
            state.Pointer.DownClientX  =  ev.clientX;
            state.Pointer.DownClientY  =  ev.clientY;
        });

        VghLantern__Measure3d__Listen(state, canvas, 'pointerup', function(ev) {
            const wasDragging  =  state.Pointer.IsDragging;
            VghLantern__Measure3d__TrackPointer(state, ev);
            state.Pointer.IsDown      =  false;
            state.Pointer.IsDragging  =  false;

            if (!state.Tool) return;
            if (wasDragging) { VghLantern__Measure3d__ScheduleHover(surface); return; }   // <-- The orbit moved the model under the cursor
            if (ev.button !== 0) return;                                     // <-- Right and middle are the controls' pan and dolly

            VghLantern__Measure3d__HandleClick(surface);
        });

        VghLantern__Measure3d__Listen(state, canvas, 'pointerleave', function() {
            state.Pointer.Inside      =  false;
            state.Pointer.IsDown      =  false;
            state.Pointer.IsDragging  =  false;
            if (state.Tool) VghLantern__Measure3d__RunHover(surface);       // <-- Clears the marker and the live line
        });

        // Zooming moves the model under a stationary cursor.
        VghLantern__Measure3d__Listen(state, canvas, 'wheel', function() {
            if (state.Tool) VghLantern__Measure3d__ScheduleHover(surface);
        }, { passive : true });

        VghLantern__Measure3d__Listen(state, window, 'keydown', function(ev) {
            if (!state.Tool || !VghLantern__Measure3d__IsOnScreen(state) || VghLantern__Measure3d__IsTyping(ev.target)) return;

            if (ev.key === 'Shift' || ev.key === 'Alt') {
                state.Shift  =  !!ev.shiftKey;
                state.Alt    =  !!ev.altKey;
                if (ev.key === 'Alt') ev.preventDefault();                   // <-- A lone Alt would otherwise move focus to the browser's menu
                VghLantern__Measure3d__RefreshLive(surface);
                return;
            }
            if (ev.ctrlKey || ev.metaKey || ev.altKey) return;               // <-- The app's own hotkeys: Alt+arrows navigate, Ctrl+S saves

            if (ev.key === 'Escape') {
                if (state.Draft)           VghLantern__Measure3d__CancelDraft(surface);
                else if (state.SelectedId) VghLantern__Measure3d__Select(surface, '');
                else                       VghLantern__Measure3d__SetTool(surface, VghLantern__Measure3d__ToolOff);
                return;
            }

            if (ev.key === 'Delete' || ev.key === 'Backspace') {
                if (state.SelectedId) {
                    VghLantern__Measure3d__Delete(surface, state.SelectedId);
                    ev.preventDefault();
                } else if (state.Draft && ev.key === 'Backspace') {
                    VghLantern__Measure3d__CancelDraft(surface);
                    ev.preventDefault();
                }
                return;
            }

            if (Object.prototype.hasOwnProperty.call(LOCK_KEYS, ev.key)) {
                VghLantern__Measure3d__ToggleLock(surface, LOCK_KEYS[ev.key]);
                ev.preventDefault();                                         // <-- Arrows would otherwise scroll the menu or the page
            }
        });

        VghLantern__Measure3d__Listen(state, window, 'keyup', function(ev) {
            if (!state.Tool) return;
            if (ev.key !== 'Shift' && ev.key !== 'Alt') return;

            state.Shift  =  !!ev.shiftKey;
            state.Alt    =  !!ev.altKey;
            VghLantern__Measure3d__RefreshLive(surface);
        });

        // A modifier held as the window loses focus never sends its keyup.
        VghLantern__Measure3d__Listen(state, window, 'blur', function() {
            if (!state.Shift && !state.Alt) return;
            state.Shift  =  false;
            state.Alt    =  false;
            if (state.Tool) VghLantern__Measure3d__RefreshLive(surface);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Attach the Measure Tool to a Live Surface
    // ------------------------------------------------------------
    // onChanged receives the composed payload (see Notify) on every change.
    // Idempotent: a second attach only takes the new callback and reports. Returns
    // false when the feature is switched off in config.
    export function VghLantern__Measure3d__Attach(surface, onChanged) {
        if (!surface || surface.IsDestroyed || !surface.Renderer) return false;
        if (!VghLantern__Measure3d__IsEnabled()) return false;

        if (surface.Measure3dState) {
            surface.Measure3dState.OnChanged  =  onChanged;
            VghLantern__Measure3d__ListChanged(surface);
            return true;
        }

        surface.Measure3dState  =  {
            Canvas           : surface.Renderer.domElement,
            Raycaster        : new THREE.Raycaster(),
            OnChanged        : onChanged,
            Listeners        : [],
            Tool             : VghLantern__Measure3d__ToolOff,
            PrecisionKey     : VghLantern__Measure3d__ConfigAccess__RequireString('Precision', 'Default'),   // <-- Every visit opens at the default
            Measures         : [],
            NextNumber       : 1,
            SelectedId       : '',
            HoverId          : '',
            Draft            : null,
            Hover            : null,
            Live             : null,
            LockKey          : '',
            Shift            : false,
            Alt              : false,
            Flash            : '',
            FlashTimer       : 0,
            Pointer          : { X : 0, Y : 0, Inside : false, IsDown : false, IsDragging : false, DownClientX : 0, DownClientY : 0 },
            Hits             : { Labels : [], Chip : null },
            Meshes           : null,
            NameCache        : new Map(),
            HoverFrame       : 0,
            DrawFrame        : 0,
            OverlayIsEmpty   : false,                                         // <-- True once an empty overlay has been drawn, so it is not drawn again
            ListRevision     : 0,
            LanternSignature : VghLantern__Measure3d__Signature(surface.LastLantern),
            PriorAfterDraw   : surface.OnAfterDraw || null
        };

        // The overlay follows every frame the model is drawn. Chained rather than
        // taken over, so a later after-draw hook and this one can live together.
        const previous  =  surface.Measure3dState.PriorAfterDraw;
        surface.OnAfterDraw  =  function(activeSurface) {
            if (typeof previous === 'function') previous(activeSurface);
            VghLantern__Measure3d__DrawNow(activeSurface);
        };

        VghLantern__Measure3d__Bind(surface);
        VghLantern__Measure3d__ListChanged(surface);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Detach the Measure Tool and Release Everything It Holds
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__Detach(surface) {
        const state  =  surface ? surface.Measure3dState : null;
        if (!state) return;

        if (state.HoverFrame) cancelAnimationFrame(state.HoverFrame);
        if (state.DrawFrame)  cancelAnimationFrame(state.DrawFrame);
        if (state.FlashTimer) clearTimeout(state.FlashTimer);

        for (let i = 0; i < state.Listeners.length; i++) {
            const entry  =  state.Listeners[i];
            entry.Target.removeEventListener(entry.Type, entry.Handler, entry.Options);
        }

        VghLantern__Env3d__HoverInspector__SetSuspended(surface, false);
        VghLantern__Measure3d__Overlay__Remove(surface);
        if (surface.HostElement) {
            surface.HostElement.classList.remove(CSS_HOST_MEASURING);
            surface.HostElement.classList.remove(CSS_HOST_OVER_LABEL);
        }

        surface.OnAfterDraw     =  state.PriorAfterDraw;
        surface.Measure3dState  =  null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch a Tool On, Change Tool, or Switch Off ('')
    // ------------------------------------------------------------
    // The hover inspector is suspended for as long as a tool is on, so a click
    // places a point and never pins a member as well.
    export function VghLantern__Measure3d__SetTool(surface, toolKey) {
        const state  =  surface ? surface.Measure3dState : null;
        if (!state) return;

        const next  =  VghLantern__Measure3d__ToolRecord(toolKey) ? toolKey : VghLantern__Measure3d__ToolOff;
        if (next === state.Tool) return;

        state.Tool        =  next;
        state.Draft       =  null;
        state.Live        =  null;
        state.Hover       =  null;
        state.HoverId     =  '';
        state.LockKey     =  '';
        state.Flash       =  '';

        VghLantern__Env3d__HoverInspector__SetSuspended(surface, !!next);

        if (next && state.Pointer.Inside) VghLantern__Measure3d__RunHover(surface);
        else                              VghLantern__Measure3d__DrawNow(surface);
        VghLantern__Measure3d__ListChanged(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Tool a Surface Has On ('' when none)
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__CurrentTool(surface) {
        return (surface && surface.Measure3dState) ? surface.Measure3dState.Tool : VghLantern__Measure3d__ToolOff;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Precision Dimensions Print At
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__SetPrecision(surface, precisionKey) {
        const state  =  surface ? surface.Measure3dState : null;
        if (!state) return;

        const options  =  VghLantern__Measure3d__ListPrecisions();
        let known  =  false;
        for (let i = 0; i < options.length; i++) {
            if (options[i].Key === precisionKey) known  =  true;
        }
        if (!known || state.PrecisionKey === precisionKey) return;

        state.PrecisionKey  =  precisionKey;
        VghLantern__Measure3d__DrawNow(surface);
        VghLantern__Measure3d__ListChanged(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Precision a Surface Prints At
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__CurrentPrecision(surface) {
        return (surface && surface.Measure3dState) ? surface.Measure3dState.PrecisionKey : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Select a Dimension ('' to Deselect)
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__Select(surface, measureId) {
        const state  =  surface ? surface.Measure3dState : null;
        if (!state) return;

        let next  =  '';
        for (let i = 0; i < state.Measures.length; i++) {
            if (state.Measures[i].Id === measureId) next  =  measureId;
        }
        if (next === state.SelectedId) return;

        state.SelectedId  =  next;
        VghLantern__Measure3d__DrawNow(surface);
        VghLantern__Measure3d__ListChanged(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove One Dimension
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__Delete(surface, measureId) {
        const state  =  surface ? surface.Measure3dState : null;
        if (!state) return;

        const kept  =  state.Measures.filter(function(measure) { return measure.Id !== measureId; });
        if (kept.length === state.Measures.length) return;

        state.Measures    =  kept;
        if (state.SelectedId === measureId) state.SelectedId  =  '';
        state.HoverId     =  '';
        VghLantern__Measure3d__DrawNow(surface);
        VghLantern__Measure3d__ListChanged(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove Every Dimension (the menu asks twice first)
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__Clear(surface) {
        const state  =  surface ? surface.Measure3dState : null;
        if (!state) return;

        state.Measures    =  [];
        state.SelectedId  =  '';
        state.HoverId     =  '';
        state.NextNumber  =  1;
        if (state.Draft) { state.Draft = null; state.Live = null; state.LockKey = ''; }

        VghLantern__Measure3d__DrawNow(surface);
        VghLantern__Measure3d__ListChanged(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | Take Back the Point in Progress, or Else the Last Dimension
    // ------------------------------------------------------------
    // The bar's Undo: a finger has no Escape key or Delete key.
    export function VghLantern__Measure3d__Undo(surface) {
        const state  =  surface ? surface.Measure3dState : null;
        if (!state) return;

        if (state.Draft) { VghLantern__Measure3d__CancelDraft(surface); return; }
        if (!state.Measures.length) return;

        VghLantern__Measure3d__Delete(surface, state.Measures[state.Measures.length - 1].Id);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Model and View Changes
// -----------------------------------------------------------------------------

    // FUNCTION | The Model Is About to Be Rebuilt
    // ------------------------------------------------------------
    // Called by RenderPipeline__Render before the groups are cleared. A point in
    // progress and the snap under the cursor refer to meshes about to be disposed,
    // so they go. The dimensions go only if the lantern itself changed: entering
    // the tab again rebuilds the same lantern, and the dimensions stay.
    export function VghLantern__Measure3d__OnModelRebuilt(surface, lantern) {
        const state  =  surface ? surface.Measure3dState : null;
        if (!state) return;

        state.Draft    =  null;
        state.Live     =  null;
        state.Hover    =  null;
        state.HoverId  =  '';
        state.LockKey  =  '';
        state.Meshes   =  null;
        state.NameCache.clear();

        const signature  =  VghLantern__Measure3d__Signature(lantern);
        if (signature !== state.LanternSignature) {
            state.Measures    =  [];
            state.SelectedId  =  '';
            state.NextNumber  =  1;
        }
        state.LanternSignature  =  signature;

        VghLantern__Measure3d__ScheduleDraw(surface);
        VghLantern__Measure3d__ListChanged(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Model Has Been Rebuilt
    // ------------------------------------------------------------
    // The build awaits its parts one by one, so a hover pass during it may have
    // collected a part-built mesh list: it is dropped here, once every part is in.
    export function VghLantern__Measure3d__OnModelBuilt(surface) {
        const state  =  surface ? surface.Measure3dState : null;
        if (!state) return;

        state.Meshes  =  null;
        state.NameCache.clear();
        if (state.Tool && state.Pointer.Inside) VghLantern__Measure3d__ScheduleHover(surface);
        else                                    VghLantern__Measure3d__ScheduleDraw(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | What Is Visible Has Changed (element view, display mode, cut)
    // ------------------------------------------------------------
    // No rebuild and no pointer movement, so the mesh list and the snap under the
    // cursor are re-found now rather than trusted. A cut also changes which faces
    // can be measured.
    export function VghLantern__Measure3d__OnViewChanged(surface) {
        const state  =  surface ? surface.Measure3dState : null;
        if (!state) return;

        state.Meshes  =  null;
        if (state.Tool && state.Pointer.Inside) VghLantern__Measure3d__ScheduleHover(surface);
        else                                    VghLantern__Measure3d__ScheduleDraw(surface);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
