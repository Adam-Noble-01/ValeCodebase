// =============================================================================
// VALEVISION AURA - ENGINE HOST - PARAMETER DUMP (DEVELOPER TOOLS)
// =============================================================================
//
// FILE       : Na__EngineHost__Dump__.js
// NAMESPACE  : Na__EngineHost
// MODULE     : Engine Host - Parameter Dump
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Everything the pinned engine holds at this moment, as plain data,
//              for the developers' parameter dump (Na__AppCore__ParameterDump__)
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - READ ONLY: nothing here sets the engine, bumps the graph or asks for a
//   render. The dump is taken whatever the engine is doing (refining, drawing
//   a still, lent to a sheet's viewport) and says which.
// - THE WHOLE STATE: every key of PainterlyNPR's State, not only the ones a
//   drawing set saves (those are given too, as SavedSettings), so the camera
//   preset, the pass viewer's view, Show influence and the rest are there.
// - BORROWED: while a sheet's viewport has the live engine, State's camera and
//   points are that viewport's; Camera.Environment and Points.Environment are
//   the 3D Environment's own.
// - EVERY RANGE CONTROL with its path into State, its range, its value and the
//   engine's own readout of it; the two choices with their options; the camera
//   presets with their cameras.
// - THE RENDER GRAPH: its flags, the inputs' versions and every pass's status
//   and last time. The graph module is read through its namespace, so a pin
//   without one of its exports still loads (as the host reads RefitPoints).
// - THE GPU in sizes only (targets, scale, the largest texture, the
//   renderer's name where the browser gives it): no pixels, no handles.
// - Only this folder imports from the engine; the import map's record lists
//   this module.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.4.8)
// - Initial build, for the avatar menu's Download a parameter dump.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports - the Core Library (PainterlyNPR, pinned)
// -----------------------------------------------------------------------------

    import { PainterlyNPR__AppCore__State as State } from 'PainterlyNPR/01__AppCore/PainterlyNPR__AppCore__State__.mjs';
    import * as PainterlyNPR__Graph from 'PainterlyNPR/20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';   // <-- By name at call time: a missing export would stop the whole page on another pin
    import { PainterlyNPR__GpuResources__Gpu as Gpu } from 'PainterlyNPR/21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
    import { PainterlyNPR__Interface__Ui as Ui, PainterlyNPR__Interface__Get } from 'PainterlyNPR/80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
    import { PainterlyNPR__Interface__CONTROLS as CONTROLS } from 'PainterlyNPR/80__System__HudOverlay/PainterlyNPR__Interface__Controls__.mjs';
    import {
        Na__EngineHost__Version,
        Na__EngineHost__SheetMm,
        Na__EngineHost__Ready,
        Na__EngineHost__Busy,
        Na__EngineHost__Borrowed,
        Na__EngineHost__WorkMode,
        Na__EngineHost__Camera,
        Na__EngineHost__EnvironmentPoints,
        Na__EngineHost__MaxPoints,
        Na__EngineHost__Settings,
        Na__EngineHost__Control,
        Na__EngineHost__Choices,
        Na__EngineHost__Presets,
        Na__EngineHost__PresetCamera,
        Na__EngineHost__PointTypes,
        Na__EngineHost__SceneCounts,
        Na__EngineHost__BuildingBounds
    } from './Na__EngineHost__PainterlyNpr__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Copy of Plain Engine Data (State is plain data; NaN and Infinity survive)
    // ------------------------------------------------------------
    function Na__EngineHost__DumpCopy(value) {
        if (value === undefined) return null;
        try { return structuredClone(value); }
        catch (error) { return JSON.parse(JSON.stringify(value)); }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Run One Part of the Dump: its value, or what went wrong
    // ------------------------------------------------------------
    function Na__EngineHost__DumpTry(fn) {
        try { return fn(); }
        catch (error) { return { DumpError: error && error.message ? error.message : String(error) }; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Where the Pin Lives (the import map's "PainterlyNPR/" prefix, resolved)
    // ------------------------------------------------------------
    function Na__EngineHost__DumpPin() {
        if (typeof import.meta.resolve !== 'function') return null;
        try { return new URL(import.meta.resolve('PainterlyNPR/')).pathname; }
        catch (error) { return null; }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Parts
// -----------------------------------------------------------------------------

    // FUNCTION | Every Range Control: { Key, Label, Path, Value, Readout, Min, Max, Step, Bump }
    // ------------------------------------------------------------
    function Na__EngineHost__DumpControls() {
        return Object.keys(CONTROLS).map((key) => {
            const spec = CONTROLS[key];
            const row = { Key: key, Path: Array.isArray(spec.Path) ? spec.Path.join('.') : null };
            Object.assign(row, Na__EngineHost__DumpTry(() => {
                const control = Na__EngineHost__Control(key);
                if (!control) return { Value: Na__EngineHost__DumpCopy(PainterlyNPR__Interface__Get(spec.Path)) };
                let readout = null;
                try { readout = control.Readout(control.Value); } catch (error) { readout = null; }
                return { Label: control.Label, Value: control.Value, Readout: readout, Min: control.Min, Max: control.Max, Step: control.Step };
            }));
            row.Bump = Array.isArray(spec.Bump) ? spec.Bump.slice() : null;
            return row;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Render Graph: flags, input versions, every pass
    // ------------------------------------------------------------
    function Na__EngineHost__DumpGraph() {
        const graph = PainterlyNPR__Graph.PainterlyNPR__RenderGraph__Graph || {};
        const passes = PainterlyNPR__Graph.PainterlyNPR__RenderGraph__PASSES || [];
        const versions = PainterlyNPR__Graph.PainterlyNPR__RenderGraph__Versions;
        return {
            Token         : graph.Token,
            Refining      : !!graph.Refining,
            Navigating    : !!graph.Navigating,
            Progressive   : !!graph.Progressive,
            PreviewQueued : !!graph.PreviewQueued,
            Proxy         : !!graph.Proxy,
            LastRefineMs  : graph.LastRefineMs,
            InputVersions : versions ? Na__EngineHost__DumpCopy(versions) : null,
            Passes        : passes.map((p) => ({                              // <-- Node (its row in the engine's own panel) left out: a DOM element
                Id      : p.Id,
                Label   : p.Label || p.Name || null,
                Home    : p.Home || null,
                Inputs  : Array.isArray(p.Inputs) ? p.Inputs.slice() : null,
                Deps    : Array.isArray(p.Deps) ? p.Deps.slice() : null,
                Status  : p.Status,
                Stamp   : p.Stamp,
                LastMs  : p.LastMs,
                Key     : p.Key
            }))
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The GPU, in Sizes Only
    // ------------------------------------------------------------
    function Na__EngineHost__DumpGpu() {
        const gl = Gpu.Gl;
        const out = { Width: Gpu.Width, Height: Gpu.Height, PxPerMm: Gpu.PxPerMm, Scale: Gpu.Scale, MaxSize: Gpu.MaxSize };
        if (gl) {
            const info = gl.getExtension('WEBGL_debug_renderer_info');
            out.Context  = gl.getParameter(gl.VERSION);
            out.Shading  = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
            out.Vendor   = info ? gl.getParameter(info.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
            out.Renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
            out.Canvas   = { Width: gl.canvas.width, Height: gl.canvas.height };
            out.ContextLost = gl.isContextLost();
        }
        out.Programs = Object.keys(Gpu.Programs || {});
        out.Targets = Object.entries(Gpu.Targets || {}).map(([key, t]) => ({
            Key: key, Name: t && t.Name, Width: t && t.Width, Height: t && t.Height, Formats: t && Array.isArray(t.Formats) ? t.Formats.slice() : null
        }));
        return out;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Dump
// -----------------------------------------------------------------------------

    // FUNCTION | Everything the Engine Holds Now, as Plain Data
    // ------------------------------------------------------------
    // Before the engine has started (a refused sign-in, a page without a
    // project) only its version, sheet and starting State are given.
    // ------------------------------------------------------------
    function Na__EngineHost__Dump() {
        const ready = Na__EngineHost__Ready();
        const out = {
            Engine  : 'PainterlyNPR',
            Version : Na__EngineHost__Version(),
            Pin     : Na__EngineHost__DumpPin(),
            Booted  : ready,
            Sheet   : Na__EngineHost__SheetMm()
        };
        if (ready) {
            out.LiveView = Na__EngineHost__DumpTry(() => ({
                WorkMode : Na__EngineHost__WorkMode(),
                Busy     : Na__EngineHost__Busy(),
                Borrowed : Na__EngineHost__Borrowed(),                          // <-- true: State's camera and points are a sheet viewport's
                Status   : Ui.Status ? Ui.Status.textContent : null
            }));
            out.Camera = Na__EngineHost__DumpTry(() => ({
                Live        : { Camera: Na__EngineHost__DumpCopy(State.Camera), Preset: State.CameraPreset },
                Environment : Na__EngineHost__Camera()
            }));
            out.Points = Na__EngineHost__DumpTry(() => ({
                Max         : Na__EngineHost__MaxPoints(),
                Types       : Na__EngineHost__PointTypes(),
                Live        : Na__EngineHost__DumpCopy(State.Points || []),
                Environment : Na__EngineHost__EnvironmentPoints()
            }));
            out.SavedSettings = Na__EngineHost__DumpTry(() => Na__EngineHost__Settings());
        }
        out.State = Na__EngineHost__DumpTry(() => Na__EngineHost__DumpCopy(State));
        out.Controls = Na__EngineHost__DumpTry(Na__EngineHost__DumpControls);
        out.Choices = Na__EngineHost__DumpTry(() => ({ InkFamily: Na__EngineHost__Choices('InkFamily'), PaperPreset: Na__EngineHost__Choices('PaperPreset') }));
        out.CameraPresets = Na__EngineHost__DumpTry(() => Na__EngineHost__Presets().map((p) => Object.assign({}, p, { Camera: Na__EngineHost__PresetCamera(p.Key) })));
        if (ready) {
            out.Interface = Na__EngineHost__DumpTry(() => ({
                ActiveTab       : Ui.ActiveTab,
                Placing         : Ui.Placing,
                SelectedPointId : Ui.SelectedPointId,
                NodeCollapsed   : Ui.NodeCollapsed,
                NodeKey         : Ui.NodeKey
            }));
            out.RenderGraph = Na__EngineHost__DumpTry(Na__EngineHost__DumpGraph);
            out.Gpu = Na__EngineHost__DumpTry(Na__EngineHost__DumpGpu);
            out.Scene = Na__EngineHost__DumpTry(() => ({ Counts: Na__EngineHost__SceneCounts(), BuildingBounds: Na__EngineHost__BuildingBounds() }));
        }
        return out;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__EngineHost__Dump
    };

// endregion -------------------------------------------------------------------
