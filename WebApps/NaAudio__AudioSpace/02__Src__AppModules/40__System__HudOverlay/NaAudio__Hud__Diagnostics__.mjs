/* =============================================================================
   NAAUDIO - HUD OVERLAY | DIAGNOSTICS
   =============================================================================

   FILE       : NaAudio__Hud__Diagnostics__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Hud - Diagnostics
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The corner readout that says when the space is about to fall over
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Frame time, voice count, scheduler headroom, cache sizes and lock counts, updated a
     few times a second.

   ---------------------------------------------------------------------------

   WHY THESE PARTICULAR NUMBERS

   The design manifest is explicit that real-time audio plus complex 3D will demand
   significant resources and that browser JavaScript is the known ceiling. This readout
   exists so that ceiling is VISIBLE while the application is being built, rather than
   arriving as an unexplained crackle six months in.

   Every figure earns its place by being the first symptom of a specific failure:

       Frame ms        The render budget. Past about 16ms the picture drops frames, and
                       because the scheduler runs on a timer that competes with the same
                       main thread, a sustained overrun eventually costs audio too.

       Voices          Live sample voices against the cap. Climbing toward the cap while
                       nothing new is being played means something is leaking.

       Stolen          Voices killed to stay under the cap. Any sustained increase means
                       the space is over-triggering and is already thinning itself out.

       Headroom        How much of the lookahead window is still unspent. THE number to
                       watch: trending toward zero means the scheduler is losing the race
                       and steps are about to drop audibly.

       Limiter         Gain reduction in decibels. Continuously non-zero means the master
                       is too hot and the limiter has stopped being a safety net.

       Working/Locked  How many modules are actually burning CPU. This is the manifest's
                       own resource strategy, made countable.

   ---------------------------------------------------------------------------

   READ ON A TIMER, NOT PER FRAME

   Every write here is a DOM text write, which invalidates layout. Doing that at frame
   rate would make the diagnostics readout itself a measurable cost - which would be a
   particularly stupid way to distort the measurements it exists to report.

   ============================================================================= */

import * as Transport    from '../10__Audio__WebAudioEngine/NaAudio__Engine__Transport__.mjs';
import * as AudioHost    from '../10__Audio__WebAudioEngine/NaAudio__Engine__AudioHost__.mjs';
import * as SamplePlayer from '../10__Audio__WebAudioEngine/NaAudio__Engine__SamplePlayer__.mjs';
import * as SampleBank   from '../15__Audio__SampleLibraryLoader/NaAudio__Library__SampleBank__.mjs';
import {
    NaAudio__ModuleRegistry__Counts
} from '../20__System__SpatialModuleFramework/NaAudio__Spatial__ModuleRegistry__.mjs';
import {
    NaAudio__PatchGraph__Counts
} from '../20__System__SpatialModuleFramework/NaAudio__Spatial__PatchGraph__.mjs';
import {
    NaAudio__Env3d__Interaction__HandleCount
} from '../05__Env3d__ThreeRenderPipeline/NaAudio__Env3d__Interaction__.mjs';

