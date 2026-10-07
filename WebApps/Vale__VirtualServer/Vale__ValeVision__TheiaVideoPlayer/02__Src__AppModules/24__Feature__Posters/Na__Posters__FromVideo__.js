// =============================================================================
// VALEVISION THEIA - FEATURE - POSTERS FROM THE VIDEO ITSELF
// =============================================================================
//
// FILE       : Na__Posters__FromVideo__.js
// NAMESPACE  : Na__Posters
// MODULE     : Feature - Posters
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Give a video without a picture one, made from its own frames
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - ValeVision 3D's Publish to Theia sends a poster with every video. A file
//   dropped into a project folder by hand has none, so the page makes one: it
//   opens the video quietly, steps two seconds in (or a tenth of the way, if
//   shorter), and draws that frame - a 1920-wide poster and a 524-wide
//   thumbnail (the Vale 524p convention), as WebP.
// - Everyone sees it at once. When a manager is watching, it is also saved to
//   the server (POST api/projects/<id>/videos/<video>/poster), so it is made
//   only once, for everybody.
// - One video at a time, from its file, after the page has
//   settled; the bytes it reads stay in the media cache.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Posters
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Api__Call } from '../03__AppUtils/Na__AppUtils__ApiClient__.js';

    const Na__Posters__TIMEOUT_MS = 30000;


    // HELPER FUNCTION | A Frame of a Video, Drawn at a Width, as a WebP Blob
    // ------------------------------------------------------------
    function Na__Posters__Draw(video, width) {
        const height = Math.round(width * (video.videoHeight / video.videoWidth));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, width, height);
        return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.88));
    }
    // ------------------------------------------------------------


    // FUNCTION | Make a Poster and Thumbnail From a Video File: { poster, thumbnail } (Blobs), or null
    // ------------------------------------------------------------
    function Na__Posters__Make(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            let done = false;
            const finish = (value) => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                video.removeAttribute('src');
                video.load();
                resolve(value);
            };
            const timer = setTimeout(() => finish(null), Na__Posters__TIMEOUT_MS);
            video.muted = true;
            video.preload = 'auto';
            video.playsInline = true;
            video.addEventListener('loadedmetadata', () => {
                video.currentTime = Math.min(2, (video.duration || 20) / 10);
            }, { once: true });
            video.addEventListener('seeked', async () => {
                try {
                    const poster = await Na__Posters__Draw(video, Math.min(video.videoWidth, Number(Na__AppConfig__Get('Publish__PosterWidthPx', 1920)) || 1920));
                    const thumbnail = await Na__Posters__Draw(video, Number(Na__AppConfig__Get('Publish__ThumbnailWidthPx', 524)) || 524);
                    finish(poster && thumbnail ? { poster, thumbnail } : null);
                } catch (error) { finish(null); }
            }, { once: true });
            video.addEventListener('error', () => finish(null), { once: true });
            video.src = file.url;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Fill In Missing Pictures: onPicture(video, { thumbUrl, posterUrl }) for each; saves them when save is true
    // ------------------------------------------------------------
    async function Na__Posters__FillMissing(projectId, videos, save, onPicture) {
        for (const video of videos) {
            if (video.thumbUrl || !video.file) continue;
            const lightest = video.file;
            const made = await Na__Posters__Make(lightest);
            if (!made) continue;
            const local = { thumbUrl: URL.createObjectURL(made.thumbnail), posterUrl: URL.createObjectURL(made.poster) };
            onPicture(video, local, null);
            if (!save) continue;
            try {
                const form = new FormData();
                form.append('poster', made.poster, 'poster.webp');
                form.append('thumbnail', made.thumbnail, 'thumbnail.webp');
                const answer = await Na__Api__Call('POST', `projects/${encodeURIComponent(projectId)}/videos/${encodeURIComponent(video.id)}/poster`, form);
                onPicture(video, local, answer);
            } catch (error) {
                console.warn('[Theia] A poster could not be saved:', error.message);
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__Posters__Make, Na__Posters__FillMissing };

// endregion -------------------------------------------------------------------
