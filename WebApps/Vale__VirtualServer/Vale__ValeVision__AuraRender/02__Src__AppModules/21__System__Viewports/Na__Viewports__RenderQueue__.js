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
//   camera, the view's Art Direction Points, the profile and the scale. Change
//   any and the key changes, so the next look at the sheet draws it again.
// - The queue pauses while the 3D Environment is open (its live drawing has
//   the engine), and while a viewport's points are edited on its sheet (that
//   viewport has it). Meanwhile the edited viewport shows a PREVIEW: the live
//   engine's drawing of it (SetPreview), until its still is drawn again.
// - Pictures are WebP in memory (object URLs), about forty kept.
// - PICTURES ARE 300 DPI ON THE PAPER (Adam: "Documents should be 300 dpi"):
//   the engine draws its whole sheet at AuraConfig__Viewport__RenderDpi, so a
//   printed sheet's pens and grain are as sharp as its title block. A GPU that
//   cannot hold the sheet at that size draws it at screen size instead and
//   says so in the console: a viewport is never left empty.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.2.0 (AURA 0.4.3)
// - Stills at 300 dpi on the paper (Viewport__RenderDpi), not the engine's
//   screen density; the screen size if the GPU cannot.
//
// 30-Oct-2026 - Version 1.1.0 (AURA 0.3.0)
// - The view's points are in the key and go to the still (Na__Views__Points);
//   a viewport can show a preview while its points are edited (SetPreview).
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Format__Key } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__EngineHost__RenderStill, Na__EngineHost__Settings, Na__EngineHost__SheetMm, Na__EngineHost__Version, Na__EngineHost__Ready } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__Views__Camera, Na__Views__Points } from './Na__Viewports__Views__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__RenderQueue__KEEP = 40;

    const Na__RenderQueue__State = {
        cache    : new Map(),                    // <-- key -> { url, widthPx, heightPx, ms }; the newest last
        previews : new Map(),                    // <-- viewport id -> { url, owned }: shown instead while its points are edited
        waiting  : [],                           // <-- [{ key, camera, points, scale, callbacks }]
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
        const points = Na__Views__Points(viewport, doc).map((p) => { const copy = Object.assign({}, p); delete copy.Id; return copy; });   // <-- Ids only tell points apart
        const scale = Na__RenderQueue__Scale();
        return {
            camera,
            points,
            scale,
            key   : Na__Format__Key({ e: Na__EngineHost__Version(), s: Na__EngineHost__Settings(), c: camera, p: points, r: scale })
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Stills' Scale: the paper's dpi over the engine's screen density
    // ------------------------------------------------------------
    // 300 dpi is 11.81 px/mm; the engine draws at 5 px/mm on screen, so 2.36.
    // ------------------------------------------------------------
    function Na__RenderQueue__Scale() {
        const dpi = Number(Na__AppConfig__Get('Viewport__RenderDpi', 300)) || 300;
        return dpi / 25.4 / (Na__EngineHost__SheetMm().PxPerMm || 5);
    }
    // ------------------------------------------------------------


    // FUNCTION | Show a Preview in a Viewport While Its Points Are Edited (null: its still again)
    // ------------------------------------------------------------
    // owned: the preview's object URL is this queue's to let go of (a still
    // already kept in the cache is lent, never revoked here).
    // ------------------------------------------------------------
    function Na__RenderQueue__SetPreview(viewportId, url, owned) {
        const previews = Na__RenderQueue__State.previews;
        const old = previews.get(viewportId);
        if (old && old.owned && old.url !== url) URL.revokeObjectURL(old.url);
        if (url) previews.set(viewportId, { url, owned: !!owned });
        else previews.delete(viewportId);
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
        const preview = Na__RenderQueue__State.previews.get(viewport.Viewport__Id);
        if (preview) return { url: preview.url, preview: true };
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
                if (S.paused || S.waiting[0] !== job) continue;                 // <-- Cleared, or paused (a viewport borrowed the engine), while it waited
                S.waiting.shift();
                S.current = job.key;
                let picture = null, failure = null;
                try {
                    let still;
                    try {
                        still = Na__EngineHost__RenderStill({ camera: job.camera, scale: job.scale, points: job.points });
                    } catch (error) {
                        if (job.scale === 1) throw error;
                        console.warn('[AURA RenderQueue] The sheet at print resolution is past this GPU: drawn at screen size instead.', error);
                        still = Na__EngineHost__RenderStill({ camera: job.camera, scale: 1, points: job.points });   // <-- The screen's 5 px/mm: the same drawing, less sharp in print
                    }
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
        Na__RenderQueue__SetPreview,
        Na__RenderQueue__Request,
        Na__RenderQueue__Clear,
        Na__RenderQueue__Pause,
        Na__RenderQueue__OnStatus
    };

// endregion -------------------------------------------------------------------
