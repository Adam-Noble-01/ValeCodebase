// =============================================================================
// VALEVISION AURA - VIEWPORTS - THE RENDER QUEUE
// =============================================================================
//
// FILE       : Na__Viewports__RenderQueue__.js
// NAMESPACE  : Na__RenderQueue
// MODULE     : Viewports - Render Queue
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Have the engine draw each viewport's picture, one at a time, and
//              keep each picture until its view or the engine's settings change
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - ONE ENGINE, ONE STILL AT A TIME: each still borrows the engine's camera and
//   runs its whole render graph (Na__EngineHost__RenderStill), so the queue
//   draws them in turn, with a breath between for the page to repaint.
// - A PICTURE IS KEPT BY WHAT MADE IT: the engine's version, its settings, the
//   camera, the profile and the scale. Change any and the key changes, so the
//   next look at the sheet draws it again; until then the old picture shows.
// - The queue pauses while the 3D Environment is open: its live drawing has
//   the engine.
// - Pictures are WebP in memory (object URLs), about forty kept.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Format__Key } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__EngineHost__RenderStill, Na__EngineHost__Settings, Na__EngineHost__Version, Na__EngineHost__Ready } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__Views__Camera } from './Na__Viewports__Views__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__RenderQueue__KEEP = 40;

    const Na__RenderQueue__State = {
        cache    : new Map(),                    // <-- key -> { url, widthPx, heightPx, ms }; the newest last
        waiting  : [],                           // <-- [{ key, camera, scale, callbacks }]
        current  : '',                           // <-- The key being drawn now
        running  : false,
        paused   : false,
        onStatus : null                          // <-- (text) => {}: "Drawing 2 of 6 ..."
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keys and the Cache
// -----------------------------------------------------------------------------

    // FUNCTION | What a Viewport's Picture Depends On, as One Key
    // ------------------------------------------------------------
    function Na__RenderQueue__Key(viewport, doc) {
        const camera = Na__Views__Camera(viewport, doc);
        return {
            camera,
            scale : Na__AppConfig__Get('Viewport__RenderScale', 1),
            key   : Na__Format__Key({ e: Na__EngineHost__Version(), s: Na__EngineHost__Settings(), c: camera, r: Na__AppConfig__Get('Viewport__RenderScale', 1) })
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Keep a Picture, Letting the Oldest Go
    // ------------------------------------------------------------
    function Na__RenderQueue__Keep(key, picture) {
        const cache = Na__RenderQueue__State.cache;
        cache.delete(key);
        cache.set(key, picture);
        while (cache.size > Na__RenderQueue__KEEP) {
            const [oldKey, old] = cache.entries().next().value;
            cache.delete(oldKey);
            URL.revokeObjectURL(old.url);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Picture for a Viewport Now, if There Is One (else null; Request draws it)
    // ------------------------------------------------------------
    function Na__RenderQueue__Picture(viewport, doc) {
        const { key } = Na__RenderQueue__Key(viewport, doc);
        return Na__RenderQueue__State.cache.get(key) || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Queue
// -----------------------------------------------------------------------------

    // FUNCTION | Ask for a Viewport's Picture: onDone(picture | null, error) once it is drawn
    // ------------------------------------------------------------
    // Returns the picture at once when it is already kept. The same key asked for
    // again while it waits is drawn once, and only its first caller hears: the
    // sheet redraws its whole layer when one arrives, and a redraw asks again for
    // every picture still missing, so adding each ask would multiply the redraws.
    // ------------------------------------------------------------
    function Na__RenderQueue__Request(viewport, doc, onDone) {
        const job = Na__RenderQueue__Key(viewport, doc);
        const kept = Na__RenderQueue__State.cache.get(job.key);
        if (kept) return kept;
        if (!job.camera) { if (onDone) onDone(null, new Error('This view has no camera (its saved view was deleted).')); return null; }
        if (Na__RenderQueue__State.current === job.key || Na__RenderQueue__State.waiting.some((w) => w.key === job.key)) return null;
        Na__RenderQueue__State.waiting.push(Object.assign(job, { callbacks: onDone ? [onDone] : [] }));
        Na__RenderQueue__Pump();
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Forget Everything Waiting (the sheet was closed or its views changed)
    // ------------------------------------------------------------
    function Na__RenderQueue__Clear() {
        Na__RenderQueue__State.waiting = [];
    }
    // ------------------------------------------------------------


    // FUNCTION | Pause and Resume (the 3D Environment has the engine)
    // ------------------------------------------------------------
    function Na__RenderQueue__Pause(paused) {
        Na__RenderQueue__State.paused = !!paused;
        if (!paused) Na__RenderQueue__Pump();
    }

    function Na__RenderQueue__OnStatus(fn) {
        Na__RenderQueue__State.onStatus = fn;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Draw What Is Waiting, One at a Time
    // ------------------------------------------------------------
    async function Na__RenderQueue__Pump() {
        const S = Na__RenderQueue__State;
        if (S.running || S.paused || !Na__EngineHost__Ready()) return;
        S.running = true;
        let done = 0;
        try {
            while (S.waiting.length && !S.paused) {
                const job = S.waiting[0];
                if (S.onStatus) S.onStatus(`Drawing view ${done + 1} of ${done + S.waiting.length} in pen and wash...`);
                await new Promise((resolve) => setTimeout(resolve, 30));        // <-- A breath: the page repaints between stills
                if (S.waiting[0] !== job) continue;                             // <-- Cleared while it waited
                S.waiting.shift();
                S.current = job.key;
                let picture = null, failure = null;
                try {
                    const still = Na__EngineHost__RenderStill({ camera: job.camera, scale: job.scale });
                    const blob = await new Promise((resolve) => still.canvas.toBlob(resolve, 'image/webp', 0.92));
                    if (!blob) throw new Error('The picture could not be encoded.');
                    picture = { url: URL.createObjectURL(blob), widthPx: still.widthPx, heightPx: still.heightPx, ms: still.ms };
                    Na__RenderQueue__Keep(job.key, picture);
                } catch (error) {
                    console.error('[AURA RenderQueue] A view could not be drawn:', error);
                    failure = error;
                }
                S.current = '';
                done++;
                job.callbacks.forEach((fn) => { try { fn(picture, failure); } catch (error) { console.error(error); } });
            }
        } finally {
            S.running = false;
            if (S.onStatus) S.onStatus(S.waiting.length ? '' : (done ? `Drew ${done} view${done === 1 ? '' : 's'}.` : ''));
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__RenderQueue__Picture,
        Na__RenderQueue__Request,
        Na__RenderQueue__Clear,
        Na__RenderQueue__Pause,
        Na__RenderQueue__OnStatus
    };

// endregion -------------------------------------------------------------------