// =============================================================================
// REGION | Diagnostics
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Warning Thresholds
    // ------------------------------------------------------------
    const FRAME_MS_WARN       =  20.0;                                       // <-- Below 50fps
    const HEADROOM_WARN       =  0.04;                                       // <-- Seconds of lookahead left before steps drop
    const LIMITER_WARN_DB     =  -1.0;

    const UPDATE_INTERVAL_MS  =  1000 / 4;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Element References
    // ------------------------------------------------------------
    let panelElement   =  null;
    let rowElements    =  {};
    let attachedSurface =  null;
    let updateTimer    =  0;

    let frameMsAverage  =  0;                                                // <-- Smoothed; a raw per-frame figure is unreadable
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build One Readout Row
    // ------------------------------------------------------------
    function NaAudio__Diagnostics__Row(parent, key, label) {
        const row  =  document.createElement('div');
        row.className  =  'NaAudio__Diagnostics__Row';

        const labelElement  =  document.createElement('span');
        labelElement.className    =  'NaAudio__Diagnostics__Label';
        labelElement.textContent  =  label;

        const valueElement  =  document.createElement('span');
        valueElement.className    =  'NaAudio__Diagnostics__Value';
        valueElement.textContent  =  '-';

        row.appendChild(labelElement);
        row.appendChild(valueElement);
        parent.appendChild(row);

        rowElements[key]  =  valueElement;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Diagnostics Panel
    // ------------------------------------------------------------
    export function NaAudio__Diagnostics__Build(mountElement, surface) {
        attachedSurface  =  surface;

        panelElement  =  document.createElement('div');
        panelElement.className  =  'NaAudio__Diagnostics';

        const heading  =  document.createElement('div');
        heading.className    =  'NaAudio__Diagnostics__Heading';
        heading.textContent  =  'Diagnostics';
        panelElement.appendChild(heading);

        NaAudio__Diagnostics__Row(panelElement, 'frame',    'Frame');
        NaAudio__Diagnostics__Row(panelElement, 'voices',   'Voices');
        NaAudio__Diagnostics__Row(panelElement, 'stolen',   'Stolen');
        NaAudio__Diagnostics__Row(panelElement, 'headroom', 'Headroom');
        NaAudio__Diagnostics__Row(panelElement, 'limiter',  'Limiter');
        NaAudio__Diagnostics__Row(panelElement, 'modules',  'Modules');
        NaAudio__Diagnostics__Row(panelElement, 'cables',   'Cables');
        NaAudio__Diagnostics__Row(panelElement, 'handles',  'Handles');
        NaAudio__Diagnostics__Row(panelElement, 'decoded',  'Decoded');

        mountElement.appendChild(panelElement);

        NaAudio__Diagnostics__Start();
        return panelElement;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sampling
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Write a Row and Flag It If It Is Over Threshold
    // ------------------------------------------------------------
    function NaAudio__Diagnostics__Write(key, text, isWarning) {
        const element  =  rowElements[key];
        if (!element) return;

        element.textContent  =  text;
        element.classList.toggle('NaAudio__Diagnostics__Value--warn', isWarning === true);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Start the Sampling Timer
    // ------------------------------------------------------------
    function NaAudio__Diagnostics__Start() {
        updateTimer  =  setInterval(function () {
            // FRAME TIME
            // Exponentially smoothed. The instantaneous figure jumps between six and
            // twenty milliseconds frame to frame and is genuinely unreadable.
            const frameMs  =  attachedSurface ? attachedSurface.FrameMs : 0;
            frameMsAverage =  frameMsAverage * 0.7 + frameMs * 0.3;
            NaAudio__Diagnostics__Write('frame', frameMsAverage.toFixed(1) + ' ms', frameMsAverage > FRAME_MS_WARN);

            const voices  =  SamplePlayer.NaAudio__SamplePlayer__Statistics();
            NaAudio__Diagnostics__Write('voices', voices.Live + ' / ' + voices.Cap, voices.Live > voices.Cap * 0.8);
            NaAudio__Diagnostics__Write('stolen', String(voices.Stolen), voices.Stolen > 0);

            if (AudioHost.NaAudio__AudioHost__IsUnlocked()) {
                const headroom  =  Transport.NaAudio__Transport__LookaheadHeadroom();
                NaAudio__Diagnostics__Write('headroom', (headroom * 1000).toFixed(0) + ' ms', headroom < HEADROOM_WARN);

                const reduction  =  AudioHost.NaAudio__AudioHost__LimiterReduction();
                NaAudio__Diagnostics__Write('limiter', reduction.toFixed(1) + ' dB', reduction < LIMITER_WARN_DB);
            } else {
                NaAudio__Diagnostics__Write('headroom', 'suspended', false);
                NaAudio__Diagnostics__Write('limiter',  '-',         false);
            }

            const modules  =  NaAudio__ModuleRegistry__Counts();
            NaAudio__Diagnostics__Write('modules', modules.Working + ' working / ' + modules.Locked + ' locked', false);

            const cables  =  NaAudio__PatchGraph__Counts();
            NaAudio__Diagnostics__Write('cables', cables.Total + ' (' + cables.Modulation + ' mod)', false);

            NaAudio__Diagnostics__Write('handles', String(NaAudio__Env3d__Interaction__HandleCount()), false);

            const bank  =  SampleBank.NaAudio__SampleBank__Counts();
            NaAudio__Diagnostics__Write('decoded', bank.Decoded + ' / ' + (bank.Samples + bank.Loops + bank.Responses), false);
        }, UPDATE_INTERVAL_MS);
    }
    // ------------------------------------------------------------


    // FUNCTION | Show or Hide the Diagnostics Panel
    // ------------------------------------------------------------
    export function NaAudio__Diagnostics__SetVisible(isVisible) {
        if (!panelElement) return;
        panelElement.style.display  =  isVisible ? '' : 'none';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
