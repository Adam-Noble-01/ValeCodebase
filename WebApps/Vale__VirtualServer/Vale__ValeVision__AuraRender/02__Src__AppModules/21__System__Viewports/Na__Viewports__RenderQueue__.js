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
//   camera, the view's Art Direction Points, its scene's sun, the profile and
//   the scale. Change any and the key changes, so the next look at the sheet
//   draws it again. A sun moved for one scene redraws only its viewports.
// - The queue pauses while the 3D Environment is open (its live drawing has
//   the engine), and while a viewport's points are edited on its sheet (that
//   viewport has it). Meanwhile the edited viewport shows a PREVIEW: the live
//   engine's drawing of it (SetPreview), until its still is drawn again.
// - Pictures are PNG in memory (object URLs), lossless as the engine's own
//   export: WebP's halved colour and smoothing took the edge off the pens,
//   the grain and the washes. Kept within AuraConfig__Viewport__PictureCacheMb,
//   forty at most, the oldest let go first.
// - PICTURES ARE 300 DPI ON THE PAPER (Adam: "Documents should be 300 dpi"):
//   the engine draws its whole sheet at AuraConfig__Viewport__RenderDpi, so a
//   printed sheet's pens and grain are as sharp as its title block. A GPU that
//   cannot hold the sheet at that size draws it at screen size instead and
//   says so in the console: a viewport is never left empty.
// - A PICTURE IS DRAWN FOR ITS FRAME (PainterlyNPR 0.8.9 on): at the frame's
//   true size, the vignette fitted to it (Na__EngineHost__RenderStill), so
//   the frame is in its key. While a viewport's new picture is drawn its last
//   one stands in, pale; a frame being resized waits to rest
//   (AuraConfig__Viewport__RedrawSettleMs) before it is drawn again.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.4.0 (AURA 0.5.9)
// - Each still is drawn with its scene's own sun (Na__Views__Sun, the
//   request's sun), which is in its key; the engine's settings no longer
//   carry the sun, so one scene's light never redraws another's viewports.
//
// 30-Oct-2026 - Version 1.3.0 (AURA 0.5.5)
// - Pictures drawn for their frame (frameMm, scaled) and kept as PNG within a
//   memory budget; one waiting picture a viewport, its last one standing in.
//
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
    import { Na__EngineHost__RenderStill, Na__EngineHost__FitsFrames, Na__EngineHost__Settings, Na__EngineHost__SheetMm, Na__EngineHost__Version, Na__EngineHost__Ready } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__Views__Camera, Na__Views__IsScaled, Na__Views__Points, Na__Views__Sun } from './Na__Viewports__Views__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__RenderQueue__KEEP = 40;

    const Na__RenderQueue__State = {
        cache    : new Map(),                    // <-- key -> { url, widthPx, heightPx, ms, showMm, bytes, frame }; the newest last
        bytes    : 0,                            // <-- What the kept pictures weigh, together
        lastKey  : new Map(),                    // <-- viewport id -> the key of its newest picture: it stands in while the next is drawn
        previews : new Map(),                    // <-- viewport id -> { url, owned, showMm }: shown instead while its points are edited
        waiting  : [],                           // <-- [{ id, key, camera, points, scale, frameMm, scaled, frame, settle, at, callbacks }]
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
        const sun = Na__Views__Sun(viewport, doc);                               // <-- Its scene's own (0.5.9)
        const scale = Na__RenderQueue__Scale();
        const scaled = Na__Views__IsScaled(viewport);
        const f = viewport.Viewport__FrameMm || {};
        const tenth = (v) => Math.round((Number(v) || 0) * 10) / 10;
        const frameMm = Na__EngineHost__FitsFrames() ? { WidthMm: tenth(f.WidthMm), HeightMm: tenth(f.HeightMm) } : null;   // <-- Drawn for its frame: a new size is a new picture
        const frame = frameMm ? `${frameMm.WidthMm}x${frameMm.HeightMm}${scaled ? ' scaled' : ''}` : '';
        return {
            id    : viewport.Viewport__Id,
            camera,
            points,
            sun,
            scale,
            frameMm,
            scaled,
            frame,
            key   : Na__Format__Key({ e: Na__EngineHost__Version(), s: Na__EngineHost__Settings(), c: camera, p: points, u: sun, r: scale, f: frame })
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
    // already kept in the cache is lent, never revoked here, and keeps its
    // own size on the paper; an owned one is the engine's whole sheet).
    // ------------------------------------------------------------
    function Na__RenderQueue__SetPreview(viewportId, url, owned) {
        const previews = Na__RenderQueue__State.previews;
        const old = previews.get(viewportId);
        if (old && old.owned && old.url !== url) URL.revokeObjectURL(old.url);
        if (url) {
            let showMm = null;
            if (!owned) for (const picture of Na__RenderQueue__State.cache.values()) if (picture.url === url) { showMm = picture.showMm || null; break; }
            previews.set(viewportId, { url, owned: !!owned, showMm });
        } else previews.delete(viewportId);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Keep a Picture, Letting the Oldest Go (past forty, or past the memory budget)
    // ------------------------------------------------------------
    // A lossless picture of a whole A3 sheet at 300 dpi is tens of megabytes, so
    // the budget, not the count, usually decides. The newest is always kept. A
    // picture lent as a preview is let go of without revoking it.
    // ------------------------------------------------------------
    function Na__RenderQueue__Keep(key, picture) {
        const S = Na__RenderQueue__State;
        const cache = S.cache;
        const old = cache.get(key);
        if (old) S.bytes -= old.bytes || 0;
        cache.delete(key);
        cache.set(key, picture);
        S.bytes += picture.bytes || 0;
        const budget = Math.max(64, Number(Na__AppConfig__Get('Viewport__PictureCacheMb', 768)) || 768) * 1048576;
        while (cache.size > 1 && (cache.size > Na__RenderQueue__KEEP || S.bytes > budget)) {
            const [oldKey, oldest] = cache.entries().next().value;
            cache.delete(oldKey);
            S.bytes -= oldest.bytes || 0;
            const lent = [...S.previews.values()].some((p) => p.url === oldest.url);
            if (!lent) URL.revokeObjectURL(oldest.url);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Picture for a Viewport Now, if There Is One (else null; Request draws it)
    // ------------------------------------------------------------
    // Its own picture, or its last one marked stale (Request draws the new one):
    // a frame being resized or a setting changed shows the old drawing, pale,
    // never an empty frame.
    // ------------------------------------------------------------
    function Na__RenderQueue__Picture(viewport, doc) {
        const S = Na__RenderQueue__State;
        const preview = S.previews.get(viewport.Viewport__Id);
        if (preview) return { url: preview.url, preview: true, showMm: preview.showMm || null };
        const { key } = Na__RenderQueue__Key(viewport, doc);
        const kept = S.cache.get(key);
        if (kept) return kept;
        const last = S.cache.get(S.lastKey.get(viewport.Viewport__Id));
        return last ? Object.assign({}, last, { stale: true }) : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | How Long a Resized Frame Rests Before It Is Drawn Again (ms)
    // ------------------------------------------------------------
    function Na__RenderQueue__SettleMs() {
        return Math.max(0, Number(Na__AppConfig__Get('Viewport__RedrawSettleMs', 400)) || 0);
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
    // A viewport waits with its newest ask only, and one whose frame changed
    // (or that asked again while waiting: a drag) rests first (settle).
    // ------------------------------------------------------------
    function Na__RenderQueue__Request(viewport, doc, onDone) {
        const S = Na__RenderQueue__State;
        const job = Na__RenderQueue__Key(viewport, doc);
        const kept = S.cache.get(job.key);
        if (kept) return kept;
        if (!job.camera) { if (onDone) onDone(null, new Error('This view has no camera (its saved view was deleted).')); return null; }
        if (S.current === job.key || S.waiting.some((w) => w.key === job.key)) return null;
        const before = S.waiting.length;
        S.waiting = S.waiting.filter((w) => w.id !== job.id);
        const last = S.cache.get(S.lastKey.get(job.id));
        job.settle = S.waiting.length < before || (!!last && last.frame !== job.frame);
        job.at = performance.now();
        S.waiting.push(Object.assign(job, { callbacks: onDone ? [onDone] : [] }));
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
                const rest = job.settle ? Na__RenderQueue__SettleMs() - (performance.now() - job.at) : 0;
                await new Promise((resolve) => setTimeout(resolve, Math.max(30, rest)));   // <-- A breath: the page repaints between stills (a resized frame rests first)
                if (S.paused || S.waiting[0] !== job) continue;                 // <-- Cleared, replaced or paused (a viewport borrowed the engine) while it waited
                S.waiting.shift();
                S.current = job.key;
                let picture = null, failure = null;
                try {
                    let still;
                    const request = { camera: job.camera, scale: job.scale, points: job.points, sun: job.sun, frameMm: job.frameMm, scaled: job.scaled };
                    try {
                        still = Na__EngineHost__RenderStill(request);
                    } catch (error) {
                        if (job.scale === 1) throw error;
                        console.warn('[AURA RenderQueue] The sheet at print resolution is past this GPU: drawn at screen size instead.', error);
                        still = Na__EngineHost__RenderStill(Object.assign(request, { scale: 1 }));   // <-- The screen's 5 px/mm: the same drawing, less sharp in print
                    }
                    const blob = await new Promise((resolve) => still.canvas.toBlob(resolve, 'image/png'));   // <-- Lossless, as the engine's own export
                    if (!blob) throw new Error('The picture could not be encoded.');
                    picture = { url: URL.createObjectURL(blob), widthPx: still.widthPx, heightPx: still.heightPx, ms: still.ms,
                                showMm: still.showMm || null, bytes: blob.size, frame: job.frame };
                    Na__RenderQueue__Keep(job.key, picture);
                    S.lastKey.set(job.id, job.key);
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
