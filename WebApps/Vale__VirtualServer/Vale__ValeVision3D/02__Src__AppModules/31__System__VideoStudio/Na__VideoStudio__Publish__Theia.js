// =============================================================================
// VALEVISION3D - VIDEO STUDIO - PUBLISH TO THEIA
// =============================================================================
//
// FILE       : Na__VideoStudio__Publish__Theia.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Publish to ValeVision Theia
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Render a path at its own export settings and stream the one file
//              straight into ValeVision Theia - no download - then keep the path's
//              title and description in step with Theia both ways
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - THEIA'S OWN API (/theia/api/ on the same site, the same Vale sign-in) does
//   the receiving: this module only talks to it. GET publish-spec says what it
//   accepts (the 2K floor, the chunk size, the server's free disk).
// - ONE FILE, AT THE PATH'S OWN EXPORT SETTINGS: what Export MP4 would make
//   (resolution, frame rate, quality, anti-aliasing), never a second size
//   (Adam, 07-Oct-2026: no versions, no quality switching; viewers are expected
//   to have a good connection). A path set below 2K is refused before rendering.
// - UPLOADED AS IT IS MADE. The upload session keeps the first bytes of the file
//   free for the MP4 index (Na__VideoStudio__Mp4Muxer__HeadBytesFor). Frames go
//   up in chunks of 16 MB while the render carries on; when the upload falls
//   behind, the render waits (backpressure), so memory stays small however long
//   the path. At the end the index is written into the reserved space: the file
//   is fast-start and the server copies nothing.
// - EVERY CHUNK IS CHECKED: it carries its SHA-256, the server refuses a damaged
//   one, and a failed chunk is sent again (five tries, waiting longer each
//   time). The server checks the finished file (a complete MP4, at least 2K)
//   before it can be published.
// - PUBLISH moves the file and the poster (the first frame, 1920 wide, and a 524
//   wide thumbnail) into the project's Theia folders under stable names, deletes
//   whatever an earlier publish of the path left at another size or in another
//   scheme, and writes Theia's data file; the Theia API stamps the path in the
//   project record (VideoStudio__Video__TheiaPublish), and the stamp is applied
//   here too.
// - SYNC sends every path's title, description and order to Theia (newer
//   MetaUpdatedIso wins on the server), and can remove Theia videos whose path
//   is gone.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.0.0
// - Initial build for ValeVision Theia. The same day, on Adam's call, it went
//   from 4K and 2K in one render to one file at the path's own export settings.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__VideoStudio__Mp4Muxer__HeadBytesFor } from './Na__VideoStudio__Export__Mp4Muxer.js';
    import {
        Na__VideoStudio__Encoder__QUALITY_STOPS,
        Na__VideoStudio__Encoder__ExportRenditions,
        Na__VideoStudio__Encoder__ResolveQualityIndex
    } from './Na__VideoStudio__Export__VideoEncoder.js';
    import { Na__VideoStudio__PathSampler__BuildTimeline } from './Na__VideoStudio__Camera__PathSampler.js';
    import {
        Na__VideoStudio__ProjectJson__GetExportOptions,
        Na__VideoStudio__ProjectJson__GetTheiaMeta,
        Na__VideoStudio__ProjectJson__GetSortedVideos,
        Na__VideoStudio__ProjectJson__SetTheiaPublish,
        Na__VideoStudio__ProjectJson__Fingerprint
    } from './Na__VideoStudio__ProjectJson__VideoData.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__VsTheia__API            = '/theia/api/';                             // <-- Theia's API, same site, same sign-in
    const Na__VsTheia__APP            = '/theia/';
    const Na__VsTheia__PENDING_MAX    = 96 * 1024 * 1024;                           // <-- Bytes waiting to go up before the render waits
    const Na__VsTheia__CONCURRENCY    = 2;                                          // <-- Chunks in flight per file
    const Na__VsTheia__RETRY_WAITS_MS = [1000, 3000, 8000, 20000, 45000];

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Theia API
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | One Call: JSON back, or an Error with the server's words
    // ------------------------------------------------------------
    async function Na__VsTheia__Call(method, path, body, headers) {
        let response;
        try {
            response = await fetch(Na__VsTheia__API + path, {
                method, credentials: 'same-origin', cache: 'no-store',
                headers : body !== undefined && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && !ArrayBuffer.isView(body)
                    ? Object.assign({ 'Content-Type': 'application/json' }, headers || {}) : (headers || {}),
                body    : body === undefined ? undefined
                    : (body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body)) ? body : JSON.stringify(body)
            });
        } catch (error) {
            const e = new Error('ValeVision Theia could not be reached. Check the connection.');
            e.status = 0;
            throw e;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.ok === false) {
            const e = new Error(response.status === 401 ? 'Sign in to publish to Theia.'
                              : response.status === 404 && path === 'health' ? 'ValeVision Theia is not available on this server yet.'
                              : (data.error || `Theia answered ${response.status}.`));
            e.status = response.status;
            e.data = data;
            throw e;
        }
        return data;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is Theia Here? (true / false, never throws)
    // ------------------------------------------------------------
    async function Na__VsTheia__IsAvailable() {
        try { await Na__VsTheia__Call('GET', 'health'); return true; }
        catch (error) { return false; }
    }
    // ------------------------------------------------------------


    // FUNCTION | What Theia Wants Rendered, and Room on the Server
    // ------------------------------------------------------------
    function Na__VsTheia__Spec() {
        return Na__VsTheia__Call('GET', 'publish-spec');
    }

    // FUNCTION | The Project's Videos in Theia (manager view: sources, stamps)
    function Na__VsTheia__Videos(projectFolder) {
        return Na__VsTheia__Call('GET', `projects/${encodeURIComponent(projectFolder)}/videos`);
    }

    // FUNCTION | Titles, Descriptions and Order to Theia (newer wins there)
    function Na__VsTheia__Sync(projectFolder, payload) {
        return Na__VsTheia__Call('POST', `projects/${encodeURIComponent(projectFolder)}/videos/sync`, payload);
    }

    // FUNCTION | Where a Video Opens in Theia
    function Na__VsTheia__AppUrl(projectFolder, videoId) {
        return `${Na__VsTheia__APP}?project=${encodeURIComponent(projectFolder)}${videoId ? `&video=${encodeURIComponent(videoId)}` : ''}`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Uploader (one file, in checked chunks, while it is being made)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | SHA-256 of Bytes, as Hex
    // ------------------------------------------------------------
    async function Na__VsTheia__Sha256(bytes) {
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    // ------------------------------------------------------------


    // CLASS | One File Going Up: push() bytes as they are made, finish(head) at the end
    // ------------------------------------------------------------
    class Na__VsTheia__Uploader {

        constructor(projectFolder, videoId, purpose, reservedHeadBytes) {
            this.project   = projectFolder;
            this.videoId   = videoId;
            this.purpose   = purpose;
            this.reserved  = reservedHeadBytes || 0;
            this.uploadId  = null;
            this.chunk     = 16 * 1024 * 1024;
            this.buffer    = [];                                             // <-- Bytes not yet in a chunk
            this.buffered  = 0;
            this.queue     = [];                                             // <-- Chunks waiting: { offset, bytes }
            this.inFlight  = 0;
            this.produced  = 0;                                              // <-- Payload bytes handed over so far
            this.sent      = 0;                                              // <-- Payload bytes the server has confirmed
            this.error     = null;
            this.waiters   = [];
            this.aborted   = false;
        }

        async start(expectedBytes) {
            const answer = await Na__VsTheia__Call('POST', `projects/${encodeURIComponent(this.project)}/uploads`, {
                purpose: this.purpose, videoId: this.videoId, reservedHeadBytes: this.reserved, expectedBytes: expectedBytes || 0
            });
            this.uploadId = answer.uploadId;
            this.chunk = answer.chunkBytes || this.chunk;
            return this;
        }

        // Hand over encoded bytes (called from the encoder's output: never awaits)
        push(bytes) {
            if (this.error) return;
            this.buffer.push(bytes);
            this.buffered += bytes.byteLength;
            this.produced += bytes.byteLength;
            while (this.buffered >= this.chunk) this._cut(this.chunk);
            this._pump();
        }

        // Bytes handed over but not yet confirmed by the server
        pending() { return this.produced - this.sent; }

        // Resolve when there is room again (the render waits here when uploads fall behind)
        async waitForSpace(maxPending) {
            if (this.error) throw this.error;
            while (this.pending() > maxPending && !this.error) {
                await new Promise((resolve) => this.waiters.push(resolve));
            }
            if (this.error) throw this.error;
        }

        // The last bytes, then the reserved head: the server checks the whole file
        async finish(head) {
            if (this.buffered) this._cut(this.buffered);
            this._pump();
            while ((this.queue.length || this.inFlight) && !this.error) {
                await new Promise((resolve) => this.waiters.push(resolve));
            }
            if (this.error) throw this.error;
            return Na__VsTheia__Call('POST',
                `projects/${encodeURIComponent(this.project)}/uploads/${this.uploadId}/complete?payloadBytes=${this.produced}`,
                head && head.byteLength ? head : new Uint8Array(0), { 'Content-Type': 'application/octet-stream' });
        }

        // Abandon: the server drops what it has
        async abort() {
            this.aborted = true;
            this.error = this.error || new Error('Publishing cancelled.');
            this._wake();
            if (this.uploadId) {
                try { await Na__VsTheia__Call('DELETE', `projects/${encodeURIComponent(this.project)}/uploads/${this.uploadId}`); }
                catch (error) { /* it is cleared after two days anyway */ }
            }
        }

        _cut(size) {
            const out = new Uint8Array(size);
            let filled = 0;
            while (filled < size) {
                const head = this.buffer[0];
                const take = Math.min(head.byteLength, size - filled);
                out.set(head.subarray(0, take), filled);
                filled += take;
                if (take === head.byteLength) this.buffer.shift();
                else this.buffer[0] = head.subarray(take);
            }
            this.buffered -= size;
            const offset = this.reserved + (this.produced - this.buffered - size);
            this.queue.push({ offset, bytes: out });
        }

        _pump() {
            while (this.inFlight < Na__VsTheia__CONCURRENCY && this.queue.length && !this.error && this.uploadId) {
                const job = this.queue.shift();
                this.inFlight++;
                this._send(job).then(() => {
                    this.sent += job.bytes.byteLength;
                }, (error) => {
                    this.error = this.error || error;
                }).finally(() => {
                    this.inFlight--;
                    this._wake();
                    this._pump();
                });
            }
        }

        async _send(job) {
            const sha = await Na__VsTheia__Sha256(job.bytes);
            for (let attempt = 0; ; attempt++) {
                if (this.aborted) throw this.error;
                try {
                    await Na__VsTheia__Call('PUT', `projects/${encodeURIComponent(this.project)}/uploads/${this.uploadId}?offset=${job.offset}`,
                                            job.bytes, { 'Content-Type': 'application/octet-stream', 'X-Theia-Chunk-Sha256': sha });
                    return;
                } catch (error) {
                    const retryable = !error.status || error.status >= 500 || error.status === 422 || error.status === 408 || error.status === 429;
                    if (!retryable || attempt >= Na__VsTheia__RETRY_WAITS_MS.length) throw error;
                    await new Promise((resolve) => setTimeout(resolve, Na__VsTheia__RETRY_WAITS_MS[attempt]));
                }
            }
        }

        _wake() {
            const waiting = this.waiters.splice(0);
            waiting.forEach((resolve) => resolve());
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Upload a Small File (a poster) in One Go
    // ------------------------------------------------------------
    async function Na__VsTheia__UploadBlob(projectFolder, videoId, purpose, blob) {
        const uploader = await new Na__VsTheia__Uploader(projectFolder, videoId, purpose, 0).start(blob.size);
        uploader.push(new Uint8Array(await blob.arrayBuffer()));
        await uploader.finish(null);
        return uploader.uploadId;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Publishing One Path
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Name of a Height, as Theia Shows It ("4K", "2K", "1080p")
    // ------------------------------------------------------------
    function Na__VsTheia__QualityName(height) {
        return height >= 4320 ? '8K' : height >= 2160 ? '4K' : height >= 1440 ? '2K' : `${height}p`;
    }
    // ------------------------------------------------------------


    // FUNCTION | What Publishing a Path Makes: its own export settings, one file
    // ------------------------------------------------------------
    // Returns { quality, width, height, fps, qualityIndex, qualityLabel, bitrateMbps,
    //           tooSmall, minimumHeight, minimumQuality }. spec may be null (not asked yet).
    // ------------------------------------------------------------
    function Na__VsTheia__PlanFor(video, spec) {
        const o = Na__VideoStudio__ProjectJson__GetExportOptions(video);
        const qualityIndex = Na__VideoStudio__Encoder__ResolveQualityIndex(o.width, o.height, o.fps, o.bitrateMbps);
        const stop = Na__VideoStudio__Encoder__QUALITY_STOPS.find((q) => q.index === qualityIndex);
        const minimumHeight = Number(spec && spec.minimumHeight) || 1440;
        return {
            quality        : Na__VsTheia__QualityName(o.height),
            width          : o.width,
            height         : o.height,
            fps            : o.fps,
            qualityIndex,
            qualityLabel   : stop ? stop.label : '',
            bitrateMbps    : o.bitrateMbps,
            tooSmall       : o.height < minimumHeight,
            minimumHeight,
            minimumQuality : (spec && spec.minimumQuality) || Na__VsTheia__QualityName(minimumHeight)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Render a Path at Its Export Settings and Publish It
    // ------------------------------------------------------------
    // options: { video, projectFolder, spec, render: { renderer, scene, camera, controls, getRenderPipelineState },
    //            onProgress({ percent, message, detail }), shouldCancel() }
    // Returns the Theia API's publish answer: { publish, title, description, metaUpdatedIso, videos, ... }
    // ------------------------------------------------------------
    async function Na__VsTheia__PublishVideo(options) {
        const { video, projectFolder, spec, render, onProgress, shouldCancel } = options;
        const say = (percent, message, detail) => { if (typeof onProgress === 'function') onProgress({ percent, message, detail }); };
        const videoId = video.VideoStudio__Video__Id;
        const meta = Na__VideoStudio__ProjectJson__GetTheiaMeta(video);
        const exportOptions = Na__VideoStudio__ProjectJson__GetExportOptions(video);
        const timeline = Na__VideoStudio__PathSampler__BuildTimeline(video);
        if (!timeline || timeline.totalDurationMs <= 0) throw new Error('This path has no keyframes to render.');
        const frameCount = Math.max(1, Math.round((timeline.totalDurationMs / 1000) * exportOptions.fps));
        const plan = Na__VsTheia__PlanFor(video, spec);
        if (plan.tooSmall) {
            throw new Error(`This path renders at ${plan.width} x ${plan.height}: Theia needs at least ${plan.minimumHeight}p (${plan.minimumQuality}). Set its Resolution to ${plan.minimumHeight}p or above.`);
        }

        // DISK | Roughly what this will take on the server, against what is free
        const estimate = (plan.bitrateMbps * 1e6 / 8) * (timeline.totalDurationMs / 1000);
        if (spec.diskFreeBytes && spec.diskFreeBytes - estimate < (spec.diskReserveBytes || 0)) {
            throw new Error(`The server has ${(spec.diskFreeBytes / 1024 ** 3).toFixed(1)} GB free and this video needs about ${(estimate / 1024 ** 3).toFixed(1)} GB. Ask Adam to make room first.`);
        }

        const fingerprint = await Na__VideoStudio__ProjectJson__Fingerprint(video);
        const reserved = Na__VideoStudio__Mp4Muxer__HeadBytesFor(frameCount);
        const uploaders = [];
        try {
            say(0, 'Starting the upload to Theia', `${plan.quality}: ${plan.width} x ${plan.height}, ${plan.fps} fps, ${plan.qualityLabel}`);
            uploaders.push(await new Na__VsTheia__Uploader(projectFolder, videoId, 'video', reserved).start(0));

            // RENDER | One pass at the path's own settings, streamed up as it is encoded
            const result = await Na__VideoStudio__Encoder__ExportRenditions(Object.assign({}, render, {
                video,
                renditions     : [{ label: plan.quality, height: plan.height }],
                qualityIndex   : null,                                        // <-- The path's own bitrate, exactly as Export MP4 makes it
                sinks          : uploaders.map((u) => ({ onPayload: (bytes) => u.push(bytes), reservedHeadBytes: reserved })),
                awaitSinkSpace : async () => { for (const u of uploaders) await u.waitForSpace(Na__VsTheia__PENDING_MAX); },
                posterWidths   : [Number(spec.posterWidth) || 1920, Number(spec.thumbnailWidth) || 524],
                shouldCancel,
                onProgress     : ({ percent, message, detail }) => {
                    const made = uploaders.reduce((s, u) => s + u.produced, 0), sent = uploaders.reduce((s, u) => s + u.sent, 0);
                    const mb = (bytes) => (bytes / 1048576).toFixed(made < 10 * 1048576 ? 1 : 0);   // <-- Tenths while the numbers are small
                    say(Math.round(percent * 0.9), message, `${detail || ''}${detail ? '\n' : ''}Uploaded ${mb(sent)} of ${mb(made)} MB so far`);
                }
            }));

            // FINISH | The last chunks, then the file's index into its reserved head
            say(92, 'Finishing the upload', `The server checks the file: a complete MP4, at least ${plan.minimumQuality}`);
            if (shouldCancel && shouldCancel()) throw new Error('Publishing cancelled.');
            await uploaders[0].finish(result.renditions[0].head);

            // POSTER | The first frame, and its thumbnail
            say(96, 'Uploading the poster', '');
            const [posterBlob, thumbBlob] = result.posters;
            const poster = posterBlob ? await Na__VsTheia__UploadBlob(projectFolder, videoId, 'poster', posterBlob) : null;
            const thumbnail = thumbBlob ? await Na__VsTheia__UploadBlob(projectFolder, videoId, 'thumbnail', thumbBlob) : null;

            // PUBLISH | Into Theia's folders and data file; the path gets its stamp
            say(98, 'Publishing in Theia', meta.title);
            const answer = await Na__VsTheia__Call('POST', `projects/${encodeURIComponent(projectFolder)}/videos/${encodeURIComponent(videoId)}/publish`, {
                title          : meta.title,
                description    : meta.description,
                scheme         : meta.scheme,
                metaUpdatedIso : meta.metaUpdatedIso,
                order          : Na__VideoStudio__ProjectJson__GetSortedVideos(null).findIndex((v) => v.VideoStudio__Video__Id === videoId) + 1 || undefined,
                video          : uploaders[0].uploadId,
                poster, thumbnail,
                source         : 'ValeVision3D',
                sourceVideoId  : videoId,
                fingerprint,
                export         : { aspect: exportOptions.aspect, fps: exportOptions.fps, qualityStop: plan.qualityIndex,
                                   antiAliasSamples: exportOptions.antiAliasEnabled ? exportOptions.antiAliasSamples : 1 }
            });
            Na__VideoStudio__ProjectJson__SetTheiaPublish(videoId, answer.publish);   // <-- The same stamp the API wrote into the record
            say(100, 'Published to Theia', `${meta.title}: ${plan.quality}`);
            return answer;
        } catch (error) {
            await Promise.all(uploaders.map((u) => u.abort()));
            throw error;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Path's Title, Description and Order, Ready for Sync
    // ------------------------------------------------------------
    function Na__VsTheia__SyncPayload(applyOrder, removeIds) {
        const videos = Na__VideoStudio__ProjectJson__GetSortedVideos(null).map((v, i) => {
            const meta = Na__VideoStudio__ProjectJson__GetTheiaMeta(v);
            return { sourceVideoId: v.VideoStudio__Video__Id, title: meta.title, description: meta.description,
                     metaUpdatedIso: meta.metaUpdatedIso, order: i + 1 };
        });
        return { videos, applyOrder: !!applyOrder, removeSourceVideoIds: removeIds || [] };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__VsTheia__IsAvailable,
        Na__VsTheia__Spec,
        Na__VsTheia__Videos,
        Na__VsTheia__Sync,
        Na__VsTheia__AppUrl,
        Na__VsTheia__PlanFor,
        Na__VsTheia__PublishVideo,
        Na__VsTheia__SyncPayload
    };

// endregion -------------------------------------------------------------------
