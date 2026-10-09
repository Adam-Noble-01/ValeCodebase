// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - RENDER CONTROLS (RE-RENDER THE PICTURE)
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__RenderControls__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Render Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The side menu's Render Quality section: the same quality and
//              picture settings as ValeVision 3D's Export Image panel, and
//              Re-Render, which renders this picture again at them
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - THE SAME CHOICES AS THE 3D VIEW: resolution, aspect ratio, anti-aliasing,
//   Enhance Whitecard and the Advanced Linework Settings (linework thickness,
//   profile line thickness, silly lines), asked of ValeVision 3D's render bridge
//   (Na__PageLayout__RenderBridge, found through the host link: the app around
//   this page since v2.76.0, or the tab that opened it) and set to what the
//   picture on the sheet was made at. Without the bridge the config's copy of
//   the choices is shown.
// - RE-RENDER asks ValeVision 3D to render the picture again from the view it
//   was made from (saved with the layout: camera, layers, lighting), at the
//   settings chosen here; it then puts its own view back. The new picture
//   takes the old one's place on the sheet: same aspect, nothing moves; a new
//   aspect keeps the centre and the width. The page then has unsaved changes.
// - It says why it cannot, rather than fail: no ValeVision 3D behind the page,
//   ValeVision 3D on another project, a picture with no saved view, a 2D
//   drawing picture while the Model View shows 3D (or the other way round), or
//   a render already running.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.76.0)
// - The bridge is found through the host link (Na__PageLayoutSystem__Host__):
//   window.parent when this page is the app's Drawing Editor page.
//
// 09-Oct-2026 - Version 1.0.0
// - Initial build with the side menu (ValeVision3D v2.75.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Pictures, Page Events
    // ------------------------------------------------------------
    import { Na__PageLayout__LoadImageFromBlob, Na__PageLayout__SetImage } from './Na__PageLayoutSystem__SystemLogic__Main__.js';
    import { Na__PageLayout__Toast, Na__PageLayout__Emit, Na__PageLayout__On } from './Na__PageLayoutSystem__UiNotify__.js';
    import { Na__PageLayout__Host__Bridge } from './Na__PageLayoutSystem__Host__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants (Hard-Coded Fallback Defaults)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fallback Choices (ValeVision 3D's Export Image Panel, 09-Oct-2026)
    // ------------------------------------------------------------
    const Na__PageLayout__Render__FALLBACK = Object.freeze({
        resolutions      : [1024, 2048, 4096, 8192],
        aspectRatios     : ['3:2', '4:3', '16:9'],
        antiAliasSamples : [1, 2, 4, 8, 16],
        defaultSamples   : 16,
        lineworkStops    : [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0],
        sillyStops       : [
            { label : 'Straight',  amplitudePx : 0.0  },
            { label : 'Subtle',    amplitudePx : 0.75 },
            { label : 'Gentle',    amplitudePx : 1.5  },
            { label : 'Wavy',      amplitudePx : 2.5  },
            { label : 'Very Wavy', amplitudePx : 4.0  },
            { label : 'Silly',     amplitudePx : 6.0  },
            { label : 'Absurd',    amplitudePx : 9.0  }
        ]
    });
    const Na__PageLayout__Render__SAME_ASPECT    = 'picture';                        // <-- The aspect select's "same as the picture" value
    const Na__PageLayout__Render__DEFAULT_HEIGHT = 4096;
    // ------------------------------------------------------------

    // MODULE CONSTANTS | DOM Ids
    // ------------------------------------------------------------
    const Na__PageLayout__Render__IDS = Object.freeze({
        resolution      : 'naRenderResolution',
        resolutionValue : 'naRenderResolutionValue',
        aspect          : 'naRenderAspect',
        antiAlias       : 'naRenderAntiAlias',
        enhance         : 'naRenderEnhance',
        linework        : 'naRenderLinework',
        lineworkValue   : 'naRenderLineworkValue',
        profile         : 'naRenderProfile',
        profileValue    : 'naRenderProfileValue',
        silly           : 'naRenderSilly',
        sillyValue      : 'naRenderSillyValue',
        rerender        : 'naRenderRerender',
        status          : 'naRenderStatus',
        picture         : 'naRenderPicture'
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The ValeVision 3D Tab
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | ValeVision 3D's Render Bridge, or Null
    // ------------------------------------------------------------
    function Na__PageLayout__Render__Bridge() {
        return Na__PageLayout__Host__Bridge();                              // <-- The app around this page, or the tab that opened it
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Do Two Project Tokens Name the Same Job? ("64135" Names "64135__Holt")
    // ------------------------------------------------------------
    function Na__PageLayout__Render__SameProject(a, b) {
        const x = String(a || '').split('/').pop();
        const y = String(b || '').split('/').pop();
        if (!x || !y) return true;
        return x === y || x.indexOf(y + '__') === 0 || y.indexOf(x + '__') === 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Choices, From the 3D Tab or the Config
    // ------------------------------------------------------------
    function Na__PageLayout__Render__ResolveOptions(state) {
        const section = (state && state.config) ? state.config['PageLayout__RenderControls__Config'] : null;
        const P       = 'PageLayout__RenderControls__Config__';
        const F       = Na__PageLayout__Render__FALLBACK;
        const list    = (key, fallback) => (section && Array.isArray(section[P + key]) && section[P + key].length) ? section[P + key] : fallback;
        const options = {
            resolutions      : list('Resolutions', F.resolutions).filter(Number.isFinite),
            aspectRatios     : list('AspectRatios', F.aspectRatios).map(String),
            antiAliasSamples : list('AntiAliasSamples', F.antiAliasSamples).filter(Number.isFinite),
            defaultSamples   : (section && Number.isFinite(section[P + 'DefaultAntiAliasSamples'])) ? section[P + 'DefaultAntiAliasSamples'] : F.defaultSamples,
            enhanceDefault   : true,
            lineworkStops    : list('LineworkStops', F.lineworkStops).filter(Number.isFinite),
            sillyStops       : list('SillyStops', F.sillyStops).map((s) => ({
                label       : String(s.Label || s.label || ''),
                amplitudePx : Number(Number.isFinite(s.AmplitudePx) ? s.AmplitudePx : s.amplitudePx) || 0
            }))
        };

        let bridgeOptions = null;
        const bridge = Na__PageLayout__Render__Bridge();
        try { bridgeOptions = bridge && typeof bridge.GetRenderOptions === 'function' ? bridge.GetRenderOptions() : null; } catch (error) { bridgeOptions = null; }
        if (bridgeOptions) {
            if (Array.isArray(bridgeOptions.Resolutions) && bridgeOptions.Resolutions.length)           options.resolutions      = bridgeOptions.Resolutions.slice();
            if (Array.isArray(bridgeOptions.AspectRatios) && bridgeOptions.AspectRatios.length)         options.aspectRatios     = bridgeOptions.AspectRatios.map(String);
            if (Array.isArray(bridgeOptions.AntiAliasSamples) && bridgeOptions.AntiAliasSamples.length) options.antiAliasSamples = bridgeOptions.AntiAliasSamples.slice();
            if (Number.isFinite(bridgeOptions.DefaultAntiAliasSamples)) options.defaultSamples = bridgeOptions.DefaultAntiAliasSamples;
            if (typeof bridgeOptions.EnhanceDefault === 'boolean')       options.enhanceDefault = bridgeOptions.EnhanceDefault;
            if (Array.isArray(bridgeOptions.LineworkStops) && bridgeOptions.LineworkStops.length) options.lineworkStops = bridgeOptions.LineworkStops.slice();
            if (Array.isArray(bridgeOptions.SillyStops) && bridgeOptions.SillyStops.length) {
                options.sillyStops = bridgeOptions.SillyStops.map((s) => ({ label : String(s.label || ''), amplitudePx : Number(s.amplitudePx) || 0 }));
            }
        }
        return options;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Index of the Closest Value in a List
    // ------------------------------------------------------------
    function Na__PageLayout__Render__Nearest(list, value) {
        let best = 0;
        list.forEach((item, index) => {
            if (Math.abs(item - value) < Math.abs(list[best] - value)) best = index;
        });
        return best;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | "W:H" as a Number (3:2 -> 1.5), or NaN
    // ------------------------------------------------------------
    function Na__PageLayout__Render__Ratio(text) {
        const parts = String(text || '').split(':').map(Number);
        return (parts.length === 2 && parts[0] > 0 && parts[1] > 0) ? parts[0] / parts[1] : NaN;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Resolution's Label, as the 3D Tab Writes It (4096 -> 4k)
    // ------------------------------------------------------------
    function Na__PageLayout__Render__ResLabel(heightPx) {
        return `${Math.round((heightPx / 1024) * 10) / 10}k`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render Controls Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize the Render Quality Section
    // ------------------------------------------------------------
    function Na__PageLayout__InitRenderControls(state, requestRedraw) {
        if (!state) return;

        const el = (key) => document.getElementById(Na__PageLayout__Render__IDS[key]);
        const ui = {};
        Object.keys(Na__PageLayout__Render__IDS).forEach((key) => { ui[key] = el(key); });
        if (!ui.rerender) return;

        const options = Na__PageLayout__Render__ResolveOptions(state);      // <-- Read once: the tab that opened the page cannot change
        let busy      = false;


        // SUB FUNCTION | Fill the Lists and Ranges From the Choices
        // ------------------------------------------------------------
        const buildControls = () => {
            if (ui.resolution) {
                ui.resolution.min  = 0;
                ui.resolution.max  = Math.max(0, options.resolutions.length - 1);
                ui.resolution.step = 1;
            }
            if (ui.antiAlias) {
                ui.antiAlias.textContent = '';
                options.antiAliasSamples.forEach((count) => {
                    const option = document.createElement('option');
                    option.value = String(count);
                    option.textContent = count <= 1 ? 'Off (one sample)' : `${count}x`;
                    ui.antiAlias.appendChild(option);
                });
            }
            [[ui.linework, options.lineworkStops], [ui.profile, options.lineworkStops], [ui.silly, options.sillyStops]].forEach(([range, stops]) => {
                if (!range) return;
                range.min  = 0;
                range.max  = Math.max(0, stops.length - 1);
                range.step = 1;
            });
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | The Aspect List: the Picture's Own First When It Is Not One of the Choices
        // ------------------------------------------------------------
        const buildAspects = () => {
            if (!ui.aspect) return;
            const meta    = state.sourceImageMeta || {};
            const current = (state.renderSettings && state.renderSettings.Render__AspectRatio) || meta.aspectRatio || '';
            const ratio   = (meta.width && meta.height) ? meta.width / meta.height : Na__PageLayout__Render__Ratio(current);
            const match   = options.aspectRatios.find((text) => Math.abs(Na__PageLayout__Render__Ratio(text) - ratio) < 0.002);

            ui.aspect.textContent = '';
            if (!match && Number.isFinite(ratio)) {
                const option = document.createElement('option');
                option.value = Na__PageLayout__Render__SAME_ASPECT;
                option.textContent = `Same as the Picture (${current || ratio.toFixed(3) + ':1'})`;
                ui.aspect.appendChild(option);
            }
            options.aspectRatios.forEach((text) => {
                const option = document.createElement('option');
                option.value = text;
                option.textContent = text;
                ui.aspect.appendChild(option);
            });
            ui.aspect.value = match || (Number.isFinite(ratio) ? Na__PageLayout__Render__SAME_ASPECT : options.aspectRatios[0]);
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Set the Controls to What the Picture Was Made At
        // ------------------------------------------------------------
        const setFromPicture = () => {
            const rs = state.renderSettings || {};
            const height = Number.isFinite(rs.Render__HeightPx) ? rs.Render__HeightPx : Na__PageLayout__Render__DEFAULT_HEIGHT;
            if (ui.resolution) ui.resolution.value = String(Na__PageLayout__Render__Nearest(options.resolutions, height));
            buildAspects();
            if (ui.antiAlias) {
                const samples = Number.isFinite(rs.Render__AntiAliasSamples) ? rs.Render__AntiAliasSamples : options.defaultSamples;
                ui.antiAlias.value = String(options.antiAliasSamples[Na__PageLayout__Render__Nearest(options.antiAliasSamples, samples)]);
            }
            if (ui.enhance) ui.enhance.checked = (typeof rs.Render__EnhanceWhitecard === 'boolean') ? rs.Render__EnhanceWhitecard : options.enhanceDefault;
            if (ui.linework) ui.linework.value = String(Na__PageLayout__Render__Nearest(options.lineworkStops, Number.isFinite(rs.Render__LineworkFactor) ? rs.Render__LineworkFactor : 1));
            if (ui.profile)  ui.profile.value  = String(Na__PageLayout__Render__Nearest(options.lineworkStops, Number.isFinite(rs.Render__ProfileLineFactor) ? rs.Render__ProfileLineFactor : 1));
            if (ui.silly)    ui.silly.value    = String(Na__PageLayout__Render__Nearest(options.sillyStops.map((s) => s.amplitudePx), Number.isFinite(rs.Render__SillyLinesPx) ? rs.Render__SillyLinesPx : 0));
            refreshLabels();
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | The Settings the Controls Show, as a Layout Stores Them
        // ------------------------------------------------------------
        const readControls = () => {
            const meta   = state.sourceImageMeta || {};
            const height = options.resolutions[parseInt(ui.resolution ? ui.resolution.value : '0', 10)] || Na__PageLayout__Render__DEFAULT_HEIGHT;
            let aspect   = ui.aspect ? ui.aspect.value : options.aspectRatios[0];
            if (aspect === Na__PageLayout__Render__SAME_ASPECT) {
                aspect = (state.renderSettings && state.renderSettings.Render__AspectRatio) || `${meta.width}:${meta.height}`;
            }
            const silly = options.sillyStops[parseInt(ui.silly ? ui.silly.value : '0', 10)] || { amplitudePx : 0 };
            return {
                Render__HeightPx          : height,
                Render__AspectRatio       : aspect,
                Render__AntiAliasSamples  : parseInt(ui.antiAlias ? ui.antiAlias.value : String(options.defaultSamples), 10),
                Render__EnhanceWhitecard  : ui.enhance ? ui.enhance.checked : options.enhanceDefault,
                Render__LineworkFactor    : options.lineworkStops[parseInt(ui.linework ? ui.linework.value : '2', 10)] || 1,
                Render__ProfileLineFactor : options.lineworkStops[parseInt(ui.profile ? ui.profile.value : '2', 10)] || 1,
                Render__SillyLinesPx      : silly.amplitudePx
            };
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | The Value Labels Beside Each Control, and the Picture Line
        // ------------------------------------------------------------
        const refreshLabels = () => {
            const asked = readControls();
            const ratio = Na__PageLayout__Render__Ratio(asked.Render__AspectRatio);
            if (ui.resolutionValue) {
                const width = Number.isFinite(ratio) ? Math.round(asked.Render__HeightPx * ratio) : 0;
                ui.resolutionValue.textContent = Na__PageLayout__Render__ResLabel(asked.Render__HeightPx);
                ui.resolutionValue.title = width ? `${width} x ${asked.Render__HeightPx} px` : '';
            }
            if (ui.lineworkValue) ui.lineworkValue.textContent = `${asked.Render__LineworkFactor.toFixed(2)}x`;
            if (ui.profileValue)  ui.profileValue.textContent  = `${asked.Render__ProfileLineFactor.toFixed(2)}x`;
            if (ui.sillyValue) {
                const stop = options.sillyStops[parseInt(ui.silly ? ui.silly.value : '0', 10)];
                ui.sillyValue.textContent = stop ? stop.label : '';
            }
            if (ui.picture) {
                const meta = state.sourceImageMeta || {};
                const rs   = state.renderSettings || {};
                if (!state.viewportImage) {
                    ui.picture.textContent = 'No picture on the sheet yet';
                } else {
                    const bits = [`${meta.width} x ${meta.height} px`];
                    if (rs.Render__AspectRatio) bits.push(rs.Render__AspectRatio);
                    if (Number.isFinite(rs.Render__AntiAliasSamples)) bits.push(rs.Render__AntiAliasSamples > 1 ? `${rs.Render__AntiAliasSamples}x anti-aliasing` : 'no anti-aliasing');
                    if (typeof rs.Render__EnhanceWhitecard === 'boolean') bits.push(rs.Render__EnhanceWhitecard ? 'Enhance on' : 'Enhance off');
                    ui.picture.textContent = 'This picture: ' + bits.join(', ');
                }
            }
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Can It Re-Render Now? { ok, reason }
        // ------------------------------------------------------------
        const availability = () => {
            if (!state.viewportImage) return { ok : false, reason : 'Open a saved layout, or press Create Drawing in ValeVision 3D, to have a picture to re-render.' };
            if (!state.sourceView)    return { ok : false, reason : 'This picture does not record the view it was made from, so it cannot be re-rendered. Press Create Drawing in ValeVision 3D for a new one.' };
            const bridge = Na__PageLayout__Render__Bridge();
            if (!bridge) return { ok : false, reason : 'Re-rendering needs the 3D model behind this page. Open the project in ValeVision 3D, then use Saved Drawings there to open this layout.' };
            let projectId = '';
            let busyThere = false;
            let options3d = null;
            try {
                projectId = typeof bridge.GetProjectId === 'function' ? bridge.GetProjectId() : '';
                busyThere = typeof bridge.IsBusy === 'function' && bridge.IsBusy();
                options3d = typeof bridge.GetRenderOptions === 'function' ? bridge.GetRenderOptions() : null;
            } catch (error) {
                return { ok : false, reason : 'ValeVision 3D did not answer. Reload it, then try again.' };
            }
            if (!Na__PageLayout__Render__SameProject(projectId, state.project.id)) {
                return { ok : false, reason : 'ValeVision 3D now shows another project.' };
            }
            if (busyThere) return { ok : false, reason : 'ValeVision 3D is rendering. Try again when it has finished.' };
            const isDrawingPicture = state.sourceView.View__Kind === 'drawing';
            if (options3d && isDrawingPicture && !options3d.IsDrawingView) return { ok : false, reason : 'This picture was made from a 2D drawing. Back on the Model View, open that drawing, then come back here (Alt+Right) to re-render it.' };
            if (options3d && !isDrawingPicture && options3d.IsDrawingView) return { ok : false, reason : 'The Model View is showing a 2D drawing. Return it to the 3D view, then come back here (Alt+Right) to re-render this picture.' };
            return { ok : true, reason : 'Re-renders this picture in ValeVision 3D from the view it was made from, at the settings above.' };
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Enable What Can Be Used, and Say Why Not
        // ------------------------------------------------------------
        const refreshState = () => {
            const avail = availability();
            ui.rerender.disabled = busy || !avail.ok;
            if (ui.status && !busy) {
                ui.status.textContent = avail.reason;
                ui.status.classList.toggle('na-layout-menu__meta-line--muted', !avail.ok);
            }
            [ui.resolution, ui.aspect, ui.antiAlias, ui.enhance, ui.linework, ui.profile, ui.silly].forEach((control) => {
                if (control) control.disabled = busy;
            });
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Re-Render the Picture in the ValeVision 3D Tab
        // ------------------------------------------------------------
        const rerender = async () => {
            if (busy) return;
            const avail = availability();
            if (!avail.ok) { Na__PageLayout__Toast(avail.reason, true); refreshState(); return; }

            const bridge = Na__PageLayout__Render__Bridge();
            const asked  = readControls();
            busy = true;
            refreshState();
            if (ui.status) ui.status.textContent = 'Asking ValeVision 3D to render...';

            try {
                const result = await bridge.Render({ sourceView : state.sourceView, renderSettings : asked }, (text) => {
                    if (ui.status) ui.status.textContent = String(text || '');
                });
                const blob  = new Blob([result.blob], { type : 'image/png' });   // <-- This window's own Blob (the 3D tab's can go)
                const image = await Na__PageLayout__LoadImageFromBlob(blob);
                Na__PageLayout__SetImage(state, image, {
                    width       : result.width,
                    height      : result.height,
                    aspectRatio : result.aspectRatio
                }, { keepPlacement : true });
                state.imageBlob      = blob;
                state.imageIsSaved   = false;                               // <-- The saved layout still has the old picture
                state.renderSettings = result.renderSettings || asked;
                requestRedraw();
                Na__PageLayout__Emit('image', { rerendered : true });
                Na__PageLayout__Emit('changed', { what : 'render' });
                Na__PageLayout__Toast(`Re-rendered at ${result.width} x ${result.height} px${result.wasClamped ? ' (reduced to fit this device)' : ''}`);
            } catch (error) {
                Na__PageLayout__Toast((error && error.message) || 'The re-render failed', true);
            } finally {
                busy = false;
                buildAspects();
                refreshLabels();
                refreshState();
            }
        };
        // ------------------------------------------------------------


        // Wire the controls
        // ------------------------------------------------------------
        [ui.resolution, ui.linework, ui.profile, ui.silly].forEach((range) => {
            if (range) range.addEventListener('input', refreshLabels);
        });
        [ui.aspect, ui.antiAlias, ui.enhance].forEach((control) => {
            if (control) control.addEventListener('change', refreshLabels);
        });
        ui.rerender.addEventListener('click', rerender);

        // A new picture (opened, re-rendered) resets the controls to it; coming
        // back to this page asks ValeVision 3D again (it may have changed meanwhile:
        // the app focuses the page each time it comes up)
        // ------------------------------------------------------------
        Na__PageLayout__On('image', (detail) => {
            if (!detail.rerendered) setFromPicture();
            refreshLabels();
            refreshState();
        });
        window.addEventListener('focus', () => {
            if (!busy) refreshState();                                      // <-- The Model View may have moved to a drawing meanwhile
        });

        buildControls();
        setFromPicture();
        refreshState();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Render Controls API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__InitRenderControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
