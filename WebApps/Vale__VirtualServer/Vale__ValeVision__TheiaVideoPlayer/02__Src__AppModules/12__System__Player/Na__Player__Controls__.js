// =============================================================================
// VALEVISION THEIA - PLAYER - CONTROLS AND OVERLAYS
// =============================================================================
//
// FILE       : Na__Player__Controls__.js
// NAMESPACE  : Na__PlayerUi
// MODULE     : Player - Controls and Overlays
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Everything drawn over the video: the big play button, the control
//              bar (play, time, seek, sound, the quality badge, fullscreen), the
//              Vale spinner while it loads, Up next, errors and connection notices
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - PRESSING PLAY ON THE PLAYER (the big button, or the picture itself) goes
//   fullscreen as it plays (config Player__AutoFullscreenOnPlay); the small play
//   button in the bar plays where the player is.
// - THE QUALITY BADGE says what the video is (4K, 2K) and its pixel size on
//   hover. It is not a menu: a video has one file, at the size it was made.
// - THE SPINNER (the Vale ring, in white over a light shade) shows while the
//   controller saves ahead before playing, and when playback waits for data (a
//   moment later, so a short hiccup never flashes it). No card and no
//   countdown (Adam, 07-Oct-2026). While it shows, the play button reads Pause,
//   and pausing cancels the wait.
// - The bar hides itself while playing (Player__ControlsHideMs) and comes back
//   with any movement; in fullscreen the pointer hides with it.
// - THE ROTATE HINT: fullscreen on a phone held upright, with a wide video,
//   where the screen could not be turned for the viewer (anything but
//   Android): a turning phone and "Turn your phone sideways for a bigger
//   picture", for a few seconds (Player__RotateHintMs), once per fullscreen.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.0.0
// - Initial build. The quality menu (Auto / 4K / 2K) became a plain badge the
//   same day, when Theia moved to one file per video.
//
// 07-Oct-2026 - Version 1.1.0
// - The rotate hint (above), with Na__Player__Fullscreen__ 1.1.0, which turns
//   an Android screen to landscape itself.
//
// 07-Oct-2026 - Version 1.2.0
// - The "Getting the video ready" card and its Play now are replaced by the
//   Vale spinner (Adam).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Dom__El, Na__Dom__Icon, Na__Dom__IconButton, Na__Dom__SetIcon, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Format__Clock } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__Fullscreen__Element, Na__Fullscreen__Toggle, Na__Fullscreen__OnChange, Na__Fullscreen__WantsLandscape } from './Na__Player__Fullscreen__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Build
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Player Into a Container: returns the UI's handle
    // ------------------------------------------------------------
    // options: { onPrimaryPlay(), onNext(), hasNext() }
    // ------------------------------------------------------------
    function Na__PlayerUi__Build(container, controller, options) {
        const opts = options || {};
        const video = controller.video;
        container.classList.add('theia-player', 'is-paused');
        container.appendChild(video);
        video.classList.add('theia-player__video');

        // BIG PLAY | Centre of the picture, while paused
        const bigPlay = Na__Dom__IconButton('play', 'theia-player__bigplay', null, 'Play');
        container.appendChild(bigPlay);

        // SPINNER | The Vale ring, while the video is saved ahead or waits for data
        const shade = Na__Dom__El('div', 'theia-player__shade', null, { 'aria-hidden': 'true' });
        const spinner = Na__Dom__El('div', 'theia-player__spinner', null, { 'aria-hidden': 'true' });
        container.append(shade, spinner);

        // UP NEXT | At the end of a video
        const upNext = Na__Dom__El('div', 'theia-player__next', null, { hidden: true });
        container.appendChild(upNext);

        // ERROR | When a video cannot play
        const errorBox = Na__Dom__El('div', 'theia-player__error', null, { hidden: true, role: 'alert' });
        container.appendChild(errorBox);

        // NOTICE | Connection advice, top of the picture
        const notice = Na__Dom__El('div', 'theia-player__notice', null, { hidden: true, role: 'status' });
        container.appendChild(notice);

        // ROTATE HINT | Fullscreen on a phone held upright, where Theia could not turn the screen
        const rotateHint = Na__Dom__El('div', 'theia-player__rotate', null, { hidden: true, role: 'status' });
        rotateHint.appendChild(Na__Dom__Icon('phone', 'theia-player__rotate-icon'));
        rotateHint.appendChild(Na__Dom__El('span', 'theia-player__rotate-text', 'Turn your phone sideways for a bigger picture'));
        container.appendChild(rotateHint);

        // CHROME | Seek bar and button bar
        const chrome = Na__Dom__El('div', 'theia-player__chrome');
        const seek = Na__Dom__El('div', 'theia-player__seek', null, { role: 'slider', tabindex: '0', 'aria-label': 'Seek', 'aria-valuemin': '0' });
        const track = Na__Dom__El('div', 'theia-player__track');
        const buffered = Na__Dom__El('div', 'theia-player__buffered');
        const played = Na__Dom__El('div', 'theia-player__played');
        const handle = Na__Dom__El('div', 'theia-player__handle');
        track.append(buffered, played, handle);
        const hoverTime = Na__Dom__El('div', 'theia-player__hover-time');
        seek.append(track, hoverTime);

        const bar = Na__Dom__El('div', 'theia-player__bar');
        const playButton = Na__Dom__IconButton('play', 'theia-player__btn', null, 'Play (Space)');
        const time = Na__Dom__El('span', 'theia-player__time', '0:00 / 0:00');
        const spacer = Na__Dom__El('span', 'theia-player__spacer');
        const volumeWrap = Na__Dom__El('div', 'theia-player__volume');
        const muteButton = Na__Dom__IconButton('volumeHigh', 'theia-player__btn', null, 'Sound (M)');
        const volumeSlider = Na__Dom__El('input', 'theia-player__volume-slider', null, { type: 'range', min: '0', max: '1', step: '0.02', 'aria-label': 'Volume' });
        volumeWrap.append(muteButton, volumeSlider);
        const qualityBadge = Na__Dom__El('span', 'theia-player__badge', '', { hidden: true });   // <-- What the video is: never a menu
        const fullButton = Na__Dom__IconButton('fullscreen', 'theia-player__btn', null, 'Fullscreen (F)');
        bar.append(playButton, time, spacer, volumeWrap, qualityBadge, fullButton);
        chrome.append(seek, bar);
        container.appendChild(chrome);

        // ---------------------------------------------------------------
        // STATE FROM THE VIDEO ELEMENT
        // ---------------------------------------------------------------
        const duration = () => video.duration || ((controller.item && controller.item.durationMs) || 0) / 1000;

        const paint = () => {
            const d = duration(), t = video.currentTime || 0;
            const playing = !video.paused && !video.ended;
            const busy = playing || !!controller.runway;                      // <-- Saving ahead to play counts as playing: the button pauses it
            container.classList.toggle('is-playing', playing);
            container.classList.toggle('is-paused', !playing);
            Na__Dom__SetIcon(playButton, busy ? 'pause' : 'play');
            playButton.title = busy ? 'Pause (Space)' : 'Play (Space)';
            time.textContent = `${Na__Format__Clock(t)} / ${Na__Format__Clock(d)}`;
            const f = d ? Math.min(1, t / d) : 0;
            played.style.width = `${f * 100}%`;
            handle.style.left = `${f * 100}%`;
            seek.setAttribute('aria-valuemax', String(Math.round(d)));
            seek.setAttribute('aria-valuenow', String(Math.round(t)));
            seek.setAttribute('aria-valuetext', `${Na__Format__Clock(t)} of ${Na__Format__Clock(d)}`);
        };
        const paintBuffered = () => {
            const d = duration();
            let end = 0;
            for (let i = 0; i < video.buffered.length; i++) {
                if (video.buffered.start(i) <= video.currentTime + 0.5) end = Math.max(end, video.buffered.end(i));
            }
            buffered.style.width = d ? `${Math.min(1, end / d) * 100}%` : '0%';
        };
        const paintVolume = () => {
            const level = video.muted ? 0 : video.volume;
            Na__Dom__SetIcon(muteButton, level === 0 ? 'volumeMute' : level < 0.5 ? 'volumeLow' : 'volumeHigh');
            volumeSlider.value = String(level);
            volumeSlider.style.setProperty('--theia-fill', `${level * 100}%`);
            const silent = controller.item && controller.item.hasAudio === false;
            volumeWrap.classList.toggle('is-silent', !!silent);
            muteButton.title = silent ? 'This video has no sound' : 'Sound (M)';
        };

        ['timeupdate', 'durationchange', 'play', 'pause', 'ended', 'loadedmetadata', 'seeked'].forEach((e) => video.addEventListener(e, paint));
        ['progress', 'timeupdate', 'loadeddata'].forEach((e) => video.addEventListener(e, paintBuffered));
        video.addEventListener('volumechange', paintVolume);
        video.addEventListener('waiting', () => container.classList.add('is-waiting'));
        ['playing', 'canplay', 'pause', 'seeked'].forEach((e) => video.addEventListener(e, () => container.classList.remove('is-waiting')));
        video.addEventListener('playing', () => { container.classList.add('is-started'); errorBox.hidden = true; });

        // ---------------------------------------------------------------
        // PLAYING
        // ---------------------------------------------------------------
        const primary = () => {
            upNext.hidden = true;
            if (typeof opts.onPrimaryPlay === 'function') opts.onPrimaryPlay();
            else controller.play();
        };
        bigPlay.addEventListener('click', primary);
        video.addEventListener('click', () => {
            if (!controller.runway && (video.paused || video.ended)) primary(); else controller.pause();
        });
        video.addEventListener('dblclick', () => Na__Fullscreen__Toggle(container, video));
        playButton.addEventListener('click', () => controller.toggle());
        fullButton.addEventListener('click', () => Na__Fullscreen__Toggle(container, video));

        // ROTATE HINT | Offered once per fullscreen, a moment after it starts,
        // so an Android phone that Theia has just turned never sees it. It goes
        // when the phone is turned, at the first touch, when fullscreen ends,
        // or by itself after a few seconds, and it never takes a tap: the
        // picture under it plays and pauses as usual.
        const portrait = window.matchMedia ? window.matchMedia('(orientation: portrait)') : null;
        const hintMs = Number(Na__AppConfig__Get('Player__RotateHintMs', 4000)) || 4000;
        let rotateTimer = null;
        const hideRotate = () => { clearTimeout(rotateTimer); rotateHint.hidden = true; };
        const offerRotate = () => {
            hideRotate();
            rotateTimer = setTimeout(() => {
                if (Na__Fullscreen__Element() !== container || !portrait || !portrait.matches) return;
                if (!Na__Fullscreen__WantsLandscape(container, video)) return;
                rotateHint.hidden = false;
                rotateTimer = setTimeout(hideRotate, hintMs);
            }, 900);
        };
        if (portrait) {
            const turned = () => { if (!portrait.matches) hideRotate(); };
            if (portrait.addEventListener) portrait.addEventListener('change', turned);
            else if (portrait.addListener) portrait.addListener(turned);              // <-- Older Safari
        }
        container.addEventListener('pointerdown', hideRotate, { passive: true });

        Na__Fullscreen__OnChange(() => {
            const full = Na__Fullscreen__Element() === container;
            container.classList.toggle('is-fullscreen', full);
            Na__Dom__SetIcon(fullButton, full ? 'exitFull' : 'fullscreen');
            fullButton.title = full ? 'Leave fullscreen (F)' : 'Fullscreen (F)';
            if (full) offerRotate(); else hideRotate();
        });

        // ---------------------------------------------------------------
        // SEEKING
        // ---------------------------------------------------------------
        const fractionAt = (clientX) => {
            const r = track.getBoundingClientRect();
            return Math.min(1, Math.max(0, (clientX - r.left) / (r.width || 1)));
        };
        let dragging = false;
        seek.addEventListener('pointerdown', (e) => {
            dragging = true;
            seek.setPointerCapture(e.pointerId);
            container.classList.add('is-seeking');
            controller.seek(fractionAt(e.clientX) * duration());
        });
        seek.addEventListener('pointermove', (e) => {
            const f = fractionAt(e.clientX);
            hoverTime.textContent = Na__Format__Clock(f * duration());
            hoverTime.style.left = `${f * 100}%`;
            if (dragging) controller.seek(f * duration());
        });
        const endDrag = () => { dragging = false; container.classList.remove('is-seeking'); };
        seek.addEventListener('pointerup', endDrag);
        seek.addEventListener('pointercancel', endDrag);
        seek.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault(); e.stopPropagation();
                controller.seekBy(e.key === 'ArrowLeft' ? -5 : 5);
            }
        });

        // ---------------------------------------------------------------
        // SOUND
        // ---------------------------------------------------------------
        muteButton.addEventListener('click', () => controller.toggleMute());
        volumeSlider.addEventListener('input', () => controller.setVolume(Number(volumeSlider.value)));

        // ---------------------------------------------------------------
        // THE VIDEO'S SHAPE AND QUALITY
        // ---------------------------------------------------------------
        // The stage (player and details together) takes the video's shape, so
        // the title and buttons under it line up with its edges.
        const setAspect = (w, h) => {
            if (!(w > 0 && h > 0)) return;
            const stage = container.closest('.theia-stage') || container;
            stage.style.setProperty('--theia-aspect', (w / h).toFixed(4));
        };
        video.addEventListener('loadedmetadata', () => setAspect(video.videoWidth, video.videoHeight));
        controller.addEventListener('sourcechange', (e) => {
            const f = e.detail.file;
            if (f) setAspect(f.width, f.height);                              // <-- Before it loads, from the file's record
            qualityBadge.textContent = f ? f.quality : '';
            qualityBadge.title = f ? `This video is ${f.quality}: ${f.width} × ${f.height}` : '';
            qualityBadge.hidden = !f;
        });

        // ---------------------------------------------------------------
        // THE SPINNER WHILE IT SAVES AHEAD
        // ---------------------------------------------------------------
        controller.addEventListener('runway', () => { container.classList.add('is-preparing'); paint(); });
        controller.addEventListener('runwayend', () => { container.classList.remove('is-preparing'); paint(); });

        // ---------------------------------------------------------------
        // ERRORS AND A NEW VIDEO
        // ---------------------------------------------------------------
        controller.addEventListener('fatal', (e) => {
            Na__Dom__Clear(errorBox);
            const card = Na__Dom__El('div', 'theia-player__card');
            card.appendChild(Na__Dom__Icon('info', 'theia-player__card-icon'));
            card.appendChild(Na__Dom__El('div', 'theia-player__card-title', 'This video will not play'));
            card.appendChild(Na__Dom__El('div', 'theia-player__card-text', e.detail.message));
            const retry = Na__Dom__El('button', 'theia-button theia-button--ghost-light', 'Try again', { type: 'button' });
            retry.addEventListener('click', () => { errorBox.hidden = true; controller.reload(); });
            card.appendChild(retry);
            errorBox.appendChild(card);
            errorBox.hidden = false;
        });
        controller.addEventListener('videochange', () => {
            container.classList.remove('is-started', 'is-waiting');
            upNext.hidden = true;
            errorBox.hidden = true;
            paint(); paintBuffered(); paintVolume();
        });

        // ---------------------------------------------------------------
        // AUTO-HIDE
        // ---------------------------------------------------------------
        let hideTimer = null;
        const hideAfter = Number(Na__AppConfig__Get('Player__ControlsHideMs', 2600)) || 2600;
        const wake = () => {
            container.classList.remove('is-controls-hidden');
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
                if (!video.paused && !chrome.querySelector(':focus-visible')) {   // <-- Keyboard users keep the bar
                    container.classList.add('is-controls-hidden');
                }
            }, hideAfter);
        };
        ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach((e) => container.addEventListener(e, wake, { passive: true }));
        video.addEventListener('play', wake);
        video.addEventListener('pause', () => container.classList.remove('is-controls-hidden'));

        paint(); paintVolume();

        // ---------------------------------------------------------------
        // THE HANDLE
        // ---------------------------------------------------------------
        return {
            container,

            // FUNCTION | A Connection Notice ({ kind, text }); null hides it. "Got it" hides that kind for the visit
            setNotice(notice_) {
                if (!notice_ || Na__PlayerUi__Dismissed.has(notice_.kind)) { notice.hidden = true; return; }
                Na__Dom__Clear(notice);
                notice.appendChild(Na__Dom__Icon(notice_.icon || 'wifi', 'theia-player__notice-icon'));
                notice.appendChild(Na__Dom__El('span', 'theia-player__notice-text', notice_.text));
                const ok = Na__Dom__El('button', 'theia-player__notice-ok', 'Got it', { type: 'button' });
                ok.addEventListener('click', () => { Na__PlayerUi__Dismissed.add(notice_.kind); notice.hidden = true; });
                notice.appendChild(ok);
                notice.hidden = false;
            },

            // FUNCTION | Up Next: { item, seconds, onPlay, onCancel }
            showUpNext(next) {
                Na__Dom__Clear(upNext);
                const card = Na__Dom__El('div', 'theia-player__next-card');
                const thumb = Na__Dom__El('div', 'theia-player__next-thumb');
                if (next.item.thumbUrl || next.item.posterUrl) thumb.style.backgroundImage = `url("${next.item.thumbUrl || next.item.posterUrl}")`;
                const text = Na__Dom__El('div', 'theia-player__next-text');
                const count = Na__Dom__El('div', 'theia-player__next-label', `Up next in ${next.seconds}`);
                text.append(count, Na__Dom__El('div', 'theia-player__next-title', next.item.title));
                const go = Na__Dom__El('button', 'theia-button theia-button--light', 'Play now', { type: 'button' });
                const stop = Na__Dom__El('button', 'theia-button theia-button--ghost-light', 'Cancel', { type: 'button' });
                const actions = Na__Dom__El('div', 'theia-player__next-actions');
                actions.append(go, stop);
                card.append(thumb, text, actions);
                upNext.appendChild(card);
                upNext.hidden = false;
                let left = next.seconds;
                const timer = setInterval(() => {
                    left -= 1;
                    count.textContent = `Up next in ${Math.max(0, left)}`;
                    if (left <= 0) { clearInterval(timer); upNext.hidden = true; next.onPlay(); }
                }, 1000);
                go.addEventListener('click', () => { clearInterval(timer); upNext.hidden = true; next.onPlay(); });
                stop.addEventListener('click', () => { clearInterval(timer); upNext.hidden = true; if (next.onCancel) next.onCancel(); });
                return () => { clearInterval(timer); upNext.hidden = true; };
            }
        };
    }
    // ------------------------------------------------------------

    const Na__PlayerUi__Dismissed = new Set();

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export { Na__PlayerUi__Build };

// endregion -------------------------------------------------------------------
